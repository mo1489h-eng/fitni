/** ~3 months; day-based avoids setMonth edge cases and matches admin analytics. */
export const FREE_TRIAL_DAYS = 91;

export function getTrialEndDate(profileCreatedAt: string | Date | null | undefined): Date {
  const created = profileCreatedAt
    ? typeof profileCreatedAt === "string"
      ? new Date(profileCreatedAt)
      : profileCreatedAt
    : new Date();
  return new Date(created.getTime() + FREE_TRIAL_DAYS * 24 * 60 * 60 * 1000);
}
