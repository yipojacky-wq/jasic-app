import { validateAiCheckInput } from '../_shared/aiInput.ts';
import { createServiceClient } from '../_shared/client.ts';
import {
  aiCheckResultSchema,
  buildAiCheckGovernanceAudit,
  buildAiCheckSystemPrompt,
  determineAllowedAiCheckActions,
  validateAiCheckStructuredResult,
} from '../_shared/aiGovernance.ts';
import {
  envelope,
  errorEnvelope,
  jsonResponse,
  optionsResponse,
} from '../_shared/http.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'POST') {
    return jsonResponse(errorEnvelope('METHOD_NOT_ALLOWED', 'POST required'), 405);
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse(errorEnvelope('AUTH_REQUIRED', 'Missing authorization'), 401);
  }

  let rawInput: unknown;
  try {
    rawInput = await request.json();
  } catch {
    return jsonResponse(errorEnvelope('INVALID_INPUT', 'Invalid JSON body'), 400);
  }

  const validation = validateAiCheckInput(rawInput);
  if (!validation.ok) {
    return jsonResponse(
      errorEnvelope('INVALID_INPUT', Object.values(validation.errors).join(' ')),
      400,
    );
  }
  const input = validation.value;

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

  const allowedActions = determineAllowedAiCheckActions({
    marketRegime: market.market_regime,
    stockRiskScore: Number(score.risk_score),
    stockTotalScore: Number(score.total_score),
    stockConfidenceScore: Number(score.confidence_score),
    riskProfile: input.riskProfile,
  });
  const model = Deno.env.get('OPENAI_MODEL') ?? 'gpt-5.4-mini';
  const audit = buildAiCheckGovernanceAudit({
    allowedActions,
    dataAsOf: score.as_of,
    modelIdentifier: model,
    ruleVersion: score.rule_version,
  });
  const facts = {
    stock,
    score,
    market,
    position: {
      cost: input.cost,
      quantity_shares: input.quantityShares,
      cost_basis: input.costBasis,
      investment_horizon: input.horizon,
      risk_profile: input.riskProfile,
    },
    governance: audit,
  };

  const openAiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAiKey) {
    return jsonResponse(errorEnvelope('SERVICE_UNAVAILABLE', 'OpenAI secret not configured'), 503);
  }

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
          content: buildAiCheckSystemPrompt(allowedActions),
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
          schema: aiCheckResultSchema,
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

  const parsedResult = JSON.parse(outputText);
  const validatedResult = validateAiCheckStructuredResult(parsedResult, allowedActions);
  if (!validatedResult.ok) {
    return jsonResponse(errorEnvelope('AI_OUTPUT_INVALID', validatedResult.reason), 503);
  }
  const result = validatedResult.value;

  const { data: aiRequest, error: requestError } = await supabase
    .from('ai_check_requests')
    .insert({
      user_id: authData.user.id,
      stock_id: stock.id,
      cost: input.cost,
      quantity_shares: input.quantityShares,
      investment_horizon: input.horizon,
      risk_profile: input.riskProfile,
      status: 'completed',
    })
    .select('id')
    .single();

  if (requestError || !aiRequest) {
    return jsonResponse(
      errorEnvelope(
        'DATABASE_ERROR',
        requestError?.message ?? 'AI request was not persisted',
      ),
      500,
    );
  }

  const { error: resultError } = await supabase
    .from('ai_check_results')
    .insert({
      request_id: aiRequest.id,
      ...result,
      facts_snapshot: facts,
      model_identifier: audit.modelIdentifier,
      prompt_version: audit.promptVersion,
      rule_version: audit.ruleVersion,
    });

  if (resultError) {
    await supabase.from('ai_check_requests').delete().eq('id', aiRequest.id);
    return jsonResponse(errorEnvelope('DATABASE_ERROR', resultError.message), 500);
  }

  return jsonResponse(
    envelope(result, {
      data_as_of: audit.dataAsOf,
      rule_version: audit.ruleVersion,
      model_identifier: audit.modelIdentifier,
      prompt_version: audit.promptVersion,
      response_schema_version: audit.responseSchemaVersion,
    }),
  );
});

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
