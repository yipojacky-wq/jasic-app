export const accountDeletionConfirmation = 'DELETE JASIC ACCOUNT';

export function isValidDeletionConfirmation(value: unknown) {
  return value === accountDeletionConfirmation;
}
