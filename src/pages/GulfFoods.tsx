import { useState, useEffect } from "react";
import TrainerLayout from "@/components/TrainerLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus } from "lucide-react";
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
    toast({ title: "تمت الإضافة ✅" });
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">الأطعمة الخليجية 🍽️</h1>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 ml-1" />إضافة صنف</Button></DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>إضافة صنف جديد</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>الاسم بالعربي</Label><Input value={form.name_ar} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))} /></div>
                <div><Label>الاسم بالإنجليزي</Label><Input value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>التصنيف</Label>
                    <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{categories.filter(c => c !== "الكل").map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>حجم الحصة</Label><Input value={form.serving_size} onChange={e => setForm(f => ({ ...f, serving_size: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>سعرات</Label><Input type="number" value={form.calories} onChange={e => setForm(f => ({ ...f, calories: +e.target.value }))} /></div>
                  <div><Label>بروتين (جم)</Label><Input type="number" value={form.protein} onChange={e => setForm(f => ({ ...f, protein: +e.target.value }))} /></div>
                  <div><Label>كربوهيدرات (جم)</Label><Input type="number" value={form.carbs} onChange={e => setForm(f => ({ ...f, carbs: +e.target.value }))} /></div>
                  <div><Label>دهون (جم)</Label><Input type="number" value={form.fats} onChange={e => setForm(f => ({ ...f, fats: +e.target.value }))} /></div>
                </div>
                <Button onClick={handleAdd} className="w-full">إضافة</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pr-10" placeholder="ابحث عن طعام (عربي أو إنجليزي)..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <p className="text-sm text-muted-foreground">{filtered.length} صنف</p>

        {loading ? <p className="text-center text-muted-foreground py-12">جاري التحميل...</p> :
          filtered.length === 0 ? <p className="text-center text-muted-foreground py-12">لا توجد أصناف مطابقة</p> :
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(f => (
              <Card key={f.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{f.name_ar}</h3>
                      {f.name_en && <p className="text-xs text-muted-foreground">{f.name_en}</p>}
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">{f.category}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{f.serving_size}</p>
                  <div className="grid grid-cols-4 gap-1.5 text-center">
                    <div className="bg-muted/50 rounded p-1.5"><p className="text-[10px] text-muted-foreground">سعرات</p><p className="font-bold text-sm">{f.calories}</p></div>
                    <div className="bg-muted/50 rounded p-1.5"><p className="text-[10px] text-muted-foreground">بروتين</p><p className="font-bold text-sm text-blue-500">{f.protein}g</p></div>
                    <div className="bg-muted/50 rounded p-1.5"><p className="text-[10px] text-muted-foreground">كربو</p><p className="font-bold text-sm text-orange-500">{f.carbs}g</p></div>
                    <div className="bg-muted/50 rounded p-1.5"><p className="text-[10px] text-muted-foreground">دهون</p><p className="font-bold text-sm text-red-500">{f.fats}g</p></div>
                  </div>
                  {f.is_verified && <Badge className="mt-2 text-xs" variant="secondary">✓ موثق</Badge>}
                </CardContent>
              </Card>
            ))}
          </div>
        }
      </div>
    </TrainerLayout>
  );
};

export default GulfFoods;
