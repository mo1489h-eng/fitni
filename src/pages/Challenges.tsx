import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TrainerLayout from "@/components/TrainerLayout";
import UpgradeModal from "@/components/UpgradeModal";
import TrialBanner from "@/components/TrialBanner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import usePageTitle from "@/hooks/usePageTitle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Trophy, Plus, CalendarDays, Medal, Lock, Banknote, Gift, ArrowRight, Loader2,
  Flame, Dumbbell, Activity, TrendingUp, Timer, Users, Crown, Check, ChevronLeft, ChevronRight,
  Share2, Copy, CheckCircle2
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

const CHALLENGE_TYPES = [
  { value: "weight_loss", label: "خسارة وزن", icon: Flame, unit: "كجم", color: "text-orange-400" },
  { value: "consistency", label: "التزام تدريبي", icon: Activity, unit: "يوم", color: "text-blue-400" },
  { value: "exercises", label: "عدد تمارين", icon: Dumbbell, unit: "تمرين", color: "text-purple-400" },
  { value: "strength", label: "قوة", icon: TrendingUp, unit: "كجم", color: "text-red-400" },
  { value: "duration", label: "مدة تمرين", icon: Timer, unit: "دقيقة", color: "text-cyan-400" },
];

const Challenges = () => {
  usePageTitle("التحديات الجماعية");
  const { user } = useAuth();
  const { hasChallengesAccess, getProFeatureBlockReason } = usePlanLimits();
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showAddP, setShowAddP] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [loading, setLoading] = useState(true);
  const [wizardStep, setWizardStep] = useState(1);
  const [tab, setTab] = useState("active");
  const [entryValues, setEntryValues] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    title: "", description: "", challenge_type: "weight_loss",
    start_date: "", end_date: "", entry_fee: 0,
    prize_description: "", kpi_unit: "كجم", max_participants: 50,
    kpi_metric: "weight_change"
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
    const typeInfo = CHALLENGE_TYPES.find(t => t.value === form.challenge_type);
    const { error } = await supabase.from("challenges").insert({
      trainer_id: user.id, title: form.title, description: form.description,
      challenge_type: form.challenge_type, start_date: form.start_date, end_date: form.end_date,
      entry_fee: form.entry_fee, prize_description: form.prize_description,
      kpi_unit: typeInfo?.unit || form.kpi_unit, kpi_metric: form.kpi_metric,
      max_participants: form.max_participants
    } as any);
    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    toast({ title: "تم إنشاء التحدي بنجاح" });
    setShowCreate(false);
    setWizardStep(1);
    setForm({ title: "", description: "", challenge_type: "weight_loss", start_date: "", end_date: "", entry_fee: 0, prize_description: "", kpi_unit: "كجم", max_participants: 50, kpi_metric: "weight_change" });
    fetchChallenges();
  };

  const addParticipant = async (clientId: string) => {
    if (!selected) return;
    const exists = participants.find(p => p.client_id === clientId);
    if (exists) { toast({ title: "المشارك موجود بالفعل", variant: "destructive" }); return; }
    const { error } = await supabase.from("challenge_participants").insert({ challenge_id: selected.id, client_id: clientId } as any);
    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    toast({ title: "تمت الإضافة بنجاح" });
    fetchParticipants(selected.id); setShowAddP(false);
  };

  const updateEntry = async (participantId: string, value: number) => {
    if (isNaN(value)) return;
    await supabase.from("challenge_entries").insert({ participant_id: participantId, value } as any);
    await supabase.from("challenge_participants").update({
      current_value: value,
      best_value: value,
    } as any).eq("id", participantId);
    if (selected) fetchParticipants(selected.id);
    setEntryValues(prev => ({ ...prev, [participantId]: "" }));
    toast({ title: "تم التحديث" });
  };

  const endChallenge = async (challengeId: string) => {
    await supabase.from("challenges").update({ status: "completed" } as any).eq("id", challengeId);
    // Find winner
    const sorted = [...participants].sort((a, b) => {
      if (selected?.challenge_type === "weight_loss") return a.current_value - b.current_value;
      return b.current_value - a.current_value;
    });
    if (sorted.length > 0) {
      await supabase.from("challenge_participants").update({ rank: 1, badges: ["winner"] } as any).eq("id", sorted[0].id);
      if (sorted.length > 1) await supabase.from("challenge_participants").update({ rank: 2 } as any).eq("id", sorted[1].id);
      if (sorted.length > 2) await supabase.from("challenge_participants").update({ rank: 3 } as any).eq("id", sorted[2].id);
      // Notify trainer
      const winnerName = (sorted[0] as any).clients?.name || "مشارك";
      await supabase.from("trainer_notifications").insert({
        trainer_id: user!.id,
        type: "challenge",
        title: `انتهى التحدي "${selected?.title}"`,
        body: `الفائز: ${winnerName} بنتيجة ${sorted[0].current_value} ${selected?.kpi_unit}`,
      } as any);
    }
    toast({ title: "تم إنهاء التحدي وإعلان الفائز" });
    fetchChallenges();
    setSelected(null);
  };

  const shareChallenge = (c: any) => {
    const text = `تحدي "${c.title}" — ${c.prize_description || "شارك الآن"}`;
    navigator.clipboard.writeText(text);
    toast({ title: "تم نسخ رابط المشاركة" });
  };

  const statusBadge = (s: string) => s === "active" ? "default" : s === "upcoming" ? "secondary" : "outline";
  const statusText = (s: string) => s === "active" ? "نشط" : s === "upcoming" ? "قادم" : "منتهي";
  const typeInfo = (t: string) => CHALLENGE_TYPES.find(ct => ct.value === t) || CHALLENGE_TYPES[0];

  const filteredChallenges = challenges.filter(c => {
    if (tab === "active") return c.status === "active" || c.status === "upcoming";
    return c.status === "completed";
  });

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
          <UpgradeModal open={showUpgrade} onOpenChange={setShowUpgrade} title={getProFeatureBlockReason().title} description={getProFeatureBlockReason().description} ctaText="ترقية للاحترافي" secondaryText="لاحقاً" onUpgrade={() => { setShowUpgrade(false); setShowPlans(true); }} />
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
          <Dialog open={showCreate} onOpenChange={(o) => { setShowCreate(o); if (!o) setWizardStep(1); }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" strokeWidth={1.5} />تحدي جديد</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-[hsl(0_0%_6%)] border-[hsl(0_0%_10%)]">
              <DialogHeader>
                <DialogTitle className="text-foreground">
                  إنشاء تحدي جديد — الخطوة {wizardStep} من 3
                </DialogTitle>
              </DialogHeader>

              {/* Step indicators */}
              <div className="flex gap-2 mb-4">
                {[1, 2, 3].map(s => (
                  <div key={s} className={`flex-1 h-1.5 rounded-full transition-colors ${s <= wizardStep ? "bg-primary" : "bg-[hsl(0_0%_15%)]"}`} />
                ))}
              </div>

              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div><Label>اسم التحدي</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="تحدي الـ 30 يوم" className="bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)]" /></div>
                  <div><Label>الوصف</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)]" /></div>
                  <div>
                    <Label>نوع التحدي</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {CHALLENGE_TYPES.map(ct => {
                        const Icon = ct.icon;
                        const isActive = form.challenge_type === ct.value;
                        return (
                          <button
                            key={ct.value}
                            onClick={() => setForm(f => ({ ...f, challenge_type: ct.value, kpi_unit: ct.unit }))}
                            className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-sm ${
                              isActive
                                ? "border-primary bg-primary/10 text-foreground"
                                : "border-[hsl(0_0%_10%)] bg-[hsl(0_0%_4%)] text-muted-foreground hover:border-[hsl(0_0%_20%)]"
                            }`}
                          >
                            <Icon className={`w-4 h-4 ${isActive ? "text-primary" : ct.color}`} strokeWidth={1.5} />
                            {ct.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <Button onClick={() => setWizardStep(2)} disabled={!form.title} className="w-full gap-2">
                    التالي <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
                  </Button>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>تاريخ البدء</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)]" /></div>
                    <div><Label>تاريخ الانتهاء</Label><Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className="bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)]" /></div>
                  </div>
                  <div><Label>أقصى عدد مشاركين</Label><Input type="number" value={form.max_participants} onChange={e => setForm(f => ({ ...f, max_participants: +e.target.value }))} className="bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)]" /></div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setWizardStep(1)} className="flex-1 gap-2 bg-transparent border-[hsl(0_0%_10%)]">
                      <ChevronRight className="w-4 h-4" strokeWidth={1.5} /> السابق
                    </Button>
                    <Button onClick={() => setWizardStep(3)} disabled={!form.start_date || !form.end_date} className="flex-1 gap-2">
                      التالي <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
                    </Button>
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div><Label>رسوم الاشتراك (ر.س) — 0 = مجاني</Label><Input type="number" value={form.entry_fee} onChange={e => setForm(f => ({ ...f, entry_fee: +e.target.value }))} className="bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)]" /></div>
                  <div><Label>الجائزة</Label><Input value={form.prize_description} onChange={e => setForm(f => ({ ...f, prize_description: e.target.value }))} placeholder="شهر تدريب مجاني" className="bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)]" /></div>

                  {/* Preview card */}
                  <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
                    <p className="text-xs text-primary font-medium">معاينة التحدي</p>
                    <p className="font-bold text-foreground">{form.title}</p>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>{typeInfo(form.challenge_type).label}</span>
                      <span>{form.start_date} → {form.end_date}</span>
                      {form.entry_fee > 0 && <span>{form.entry_fee} ر.س</span>}
                    </div>
                    {form.prize_description && <p className="text-xs text-foreground">{form.prize_description}</p>}
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setWizardStep(2)} className="flex-1 gap-2 bg-transparent border-[hsl(0_0%_10%)]">
                      <ChevronRight className="w-4 h-4" strokeWidth={1.5} /> السابق
                    </Button>
                    <Button onClick={handleCreate} className="flex-1 gap-2">
                      <Check className="w-4 h-4" strokeWidth={1.5} /> إنشاء التحدي
                    </Button>
                  </div>
                </div>
              )}
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
                <div className="flex items-center gap-2">
                  <Badge variant={statusBadge(selected.status) as any}>{statusText(selected.status)}</Badge>
                  <Button variant="ghost" size="icon" onClick={() => shareChallenge(selected)} className="text-muted-foreground hover:text-foreground">
                    <Share2 className="w-4 h-4" strokeWidth={1.5} />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{selected.description}</p>
              <div className="flex gap-3 text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" strokeWidth={1.5} />{selected.start_date} → {selected.end_date}</span>
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" strokeWidth={1.5} />{participants.length}/{selected.max_participants || "∞"}</span>
                {selected.entry_fee > 0 && <span className="flex items-center gap-1"><Banknote className="w-3.5 h-3.5" strokeWidth={1.5} />{selected.entry_fee} ر.س</span>}
                {selected.prize_description && <span className="flex items-center gap-1"><Gift className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />{selected.prize_description}</span>}
              </div>

              {/* Challenge actions */}
              <div className="flex gap-2 flex-wrap">
                {selected.status === "active" && (
                  <Button variant="outline" className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => endChallenge(selected.id)}>
                    <Crown className="w-4 h-4" strokeWidth={1.5} /> إنهاء التحدي وإعلان الفائز
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="gap-2 border-[hsl(0_0%_15%)] text-[hsl(0_0%_50%)] hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                  onClick={async () => {
                    if (!confirm("هل أنت متأكد من حذف هذا التحدي؟")) return;
                    await supabase.from("challenge_participants").delete().eq("challenge_id", selected.id);
                    await supabase.from("challenges").delete().eq("id", selected.id);
                    toast({ title: "تم حذف التحدي" });
                    setSelected(null);
                    fetchChallenges();
                  }}
                >
                  حذف التحدي
                </Button>
              </div>

              <div className="border-t border-[hsl(0_0%_10%)] pt-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-foreground flex items-center gap-2"><Medal className="w-4 h-4 text-primary" strokeWidth={1.5} />المتصدرين ({participants.length})</h3>
                  {selected.status !== "completed" && (
                    <Dialog open={showAddP} onOpenChange={setShowAddP}>
                      <DialogTrigger asChild><Button size="sm" variant="outline" className="gap-1 bg-transparent border-[hsl(0_0%_10%)]"><Plus className="w-4 h-4" strokeWidth={1.5} />إضافة مشارك</Button></DialogTrigger>
                      <DialogContent className="bg-[hsl(0_0%_6%)] border-[hsl(0_0%_10%)]">
                        <DialogHeader><DialogTitle className="text-foreground">إضافة مشارك</DialogTitle></DialogHeader>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {clients.filter(c => !participants.find(p => p.client_id === c.id)).map(c => (
                            <Button key={c.id} variant="ghost" className="w-full justify-start hover:bg-[hsl(0_0%_10%)]" onClick={() => addParticipant(c.id)}>{c.name}</Button>
                          ))}
                          {clients.filter(c => !participants.find(p => p.client_id === c.id)).length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">جميع العملاء مضافين بالفعل</p>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
                {participants.length === 0 ? (
                  <div className="text-center py-8">
                    <Medal className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" strokeWidth={1.5} />
                    <p className="text-muted-foreground text-sm">لا يوجد مشاركين بعد</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {[...participants].sort((a, b) => {
                      if (selected.challenge_type === "weight_loss") return a.current_value - b.current_value;
                      return b.current_value - a.current_value;
                    }).map((p, i) => (
                      <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        i === 0 && selected.status === "completed"
                          ? "bg-primary/5 border-primary/30"
                          : "bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)]"
                      }`}>
                        <div className="flex items-center gap-3">
                          <span className={`font-bold text-lg tabular-nums w-8 text-center ${
                            i === 0 ? "text-amber-400" : i === 1 ? "text-[hsl(0_0%_60%)]" : i === 2 ? "text-amber-700" : "text-muted-foreground"
                          }`}>
                            {i === 0 && selected.status === "completed" ? <Crown className="w-5 h-5 text-amber-400 mx-auto" strokeWidth={1.5} /> : `#${i + 1}`}
                          </span>
                          <div>
                            <span className="font-medium text-foreground">{(p as any).clients?.name || "—"}</span>
                            {p.badges && (p.badges as string[]).includes("winner") && (
                              <Badge className="mr-2 bg-amber-400/10 text-amber-400 border-amber-400/30 text-[10px]">الفائز</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground tabular-nums">{p.current_value} {selected.kpi_unit}</span>
                          {selected.status !== "completed" && (
                            <Input
                              type="number"
                              className="w-20 h-8 text-sm bg-[hsl(0_0%_6%)] border-[hsl(0_0%_10%)]"
                              placeholder="قيمة"
                              value={entryValues[p.id] || ""}
                              onChange={e => setEntryValues(prev => ({ ...prev, [p.id]: e.target.value }))}
                              onKeyDown={e => { if (e.key === "Enter") updateEntry(p.id, +(e.target as HTMLInputElement).value); }}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            <Tabs value={tab} onValueChange={setTab} dir="rtl">
              <TabsList className="bg-[hsl(0_0%_6%)] border border-[hsl(0_0%_10%)]">
                <TabsTrigger value="active" className="gap-1.5 text-xs">
                  <Activity className="w-3.5 h-3.5" strokeWidth={1.5} />نشطة
                </TabsTrigger>
                <TabsTrigger value="completed" className="gap-1.5 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.5} />منتهية
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : filteredChallenges.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto" strokeWidth={1.5} />
                <p className="text-muted-foreground">{tab === "active" ? "لا توجد تحديات نشطة" : "لا توجد تحديات منتهية"}</p>
                {tab === "active" && <p className="text-sm text-muted-foreground">أنشئ أول تحدي لعملائك</p>}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {filteredChallenges.map(c => {
                  const ti = typeInfo(c.challenge_type);
                  const TypeIcon = ti.icon;
                  return (
                    <div
                      key={c.id}
                      className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] p-5 space-y-3 cursor-pointer hover:border-primary/40 transition-all duration-200 hover:-translate-y-0.5"
                      onClick={() => { setSelected(c); fetchParticipants(c.id); }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-[hsl(0_0%_10%)]`}>
                            <TypeIcon className={`w-4 h-4 ${ti.color}`} strokeWidth={1.5} />
                          </div>
                          <h3 className="font-bold text-foreground">{c.title}</h3>
                        </div>
                        <Badge variant={statusBadge(c.status) as any}>{statusText(c.status)}</Badge>
                      </div>
                      {c.description && <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" strokeWidth={1.5} />{c.start_date} → {c.end_date}</span>
                      </div>
                      <div className="flex items-center gap-3 pt-2 border-t border-[hsl(0_0%_10%)]">
                        {c.prize_description && <span className="text-sm text-foreground flex items-center gap-1.5"><Gift className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />{c.prize_description}</span>}
                        {c.entry_fee > 0 && <span className="text-sm text-primary flex items-center gap-1.5"><Banknote className="w-3.5 h-3.5" strokeWidth={1.5} />{c.entry_fee} ر.س</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </TrainerLayout>
  );
};

export default Challenges;
