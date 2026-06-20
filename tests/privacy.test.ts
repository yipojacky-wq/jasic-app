import assert from 'node:assert/strict';
import test from 'node:test';

import {
  accountDeletionConfirmation,
  isValidDeletionConfirmation,
} from '../supabase/functions/_shared/privacy.ts';

test('account deletion requires an exact explicit phrase', () => {
  assert.equal(
    isValidDeletionConfirmation(accountDeletionConfirmation),
    true,
  );
  assert.equal(isValidDeletionConfirmation('delete jasic account'), false);
  assert.equal(isValidDeletionConfirmation('DELETE JASIC'), false);
  assert.equal(isValidDeletionConfirmation(undefined), false);
});
