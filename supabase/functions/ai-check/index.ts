import { createServiceClient } from '../_shared/client.ts';
import {
  envelope,
  errorEnvelope,
  jsonResponse,
  optionsResponse,
} from '../_shared/http.ts';

const resultSchema = {
  type: 'object',
  properties: {
    action: { type: 'string', enum: ['ADD', 'HOLD', 'WAIT', 'REDUCE', 'STOP_LOSS'] },
    conclusion: { type: 'string' },
    reasons: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 5 },
    risks: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 5 },
    suggestions: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 5 },
    confidence: { type: 'number', minimum: 0, maximum: 100 },
  },
  required: ['action', 'conclusion', 'reasons', 'risks', 'suggestions', 'confidence'],
  additionalProperties: false,
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'POST') {
    return jsonResponse(errorEnvelope('METHOD_NOT_ALLOWED', 'POST required'), 405);
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse(errorEnvelope('AUTH_REQUIRED', 'Missing authorization'), 401);
  }

  const input = await request.json();
  if (
    typeof input.symbol !== 'string' ||
    !Number.isFinite(input.cost) ||
    input.cost <= 0 ||
    !Number.isFinite(input.lots) ||
    input.lots <= 0
  ) {
    return jsonResponse(errorEnvelope('INVALID_INPUT', 'Invalid position input'), 400);
  }

  const supabase = createServiceClient();
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  const { data: authData, error: authError } = await supabase.auth.getUser(jwt);
  if (authError || !authData.user) {
    return jsonResponse(errorEnvelope('AUTH_REQUIRED', 'Invalid session'), 401);
  }

  const { data: stock } = await supabase
    .from('stocks')
    .select('id, symbol, name_zh, industry_code')
    .eq('symbol', input.symbol.trim())
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (!stock) {
    return jsonResponse(errorEnvelope('STOCK_NOT_FOUND', 'Unknown stock symbol'), 404);
  }

  const [{ data: score }, { data: market }] = await Promise.all([
    supabase
      .from('stock_score_snapshots')
      .select('*')
      .eq('stock_id', stock.id)
      .order('as_of', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('market_score_snapshots')
      .select('*')
      .order('as_of', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!score || !market) {
    return jsonResponse(errorEnvelope('INSUFFICIENT_DATA', 'Score snapshot unavailable'), 503);
  }

  const ageMs = Date.now() - new Date(score.as_of).getTime();
  if (ageMs > 1000 * 60 * 60 * 72) {
    return jsonResponse(errorEnvelope('MARKET_DATA_STALE', 'Stock data is older than 72 hours'), 503);
  }

  const allowedActions = determineAllowedActions(score, market, input.riskProfile);
  const facts = {
    stock,
    score,
    market,
    position: {
      cost: input.cost,
      quantity_shares: Number(input.lots) * 1000,
      investment_horizon: input.horizon,
      risk_profile: input.riskProfile,
    },
    allowed_actions: allowedActions,
  };

  const openAiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAiKey) {
    return jsonResponse(errorEnvelope('SERVICE_UNAVAILABLE', 'OpenAI secret not configured'), 503);
  }

  const model = Deno.env.get('OPENAI_MODEL') ?? 'gpt-5.4-mini';
  const openAiResponse = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: 'system',
          content:
            '你是 JASIC 股票研究決策助理。只能根據提供的結構化事實回答。不得保證獲利，不得建議自動交易，不得捏造價格、勝率或資料。action 必須屬於 allowed_actions。資料不足或訊號衝突時選 WAIT。用繁體中文，先結論後證據。',
        },
        {
          role: 'user',
          content: JSON.stringify(facts),
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'jasic_ai_check',
          strict: true,
          schema: resultSchema,
        },
      },
    }),
  });

  if (!openAiResponse.ok) {
    const detail = await openAiResponse.text();
    console.error('OpenAI error', openAiResponse.status, detail);
    return jsonResponse(errorEnvelope('SERVICE_UNAVAILABLE', 'AI generation failed'), 503);
  }

  const raw = await openAiResponse.json();
  const outputText = extractOutputText(raw);
  if (!outputText) {
    return jsonResponse(errorEnvelope('AI_OUTPUT_INVALID', 'No structured output'), 503);
  }

  const result = JSON.parse(outputText);
  if (!allowedActions.includes(result.action)) {
    return jsonResponse(errorEnvelope('AI_OUTPUT_INVALID', 'Action violated rule guardrail'), 503);
  }

  const { data: aiRequest, error: requestError } = await supabase
    .from('ai_check_requests')
    .insert({
      user_id: authData.user.id,
      stock_id: stock.id,
      cost: input.cost,
      quantity_shares: Number(input.lots) * 1000,
      investment_horizon: input.horizon,
      risk_profile: input.riskProfile,
      status: 'completed',
    })
    .select('id')
    .single();

  if (!requestError && aiRequest) {
    await supabase.from('ai_check_results').insert({
      request_id: aiRequest.id,
      ...result,
      facts_snapshot: facts,
      model_identifier: model,
      prompt_version: 'ai-check-1.0.0',
      rule_version: score.rule_version,
    });
  }

  return jsonResponse(
    envelope(result, {
      data_as_of: score.as_of,
      rule_version: score.rule_version,
      model_identifier: model,
    }),
  );
});

function determineAllowedActions(
  score: Record<string, any>,
  market: Record<string, any>,
  riskProfile: string,
) {
  if (
    market.market_regime === 'risk_off' ||
    Number(score.risk_score) >= 75 ||
    Number(score.confidence_score) < 55
  ) {
    return ['WAIT', 'REDUCE', 'STOP_LOSS'];
  }
  if (riskProfile === 'conservative' || Number(score.total_score) < 75) {
    return ['HOLD', 'WAIT', 'REDUCE'];
  }
  return ['ADD', 'HOLD', 'WAIT', 'REDUCE'];
}

function extractOutputText(response: any): string | null {
  if (typeof response.output_text === 'string') return response.output_text;
  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === 'output_text' && typeof content.text === 'string') {
        return content.text;
      }
    }
  }
  return null;
}
