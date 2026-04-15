/** Lightweight inline SVGs for empty states (OLED-friendly). */

export function EmptyInboxIllustration({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect x="24" y="32" width="152" height="104" rx="16" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
      <path d="M48 56h104M48 72h72M48 88h96" stroke="rgba(161,161,170,0.5)" strokeWidth="4" strokeLinecap="round" />
      <circle cx="100" cy="118" r="22" stroke="rgba(34,197,94,0.35)" strokeWidth="2" />
      <path
        d="M92 118l6 6 12-14"
        stroke="rgba(34,197,94,0.85)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function EmptyChartIllustration({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M32 120V48h136v72" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
      <path
        d="M48 104l28-32 24 20 32-40 24 28"
        stroke="url(#g)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="g" x1="48" y1="104" x2="156" y2="72" gradientUnits="userSpaceOnUse">
          <stop stopColor="rgba(34,197,94,0.2)" />
          <stop offset="1" stopColor="rgba(34,197,94,0.85)" />
        </linearGradient>
      </defs>
      <circle cx="48" cy="104" r="4" fill="rgba(34,197,94,0.9)" />
      <circle cx="76" cy="72" r="4" fill="rgba(161,161,170,0.8)" />
      <circle cx="100" cy="92" r="4" fill="rgba(161,161,170,0.8)" />
      <circle cx="132" cy="52" r="4" fill="rgba(161,161,170,0.8)" />
      <circle cx="156" cy="80" r="4" fill="rgba(34,197,94,0.75)" />
    </svg>
  );
}
