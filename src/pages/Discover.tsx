import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dumbbell, MapPin, ArrowRight, Search, Target, Banknote, Gift } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Discover = () => {
  const [step, setStep] = useState<"intake" | "results">("intake");
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", goal: "",
    budget_min: 0, budget_max: 500, city: "", training_mode: "online", notes: ""
  });

  const handleSubmit = async () => {
    if (!form.name || !form.goal || !form.city) {
      toast({ title: "يرجى تعبئة الحقول المطلوبة", variant: "destructive" }); return;
    }
    setLoading(true);
    const intakeId = crypto.randomUUID();

    const { error: intakeErr } = await supabase.from("client_intakes").insert({ ...form, id: intakeId } as any);
    if (intakeErr) { toast({ title: "خطأ", variant: "destructive" }); setLoading(false); return; }

    const { data: discoveryProfiles } = await supabase.from("trainer_discovery_profiles").select("*");
    if (!discoveryProfiles?.length) { setMatches([]); setStep("results"); setLoading(false); return; }

    const scored = discoveryProfiles.filter((dp: any) => dp.is_discoverable).map((dp: any) => {
      let score = 50;
      if (dp.city === form.city) score += 30;
      if (dp.training_modes?.includes(form.training_mode)) score += 20;
      if (form.budget_max >= dp.price_range_min && form.budget_min <= dp.price_range_max) score += 25;
      if (dp.featured) score += 10;
      return { ...dp, score };
    }).sort((a: any, b: any) => b.score - a.score).slice(0, 5);

    await supabase.rpc("create_client_matches", {
      p_intake_id: intakeId,
      p_matches: scored.map((m: any) => ({ trainer_id: m.trainer_id, score: m.score })),
    });

    const enriched = await Promise.all(scored.map(async (m: any) => {
      const { data } = await supabase.rpc("get_public_profile", { p_user_id: m.trainer_id });
      return { ...m, profile: data?.[0] || null };
    }));

    setMatches(enriched);
    setStep("results");
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="bg-card border-b border-border px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <Dumbbell className="w-6 h-6 text-primary" />
          <span className="font-black text-lg">CoachBase</span>
          <span className="text-muted-foreground mr-2">| اعثر على مدربك المثالي</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 py-8">
        {step === "intake" ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Search className="w-5 h-5 text-primary" />
                ابحث عن مدرب يناسبك
              </CardTitle>
              <p className="text-sm text-muted-foreground">أجب على بعض الأسئلة وسنوصلك بأفضل المدربين</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div><Label>الاسم *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>البريد</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                <div><Label>الجوال</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
              </div>
              <div><Label>هدفك الرئيسي *</Label>
                <Select value={form.goal} onValueChange={v => setForm(f => ({ ...f, goal: v }))}>
                  <SelectTrigger><SelectValue placeholder="اختر هدفك..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="خسارة وزن">خسارة وزن</SelectItem>
                    <SelectItem value="بناء عضلات">بناء عضلات</SelectItem>
                    <SelectItem value="لياقة عامة">لياقة عامة</SelectItem>
                    <SelectItem value="تحضير بطولة">تحضير بطولة</SelectItem>
                    <SelectItem value="صحة ونشاط">صحة ونشاط</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>المدينة *</Label>
                <Select value={form.city} onValueChange={v => setForm(f => ({ ...f, city: v }))}>
                  <SelectTrigger><SelectValue placeholder="اختر مدينتك..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="الرياض">الرياض</SelectItem>
                    <SelectItem value="جدة">جدة</SelectItem>
                    <SelectItem value="الدمام">الدمام</SelectItem>
                    <SelectItem value="مكة">مكة</SelectItem>
                    <SelectItem value="المدينة">المدينة</SelectItem>
                    <SelectItem value="أخرى">أخرى</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>طريقة التدريب</Label>
                <Select value={form.training_mode} onValueChange={v => setForm(f => ({ ...f, training_mode: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">أونلاين</SelectItem>
                    <SelectItem value="in_person">حضوري</SelectItem>
                    <SelectItem value="both">كلاهما</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>الميزانية من (ر.س/شهر)</Label><Input type="number" value={form.budget_min} onChange={e => setForm(f => ({ ...f, budget_min: +e.target.value }))} /></div>
                <div><Label>الميزانية إلى (ر.س/شهر)</Label><Input type="number" value={form.budget_max} onChange={e => setForm(f => ({ ...f, budget_max: +e.target.value }))} /></div>
              </div>
              <div><Label>ملاحظات</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="إصابات، تجارب سابقة..." /></div>
              <Button onClick={handleSubmit} className="w-full gap-2" size="lg" disabled={loading}>
                <Search className="w-4 h-4" />
                {loading ? "جاري البحث..." : "اعثر على مدربي"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
                <Target className="w-6 h-6 text-primary" />
                المدربون المناسبون لك
              </h2>
              <p className="text-muted-foreground">{matches.length > 0 ? `وجدنا ${matches.length} مدربين مناسبين` : "لا يوجد مدربون متاحون حالياً. جرب تعديل المعايير."}</p>
            </div>
            {matches.map((m, i) => (
              <Card key={m.trainer_id} className={i === 0 ? "border-primary" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {m.profile?.avatar_url ? (
                      <img src={m.profile.avatar_url} alt={m.profile.full_name} className="w-14 h-14 rounded-full object-cover border-2 border-border shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary shrink-0">
                        {m.profile?.full_name?.[0] || "?"}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-bold text-lg">{m.profile?.full_name || "مدرب"}</h3>
                        {i === 0 && <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">أفضل تطابق</Badge>}
                        {m.featured && <Badge className="bg-primary/10 text-primary border-primary/30">مميز</Badge>}
                      </div>
                      {m.profile?.specialization && <p className="text-sm text-primary font-medium">{m.profile.specialization}</p>}
                      {m.profile?.bio && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{m.profile.bio}</p>}
                      
                      {(m.specialties?.length > 0) && (
                        <div className="flex gap-1 flex-wrap mt-2">
                          {m.specialties.map((s: string) => (
                            <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
                        {m.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{m.city}</span>}
                        <span className="flex items-center gap-1"><Banknote className="w-3 h-3" />{m.price_range_min}–{m.price_range_max} ر.س/شهر</span>
                        {m.training_modes?.map((mode: string) => (
                          <Badge key={mode} variant="secondary" className="text-xs">
                            {mode === "online" ? "أونلاين" : mode === "in_person" ? "حضوري" : "مدمج"}
                          </Badge>
                        ))}
                        <Badge variant="outline" className="text-xs">{Math.round(m.score)}% تطابق</Badge>
                      </div>
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {m.profile?.user_id && (
                          <Button size="sm" asChild><a href={`/trainer/${m.profile.user_id}`}>عرض الملف <ArrowRight className="w-3 h-3 mr-1" /></a></Button>
                        )}
                        {m.trial_sessions && <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/30 flex items-center gap-1"><Gift className="w-3 h-3" />جلسة تجريبية</Badge>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button variant="outline" className="w-full" onClick={() => setStep("intake")}>بحث جديد</Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Discover;
