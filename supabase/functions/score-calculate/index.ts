import { createServiceClient } from '../_shared/client.ts';
import { requireCronSecret, upsertChunks } from '../_shared/data.ts';
import {
  categoryFor,
  computeMarketMetrics,
  computeStockScore,
  round,
} from '../_shared/scoring.ts';
import {
  envelope,
  errorEnvelope,
  jsonResponse,
  optionsResponse,
} from '../_shared/http.ts';

const FEATURE_VERSION = 'features-0.1.0';
const RULE_VERSION = 'stock-score-provisional-0.1.0';

type FeatureRow = {
  stock_id: string;
  ma20: number | string | null;
  return_5d: number | string | null;
  volatility_20d: number | string | null;
  volume_ratio_20d: number | string | null;
  institution_net_5d: number | string | null;
};

type PriceRow = {
  stock_id: string;
  close: number | string;
  volume: number | string;
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return optionsResponse();
  const forbidden = requireCronSecret(request);
  if (forbidden) return forbidden;
  if (request.method !== 'POST') {
    return jsonResponse(errorEnvelope('METHOD_NOT_ALLOWED', 'POST required'), 405);
  }

  const supabase = createServiceClient();
  try {
    const requested = await request.json().catch(() => ({}));
    const targetDate = requested.tradeDate ?? await latestTradeDate(supabase);
    if (!targetDate) {
      return jsonResponse(errorEnvelope('INSUFFICIENT_DATA', 'No daily prices'), 503);
    }

    const { data: featureCount, error: featureError } = await supabase.rpc(
      'calculate_stock_features',
      {
        target_date: targetDate,
        target_feature_version: FEATURE_VERSION,
      },
    );
    if (featureError) throw featureError;

    const [{ data: features, error: featuresError }, { data: prices, error: pricesError }] =
      await Promise.all([
        supabase
          .from('stock_features_daily')
          .select('*')
          .eq('trade_date', targetDate)
          .eq('feature_version', FEATURE_VERSION),
        supabase
          .from('stock_daily_prices')
          .select('stock_id, close, volume')
          .eq('trade_date', targetDate),
      ]);
    if (featuresError) throw featuresError;
    if (pricesError) throw pricesError;
    if (!features?.length) {
      return jsonResponse(
        errorEnvelope(
          'INSUFFICIENT_DATA',
          'At least 20 trading sessions are required before scoring',
        ),
        503,
      );
    }

    const typedFeatures = (features ?? []) as FeatureRow[];
    const priceMap = new Map<string, PriceRow>(
      ((prices ?? []) as PriceRow[]).map((price) => [price.stock_id, price]),
    );
    const aboveMa20Count = typedFeatures.filter((feature) => {
      const price = priceMap.get(feature.stock_id);
      return price && Number(price.close) > Number(feature.ma20);
    }).length;
    const averageVolatility =
      typedFeatures.reduce(
        (sum: number, feature: FeatureRow) =>
          sum + Number(feature.volatility_20d ?? 0),
        0,
      ) / typedFeatures.length;

    const market = computeMarketMetrics(
      aboveMa20Count,
      typedFeatures.length,
      averageVolatility,
    );
    const marketScore = market.score;
    const marketRisk = market.risk;
    const signal = market.signal;
    const regime = market.regime;
    const asOf = `${targetDate}T08:30:00.000Z`;

    await supabase.from('market_score_snapshots').upsert(
      {
        as_of: asOf,
        score: round(marketScore),
        risk_score: round(marketRisk),
        signal,
        market_regime: regime,
        component_scores: {
          breadth: round(market.breadth * 100),
          average_volatility_20d: round(averageVolatility * 100),
        },
        strategy_bias: {
          summary: marketSummary(regime),
          status: 'provisional',
        },
        confidence_score: 70,
        rule_version: RULE_VERSION,
      },
      { onConflict: 'as_of' },
    );

    const scoreRows = typedFeatures.flatMap((feature) => {
      const price = priceMap.get(feature.stock_id);
      if (!price || !feature.ma20) return [];
      const close = Number(price.close);
      const ma20 = Number(feature.ma20);
      const return5d = Number(feature.return_5d ?? 0);
      const volume = Number(price.volume);
      const averageVolume20 =
        Number(feature.volume_ratio_20d) > 0
          ? volume / Number(feature.volume_ratio_20d)
          : volume;

      const calculated = computeStockScore({
        marketScore,
        close,
        ma20,
        return5d,
        institutionNet5d: Number(feature.institution_net_5d ?? 0),
        averageVolume20,
        volatility20d: Number(feature.volatility_20d ?? 0),
      });

      return [{
        stock_id: feature.stock_id,
        as_of: asOf,
        market_score: calculated.market,
        institution_score: calculated.institution,
        chip_score: calculated.chip,
        oi_score: calculated.oi,
        technical_score: calculated.technical,
        total_score: calculated.total,
        confidence_score: 65,
        risk_score: calculated.risk,
        signal: calculated.signal,
        evidence: {
          status: 'provisional',
          close,
          ma20,
          return_5d: return5d,
          institution_net_5d: feature.institution_net_5d,
          missing_dimensions: ['verified_chip_concentration', 'individual_stock_oi'],
        },
        rule_version: RULE_VERSION,
      }];
    });
    await upsertChunks(
      supabase,
      'stock_score_snapshots',
      scoreRows,
      'stock_id,as_of,rule_version',
    );

    const { data: run, error: runError } = await supabase
      .from('discovery_runs')
      .insert({
        as_of: asOf,
        status: 'completed',
        market_scope: 'TWSE_TPEX_COMMON_STOCKS',
        rule_version: RULE_VERSION,
        completed_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (runError) throw runError;

    const topCandidates = [...scoreRows]
      .filter((row) => row.risk_score < 80 && row.total_score >= 50)
      .sort((a, b) => b.total_score - a.total_score)
      .slice(0, 20)
      .map((row, index) => ({
        run_id: run.id,
        stock_id: row.stock_id,
        rank: index + 1,
        discovery_score: row.total_score,
        category: categoryFor({
          technical: row.technical_score,
          institution: row.institution_score,
        }),
        layer_results: {
          market: { status: marketScore >= 45 ? 'pass' : 'reject', score: round(marketScore) },
          institution: { status: row.institution_score >= 45 ? 'pass' : 'caution', score: row.institution_score },
          technical_risk: { status: row.technical_score >= 50 && row.risk_score < 80 ? 'pass' : 'caution', technical_score: row.technical_score, risk_score: row.risk_score },
        },
        rank_reasons: [
          `綜合分數 ${row.total_score}`,
          `技術分數 ${row.technical_score}`,
          `法人分數 ${row.institution_score}`,
        ],
        risk_flags: row.risk_score >= 60 ? ['high_volatility'] : [],
      }));
    if (topCandidates.length) {
      await supabase.from('discovery_candidates').insert(topCandidates);
    }

    return jsonResponse(
      envelope(
        {
          tradeDate: targetDate,
          featureCount,
          scoreCount: scoreRows.length,
          discoveryCount: topCandidates.length,
          marketScore: round(marketScore),
          marketRisk: round(marketRisk),
          status: 'provisional_rule_version',
        },
        { data_as_of: asOf, rule_version: RULE_VERSION },
      ),
    );
  } catch (error) {
    console.error(error);
    return jsonResponse(
      errorEnvelope(
        'SCORE_CALCULATION_FAILED',
        error instanceof Error ? error.message : 'Unknown scoring error',
      ),
      500,
    );
  }
});

async function latestTradeDate(supabase: any): Promise<string | null> {
  const { data, error } = await supabase
    .from('stock_daily_prices')
    .select('trade_date')
    .order('trade_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.trade_date ?? null;
}

function marketSummary(regime: string) {
  if (regime === 'risk_on') return '市場廣度偏強，仍需依個股風險與部位限制分層操作。';
  if (regime === 'high_volatility') return '市場波動偏高，降低曝險並優先等待訊號一致。';
  if (regime === 'risk_off') return '市場環境偏弱，禁止積極加碼並優先風險控制。';
  return '市場處於中性輪動，聚焦相對強勢標的並避免追高。';
}
