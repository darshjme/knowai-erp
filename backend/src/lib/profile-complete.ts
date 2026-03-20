/**
 * Shared profileComplete calculation — single source of truth.
 *
 * A user's profile is "complete" when ALL 8 mandatory fields are filled:
 *   1. firstName    5. city
 *   2. lastName     6. country
 *   3. phone        7. about
 *   4. address      8. alternateEmail
 *
 * Used by:
 *   - POST /api/onboarding (on completion)
 *   - POST /api/profile-setup (on incremental updates)
 */

interface ProfileFields {
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  about?: string | null;
  alternateEmail?: string | null;
}

export function isProfileComplete(fields: ProfileFields): boolean {
  return !!(
    fields.firstName?.trim() &&
    fields.lastName?.trim() &&
    fields.phone?.trim() &&
    fields.address?.trim() &&
    fields.city?.trim() &&
    fields.country?.trim() &&
    fields.about?.trim() &&
    fields.alternateEmail?.trim()
  );
}
