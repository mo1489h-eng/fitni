import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import TrainerLayout from "@/components/TrainerLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Package, Plus, Loader2, Trash2, Edit, Copy, Check,
  Dumbbell, UtensilsCrossed, MessageCircle, Link as LinkIcon,
} from "lucide-react";

interface PackageForm {
  name: string;
  description: string;
  price: number;
  billing_cycle: string;
  sessions_per_week: number;
  includes_program: boolean;
  includes_nutrition: boolean;
  includes_followup: boolean;
  custom_features: string[];
}

const defaultForm: PackageForm = {
  name: "",
  description: "",
  price: 0,
  billing_cycle: "monthly",
  sessions_per_week: 3,
  includes_program: true,
  includes_nutrition: true,
  includes_followup: true,
  custom_features: [],
};

const TrainerPackages = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PackageForm>(defaultForm);
  const [newFeature, setNewFeature] = useState("");
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ["trainer-packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainer_packages")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const payload = {
        trainer_id: user.id,
        name: form.name.trim(),
        description: form.description.trim(),
        price: form.price,
        billing_cycle: form.billing_cycle,
        sessions_per_week: form.sessions_per_week,
        includes_program: form.includes_program,
        includes_nutrition: form.includes_nutrition,
        includes_followup: form.includes_followup,
        custom_features: form.custom_features,
      };
      if (editingId) {
        const { error } = await supabase.from("trainer_packages").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("trainer_packages").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trainer-packages"] });
      setShowForm(false);
      setEditingId(null);
      setForm(defaultForm);
      toast({ title: editingId ? "تم تحديث الباقة" : "تم إنشاء الباقة" });
    },
    onError: () => toast({ title: "حدث خطأ", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trainer_packages").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trainer-packages"] });
      toast({ title: "تم حذف الباقة" });
    },
  });

  const openEdit = (pkg: any) => {
    setForm({
      name: pkg.name,
      description: pkg.description,
      price: pkg.price,
      billing_cycle: pkg.billing_cycle,
      sessions_per_week: pkg.sessions_per_week,
      includes_program: pkg.includes_program,
      includes_nutrition: pkg.includes_nutrition,
      includes_followup: pkg.includes_followup,
      custom_features: pkg.custom_features || [],
    });
    setEditingId(pkg.id);
    setShowForm(true);
  };

  const getPayLink = (pkgId: string) => {
    const username = profile?.username || user?.id;
    return `${window.location.origin}/pay/${username}/${pkgId}`;
  };

  const copyLink = (pkgId: string) => {
    navigator.clipboard.writeText(getPayLink(pkgId));
    setCopiedLink(pkgId);
    toast({ title: "تم نسخ الرابط" });
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const cycleLabel: Record<string, string> = {
    monthly: "شهرياً",
    quarterly: "كل 3 شهور",
    yearly: "سنوياً",
  };

  return (
    <TrainerLayout>
      <div className="space-y-4 animate-fade-in" dir="rtl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Package className="w-6 h-6 text-primary" strokeWidth={1.5} />باقاتي</h1>
          <Button className="gap-1" onClick={() => { setForm(defaultForm); setEditingId(null); setShowForm(true); }}>
            <Plus className="w-4 h-4" /> باقة جديدة
          </Button>
        </div>

        {/* Trainer Payment Link */}
        {user && (
          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <LinkIcon className="w-4 h-4 text-primary" />
              <p className="text-sm font-bold text-foreground">رابط الدفع الخاص بك</p>
            </div>
            <p className="text-xs text-muted-foreground mb-2">شارك هذا الرابط في إنستقرام، واتساب، سناب شات</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-secondary rounded-lg px-3 py-2 text-foreground overflow-x-auto" dir="ltr">
                {window.location.origin}/pay/{profile?.username || user.id}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/pay/${profile?.username || user.id}`);
                  toast({ title: "تم نسخ الرابط" });
                }}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        )}

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : packages.filter(p => p.is_active).length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <Package className="w-12 h-12 mx-auto text-muted-foreground opacity-40" />
            <p className="text-muted-foreground">ما أنشأت باقات بعد 📦</p>
            <p className="text-sm text-muted-foreground">أنشئ باقتك الأولى وشاركها مع عملاءك</p>
            <Button onClick={() => { setForm(defaultForm); setShowForm(true); }}>
              <Plus className="w-4 h-4 ml-1" /> إنشاء باقة
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {packages.filter(p => p.is_active).map((pkg) => (
              <Card key={pkg.id} className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-card-foreground">{pkg.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{pkg.description}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(pkg)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(pkg.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-primary">{pkg.price}</span>
                  <span className="text-sm text-muted-foreground">ر.س / {cycleLabel[pkg.billing_cycle] || "شهرياً"}</span>
                </div>

                <div className="space-y-2">
                  {pkg.sessions_per_week > 0 && (
                    <div className="flex items-center gap-2 text-sm text-card-foreground">
                      <Dumbbell className="w-4 h-4 text-primary" />
                      <span>{pkg.sessions_per_week} جلسات أسبوعياً</span>
                    </div>
                  )}
                  {pkg.includes_program && (
                    <div className="flex items-center gap-2 text-sm text-card-foreground">
                      <Check className="w-4 h-4 text-primary" />
                      <span>برنامج تدريب</span>
                    </div>
                  )}
                  {pkg.includes_nutrition && (
                    <div className="flex items-center gap-2 text-sm text-card-foreground">
                      <UtensilsCrossed className="w-4 h-4 text-primary" />
                      <span>جدول غذائي</span>
                    </div>
                  )}
                  {pkg.includes_followup && (
                    <div className="flex items-center gap-2 text-sm text-card-foreground">
                      <MessageCircle className="w-4 h-4 text-primary" />
                      <span>متابعة يومية</span>
                    </div>
                  )}
                  {(pkg.custom_features as string[] || []).map((f: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-card-foreground">
                      <Check className="w-4 h-4 text-primary" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => copyLink(pkg.id)}>
                    {copiedLink === pkg.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedLink === pkg.id ? "تم النسخ" : "نسخ رابط الدفع"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "تعديل الباقة" : "باقة جديدة"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4" dir="rtl">
              <div>
                <label className="text-sm font-medium text-foreground">اسم الباقة</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="مثال: باقة شهرية كاملة"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">الوصف</label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="وصف مختصر للباقة..."
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground">السعر (ر.س)</label>
                  <Input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: +e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">دورة الفوترة</label>
                  <Select value={form.billing_cycle} onValueChange={(v) => setForm({ ...form, billing_cycle: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">شهرياً</SelectItem>
                      <SelectItem value="quarterly">كل 3 شهور</SelectItem>
                      <SelectItem value="yearly">سنوياً</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">عدد الجلسات الأسبوعية</label>
                <Input
                  type="number"
                  value={form.sessions_per_week}
                  onChange={(e) => setForm({ ...form, sessions_per_week: +e.target.value })}
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">ما تشمل الباقة</label>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-card-foreground">برنامج تدريب</span>
                  <Switch checked={form.includes_program} onCheckedChange={(v) => setForm({ ...form, includes_program: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-card-foreground">جدول غذائي</span>
                  <Switch checked={form.includes_nutrition} onCheckedChange={(v) => setForm({ ...form, includes_nutrition: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-card-foreground">متابعة يومية</span>
                  <Switch checked={form.includes_followup} onCheckedChange={(v) => setForm({ ...form, includes_followup: v })} />
                </div>
              </div>

              {/* Custom features */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">مميزات إضافية</label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    placeholder="مثال: تقييم شهري"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newFeature.trim()) {
                        setForm({ ...form, custom_features: [...form.custom_features, newFeature.trim()] });
                        setNewFeature("");
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (newFeature.trim()) {
                        setForm({ ...form, custom_features: [...form.custom_features, newFeature.trim()] });
                        setNewFeature("");
                      }
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {form.custom_features.map((f, i) => (
                  <div key={i} className="flex items-center justify-between bg-secondary rounded-lg px-3 py-1.5 mb-1">
                    <span className="text-sm text-card-foreground">{f}</span>
                    <button
                      onClick={() => setForm({ ...form, custom_features: form.custom_features.filter((_, idx) => idx !== i) })}
                      className="text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              <Button
                className="w-full gap-2"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !form.name.trim() || form.price <= 0}
              >
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {editingId ? "حفظ التغييرات" : "نشر الباقة ✅"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TrainerLayout>
  );
};

export default TrainerPackages;
