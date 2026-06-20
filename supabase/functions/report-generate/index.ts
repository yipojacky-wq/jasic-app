import { createServiceClient } from '../_shared/client.ts';
import { requireCronSecret } from '../_shared/data.ts';
import {
  envelope,
  errorEnvelope,
  jsonResponse,
  optionsResponse,
} from '../_shared/http.ts';
import {
  dailyMarketSections,
  isoWeek,
  reportDisclaimer,
  riskLabel,
} from '../_shared/reports.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return optionsResponse();
  const forbidden = requireCronSecret(request);
  if (forbidden) return forbidden;
  if (request.method !== 'POST') {
    return jsonResponse(errorEnvelope('METHOD_NOT_ALLOWED', 'POST required'), 405);
  }

  const supabase = createServiceClient();
  try {
    const [
      { data: market, error: marketError },
      { data: run, error: runError },
    ] = await Promise.all([
      supabase
        .from('market_score_snapshots')
        .select('*')
        .order('as_of', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('discovery_runs')
        .select('id, as_of, rule_version')
        .eq('status', 'completed')
        .order('as_of', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (marketError) throw marketError;
    if (runError) throw runError;
    if (!market || !run) {
      return jsonResponse(errorEnvelope('INSUFFICIENT_DATA', 'Market or Discovery snapshot unavailable'), 503);
    }

    const { data: candidates, error: candidateError } = await supabase
      .from('discovery_candidates')
      .select('rank, discovery_score, category, risk_flags, stock_id, stocks!inner(symbol, name_zh, industry_code)')
      .eq('run_id', run.id)
      .order('rank')
      .limit(20);
    if (candidateError) throw candidateError;

    const asOfDate = market.as_of.slice(0, 10);
    const weekKey = isoWeek(asOfDate);
    const strategy = market.strategy_bias as Record<string, unknown>;
    const marketSummary =
      typeof strategy?.summary === 'string'
        ? strategy.summary
        : '市場資料已更新，請依分數、燈號與風險分層判讀。';
    const industries = topIndustries(candidates ?? []);
    const highRiskCount = (candidates ?? []).filter((candidate: any) =>
      Array.isArray(candidate.risk_flags) && candidate.risk_flags.length > 0
    ).length;
    const greenCount = await countGreenScores(supabase, run.as_of);

    const reportRows: Record<string, unknown>[] = [
      {
        report_key: `daily_market:${asOfDate}:${market.rule_version}`,
        report_type: 'daily_market',
        title: `${asOfDate} 每日市場戰情`,
        period_start: asOfDate,
        period_end: asOfDate,
        as_of: market.as_of,
        summary: marketSummary,
        content: {
          metrics: [
            { label: 'Market Score', value: Number(market.score).toFixed(1) },
            { label: 'Risk Score', value: Number(market.risk_score).toFixed(1) },
            { label: '市場狀態', value: market.market_regime },
          ],
          sections: dailyMarketSections({
            summary: marketSummary,
            regime: market.market_regime,
            score: Number(market.score),
            risk: Number(market.risk_score),
            topIndustries: industries,
          }),
          disclaimer: reportDisclaimer(),
        },
        status: 'published',
        rule_version: market.rule_version,
        published_at: new Date().toISOString(),
      },
      {
        report_key: `weekly_core_pool:${weekKey}:${run.rule_version}`,
        report_type: 'weekly_core_pool',
        title: `${weekKey} 核心池週報`,
        period_start: weekStart(asOfDate),
        period_end: asOfDate,
        as_of: run.as_of,
        summary: `核心池共 ${(candidates ?? []).length} 檔，前段產業為 ${industries.join('、') || '資料不足'}。`,
        content: {
          metrics: [
            { label: '核心候選', value: String((candidates ?? []).length) },
            { label: '綠燈標的', value: String(greenCount) },
            { label: '高風險標的', value: String(highRiskCount) },
          ],
          sections: [
            {
              title: 'Top 10',
              tone: 'positive',
              items: (candidates ?? []).slice(0, 10).map((candidate: any) =>
                `${candidate.rank}. ${candidate.stocks.name_zh}（${candidate.stocks.symbol}）— ${Number(candidate.discovery_score).toFixed(1)}`
              ),
            },
            {
              title: '產業分布',
              tone: 'info',
              items: industries.length
                ? industries.map((industry) => `${industry} 位於本週核心池前段`)
                : ['產業資料不足'],
            },
            {
              title: '風險提醒',
              tone: highRiskCount > 0 ? 'warning' : 'info',
              items: [
                `${highRiskCount} 檔候選標的帶有高波動風險旗標。`,
                '排名反映當期資料快照，不代表未來報酬。',
              ],
            },
          ],
          disclaimer: reportDisclaimer(),
        },
        status: 'published',
        rule_version: run.rule_version,
        published_at: new Date().toISOString(),
      },
      {
        report_key: `risk_alert:${asOfDate}:${market.rule_version}`,
        report_type: 'risk_alert',
        title: `${asOfDate} 風險警示報告`,
        period_start: asOfDate,
        period_end: asOfDate,
        as_of: market.as_of,
        summary: `整體風險為${riskLabel(Number(market.risk_score))}風險，候選池有 ${highRiskCount} 檔帶有風險旗標。`,
        content: {
          metrics: [
            { label: '市場風險', value: Number(market.risk_score).toFixed(1) },
            { label: '高風險候選', value: String(highRiskCount) },
            { label: '市場燈號', value: market.signal },
          ],
          sections: [
            {
              title: '市場風險',
              tone: Number(market.risk_score) >= 70 ? 'danger' : 'warning',
              items: [
                `市場風險分數 ${Number(market.risk_score).toFixed(1)}。`,
                `目前市場狀態為 ${market.market_regime}。`,
              ],
            },
            {
              title: '候選池風險',
              tone: highRiskCount ? 'warning' : 'info',
              items: [
                `${highRiskCount} 檔候選股具有波動或資料風險旗標。`,
                '個股 Chip 與 OI 未完整驗證者應降低信心。',
              ],
            },
          ],
          disclaimer: reportDisclaimer(),
        },
        status: 'published',
        rule_version: market.rule_version,
        published_at: new Date().toISOString(),
      },
    ];

    const topCandidate = candidates?.[0] as any;
    if (topCandidate) {
      const { data: scores } = await supabase
        .from('stock_score_snapshots')
        .select('*')
        .eq('stock_id', topCandidate.stock_id)
        .order('as_of', { ascending: false })
        .limit(1);
      const score = scores?.[0];
      if (score) {
        reportRows.push({
          report_key: `stock_war_room:${topCandidate.stock_id}:${asOfDate}:${score.rule_version}`,
          report_type: 'stock_war_room',
          stock_id: topCandidate.stock_id,
          title: `${topCandidate.stocks.name_zh} 個股戰情室`,
          period_start: asOfDate,
          period_end: asOfDate,
          as_of: score.as_of,
          summary: `${topCandidate.stocks.name_zh} JASIC Score ${Number(score.total_score).toFixed(1)}，${riskLabel(Number(score.risk_score))}風險。`,
          content: {
            stock_symbol: topCandidate.stocks.symbol,
            metrics: [
              { label: 'JASIC Score', value: Number(score.total_score).toFixed(1) },
              { label: '風險分數', value: Number(score.risk_score).toFixed(1) },
              { label: '信心分數', value: Number(score.confidence_score).toFixed(1) },
            ],
            sections: [
              {
                title: '五大構面',
                tone: 'info',
                items: [
                  `Market ${Number(score.market_score).toFixed(1)}`,
                  `Institution ${Number(score.institution_score).toFixed(1)}`,
                  `Chip ${Number(score.chip_score).toFixed(1)}（暫定）`,
                  `OI ${Number(score.oi_score).toFixed(1)}（資料未完整）`,
                  `Technical ${Number(score.technical_score).toFixed(1)}`,
                ],
              },
              {
                title: '研究限制',
                tone: 'warning',
                items: ['本報告使用暫定規則版本。', '需進入 Stock War Room 查看完整價格與法人證據。'],
              },
            ],
            disclaimer: reportDisclaimer(),
          },
          status: 'published',
          rule_version: score.rule_version,
          published_at: new Date().toISOString(),
        });
      }
    }

    const { error: upsertError } = await supabase
      .from('reports')
      .upsert(reportRows, { onConflict: 'report_key' });
    if (upsertError) throw upsertError;

    return jsonResponse(envelope({
      generated: reportRows.length,
      reportKeys: reportRows.map((row) => row.report_key),
    }, {
      data_as_of: market.as_of,
      rule_version: market.rule_version,
    }));
  } catch (error) {
    console.error(error);
    return jsonResponse(
      errorEnvelope(
        'REPORT_GENERATION_FAILED',
        error instanceof Error ? error.message : 'Unknown report error',
      ),
      500,
    );
  }
});

function topIndustries(candidates: any[]) {
  const counts = new Map<string, number>();
  for (const candidate of candidates) {
    const industry = candidate.stocks?.industry_code ?? '未分類';
    counts.set(industry, (counts.get(industry) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([industry]) => industry);
}

function weekStart(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00Z`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date.toISOString().slice(0, 10);
}

async function countGreenScores(supabase: any, asOf: string) {
  const { count } = await supabase
    .from('stock_score_snapshots')
    .select('id', { count: 'exact', head: true })
    .eq('as_of', asOf)
    .eq('signal', 'green');
  return count ?? 0;
}
