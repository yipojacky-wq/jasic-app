import { createServiceClient } from '../_shared/client.ts';
import {
  envelope,
  errorEnvelope,
  jsonResponse,
  optionsResponse,
} from '../_shared/http.ts';
import {
  accountDeletionConfirmation,
  isValidDeletionConfirmation,
} from '../_shared/privacy.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'POST') {
    return jsonResponse(errorEnvelope('METHOD_NOT_ALLOWED', 'POST required'), 405);
  }
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse(errorEnvelope('AUTH_REQUIRED', 'Missing authorization'), 401);
  }

  const body = await request.json().catch(() => ({}));
  if (!isValidDeletionConfirmation(body.confirmation)) {
    return jsonResponse(
      errorEnvelope(
        'CONFIRMATION_REQUIRED',
        `Type exactly: ${accountDeletionConfirmation}`,
      ),
      400,
    );
  }

  const supabase = createServiceClient();
  const { data: authData, error: authError } = await supabase.auth.getUser(
    authHeader.replace(/^Bearer\s+/i, ''),
  );
  if (authError || !authData.user) {
    return jsonResponse(errorEnvelope('AUTH_REQUIRED', 'Invalid session'), 401);
  }

  const requestId = crypto.randomUUID();
  const userIdHash = await sha256(authData.user.id);
  const { data: audit, error: auditError } = await supabase
    .from('account_deletion_audit')
    .insert({
      user_id_hash: userIdHash,
      request_id: requestId,
    })
    .select('id')
    .single();
  if (auditError) {
    return jsonResponse(errorEnvelope('DATABASE_ERROR', auditError.message), 500);
  }

  const { error: deletionError } = await supabase.auth.admin.deleteUser(
    authData.user.id,
  );
  if (deletionError) {
    return jsonResponse(
      errorEnvelope('ACCOUNT_DELETION_FAILED', deletionError.message),
      500,
    );
  }

  await supabase
    .from('account_deletion_audit')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', audit.id);

  return jsonResponse(envelope({
    deleted: true,
    requestId,
    completedAt: new Date().toISOString(),
  }));
});

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
