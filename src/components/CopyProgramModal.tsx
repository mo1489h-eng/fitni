import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Users, Search, Loader2, CheckCircle, AlertTriangle, CalendarDays } from "lucide-react";
import { formatArabicLongDate, parseStartDate, todayISODate } from "@/lib/programStartDate";

interface Client {
  id: string;
  name: string;
  program_id: string | null;
}

interface Program {
  id: string;
  name: string;
}

interface CopyProgramModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  program: Program;
  clients: Client[];
  programs: Program[];
}

type Step = "select" | "confirm" | "done";

const CopyProgramModal = ({ open, onOpenChange, program, clients, programs }: CopyProgramModalProps) => {
  const [step, setStep] = useState<Step>("select");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "no_program">("all");
  const [loading, setLoading] = useState(false);
  const [skipExisting, setSkipExisting] = useState(false);
  const [resultCount, setResultCount] = useState(0);
  const [startDate, setStartDate] = useState<string>(todayISODate());
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const filteredClients = useMemo(() => {
    let list = clients;
    if (filter === "no_program") list = list.filter((c) => !c.program_id);
    if (search.trim()) list = list.filter((c) => c.name.includes(search.trim()));
    return list;
  }, [clients, filter, search]);

  const selectedClients = clients.filter((c) => selectedIds.has(c.id));
  const clientsWithProgram = selectedClients.filter((c) => c.program_id && c.program_id !== program.id);
  const clientsWithoutProgram = selectedClients.filter((c) => !c.program_id || c.program_id === program.id);

  const toggleAll = () => {
    if (selectedIds.size === filteredClients.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredClients.map((c) => c.id)));
    }
  };

  const toggle = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const getProgramName = (programId: string | null) => {
    if (!programId) return null;
    return programs.find((p) => p.id === programId)?.name || null;
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      let toAssign = selectedClients;
      if (skipExisting) {
        toAssign = clientsWithoutProgram;
      }

      if (toAssign.length === 0) {
        toast({ title: "لا يوجد عملاء للتعيين" });
        return;
      }

      const ids = toAssign.map((c) => c.id);
      const effectiveStart = startDate || todayISODate();
      const { error } = await supabase
        .from("clients")
        .update({
          program_id: program.id,
          program_start_date: effectiveStart,
        } as never)
        .in("id", ids);
      if (error) throw error;

      setResultCount(toAssign.length);
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setStep("done");
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep("select");
      setSelectedIds(new Set());
      setSearch("");
      setFilter("all");
      setSkipExisting(false);
      setStartDate(todayISODate());
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            {step === "select" && "اختر العملاء لنسخ البرنامج لهم"}
            {step === "confirm" && "تأكيد النسخ"}
            {step === "done" && "تم بنجاح"}
          </DialogTitle>
        </DialogHeader>

        {/* STEP 1: Select */}
        {step === "select" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">برنامج: <span className="font-medium text-foreground">{program.name}</span></p>

            {/* Start date */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarDays className="w-3.5 h-3.5" />
                تاريخ بداية البرنامج
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value || todayISODate())}
              />
              {startDate && (() => {
                const d = parseStartDate(startDate);
                return d ? (
                  <p className="text-[10px] text-muted-foreground">
                    يبدأ {formatArabicLongDate(d)}
                  </p>
                ) : null;
              })()}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="ابحث عن عميل..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10"
              />
            </div>

            {/* Filter */}
            <div className="flex gap-2">
              <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")} className="text-xs">
                الكل
              </Button>
              <Button size="sm" variant={filter === "no_program" ? "default" : "outline"} onClick={() => setFilter("no_program")} className="text-xs">
                بدون برنامج
              </Button>
            </div>

            {/* Select all */}
            <label className="flex items-center gap-2 p-2 rounded-lg bg-secondary cursor-pointer">
              <Checkbox
                checked={filteredClients.length > 0 && selectedIds.size === filteredClients.length}
                onCheckedChange={toggleAll}
              />
              <span className="text-sm font-medium text-foreground">تحديد الكل ({filteredClients.length})</span>
            </label>

            {/* Client list */}
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {filteredClients.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">لا يوجد عملاء</p>
              ) : (
                filteredClients.map((c) => {
                  const progName = getProgramName(c.program_id);
                  return (
                    <label
                      key={c.id}
                      className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                        selectedIds.has(c.id) ? "bg-primary/5 border border-primary/20" : "border border-transparent hover:bg-secondary"
                      }`}
                    >
                      <Checkbox checked={selectedIds.has(c.id)} onCheckedChange={() => toggle(c.id)} />
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-primary">{c.name.slice(0, 2)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                        {progName && (
                          <p className="text-[10px] text-muted-foreground truncate">{progName}</p>
                        )}
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            <Button
              className="w-full"
              disabled={selectedIds.size === 0}
              onClick={() => setStep("confirm")}
            >
              التالي ({selectedIds.size} عميل)
            </Button>
          </div>
        )}

        {/* STEP 2: Confirm */}
        {step === "confirm" && (
          <div className="space-y-4">
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 text-center space-y-1">
              <p className="text-sm font-medium text-foreground">
                سيتم نسخ برنامج <span className="text-primary font-bold">{program.name}</span> لـ {selectedClients.length} عميل
              </p>
              {(() => {
                const d = parseStartDate(startDate);
                return d ? (
                  <p className="text-[11px] text-muted-foreground">
                    يبدأ {formatArabicLongDate(d)}
                  </p>
                ) : null;
              })()}
            </div>

            {clientsWithProgram.length > 0 && (
              <div className="rounded-lg bg-warning/5 border border-warning/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  <p className="text-sm font-bold text-foreground">{clientsWithProgram.length} عملاء لديهم برنامج حالي</p>
                </div>
                <div className="space-y-1 mb-3">
                  {clientsWithProgram.slice(0, 5).map((c) => (
                    <p key={c.id} className="text-xs text-muted-foreground">
                      {c.name} — {getProgramName(c.program_id)}
                    </p>
                  ))}
                  {clientsWithProgram.length > 5 && (
                    <p className="text-xs text-muted-foreground">و {clientsWithProgram.length - 5} آخرين...</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => { setSkipExisting(false); handleConfirm(); }} disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "استبدل"}
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => { setSkipExisting(true); handleConfirm(); }} disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "تخطَّ هؤلاء"}
                  </Button>
                </div>
              </div>
            )}

            {clientsWithProgram.length === 0 && (
              <Button className="w-full" onClick={handleConfirm} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : `تأكيد النسخ لـ ${selectedClients.length} عميل`}
              </Button>
            )}

            <Button variant="ghost" className="w-full" onClick={() => setStep("select")}>
              رجوع
            </Button>
          </div>
        )}

        {/* STEP 3: Done */}
        {step === "done" && (
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <p className="text-lg font-bold text-foreground">تم نسخ البرنامج لـ {resultCount} عميل بنجاح</p>
            <Button className="w-full" onClick={handleClose}>إغلاق</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CopyProgramModal;
