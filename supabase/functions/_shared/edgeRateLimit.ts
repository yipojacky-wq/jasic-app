export type EdgeRateLimitFunction =
  | 'ai-check'
  | 'report-generate'
  | 'user-data-export'
  | 'account-delete';

export interface EdgeRateLimitPolicy {
  functionName: EdgeRateLimitFunction;
  limit: number;
  windowSeconds: number;
  scope: 'user';
  actionWhenLimited: {
    status: 429;
    code: 'RATE_LIMITED';
    skipOpenAi: boolean;
    skipPartialWrites: boolean;
  };
}

export interface EdgeRateLimitState {
  count: number;
  windowStartedAt: string;
}

export interface EdgeRateLimitRpcResult {
  allowed: boolean;
  request_count: number;
  retry_after_seconds: number;
  reset_at: string;
}

export const edgeRateLimitPolicies: Record<
  EdgeRateLimitFunction,
  EdgeRateLimitPolicy
> = {
  'ai-check': policy('ai-check', 20, 60 * 60),
  'report-generate': policy('report-generate', 10, 24 * 60 * 60),
  'user-data-export': policy('user-data-export', 5, 24 * 60 * 60),
  'account-delete': policy('account-delete', 1, 24 * 60 * 60),
};

export function rateLimitDecision(
  policy: EdgeRateLimitPolicy,
  state: EdgeRateLimitState,
  now = new Date(),
) {
  const windowStartedAt = new Date(state.windowStartedAt);
  const elapsedSeconds =
    (now.getTime() - windowStartedAt.getTime()) / 1000;
  const windowExpired =
    !Number.isFinite(windowStartedAt.getTime()) ||
    elapsedSeconds >= policy.windowSeconds;

  if (windowExpired) {
    return {
      allowed: true,
      nextCount: 1,
      resetAt: new Date(now.getTime() + policy.windowSeconds * 1000).toISOString(),
      retryAfterSeconds: 0,
    };
  }

  const nextCount = state.count + 1;
  const resetAt = new Date(
    windowStartedAt.getTime() + policy.windowSeconds * 1000,
  );
  const retryAfterSeconds = Math.max(
    0,
    Math.ceil((resetAt.getTime() - now.getTime()) / 1000),
  );

  return {
    allowed: nextCount <= policy.limit,
    nextCount,
    resetAt: resetAt.toISOString(),
    retryAfterSeconds,
  };
}

export function rateLimitMessage(retryAfterSeconds: number) {
  if (retryAfterSeconds <= 0) {
    return 'Request limit reached. Please try again later.';
  }
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `Request limit reached. Please try again in about ${minutes} minute(s).`;
}

export async function consumeEdgeRateLimit(
  supabase: {
    rpc: (
      functionName: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
  },
  userId: string,
  functionName: EdgeRateLimitFunction,
) {
  const policy = edgeRateLimitPolicies[functionName];
  const { data, error } = await supabase.rpc('consume_edge_rate_limit', {
    target_user_id: userId,
    target_function_name: policy.functionName,
    target_limit: policy.limit,
    target_window_seconds: policy.windowSeconds,
  });

  if (error) {
    return {
      ok: false as const,
      error: error.message,
      policy,
    };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const result = normalizeRpcResult(row);
  if (!result) {
    return {
      ok: false as const,
      error: 'Invalid rate-limit RPC response',
      policy,
    };
  }

  return {
    ok: true as const,
    policy,
    result,
  };
}

function normalizeRpcResult(value: unknown): EdgeRateLimitRpcResult | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (typeof record.allowed !== 'boolean') return null;
  const requestCount = Number(record.request_count);
  const retryAfterSeconds = Number(record.retry_after_seconds);
  if (!Number.isFinite(requestCount) || !Number.isFinite(retryAfterSeconds)) {
    return null;
  }
  return {
    allowed: record.allowed,
    request_count: requestCount,
    retry_after_seconds: retryAfterSeconds,
    reset_at: String(record.reset_at ?? ''),
  };
}

function policy(
  functionName: EdgeRateLimitFunction,
  limit: number,
  windowSeconds: number,
): EdgeRateLimitPolicy {
  return {
    functionName,
    limit,
    windowSeconds,
    scope: 'user',
    actionWhenLimited: {
      status: 429,
      code: 'RATE_LIMITED',
      skipOpenAi: true,
      skipPartialWrites: true,
    },
  };
}
