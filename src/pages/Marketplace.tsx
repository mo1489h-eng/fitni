import { useState, useEffect } from "react";
import TrainerLayout from "@/components/TrainerLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, ShoppingCart, Star } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Marketplace = () => {
  const { user } = useAuth();
  const [listings, setListings] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("all");
  const [showPublish, setShowPublish] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pubForm, setPubForm] = useState({
    program_id: "", title: "", description: "", price: 0,
    difficulty: "متوسط", duration_weeks: 8, tags: ""
  });

  useEffect(() => { fetchListings(); fetchPrograms(); }, []);

  const fetchListings = async () => {
    const { data } = await supabase.from("marketplace_listings").select("*").order("created_at", { ascending: false });
    setListings(data || []);
    setLoading(false);
  };

  const fetchPrograms = async () => {
    if (!user) return;
    const { data } = await supabase.from("programs").select("id, name, weeks").eq("trainer_id", user.id);
    setPrograms(data || []);
  };

  const handlePublish = async () => {
    if (!user || !pubForm.title) return;
    const { error } = await supabase.from("marketplace_listings").insert({
      trainer_id: user.id,
      program_id: pubForm.program_id || null,
      title: pubForm.title,
      description: pubForm.description,
      price: pubForm.price,
      difficulty: pubForm.difficulty,
      duration_weeks: pubForm.duration_weeks,
      tags: pubForm.tags.split(",").map(t => t.trim()).filter(Boolean),
      status: "published"
    } as any);
    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    toast({ title: "تم النشر ✅" });
    setShowPublish(false);
    setPubForm({ program_id: "", title: "", description: "", price: 0, difficulty: "متوسط", duration_weeks: 8, tags: "" });
    fetchListings();
  };

  const handlePurchase = async (listing: any) => {
    if (!user) { toast({ title: "يجب تسجيل الدخول أولاً", variant: "destructive" }); return; }
    const { error } = await supabase.from("marketplace_purchases").insert({
      buyer_id: user.id, listing_id: listing.id, trainer_id: listing.trainer_id,
      amount: listing.price, currency: listing.currency
    } as any);
    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    await supabase.from("marketplace_listings").update({ purchase_count: (listing.purchase_count || 0) + 1 } as any).eq("id", listing.id);
    toast({ title: "تم الشراء بنجاح! 🎉" });
    fetchListings();
  };

  const filtered = listings.filter(l => {
    if (search && !l.title?.includes(search) && !l.description?.includes(search)) return false;
    if (filterDifficulty !== "all" && l.difficulty !== filterDifficulty) return false;
    return true;
  });

  return (
    <TrainerLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">سوق البرامج 🏪</h1>
          <Dialog open={showPublish} onOpenChange={setShowPublish}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 ml-2" />نشر برنامج</Button></DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>نشر برنامج في السوق</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>اختر برنامج موجود (اختياري)</Label>
                  <Select value={pubForm.program_id} onValueChange={v => {
                    const prog = programs.find(p => p.id === v);
                    setPubForm(f => ({ ...f, program_id: v, title: prog?.name || f.title, duration_weeks: prog?.weeks || f.duration_weeks }));
                  }}>
                    <SelectTrigger><SelectValue placeholder="اختر برنامج..." /></SelectTrigger>
                    <SelectContent>{programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>اسم البرنامج</Label><Input value={pubForm.title} onChange={e => setPubForm(f => ({ ...f, title: e.target.value }))} /></div>
                <div><Label>الوصف</Label><Textarea value={pubForm.description} onChange={e => setPubForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>السعر (ر.س)</Label><Input type="number" value={pubForm.price} onChange={e => setPubForm(f => ({ ...f, price: +e.target.value }))} /></div>
                  <div><Label>المدة (أسابيع)</Label><Input type="number" value={pubForm.duration_weeks} onChange={e => setPubForm(f => ({ ...f, duration_weeks: +e.target.value }))} /></div>
                </div>
                <div>
                  <Label>المستوى</Label>
                  <Select value={pubForm.difficulty} onValueChange={v => setPubForm(f => ({ ...f, difficulty: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="مبتدئ">مبتدئ</SelectItem>
                      <SelectItem value="متوسط">متوسط</SelectItem>
                      <SelectItem value="متقدم">متقدم</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>الوسوم (مفصولة بفاصلة)</Label><Input value={pubForm.tags} onChange={e => setPubForm(f => ({ ...f, tags: e.target.value }))} placeholder="تضخيم, تنشيف, مبتدئ" /></div>
                <Button onClick={handlePublish} className="w-full">نشر في السوق</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pr-10" placeholder="ابحث عن برنامج..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
            <SelectTrigger className="w-32"><SelectValue placeholder="المستوى" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="مبتدئ">مبتدئ</SelectItem>
              <SelectItem value="متوسط">متوسط</SelectItem>
              <SelectItem value="متقدم">متقدم</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? <p className="text-center text-muted-foreground py-12">جاري التحميل...</p> :
          filtered.length === 0 ? <p className="text-center text-muted-foreground py-12">لا توجد برامج منشورة بعد. كن أول من ينشر!</p> :
          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.map(l => (
              <Card key={l.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{l.title}</CardTitle>
                    <Badge variant="secondary">{l.difficulty}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{l.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <span>{l.duration_weeks} أسبوع</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />{Number(l.rating_avg || 0).toFixed(1)}</span>
                    <span>•</span>
                    <span>{l.purchase_count || 0} مبيعة</span>
                  </div>
                  {(l.tags || []).length > 0 && <div className="flex gap-1 flex-wrap mb-3">{l.tags.map((t: string) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}</div>}
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-primary">{l.price} ر.س</span>
                    {l.trainer_id !== user?.id && <Button size="sm" onClick={() => handlePurchase(l)}><ShoppingCart className="w-4 h-4 ml-1" />شراء</Button>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        }
      </div>
    </TrainerLayout>
  );
};

export default Marketplace;
