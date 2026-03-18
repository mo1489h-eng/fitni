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
import { Trophy, Plus, Calendar, Medal, Lock } from "lucide-react";
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
    toast({ title: "تم إنشاء التحدي! 🏆" });
    setShowCreate(false);
    setForm({ title: "", description: "", challenge_type: "weight_loss", start_date: "", end_date: "", entry_fee: 0, prize_description: "", kpi_unit: "كجم", max_participants: 50 });
    fetchChallenges();
  };

  const addParticipant = async (clientId: string) => {
    if (!selected) return;
    const { error } = await supabase.from("challenge_participants").insert({ challenge_id: selected.id, client_id: clientId } as any);
    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    toast({ title: "تمت الإضافة ✅" });
    fetchParticipants(selected.id); setShowAddP(false);
  };

  const updateEntry = async (participantId: string, value: number) => {
    await supabase.from("challenge_entries").insert({ participant_id: participantId, value } as any);
    await supabase.from("challenge_participants").update({ current_value: value } as any).eq("id", participantId);
    if (selected) fetchParticipants(selected.id);
    toast({ title: "تم التحديث ✅" });
  };

  const statusBadge = (s: string) => s === "active" ? "default" : s === "upcoming" ? "secondary" : "outline";
  const statusText = (s: string) => s === "active" ? "نشط" : s === "upcoming" ? "قادم" : "منتهي";
  const typeText = (t: string) => ({ weight_loss: "خسارة وزن", consistency: "الانتظام", steps: "خطوات", workout: "تمارين" }[t] || t);

  if (!hasChallengesAccess) {
    return (
      <TrainerLayout>
        <div className="space-y-4 py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-warning" />
          </div>
          <h1 className="text-2xl font-bold">التحديات الجماعية</h1>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">هذه الميزة للباقة الاحترافية ⭐</p>
          <Button onClick={() => setShowUpgrade(true)}>ترقية للاحترافي - 69 ريال/شهر ←</Button>
          <UpgradeModal
            open={showUpgrade}
            onOpenChange={setShowUpgrade}
            title={getProFeatureBlockReason().title}
            description={getProFeatureBlockReason().description}
            ctaText="ترقية للاحترافي - 69 ريال/شهر ←"
            secondaryText="لاحقاً"
            onUpgrade={() => {
              setShowUpgrade(false);
              setShowPlans(true);
            }}
          />
          <TrialBanner showPlans={showPlans} onShowPlansChange={setShowPlans} />
        </div>
      </TrainerLayout>
    );
  }

  return (
    <TrainerLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">التحديات 🏆</h1>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 ml-2" />تحدي جديد</Button></DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>إنشاء تحدي جديد</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>اسم التحدي</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="تحدي الـ 30 يوم" /></div>
                <div><Label>الوصف</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
                <div><Label>نوع التحدي</Label>
                  <Select value={form.challenge_type} onValueChange={v => setForm(f => ({ ...f, challenge_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weight_loss">خسارة وزن</SelectItem>
                      <SelectItem value="consistency">الانتظام</SelectItem>
                      <SelectItem value="steps">خطوات</SelectItem>
                      <SelectItem value="workout">إكمال تمارين</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>تاريخ البدء</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
                  <div><Label>تاريخ الانتهاء</Label><Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>رسوم الاشتراك (ر.س)</Label><Input type="number" value={form.entry_fee} onChange={e => setForm(f => ({ ...f, entry_fee: +e.target.value }))} /></div>
                  <div><Label>أقصى عدد مشاركين</Label><Input type="number" value={form.max_participants} onChange={e => setForm(f => ({ ...f, max_participants: +e.target.value }))} /></div>
                </div>
                <div><Label>الجائزة</Label><Input value={form.prize_description} onChange={e => setForm(f => ({ ...f, prize_description: e.target.value }))} placeholder="شهر تدريب مجاني" /></div>
                <Button onClick={handleCreate} className="w-full">إنشاء التحدي</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {selected ? (
          <div className="space-y-4">
            <Button variant="ghost" onClick={() => { setSelected(null); setParticipants([]); }}>← العودة للتحديات</Button>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{selected.title}</CardTitle>
                  <Badge variant={statusBadge(selected.status) as any}>{statusText(selected.status)}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{selected.description}</p>
                <div className="flex gap-3 text-sm text-muted-foreground">
                  <span>📅 {selected.start_date} → {selected.end_date}</span>
                  {selected.entry_fee > 0 && <span>💰 {selected.entry_fee} ر.س</span>}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold flex items-center gap-2"><Medal className="w-4 h-4" />المتصدرين ({participants.length})</h3>
                  <Dialog open={showAddP} onOpenChange={setShowAddP}>
                    <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="w-4 h-4 ml-1" />إضافة مشارك</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>إضافة مشارك</DialogTitle></DialogHeader>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {clients.map(c => (
                          <Button key={c.id} variant="ghost" className="w-full justify-start" onClick={() => addParticipant(c.id)}>{c.name}</Button>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                {participants.length === 0 ? <p className="text-muted-foreground text-center py-6">لا يوجد مشاركين بعد</p> :
                  <div className="space-y-2">
                    {participants.map((p, i) => (
                      <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <span className={`font-bold text-lg ${i === 0 ? "text-warning" : i === 1 ? "text-muted-foreground" : i === 2 ? "text-primary" : "text-muted-foreground"}`}>#{i + 1}</span>
                          <span className="font-medium">{(p as any).clients?.name || "—"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{p.current_value} {selected.kpi_unit}</span>
                          <Input type="number" className="w-20 h-8 text-sm" placeholder="قيمة"
                            onKeyDown={e => { if (e.key === "Enter") updateEntry(p.id, +(e.target as HTMLInputElement).value); }} />
                        </div>
                      </div>
                    ))}
                  </div>
                }
              </CardContent>
            </Card>
          </div>
        ) : (
          loading ? <p className="text-center text-muted-foreground py-12">جاري التحميل...</p> :
          challenges.length === 0 ? <p className="text-center text-muted-foreground py-12">لا توجد تحديات بعد. أنشئ أول تحدي!</p> :
          <div className="grid gap-4 sm:grid-cols-2">
            {challenges.map(c => (
              <Card key={c.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => { setSelected(c); fetchParticipants(c.id); }}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{c.title}</CardTitle>
                    <Badge variant={statusBadge(c.status) as any}>{statusText(c.status)}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Trophy className="w-3 h-3" />{typeText(c.challenge_type)}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{c.start_date} → {c.end_date}</span>
                  </div>
                  {c.prize_description && <p className="text-sm mt-2">🎁 {c.prize_description}</p>}
                  {c.entry_fee > 0 && <p className="text-sm text-primary mt-1">رسوم: {c.entry_fee} ر.س</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </TrainerLayout>
  );
};

export default Challenges;
