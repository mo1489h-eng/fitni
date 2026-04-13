import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  onClick: () => void;
  disabled?: boolean;
};

export function AddExerciseButton({ onClick, disabled }: Props) {
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full gap-2 border-dashed border-border bg-transparent text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
      onClick={onClick}
      disabled={disabled}
    >
      <Plus className="h-4 w-4" strokeWidth={1.5} />
      إضافة تمرين
    </Button>
  );
}
