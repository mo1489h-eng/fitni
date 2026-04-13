import { LayoutTemplate, Trash2 } from "lucide-react";

import type { SavedWorkoutTemplate } from "@/stores/templateStore";
import { useWorkoutBuilderStore } from "@/stores/workoutBuilderStore";
import { useTemplateStore } from "@/stores/templateStore";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function TemplatesGalleryModal({ open, onOpenChange }: Props) {
  const templates = useTemplateStore((s) => s.templates);
  const removeTemplate = useTemplateStore((s) => s.removeTemplate);
  const getHydratedProgram = useTemplateStore((s) => s.getHydratedProgram);
  const replaceActiveWeekFromProgram = useWorkoutBuilderStore((s) => s.replaceActiveWeekFromProgram);

  const apply = (t: SavedWorkoutTemplate) => {
    const program = getHydratedProgram(t.id);
    if (!program) {
      toast.error("تعذر تحميل القالب");
      return;
    }
    const res = replaceActiveWeekFromProgram(program);
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success("تم تطبيق القالب", { description: t.name });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-hidden" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-primary" strokeWidth={1.5} />
            قوالبي المحفوظة
          </DialogTitle>
          <DialogDescription>
            تطبيق قالب يستبدل الأسبوع الحالي في المحرر ويولّد معرفات جديدة.
          </DialogDescription>
        </DialogHeader>
        <ul className="max-h-[55vh] space-y-2 overflow-y-auto pe-1">
          {templates.length === 0 ? (
            <li className="py-10 text-center text-sm text-muted-foreground">لا توجد قوالب بعد</li>
          ) : (
            templates.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card/80 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{t.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(t.savedAt).toLocaleString("ar-SA")}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{t.program.title}</p>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <Button type="button" size="sm" onClick={() => apply(t)}>
                    تطبيق
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      removeTemplate(t.id);
                      toast.message("تم الحذف");
                    }}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                  </Button>
                </div>
              </li>
            ))
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
