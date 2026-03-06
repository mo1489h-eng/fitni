import { useState, useEffect } from "react";
import TrainerLayout from "@/components/TrainerLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Inbox, Check, X, MapPin, Target } from "lucide-react";
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
    toast({ title: status === "accepted" ? "تم القبول ✅" : "تم الرفض" });
    fetchMatches();
  };

  const statusLabel = (s: string) => ({ pending: "جديد", accepted: "مقبول", rejected: "مرفوض", converted: "تم التحويل" }[s] || s);
  const statusVariant = (s: string): "default" | "secondary" | "outline" | "destructive" =>
    ({ pending: "default" as const, accepted: "secondary" as const, rejected: "destructive" as const, converted: "outline" as const }[s] || "default" as const);

  return (
    <TrainerLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Inbox className="w-6 h-6" />العملاء المحتملين</h1>
          <Badge variant="outline">{matches.filter(m => m.status === "pending").length} جديد</Badge>
        </div>

        {loading ? <p className="text-center text-muted-foreground py-12">جاري التحميل...</p> :
          matches.length === 0 ? (
            <div className="text-center py-16">
              <Inbox className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">لا توجد طلبات بعد</p>
              <p className="text-sm text-muted-foreground mt-1">فعّل ملفك في الإعدادات ليظهر في محرك البحث</p>
            </div>
          ) :
          <div className="space-y-4">
            {matches.map(m => {
              const intake = (m as any).client_intakes;
              return (
                <Card key={m.id} className={m.status === "pending" ? "border-primary/50" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{intake?.name || "—"}</h3>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
                          {intake?.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{intake.city}</span>}
                          {intake?.goal && <span className="flex items-center gap-1"><Target className="w-3 h-3" />{intake.goal}</span>}
                          <span>{intake?.training_mode === "online" ? "أونلاين" : intake?.training_mode === "in_person" ? "حضوري" : "كلاهما"}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{Math.round(m.match_score)}% تطابق</Badge>
                        <Badge variant={statusVariant(m.status)}>{statusLabel(m.status)}</Badge>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground mb-3">
                      <span>الميزانية: {intake?.budget_min}-{intake?.budget_max} ر.س/شهر</span>
                      {intake?.notes && <p className="mt-1">{intake.notes}</p>}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                      {intake?.email && <span>📧 {intake.email}</span>}
                      {intake?.phone && <span>📱 {intake.phone}</span>}
                    </div>
                    {m.status === "pending" && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => updateStatus(m.id, "accepted")}><Check className="w-4 h-4 ml-1" />قبول</Button>
                        <Button size="sm" variant="outline" onClick={() => updateStatus(m.id, "rejected")}><X className="w-4 h-4 ml-1" />رفض</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        }
      </div>
    </TrainerLayout>
  );
};

export default LeadsInbox;
