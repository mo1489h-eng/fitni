import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Optional custom illustration (SVG). When set, shown instead of the Lucide icon. */
  illustration?: ReactNode;
}

const EmptyState = ({ icon: Icon, title, subtitle, actionLabel, onAction, illustration }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-16 md:py-20 text-center animate-fade-in px-4">
    {illustration ? (
      <div className="mb-6 w-44 max-w-full [&_svg]:mx-auto">{illustration}</div>
    ) : (
      <Icon className="h-16 w-16 text-muted-foreground/20 mb-6" strokeWidth={1.5} />
    )}
    <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
    <p className="text-sm text-zinc-400 mb-6 max-w-xs">{subtitle}</p>
    {actionLabel && onAction && (
      <Button onClick={onAction} size="lg" className="min-h-11 px-8">
        {actionLabel}
      </Button>
    )}
  </div>
);

export default EmptyState;
