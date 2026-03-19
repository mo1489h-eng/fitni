import { useState, useEffect } from "react";
import TrainerLayout from "@/components/TrainerLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, UtensilsCrossed, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const categories = ["الكل", "أطباق رئيسية", "مقبلات", "حلويات", "مشروبات", "خبز ومعجنات", "أرز", "لحوم", "دواجن", "أسماك", "سلطات", "شوربات", "وجبات خفيفة"];

const GulfFoods = () => {
  const { user } = useAuth();
  const [foods, setFoods] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("الكل");
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name_ar: "", name_en: "", category: "أطباق رئيسية", serving_size: "حصة واحدة", calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 });

  useEffect(() => { fetchFoods(); }, []);

  const fetchFoods = async () => {
    const { data } = await supabase.from("gulf_foods").select("*").order("name_ar");
    setFoods(data || []); setLoading(false);
  };

  const handleAdd = async () => {
    if (!form.name_ar) return;
    const { error } = await supabase.from("gulf_foods").insert({ ...form, added_by_trainer_id: user?.id || null } as any);
    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    toast({ title: "تمت الإضافة بنجاح" });
    setShowAdd(false);
    setForm({ name_ar: "", name_en: "", category: "أطباق رئيسية", serving_size: "حصة واحدة", calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 });
    fetchFoods();
  };

  const filtered = foods.filter(f => {
    if (search && !f.name_ar?.includes(search) && !f.name_en?.toLowerCase().includes(search.toLowerCase())) return false;
    if (category !== "الكل" && f.category !== category) return false;
    return true;
  });

  return (
    <TrainerLayout>
      <div className="space-y-5" dir="rtl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <UtensilsCrossed className="w-6 h-6 text-primary" strokeWidth={1.5} />
            <h1 className="text-2xl font-bold text-foreground">الأطعمة الخليجية</h1>
          </div>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="w-4 h-4" strokeWidth={1.5} />إضافة صنف</Button></DialogTrigger>
            <DialogContent className="max-w-md bg-[hsl(0_0%_6%)] border-[hsl(0_0%_10%)]">
              <DialogHeader><DialogTitle className="text-foreground">إضافة صنف جديد</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>الاسم بالعربي</Label><Input value={form.name_ar} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))} className="bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)]" /></div>
                <div><Label>الاسم بالإنجليزي</Label><Input value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))} className="bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)]" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>التصنيف</Label>
                    <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                      <SelectTrigger className="bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)]"><SelectValue /></SelectTrigger>
                      <SelectContent>{categories.filter(c => c !== "الكل").map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>حجم الحصة</Label><Input value={form.serving_size} onChange={e => setForm(f => ({ ...f, serving_size: e.target.value }))} className="bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)]" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>سعرات</Label><Input type="number" value={form.calories} onChange={e => setForm(f => ({ ...f, calories: +e.target.value }))} className="bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)]" /></div>
                  <div><Label>بروتين (جم)</Label><Input type="number" value={form.protein} onChange={e => setForm(f => ({ ...f, protein: +e.target.value }))} className="bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)]" /></div>
                  <div><Label>كربوهيدرات (جم)</Label><Input type="number" value={form.carbs} onChange={e => setForm(f => ({ ...f, carbs: +e.target.value }))} className="bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)]" /></div>
                  <div><Label>دهون (جم)</Label><Input type="number" value={form.fats} onChange={e => setForm(f => ({ ...f, fats: +e.target.value }))} className="bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)]" /></div>
                </div>
                <Button onClick={handleAdd} className="w-full">إضافة</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
            <Input className="pr-10 bg-[hsl(0_0%_6%)] border-[hsl(0_0%_10%)]" placeholder="ابحث عن طعام..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-40 bg-[hsl(0_0%_6%)] border-[hsl(0_0%_10%)]"><SelectValue /></SelectTrigger>
            <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <p className="text-sm text-muted-foreground">{filtered.length} صنف</p>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <UtensilsCrossed className="w-12 h-12 text-muted-foreground/30 mx-auto" strokeWidth={1.5} />
            <p className="text-muted-foreground">لا توجد أصناف مطابقة</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(f => (
              <div key={f.id} className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] p-4 space-y-3 hover:border-primary/30 transition-all duration-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-foreground">{f.name_ar}</h3>
                    {f.name_en && <p className="text-xs text-muted-foreground">{f.name_en}</p>}
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0 border-[hsl(0_0%_10%)]">{f.category}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{f.serving_size}</p>
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  <div className="bg-[hsl(0_0%_4%)] rounded-lg p-2"><p className="text-[10px] text-muted-foreground">سعرات</p><p className="font-bold text-sm text-foreground tabular-nums">{f.calories}</p></div>
                  <div className="bg-[hsl(0_0%_4%)] rounded-lg p-2"><p className="text-[10px] text-muted-foreground">بروتين</p><p className="font-bold text-sm text-blue-400 tabular-nums">{f.protein}g</p></div>
                  <div className="bg-[hsl(0_0%_4%)] rounded-lg p-2"><p className="text-[10px] text-muted-foreground">كربو</p><p className="font-bold text-sm text-amber-400 tabular-nums">{f.carbs}g</p></div>
                  <div className="bg-[hsl(0_0%_4%)] rounded-lg p-2"><p className="text-[10px] text-muted-foreground">دهون</p><p className="font-bold text-sm text-red-400 tabular-nums">{f.fats}g</p></div>
                </div>
                {f.is_verified && (
                  <div className="flex items-center gap-1 text-xs text-primary">
                    <CheckCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
                    <span>موثق</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </TrainerLayout>
  );
};

export default GulfFoods;
