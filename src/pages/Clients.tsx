import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import TrainerLayout from "@/components/TrainerLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import UpgradeModal from "@/components/UpgradeModal";
import { Plus, Search, Target, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  const [form, setForm] = useState({ name: "", phone: "", goal: "", price: "", startDate: "", email: "" });
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

  const addMutation = useMutation({
    mutationFn: async () => {
      const startDate = form.startDate ? new Date(form.startDate) : new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 30);

      const { error } = await supabase.from("clients").insert({
        trainer_id: user!.id,
        name: form.name,
        phone: form.phone,
        goal: form.goal,
        email: form.email || null,
        subscription_price: Number(form.price) || 0,
        subscription_end_date: endDate.toISOString().split("T")[0],
        last_workout_date: new Date().toISOString().split("T")[0],
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setOpen(false);
      setForm({ name: "", phone: "", goal: "", price: "", startDate: "", email: "" });
      toast({ title: "تم إضافة العميل بنجاح" });
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
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">العملاء</h1>
          <span className="text-sm text-muted-foreground">{clients.length} عميل</span>
        </div>

        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث عن عميل..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            {search ? "لا توجد نتائج" : "لا يوجد عملاء بعد. أضف أول عميل!"}
          </div>
        ) : (
          <div className="space-y-3 pb-20">
            {filtered.map((client) => {
              const status = getPaymentStatus(client.subscription_end_date);
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
                        <p className="text-sm text-muted-foreground mt-1">الأسبوع {client.week_number}</p>
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
          className="fixed bottom-20 left-4 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity"
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
