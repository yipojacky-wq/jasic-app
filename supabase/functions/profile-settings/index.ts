import { createServiceClient } from '../_shared/client.ts';
import {
  envelope,
  errorEnvelope,
  jsonResponse,
  optionsResponse,
} from '../_shared/http.ts';

const riskProfiles = new Set(['conservative', 'balanced', 'aggressive', 'growth']);
const horizons = new Set(['short', 'swing', 'medium', 'long']);

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'POST') {
    return jsonResponse(errorEnvelope('METHOD_NOT_ALLOWED', 'POST required'), 405);
  }
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse(errorEnvelope('AUTH_REQUIRED', 'Missing authorization'), 401);
  }

  const supabase = createServiceClient();
  const { data: authData, error: authError } = await supabase.auth.getUser(
    authHeader.replace(/^Bearer\s+/i, ''),
  );
  if (authError || !authData.user) {
    return jsonResponse(errorEnvelope('AUTH_REQUIRED', 'Invalid session'), 401);
  }

  const body = await request.json().catch(() => ({}));
  if (body.action === 'update') {
    const update: Record<string, unknown> = {};
    if (typeof body.displayName === 'string') {
      update.display_name = body.displayName.trim().slice(0, 80);
    }
    if (riskProfiles.has(body.riskProfile)) {
      update.risk_profile = body.riskProfile;
    }
    if (horizons.has(body.defaultHorizon)) {
      update.default_horizon = body.defaultHorizon;
    }
    if (body.acceptTerms === true) {
      update.terms_version = 'alpha-1.0';
      update.terms_accepted_at = new Date().toISOString();
    }
    if (Object.keys(update).length) {
      const { error } = await supabase
        .from('profiles')
        .update(update)
        .eq('id', authData.user.id);
      if (error) {
        return jsonResponse(errorEnvelope('DATABASE_ERROR', error.message), 500);
      }
    }
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, display_name, risk_profile, default_horizon, timezone, terms_version, terms_accepted_at')
    .eq('id', authData.user.id)
    .single();
  if (error) {
    return jsonResponse(errorEnvelope('DATABASE_ERROR', error.message), 500);
  }

  return jsonResponse(envelope({
    id: profile.id,
    email: authData.user.email ?? '',
    displayName: profile.display_name ?? '',
    riskProfile: profile.risk_profile,
    defaultHorizon: profile.default_horizon,
    timezone: profile.timezone,
    termsVersion: profile.terms_version,
    termsAcceptedAt: profile.terms_accepted_at,
  }));
});
