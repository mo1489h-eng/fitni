import { Haptics, ImpactStyle } from "@capacitor/haptics";

/** Capacitor Haptics with graceful web fallback */
export async function hapticImpact(style: "light" | "medium" | "heavy" = "medium"): Promise<void> {
  try {
    const map = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    };
    await Haptics.impact({ style: map[style] });
  } catch {
    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(style === "light" ? 8 : style === "heavy" ? 22 : 14);
      }
    } catch {
      /* ignore */
    }
  }
}

export async function hapticSuccess(): Promise<void> {
  await hapticImpact("medium");
}
