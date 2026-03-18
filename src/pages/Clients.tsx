import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import TrainerLayout from "@/components/TrainerLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import UpgradeModal from "@/components/UpgradeModal";
import { Plus, Search, Target, Loader2, ChevronDown, ChevronUp, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

function getPaymentStatus(subscriptionEndDate: string): "active" | "overdue" | "expiring" {
  const end = new Date(subscriptionEndDate);
  const now = new Date();
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "overdue";
  if (diff <= 7) return "expiring";
  return "active";
}

const statusColors = {
  active: "border-r-4 border-r-success",
  overdue: "border-r-4 border-r-destructive",
  expiring: "border-r-4 border-r-warning",
};
const statusLabels = { active: "نشط", overdue: "متأخر", expiring: "ينتهي قريباً" };
const statusBadgeColors = {
  active: "bg-success/10 text-success",
  overdue: "bg-destructive/10 text-destructive",
  expiring: "bg-warning/10 text-warning",
};

const Clients = () => {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", goal: "", price: "", startDate: "", email: "", age: "", weight: "", height: "", experience: "مبتدئ", daysPerWeek: "4", injuries: "", equipment: "" });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { canAddClient, getAddClientBlockReason } = usePlanLimits();
  const [blockReason, setBlockReason] = useState<{ title: string; description: string } | null>(null);

  const handleAddClick = () => {
    const reason = getAddClientBlockReason();
    if (reason?.blocked) {
      setBlockReason(reason);
      setShowUpgrade(true);
    } else {
      setOpen(true);
    }
  };

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: profile } = useQuery({
    queryKey: ["trainer-profile"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const startDate = form.startDate ? new Date(form.startDate) : new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 30);

      const { data: newClient, error } = await supabase.from("clients").insert({
        trainer_id: user!.id,
        name: form.name,
        phone: form.phone,
        goal: form.goal,
        email: form.email || null,
        subscription_price: Number(form.price) || 0,
        subscription_end_date: endDate.toISOString().split("T")[0],
        last_workout_date: new Date().toISOString().split("T")[0],
        age: form.age ? parseInt(form.age) : null,
        weight: form.weight ? parseFloat(form.weight) : null,
        height: form.height ? parseFloat(form.height) : null,
        experience: form.experience || "مبتدئ",
        days_per_week: parseInt(form.daysPerWeek) || 4,
        injuries: form.injuries || null,
        preferred_equipment: form.equipment || null,
      } as any).select("id, invite_token").single();
      if (error) throw error;

      // Send invitation email if email provided
      if (form.email && newClient?.invite_token) {
        try {
          const { data: emailResult } = await supabase.functions.invoke("send-invite-email", {
            body: {
              clientName: form.name,
              clientEmail: form.email,
              trainerName: profile?.full_name || "مدربك",
              inviteToken: newClient.invite_token,
            },
          });
          if (emailResult?.emailSent) {
            toast({ title: "تم إرسال الدعوة بالإيميل", description: `تم إرسال رابط التسجيل إلى ${form.email}` });
          } else if (emailResult?.setupLink) {
            toast({ title: "تمت إضافة العميل", description: "شارك رابط التسجيل يدوياً من ملف العميل" });
          }
        } catch (e) {
          console.error("Email send error:", e);
          toast({ title: "تمت إضافة العميل", description: "لم يتم إرسال الإيميل، شارك الرابط يدوياً" });
        }
      }

      // Auto-trigger copilot generation if we have enough data
      if (newClient?.id && form.goal && (form.weight || form.height)) {
        try {
          await supabase.functions.invoke("copilot-generate", {
            body: { client_id: newClient.id, action: "generate_program" },
          });
          toast({ title: "تم إنشاء برنامج AI تلقائياً", description: "افتح ملف العميل لمراجعة البرنامج المقترح" });
        } catch (e) {
          console.error("Auto copilot error:", e);
        }
      }

      return newClient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setOpen(false);
      setForm({ name: "", phone: "", goal: "", price: "", startDate: "", email: "", age: "", weight: "", height: "", experience: "مبتدئ", daysPerWeek: "4", injuries: "", equipment: "" });
      setShowAdvanced(false);
      if (!form.email) {
        toast({ title: "تم إضافة العميل بنجاح" });
      }
    },
    onError: () => {
      toast({ title: "حدث خطأ", variant: "destructive" });
    },
  });

  const filtered = (clients ?? []).filter(
    (c) => (c.name ?? "").includes(search) || (c.goal ?? "").includes(search)
  );

  return (
    <TrainerLayout>
      <div className="space-y-4 page-enter">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">العملاء</h1>
          <span className="text-sm text-muted-foreground">{clients.length} عميل</span>
        </div>

        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-tour="search"
            placeholder="بحث عن عميل..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            {search ? (
              <p className="text-muted-foreground">لا توجد نتائج</p>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-foreground">لم تضف عملاء بعد</h3>
                <p className="text-sm text-muted-foreground">ابدأ بإضافة أول عميل لك</p>
                <Button className="gap-1" onClick={() => {
                  if (!canAddClient) {
                    const reason = getAddClientBlockReason();
                    if (reason) setBlockReason(reason);
                    return;
                  }
                  setOpen(true);
                }}>
                  <Plus className="w-4 h-4" /> إضافة عميل
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3 pb-20">
            {filtered.map((client) => {
              const status = getPaymentStatus(client.subscription_end_date);
              const lastActive = (client as any).last_active_at ? new Date((client as any).last_active_at) : null;
              const minsAgo = lastActive ? Math.floor((Date.now() - lastActive.getTime()) / 60000) : null;
              let activityBadge = { text: "غير معروف", color: "bg-secondary text-muted-foreground" };
                if (minsAgo !== null) {
                  if (minsAgo < 120) activityBadge = { text: "نشط الآن", color: "bg-emerald-500/10 text-emerald-500" };
                  else if (minsAgo < 1440) activityBadge = { text: "اليوم", color: "bg-yellow-500/10 text-yellow-500" };
                else activityBadge = { text: `منذ ${Math.floor(minsAgo / 1440)} أيام`, color: "bg-secondary text-muted-foreground" };
              }
              return (
                <Link to={`/clients/${client.id}`} key={client.id}>
                  <Card className={`p-4 hover:shadow-md transition-shadow ${statusColors[status]}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-card-foreground">{client.name}</h3>
                        <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                          <Target className="w-3 h-3" />
                          {client.goal}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs text-muted-foreground">الأسبوع {client.week_number}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${activityBadge.color}`}>
                            {activityBadge.text}
                          </span>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusBadgeColors[status]}`}>
                        {statusLabels[status]}
                      </span>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        <button
          onClick={handleAddClick}
          data-tour="add-client"
          className="fixed bottom-20 left-4 z-50 w-14 h-14 rounded-full btn-gradient text-primary-foreground flex items-center justify-center fab-premium"
        >
          <Plus className="w-6 h-6" />
        </button>

        <UpgradeModal
          open={showUpgrade}
          onOpenChange={setShowUpgrade}
          title={blockReason?.title || ""}
          description={blockReason?.description || ""}
          onUpgrade={() => {
            setShowUpgrade(false);
            setShowPlans(true);
          }}
        />

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة عميل جديد</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); addMutation.mutate(); }} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground">الاسم</label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="اسم العميل" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">رقم الجوال</label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="05XXXXXXXX" type="tel" dir="ltr" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">الهدف</label>
                <Input required value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} placeholder="مثال: خسارة وزن" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">سعر الاشتراك (ر.س)</label>
                <Input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} type="number" dir="ltr" placeholder="800" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">البريد الإلكتروني (اختياري)</label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" dir="ltr" placeholder="client@email.com" />
                <p className="text-xs text-muted-foreground mt-1">لإرسال رابط تسجيل الدخول للمتدرب</p>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">تاريخ البدء</label>
                <Input value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} type="date" dir="ltr" />
              </div>

              {/* Advanced Fields Toggle */}
              <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-1 text-sm text-primary font-medium w-full justify-center py-1">
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                بيانات متقدمة (لتوليد برنامج AI تلقائي)
              </button>

              {showAdvanced && (
                <div className="space-y-3 border border-primary/20 rounded-lg p-3 bg-primary/5">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs font-medium text-foreground">العمر</label>
                      <Input value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} type="number" placeholder="25" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground">الوزن (كجم)</label>
                      <Input value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} type="number" placeholder="80" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground">الطول (سم)</label>
                      <Input value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} type="number" placeholder="175" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-foreground">الخبرة</label>
                      <Select value={form.experience} onValueChange={(v) => setForm({ ...form, experience: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="مبتدئ">مبتدئ</SelectItem>
                          <SelectItem value="متوسط">متوسط</SelectItem>
                          <SelectItem value="متقدم">متقدم</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground">أيام التدريب / أسبوع</label>
                      <Select value={form.daysPerWeek} onValueChange={(v) => setForm({ ...form, daysPerWeek: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[2,3,4,5,6].map(n => <SelectItem key={n} value={String(n)}>{n} أيام</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground">إصابات أو قيود (اختياري)</label>
                    <Input value={form.injuries} onChange={(e) => setForm({ ...form, injuries: e.target.value })} placeholder="مثال: مشكلة في الركبة" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground">الأدوات المتوفرة (اختياري)</label>
                    <Input value={form.equipment} onChange={(e) => setForm({ ...form, equipment: e.target.value })} placeholder="مثال: دمبلز، بار، أجهزة نادي" />
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center">✨ تعبئة هذه البيانات تمكّن المساعد الذكي من إنشاء برنامج تدريب وتغذية مخصص تلقائياً</p>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={addMutation.isPending}>
                {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Plans dialog reusing TrialBanner */}
        {showPlans && (
          <TrialBannerPlans open={showPlans} onOpenChange={setShowPlans} />
        )}
      </div>
    </TrainerLayout>
  );
};

// Minimal wrapper to show plans dialog
import TrialBanner from "@/components/TrialBanner";
const TrialBannerPlans = ({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) => (
  <TrialBanner showPlans={open} onShowPlansChange={onOpenChange} />
);

export default Clients;
