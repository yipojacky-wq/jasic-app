export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-jasic-query',
};

export function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      ...extraHeaders,
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

export function optionsResponse() {
  return new Response('ok', { headers: corsHeaders });
}

export function envelope<T>(data: T, meta: Record<string, unknown> = {}) {
  return {
    data,
    meta: {
      request_id: crypto.randomUUID(),
      ...meta,
    },
    error: null,
  };
}

export function errorEnvelope(code: string, message: string) {
  return { data: null, meta: { request_id: crypto.randomUUID() }, error: { code, message } };
}
