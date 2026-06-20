import type { UserProfile } from '../types';

export const currentTermsVersion = 'alpha-1.0';

export function hasAcceptedCurrentTerms(
  profile: Pick<UserProfile, 'termsAcceptedAt' | 'termsVersion'>,
) {
  return (
    profile.termsVersion === currentTermsVersion &&
    Boolean(profile.termsAcceptedAt)
  );
}
