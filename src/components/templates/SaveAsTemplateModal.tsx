import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookOpen } from "lucide-react";

const CATEGORIES = [
  { value: "تخسيس", color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  { value: "بناء عضلات", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  { value: "قوة", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  { value: "لياقة عامة", color: "bg-primary/10 text-primary border-primary/20" },
  { value: "تأهيل", color: "bg-primary/10 text-muted-foreground border-primary/20" },
  { value: "رياضي", color: "bg-red-500/10 text-red-400 border-red-500/20" },
];

interface SaveAsTemplateModalProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultName: string;
  defaultCategory?: string;
  defaultLevel?: string;
  onSave: (data: { name: string; category: string; level: string; description: string; isPublic: boolean }) => Promise<void>;
}

const SaveAsTemplateModal = ({ open, onOpenChange, defaultName, defaultCategory, defaultLevel, onSave }: SaveAsTemplateModalProps) => {
  const [name, setName] = useState(defaultName);
  const [category, setCategory] = useState(defaultCategory || "لياقة عامة");
  const [level, setLevel] = useState(defaultLevel || "متوسط");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);

  const LEVELS = ["مبتدئ", "متوسط", "متقدم"];

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), category, level, description, isPublic });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            حفظ كقالب
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">اسم القالب</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="اسم القالب..." />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">التصنيف</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(c => (
                <Badge
                  key={c.value}
                  variant="outline"
                  className={`cursor-pointer text-xs transition-all ${category === c.value ? c.color + " ring-1 ring-primary/50" : "opacity-60 hover:opacity-100"}`}
                  onClick={() => setCategory(c.value)}
                >
                  {c.value}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">المستوى</label>
            <div className="flex gap-1.5">
              {LEVELS.map(l => (
                <Badge
                  key={l}
                  variant="outline"
                  className={`cursor-pointer text-xs transition-all ${level === l ? "bg-primary/10 text-primary border-primary/20 ring-1 ring-primary/50" : "opacity-60 hover:opacity-100"}`}
                  onClick={() => setLevel(l)}
                >
                  {l}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">الوصف (اختياري)</label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="وصف مختصر للقالب..." rows={2} />
          </div>

          <div className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
            <div>
              <p className="text-sm font-medium text-foreground">مشاركة عامة</p>
              <p className="text-[10px] text-muted-foreground">يمكن للمدربين الآخرين رؤية واستخدام هذا القالب</p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>

          <Button className="w-full gap-2" onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
            حفظ القالب
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SaveAsTemplateModal;
