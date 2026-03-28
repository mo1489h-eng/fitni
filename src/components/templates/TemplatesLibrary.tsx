import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookOpen } from "lucide-react";
import TemplateCard from "./TemplateCard";
import TemplatePreviewPanel from "./TemplatePreviewPanel";
import AssignTemplateModal from "./AssignTemplateModal";

const CATEGORIES = ["الكل", "تخسيس", "بناء عضلات", "قوة", "لياقة عامة", "تأهيل", "رياضي"];

interface TemplatesLibraryProps {
  /** If provided, only shows assign action for this client */
  forClientId?: string;
  /** Callback when template is assigned to a client */
  onAssigned?: () => void;
}

const TemplatesLibrary = ({ forClientId, onAssigned }: TemplatesLibraryProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"mine" | "coachbase">("mine");
  const [filter, setFilter] = useState("الكل");
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const [assignTemplate, setAssignTemplate] = useState<any>(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["program-templates", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("program_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const myTemplates = templates.filter((t: any) => t.trainer_id === user?.id);
  const coachbaseTemplates = templates.filter((t: any) => t.is_system || (t.is_public && t.trainer_id !== user?.id));

  const currentList = tab === "mine" ? myTemplates : coachbaseTemplates;
  const filteredList = filter === "الكل" ? currentList : currentList.filter((t: any) => t.category === filter);

  const handleDuplicate = async (template: any) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("program_templates").insert({
        trainer_id: user.id,
        name: template.name + " (نسخة)",
        category: template.category,
        level: template.level,
        duration_weeks: template.duration_weeks,
        days_per_week: template.days_per_week,
        description: template.description,
        program_data: template.program_data,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["program-templates"] });
      toast({ title: "تم نسخ القالب ✅" });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("program_templates").delete().eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["program-templates"] });
      toast({ title: "تم حذف القالب" });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const handleAssignForClient = async (template: any) => {
    if (!forClientId || !user) return;
    try {
      const programData = typeof template.program_data === 'string'
        ? JSON.parse(template.program_data)
        : template.program_data || [];

      const { data: program, error: pErr } = await supabase
        .from("programs")
        .insert({ trainer_id: user.id, name: template.name, weeks: template.duration_weeks })
        .select().single();
      if (pErr) throw pErr;

      for (let i = 0; i < programData.length; i++) {
        const day = programData[i];
        const { data: savedDay, error: dErr } = await supabase
          .from("program_days")
          .insert({ program_id: program.id, day_name: day.dayName || `اليوم ${i + 1}`, day_order: i })
          .select().single();
        if (dErr) throw dErr;

        const exercises = day.exercises || [];
        if (exercises.length > 0) {
          const exToInsert = exercises.map((ex: any, idx: number) => ({
            day_id: savedDay.id, name: ex.name, sets: ex.sets || 3, reps: ex.reps || 10,
            weight: ex.weight || 0, exercise_order: idx, rest_seconds: ex.rest_seconds || 60,
            tempo: ex.tempo || null, rpe: ex.rpe || null, notes: ex.notes || null,
            video_url: ex.video_url || null, is_warmup: ex.is_warmup || false,
          }));
          await supabase.from("program_exercises").insert(exToInsert);
        }
      }

      await supabase.from("clients").update({ program_id: program.id }).eq("id", forClientId);
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "تم تعيين البرنامج للعميل ✅" });
      onAssigned?.();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
        <button
          onClick={() => setTab("mine")}
          className={`flex-1 text-sm font-medium py-2 rounded-md transition-all ${tab === "mine" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          قوالبي ({myTemplates.length})
        </button>
        <button
          onClick={() => setTab("coachbase")}
          className={`flex-1 text-sm font-medium py-2 rounded-md transition-all ${tab === "coachbase" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          قوالب CoachBase ({coachbaseTemplates.length})
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map(c => (
          <Badge
            key={c}
            variant="outline"
            className={`cursor-pointer text-xs whitespace-nowrap transition-all ${filter === c ? "bg-primary/10 text-primary border-primary/30" : "opacity-60 hover:opacity-100"}`}
            onClick={() => setFilter(c)}
          >
            {c}
          </Badge>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : filteredList.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <BookOpen className="w-7 h-7 text-primary" />
          </div>
          <h3 className="text-sm font-bold text-foreground">
            {tab === "mine" ? "لم تحفظ قوالب بعد" : "لا توجد قوالب حالياً"}
          </h3>
          <p className="text-xs text-muted-foreground">
            {tab === "mine" ? "احفظ أي برنامج كقالب من محرر البرامج" : "ستتوفر قوالب جاهزة قريباً"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredList.map((t: any) => (
            <TemplateCard
              key={t.id}
              template={t}
              isOwn={t.trainer_id === user?.id}
              onPreview={() => setPreviewTemplate(t)}
              onAssign={() => forClientId ? handleAssignForClient(t) : setAssignTemplate(t)}
              onDuplicate={() => handleDuplicate(t)}
              onDelete={t.trainer_id === user?.id ? () => handleDelete(t.id) : undefined}
            />
          ))}
        </div>
      )}

      {/* Preview Panel */}
      <TemplatePreviewPanel
        open={!!previewTemplate}
        onOpenChange={o => { if (!o) setPreviewTemplate(null); }}
        template={previewTemplate}
        onAssign={() => {
          const t = previewTemplate;
          setPreviewTemplate(null);
          if (forClientId) {
            handleAssignForClient(t);
          } else {
            setAssignTemplate(t);
          }
        }}
      />

      {/* Assign Modal */}
      {assignTemplate && (
        <AssignTemplateModal
          open={!!assignTemplate}
          onOpenChange={o => { if (!o) setAssignTemplate(null); }}
          template={assignTemplate}
        />
      )}
    </div>
  );
};

export default TemplatesLibrary;
