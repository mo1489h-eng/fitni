import { useState, useEffect } from "react";
import TrainerLayout from "@/components/TrainerLayout";
import UpgradeModal from "@/components/UpgradeModal";
import TrialBanner from "@/components/TrialBanner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Trophy, Plus, CalendarDays, Medal, Lock, Banknote, Gift, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Challenges = () => {
  const { user } = useAuth();
  const { hasChallengesAccess, getProFeatureBlockReason } = usePlanLimits();
  const [challenges, setChallenges] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showAddP, setShowAddP] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: "", description: "", challenge_type: "weight_loss",
    start_date: "", end_date: "", entry_fee: 0,
    prize_description: "", kpi_unit: "كجم", max_participants: 50
  });

  useEffect(() => { if (user && hasChallengesAccess) { fetchChallenges(); fetchClients(); } }, [user, hasChallengesAccess]);

  const fetchChallenges = async () => {
    const { data } = await supabase.from("challenges").select("*").eq("trainer_id", user!.id).order("created_at", { ascending: false });
    setChallenges(data || []); setLoading(false);
  };

  const fetchClients = async () => {
    const { data } = await supabase.from("clients").select("id, name").eq("trainer_id", user!.id);
    setClients(data || []);
  };

  const fetchParticipants = async (cid: string) => {
    const { data } = await supabase.from("challenge_participants").select("*, clients(name)").eq("challenge_id", cid).order("current_value", { ascending: true });
    setParticipants(data || []);
  };

  const handleCreate = async () => {
    if (!user || !form.title || !form.start_date || !form.end_date) return;
    const { error } = await supabase.from("challenges").insert({
      trainer_id: user.id, title: form.title, description: form.description,
      challenge_type: form.challenge_type, start_date: form.start_date, end_date: form.end_date,
      entry_fee: form.entry_fee, prize_description: form.prize_description,
      kpi_unit: form.kpi_unit, max_participants: form.max_participants
    } as any);
    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    toast({ title: "تم إنشاء التحدي بنجاح" });
    setShowCreate(false);
    setForm({ title: "", description: "", challenge_type: "weight_loss", start_date: "", end_date: "", entry_fee: 0, prize_description: "", kpi_unit: "كجم", max_participants: 50 });
    fetchChallenges();
  };

  const addParticipant = async (clientId: string) => {
    if (!selected) return;
    const { error } = await supabase.from("challenge_participants").insert({ challenge_id: selected.id, client_id: clientId } as any);
    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    toast({ title: "تمت الإضافة بنجاح" });
    fetchParticipants(selected.id); setShowAddP(false);
  };

  const updateEntry = async (participantId: string, value: number) => {
    await supabase.from("challenge_entries").insert({ participant_id: participantId, value } as any);
    await supabase.from("challenge_participants").update({ current_value: value } as any).eq("id", participantId);
    if (selected) fetchParticipants(selected.id);
    toast({ title: "تم التحديث" });
  };

  const statusBadge = (s: string) => s === "active" ? "default" : s === "upcoming" ? "secondary" : "outline";
  const statusText = (s: string) => s === "active" ? "نشط" : s === "upcoming" ? "قادم" : "منتهي";
  const typeText = (t: string) => ({ weight_loss: "خسارة وزن", consistency: "الانتظام", steps: "خطوات", workout: "تمارين" }[t] || t);

  if (!hasChallengesAccess) {
    return (
      <TrainerLayout>
        <div className="space-y-4 py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-warning" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-bold text-foreground">التحديات الجماعية</h1>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">هذه الميزة للباقة الاحترافية</p>
          <Button onClick={() => setShowUpgrade(true)}>ترقية للاحترافي</Button>
          <UpgradeModal
            open={showUpgrade}
            onOpenChange={setShowUpgrade}
            title={getProFeatureBlockReason().title}
            description={getProFeatureBlockReason().description}
            ctaText="ترقية للاحترافي"
            secondaryText="لاحقاً"
            onUpgrade={() => { setShowUpgrade(false); setShowPlans(true); }}
          />
          <TrialBanner showPlans={showPlans} onShowPlansChange={setShowPlans} />
        </div>
      </TrainerLayout>
    );
  }

  return (
    <TrainerLayout>
      <div className="space-y-5" dir="rtl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-6 h-6 text-primary" strokeWidth={1.5} />
            <h1 className="text-2xl font-bold text-foreground">التحديات</h1>
          </div>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" strokeWidth={1.5} />تحدي جديد</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-[hsl(0_0%_6%)] border-[hsl(0_0%_10%)]">
              <DialogHeader><DialogTitle className="text-foreground">إنشاء تحدي جديد</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>اسم التحدي</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="تحدي الـ 30 يوم" className="bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)]" /></div>
                <div><Label>الوصف</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)]" /></div>
                <div><Label>نوع التحدي</Label>
                  <Select value={form.challenge_type} onValueChange={v => setForm(f => ({ ...f, challenge_type: v }))}>
                    <SelectTrigger className="bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weight_loss">خسارة وزن</SelectItem>
                      <SelectItem value="consistency">الانتظام</SelectItem>
                      <SelectItem value="steps">خطوات</SelectItem>
                      <SelectItem value="workout">إكمال تمارين</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>تاريخ البدء</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)]" /></div>
                  <div><Label>تاريخ الانتهاء</Label><Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className="bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)]" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>رسوم الاشتراك (ر.س)</Label><Input type="number" value={form.entry_fee} onChange={e => setForm(f => ({ ...f, entry_fee: +e.target.value }))} className="bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)]" /></div>
                  <div><Label>أقصى عدد مشاركين</Label><Input type="number" value={form.max_participants} onChange={e => setForm(f => ({ ...f, max_participants: +e.target.value }))} className="bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)]" /></div>
                </div>
                <div><Label>الجائزة</Label><Input value={form.prize_description} onChange={e => setForm(f => ({ ...f, prize_description: e.target.value }))} placeholder="شهر تدريب مجاني" className="bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)]" /></div>
                <Button onClick={handleCreate} className="w-full">إنشاء التحدي</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {selected ? (
          <div className="space-y-4">
            <Button variant="ghost" onClick={() => { setSelected(null); setParticipants([]); }} className="gap-2 text-muted-foreground hover:text-foreground">
              <ArrowRight className="w-4 h-4" strokeWidth={1.5} />العودة للتحديات
            </Button>
            <div className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] border-t-2 border-t-primary p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground">{selected.title}</h2>
                <Badge variant={statusBadge(selected.status) as any}>{statusText(selected.status)}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{selected.description}</p>
              <div className="flex gap-3 text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" strokeWidth={1.5} />{selected.start_date} → {selected.end_date}</span>
                {selected.entry_fee > 0 && <span className="flex items-center gap-1"><Banknote className="w-3.5 h-3.5" strokeWidth={1.5} />{selected.entry_fee} ر.س</span>}
              </div>

              <div className="border-t border-[hsl(0_0%_10%)] pt-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-foreground flex items-center gap-2"><Medal className="w-4 h-4 text-primary" strokeWidth={1.5} />المتصدرين ({participants.length})</h3>
                  <Dialog open={showAddP} onOpenChange={setShowAddP}>
                    <DialogTrigger asChild><Button size="sm" variant="outline" className="gap-1 bg-transparent border-[hsl(0_0%_10%)]"><Plus className="w-4 h-4" strokeWidth={1.5} />إضافة مشارك</Button></DialogTrigger>
                    <DialogContent className="bg-[hsl(0_0%_6%)] border-[hsl(0_0%_10%)]">
                      <DialogHeader><DialogTitle className="text-foreground">إضافة مشارك</DialogTitle></DialogHeader>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {clients.map(c => (
                          <Button key={c.id} variant="ghost" className="w-full justify-start hover:bg-[hsl(0_0%_10%)]" onClick={() => addParticipant(c.id)}>{c.name}</Button>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                {participants.length === 0 ? (
                  <div className="text-center py-8">
                    <Medal className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" strokeWidth={1.5} />
                    <p className="text-muted-foreground text-sm">لا يوجد مشاركين بعد</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {participants.map((p, i) => (
                      <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-[hsl(0_0%_4%)] border border-[hsl(0_0%_10%)]">
                        <div className="flex items-center gap-3">
                          <span className={`font-bold text-lg tabular-nums ${i === 0 ? "text-amber-400" : i === 1 ? "text-muted-foreground" : i === 2 ? "text-primary" : "text-muted-foreground"}`}>#{i + 1}</span>
                          <span className="font-medium text-foreground">{(p as any).clients?.name || "—"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground tabular-nums">{p.current_value} {selected.kpi_unit}</span>
                          <Input type="number" className="w-20 h-8 text-sm bg-[hsl(0_0%_6%)] border-[hsl(0_0%_10%)]" placeholder="قيمة"
                            onKeyDown={e => { if (e.key === "Enter") updateEntry(p.id, +(e.target as HTMLInputElement).value); }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : challenges.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto" strokeWidth={1.5} />
              <p className="text-muted-foreground">لا توجد تحديات بعد</p>
              <p className="text-sm text-muted-foreground">أنشئ أول تحدي لعملائك</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {challenges.map(c => (
                <div
                  key={c.id}
                  className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] p-5 space-y-3 cursor-pointer hover:border-primary/40 transition-all duration-200 hover:-translate-y-0.5"
                  onClick={() => { setSelected(c); fetchParticipants(c.id); }}
                >
                  <div className="flex items-start justify-between">
                    <h3 className="font-bold text-foreground">{c.title}</h3>
                    <Badge variant={statusBadge(c.status) as any}>{statusText(c.status)}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1"><Trophy className="w-3.5 h-3.5" strokeWidth={1.5} />{typeText(c.challenge_type)}</span>
                    <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" strokeWidth={1.5} />{c.start_date} → {c.end_date}</span>
                  </div>
                  {c.prize_description && <p className="text-sm text-foreground flex items-center gap-1.5"><Gift className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />{c.prize_description}</p>}
                  {c.entry_fee > 0 && <p className="text-sm text-primary flex items-center gap-1.5"><Banknote className="w-3.5 h-3.5" strokeWidth={1.5} />رسوم: {c.entry_fee} ر.س</p>}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </TrainerLayout>
  );
};

export default Challenges;
