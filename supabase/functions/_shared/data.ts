import { chunks } from './normalize.ts';

export {
  chunks,
  integerValue,
  isCommonStockSymbol,
  numberValue,
  rocDateToIso,
} from './normalize.ts';

export async function upsertChunks(
  supabase: any,
  table: string,
  rows: Record<string, unknown>[],
  onConflict: string,
) {
  for (const batch of chunks(rows)) {
    const { error } = await supabase.from(table).upsert(batch, { onConflict });
    if (error) throw error;
  }
}

export function requireCronSecret(request: Request): Response | null {
  const expected = Deno.env.get('CRON_SECRET');
  if (!expected) {
    return new Response(JSON.stringify({ error: 'CRON_SECRET_NOT_CONFIGURED' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (request.headers.get('x-cron-secret') !== expected) {
    return new Response(JSON.stringify({ error: 'FORBIDDEN' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return null;
}
