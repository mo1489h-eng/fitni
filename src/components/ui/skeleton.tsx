import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Pulse placeholder; use logical spacing (`me-*`, `ps-*`) in parents for RTL-safe layouts.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}

export { Skeleton };
