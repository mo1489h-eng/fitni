import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onUpgrade: () => void;
}

const UpgradeModal = ({ open, onOpenChange, title, description, onUpgrade }: UpgradeModalProps) => {
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
        <Button className="w-full" onClick={onUpgrade}>
          ترقية الآن
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeModal;
