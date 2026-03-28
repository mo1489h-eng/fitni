import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, UserCheck, Users } from "lucide-react";

interface AssignTemplateModalProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  template: {
    id: string;
    name: string;
    duration_weeks: number;
    program_data: any;
  };
}

const AssignTemplateModal = ({ open, onOpenChange, template }: AssignTemplateModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name, program_id");
      return data || [];
    },
    enabled: !!user && open,
  });

  const filtered = search
    ? clients.filter((c: any) => c.name.includes(search))
    : clients;

  const handleAssign = async () => {
    if (!selectedClientId || !user) return;
    setAssigning(true);
    try {
      const programData = typeof template.program_data === 'string'
        ? JSON.parse(template.program_data)
        : template.program_data || [];

      // Create program from template
      const { data: program, error: pErr } = await supabase
        .from("programs")
        .insert({
          trainer_id: user.id,
          name: template.name,
          weeks: template.duration_weeks,
        })
        .select().single();
      if (pErr) throw pErr;

      // Insert days and exercises from program_data
      for (let i = 0; i < programData.length; i++) {
        const day = programData[i];
        const { data: savedDay, error: dErr } = await supabase
          .from("program_days")
          .insert({
            program_id: program.id,
            day_name: day.dayName || `اليوم ${i + 1}`,
            day_order: i,
          })
          .select().single();
        if (dErr) throw dErr;

        const exercises = day.exercises || [];
        if (exercises.length > 0) {
          const exToInsert = exercises.map((ex: any, idx: number) => ({
            day_id: savedDay.id,
            name: ex.name,
            sets: ex.sets || 3,
            reps: ex.reps || 10,
            weight: ex.weight || 0,
            exercise_order: idx,
            rest_seconds: ex.rest_seconds || 60,
            tempo: ex.tempo || null,
            rpe: ex.rpe || null,
            notes: ex.notes || null,
            video_url: ex.video_url || null,
            is_warmup: ex.is_warmup || false,
          }));
          const { error: eErr } = await supabase.from("program_exercises").insert(exToInsert);
          if (eErr) throw eErr;
        }
      }

      // Assign to client
      await supabase.from("clients").update({ program_id: program.id }).eq("id", selectedClientId);

      // Increment use_count
      await supabase.from("program_templates").update({
        use_count: (template as any).use_count ? (template as any).use_count + 1 : 1
      }).eq("id", template.id);

      queryClient.invalidateQueries({ queryKey: ["programs"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["program-templates"] });
      toast({ title: "تم تعيين البرنامج للعميل بنجاح ✅" });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            تعيين "{template.name}" لعميل
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="ابحث عن عميل..." value={search} onChange={e => setSearch(e.target.value)} className="pr-10" />
          </div>

          <div className="max-h-64 overflow-y-auto space-y-1">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">لا يوجد عملاء</p>
            ) : filtered.map((client: any) => (
              <button
                key={client.id}
                onClick={() => setSelectedClientId(client.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all ${
                  selectedClientId === client.id
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "hover:bg-muted/50 text-foreground"
                }`}
              >
                <span className="font-medium">{client.name}</span>
                {selectedClientId === client.id && <UserCheck className="w-4 h-4" />}
                {client.program_id && selectedClientId !== client.id && (
                  <span className="text-[10px] text-muted-foreground">لديه برنامج</span>
                )}
              </button>
            ))}
          </div>

          <Button className="w-full gap-2" onClick={handleAssign} disabled={!selectedClientId || assigning}>
            {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
            تعيين مباشر
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AssignTemplateModal;
