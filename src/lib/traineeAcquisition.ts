/** Auth user_metadata for trainee acquisition — server enforces role via profiles + compute_profile_role. */
export const traineeLandingSignupData = (fullName: string) => ({
  full_name: fullName.trim(),
  role: "trainee" as const,
  is_client: true,
  source: "landing" as const,
});

export const traineeInviteSignupData = (fullName: string) => ({
  full_name: fullName.trim(),
  role: "trainee" as const,
  is_client: true,
  source: "invite" as const,
});
