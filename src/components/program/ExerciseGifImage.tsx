import { useState, useEffect, type ReactNode } from "react";
import { Dumbbell } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Phase = "loading" | "loaded" | "error";

interface Props {
  src: string;
  alt: string;
  className?: string;
  /** `object-contain` for previews, `object-cover` for list thumbs */
  objectFit?: "contain" | "cover";
  loading?: "eager" | "lazy";
  /** Shown when `src` is empty, load fails, or after error. Defaults to dumbbell icon. */
  errorFallback?: ReactNode;
  /** Default: omit (browser default). Use `no-referrer` for strict CDN hotlink rules. */
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
}

const defaultErrorFallback = (
  <div className="flex h-full w-full items-center justify-center bg-muted/60">
    <Dumbbell className="h-8 w-8 text-muted-foreground/55" strokeWidth={1.5} aria-hidden />
  </div>
);

/**
 * GIF from `{VITE_SUPABASE_URL}/functions/v1/exercise-gif?id=…&apikey=…` (see getExerciseImageUrl)
 * or absolute URLs. Loading: skeleton overlay; onError: dumbbell fallback.
 */
export function ExerciseGifImage({
  src,
  alt,
  className,
  objectFit = "cover",
  loading = "lazy",
  errorFallback = defaultErrorFallback,
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
        <Skeleton
          className="absolute inset-0 z-[1] h-full w-full rounded-[inherit]"
          aria-hidden
        />
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
