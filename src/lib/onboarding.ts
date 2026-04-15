/** localStorage key — set when the user finishes onboarding (auth CTAs on last slide). */
export const ONBOARDING_STORAGE_KEY = "onboarding_done";

export function isOnboardingComplete(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
  } catch {
    return true;
  }
}

export function markOnboardingComplete(): void {
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
  } catch {
    /* ignore quota / private mode */
  }
}
