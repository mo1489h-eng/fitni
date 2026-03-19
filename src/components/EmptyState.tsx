import { type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState = ({ icon: Icon, title, subtitle, actionLabel, onAction }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
    <Icon className="h-16 w-16 text-muted-foreground/20 mb-6" strokeWidth={1.5} />
    <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground mb-6 max-w-xs">{subtitle}</p>
    {actionLabel && onAction && (
      <Button onClick={onAction} size="lg">{actionLabel}</Button>
    )}
  </div>
);

export default EmptyState;
