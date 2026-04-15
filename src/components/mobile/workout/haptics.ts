import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

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

/** Success notification — e.g. set completed */
export async function hapticSuccess(): Promise<void> {
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([12, 40, 12]);
      }
    } catch {
      /* ignore */
    }
  }
}
