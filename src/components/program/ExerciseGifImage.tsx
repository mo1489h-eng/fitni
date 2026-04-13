import { useState, useEffect, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Phase = "loading" | "loaded" | "error";

interface Props {
  src: string;
  alt: string;
  className?: string;
  /** `object-contain` for previews, `object-cover` for list thumbs */
  objectFit?: "contain" | "cover";
  loading?: "eager" | "lazy";
  /** Shown when `src` is empty, load fails, or after error */
  errorFallback: ReactNode;
  /** Default: omit (browser default). Use `no-referrer` for strict CDN hotlink rules. */
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
}

/**
 * GIF from our `exercise-gif` Edge proxy (or absolute URLs).
 * Supabase GIFs use default referrer; some third-party CDN URLs may need `referrerPolicy="no-referrer"`.
 */
export function ExerciseGifImage({
  src,
  alt,
  className,
  objectFit = "cover",
  loading = "lazy",
  errorFallback,
  referrerPolicy,
}: Props) {
  const [phase, setPhase] = useState<Phase>(!src ? "error" : "loading");

  useEffect(() => {
    if (!src) {
      setPhase("error");
      return;
    }
    setPhase("loading");
  }, [src]);

  if (!src || phase === "error") {
    return <>{errorFallback}</>;
  }

  return (
    <div className="relative h-full w-full">
      {phase === "loading" && (
        <div
          className="absolute inset-0 z-[1] flex items-center justify-center bg-muted/50"
          aria-hidden
        >
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground/70" strokeWidth={1.5} />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        loading={loading}
        referrerPolicy={referrerPolicy}
        className={cn(className, phase === "loading" && "opacity-0")}
        style={{ objectFit }}
        onLoad={() => setPhase("loaded")}
        onError={() => {
          if (import.meta.env.DEV) {
            console.warn("[ExerciseGifImage] failed to load", src.slice(0, 120));
          }
          setPhase("error");
        }}
      />
    </div>
  );
}
