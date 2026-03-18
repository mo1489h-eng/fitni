import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onUpgrade: () => void;
  ctaText?: string;
  secondaryText?: string;
}

const UpgradeModal = ({
  open,
  onOpenChange,
  title,
  description,
  onUpgrade,
  ctaText = "ترقية الآن",
  secondaryText = "لاحقاً",
}: UpgradeModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm text-center" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-warning/10 flex items-center justify-center">
              <Lock className="w-7 h-7 text-warning" />
            </div>
            {title}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{description}</p>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button className="w-full" onClick={onUpgrade}>
            {ctaText}
          </Button>
          <Button className="w-full" variant="ghost" onClick={() => onOpenChange(false)}>
            {secondaryText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeModal;
