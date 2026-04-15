/** CoachBase mobile workout — design tokens (strict) */
export const CB = {
  bg: "#0A0A0A",
  card: "#111111",
  card2: "#161616",
  accent: "#22C55E",
  accent2: "#16A34A",
  text: "#FFFFFF",
  muted: "#888888",
  caption: "#666666",
  gold: "#F59E0B",
  shadow: "0 4px 24px rgba(0,0,0,0.4)",
  radius: { sm: 8, md: 12, lg: 16 },
  font: { display: 32, title: 24, body: 16, caption: 12 },
  gradient: "linear-gradient(135deg, #22C55E, #16A34A)",
} as const;

/** Elite tier: 8pt grid alignment, OLED blacks, zinc hierarchy */
export const ELITE = {
  textPrimary: "#FFFFFF",
  textSecondary: "#A1A1AA",
  textTertiary: "#71717A",
  cardBg: "#0A0A0A",
  border: "1px solid rgba(255,255,255,0.05)",
  radiusCard: 20,
  innerShadow: "inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.45)",
  /** Spec: glass cards — rgba(10,10,10,0.8), blur 12px */
  glassBg: "rgba(10,10,10,0.8)",
  glassBlur: "blur(12px)",
} as const;
