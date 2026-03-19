import { useState, useEffect } from "react";
import TrainerLayout from "@/components/TrainerLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Inbox, Check, X, MapPin, Target, Mail, Phone, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const LeadsInbox = () => {
  const { user } = useAuth();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user) fetchMatches(); }, [user]);

  const fetchMatches = async () => {
    const { data } = await supabase.from("client_matches").select("*, client_intakes(*)").eq("trainer_id", user!.id).order("created_at", { ascending: false });
    setMatches(data || []); setLoading(false);
  };

  const updateStatus = async (matchId: string, status: string) => {
    const { error } = await supabase.from("client_matches").update({ status } as any).eq("id", matchId);
    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    toast({ title: status === "accepted" ? "تم القبول" : "تم الرفض" });
    fetchMatches();
  };

  const statusLabel = (s: string) => ({ pending: "جديد", accepted: "مقبول", rejected: "مرفوض", converted: "تم التحويل" }[s] || s);
  const statusVariant = (s: string): "default" | "secondary" | "outline" | "destructive" =>
    ({ pending: "default" as const, accepted: "secondary" as const, rejected: "destructive" as const, converted: "outline" as const }[s] || "default" as const);

  return (
    <TrainerLayout>
      <div className="space-y-5" dir="rtl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Inbox className="w-6 h-6 text-primary" strokeWidth={1.5} />
            <h1 className="text-2xl font-bold text-foreground">العملاء المحتملين</h1>
          </div>
          <Badge variant="outline" className="border-[hsl(0_0%_10%)]">{matches.filter(m => m.status === "pending").length} جديد</Badge>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : matches.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Inbox className="w-12 h-12 text-muted-foreground/30 mx-auto" strokeWidth={1.5} />
            <p className="text-muted-foreground">لا توجد طلبات بعد</p>
            <p className="text-sm text-muted-foreground">فعّل ملفك في الإعدادات ليظهر في محرك البحث</p>
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map(m => {
              const intake = (m as any).client_intakes;
              return (
                <div key={m.id} className={`bg-[hsl(0_0%_6%)] rounded-xl border p-5 space-y-3 transition-all duration-200 ${m.status === "pending" ? "border-primary/30" : "border-[hsl(0_0%_10%)]"}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-lg text-foreground">{intake?.name || "—"}</h3>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
                        {intake?.city && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" strokeWidth={1.5} />{intake.city}</span>}
                        {intake?.goal && <span className="flex items-center gap-1"><Target className="w-3.5 h-3.5" strokeWidth={1.5} />{intake.goal}</span>}
                        <span>{intake?.training_mode === "online" ? "أونلاين" : intake?.training_mode === "in_person" ? "حضوري" : "كلاهما"}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-[hsl(0_0%_10%)]">{Math.round(m.match_score)}% تطابق</Badge>
                      <Badge variant={statusVariant(m.status)}>{statusLabel(m.status)}</Badge>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span>الميزانية: {intake?.budget_min}-{intake?.budget_max} ر.س/شهر</span>
                    {intake?.notes && <p className="mt-1">{intake.notes}</p>}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {intake?.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" strokeWidth={1.5} />{intake.email}</span>}
                    {intake?.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" strokeWidth={1.5} />{intake.phone}</span>}
                  </div>
                  {m.status === "pending" && (
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" onClick={() => updateStatus(m.id, "accepted")} className="gap-1"><Check className="w-4 h-4" strokeWidth={1.5} />قبول</Button>
                      <Button size="sm" variant="outline" className="gap-1 bg-transparent border-[hsl(0_0%_10%)]" onClick={() => updateStatus(m.id, "rejected")}><X className="w-4 h-4" strokeWidth={1.5} />رفض</Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </TrainerLayout>
  );
};

export default LeadsInbox;
