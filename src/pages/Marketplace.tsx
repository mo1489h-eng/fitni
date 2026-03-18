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
import { Slider } from "@/components/ui/slider";
import { Search, Plus, ShoppingCart, Star, Clock, Users, Filter, TrendingUp, CheckCircle2, Loader2, Lock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Marketplace = () => {
  const { user } = useAuth();
  const { hasMarketplaceAccess, getProFeatureBlockReason } = usePlanLimits();
  const [listings, setListings] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [trainerProfiles, setTrainerProfiles] = useState<Record<string, any>>({});
  const [search, setSearch] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("all");
  const [filterGoal, setFilterGoal] = useState("all");
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [filterDuration, setFilterDuration] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [pubForm, setPubForm] = useState({
    program_id: "", title: "", description: "", price: 0,
    difficulty: "متوسط", duration_weeks: 8, tags: "", equipment: ""
  });

  useEffect(() => { fetchListings(); fetchPrograms(); }, [user]);

  const fetchListings = async () => {
    const { data } = await supabase.from("marketplace_listings").select("*").order("created_at", { ascending: false });
    setListings(data || []);
    setLoading(false);

    if (data && data.length > 0) {
      const trainerIds = [...new Set(data.map(l => l.trainer_id))];
      const profiles: Record<string, any> = {};
      for (const tid of trainerIds) {
        const { data: p } = await supabase.rpc("get_public_profile", { p_user_id: tid });
        if (p && p.length > 0) profiles[tid] = p[0];
      }
      setTrainerProfiles(profiles);
    }
  };

  const fetchPrograms = async () => {
    if (!user || !hasMarketplaceAccess) return;
    const { data } = await supabase.from("programs").select("id, name, weeks").eq("trainer_id", user.id);
    setPrograms(data || []);
  };

  const handlePublish = async () => {
    if (!hasMarketplaceAccess) {
      setShowUpgrade(true);
      return;
    }
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
      equipment: pubForm.equipment.split(",").map(t => t.trim()).filter(Boolean),
      status: "published"
    } as any);
    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    toast({ title: "تم النشر" });
    setShowPublish(false);
    setPubForm({ program_id: "", title: "", description: "", price: 0, difficulty: "متوسط", duration_weeks: 8, tags: "", equipment: "" });
    fetchListings();
  };

  const handlePurchase = async (listing: any) => {
    if (!user) {
      toast({ title: "يجب تسجيل الدخول أولاً", variant: "destructive" });
      return;
    }

    setPurchasing(listing.id);

    try {
      const { data, error } = await supabase.functions.invoke("public-purchase", {
        body: { listing_id: listing.id },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "تعذر إتمام الشراء");
      }

      toast({
        title: "تم الشراء بنجاح! 🎉",
        description: data.program_cloned ? "تم نسخ البرنامج إلى مكتبتك" : "يمكنك الآن استخدام البرنامج",
      });

      setSelectedListing(null);
      fetchListings();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description:
          listing.price > 0 && error?.message?.includes("payment_id")
            ? "البرامج المدفوعة تحتاج إلى تأكيد دفع آمن قبل إتمام الشراء."
            : error?.message || "تعذر إتمام الشراء",
        variant: "destructive",
      });
    } finally {
      setPurchasing(null);
    }
  };

  const filtered = listings.filter(l => {
    if (search && !l.title?.includes(search) && !l.description?.includes(search) && !(l.tags || []).some((t: string) => t.includes(search))) return false;
    if (filterDifficulty !== "all" && l.difficulty !== filterDifficulty) return false;
    if (filterGoal !== "all" && !(l.tags || []).some((t: string) => t.includes(filterGoal))) return false;
    if (l.price < priceRange[0] || l.price > priceRange[1]) return false;
    if (filterDuration !== "all") {
      const weeks = l.duration_weeks || 0;
      if (filterDuration === "short" && weeks > 4) return false;
      if (filterDuration === "medium" && (weeks < 5 || weeks > 8)) return false;
      if (filterDuration === "long" && weeks < 9) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortBy === "popular") return (b.purchase_count || 0) - (a.purchase_count || 0);
    if (sortBy === "rating") return (b.rating_avg || 0) - (a.rating_avg || 0);
    if (sortBy === "price_low") return a.price - b.price;
    if (sortBy === "price_high") return b.price - a.price;
    return 0;
  });

  return (
    <TrainerLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">سوق البرامج 🏪</h1>
            <p className="text-sm text-muted-foreground">اشترِ برامج جاهزة أو انشر برامجك للبيع</p>
          </div>
          <Dialog open={showPublish} onOpenChange={(open) => hasMarketplaceAccess ? setShowPublish(open) : setShowUpgrade(true)}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 ml-2" />نشر برنامج</Button></DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
                <div><Label>الوصف</Label><Textarea value={pubForm.description} onChange={e => setPubForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="وصف تفصيلي للبرنامج وما يتضمنه..." /></div>
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
                <div><Label>الأدوات المطلوبة (مفصولة بفاصلة)</Label><Input value={pubForm.equipment} onChange={e => setPubForm(f => ({ ...f, equipment: e.target.value }))} placeholder="دمبلز, بار, أجهزة" /></div>
                <Button onClick={handlePublish} className="w-full">نشر في السوق</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {!hasMarketplaceAccess && (
          <Card className="p-4 border-warning/30 bg-warning/5">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-4 h-4 text-warning" />
              <h3 className="font-bold text-card-foreground">هذه الميزة للباقة الاحترافية ⭐</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">فعّل الاحترافي لنشر برامجك وبيعها في سوق البرامج.</p>
            <Button size="sm" onClick={() => setShowUpgrade(true)}>ترقية للاحترافي - 69 ريال/شهر ←</Button>
          </Card>
        )}

        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pr-10" placeholder="ابحث عن برنامج..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-36"><SelectValue placeholder="ترتيب" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">الأحدث</SelectItem>
              <SelectItem value="popular">الأكثر مبيعاً</SelectItem>
              <SelectItem value="rating">الأعلى تقييماً</SelectItem>
              <SelectItem value="price_low">السعر: الأقل</SelectItem>
              <SelectItem value="price_high">السعر: الأعلى</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4" />
          </Button>
        </div>

        {showFilters && (
          <Card className="p-4 animate-fade-in">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">المستوى</Label>
                <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="مبتدئ">مبتدئ</SelectItem>
                    <SelectItem value="متوسط">متوسط</SelectItem>
                    <SelectItem value="متقدم">متقدم</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">الهدف</Label>
                <Select value={filterGoal} onValueChange={setFilterGoal}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="تضخيم">تضخيم</SelectItem>
                    <SelectItem value="تنشيف">تنشيف</SelectItem>
                    <SelectItem value="لياقة">لياقة عامة</SelectItem>
                    <SelectItem value="قوة">قوة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">المدة</Label>
                <Select value={filterDuration} onValueChange={setFilterDuration}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="short">قصير (1-4 أسابيع)</SelectItem>
                    <SelectItem value="medium">متوسط (5-8 أسابيع)</SelectItem>
                    <SelectItem value="long">طويل (9+ أسابيع)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">نطاق السعر: {priceRange[0]}-{priceRange[1]} ر.س</Label>
                <Slider value={priceRange} onValueChange={setPriceRange} min={0} max={1000} step={50} className="mt-2" />
              </div>
            </div>
          </Card>
        )}

        {loading ? <p className="text-center text-muted-foreground py-12">جاري التحميل...</p> :
          filtered.length === 0 ? <p className="text-center text-muted-foreground py-12">لا توجد برامج مطابقة. جرب تغيير الفلاتر أو كن أول من ينشر!</p> :
          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.map(l => {
              const trainer = trainerProfiles[l.trainer_id];
              return (
                <Card key={l.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedListing(l)}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{l.title}</CardTitle>
                      <Badge variant="secondary">{l.difficulty}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{l.description}</p>
                    {trainer && (
                      <div className="flex items-center gap-2 mt-2">
                        {trainer.avatar_url ? (
                          <img src={trainer.avatar_url} className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                            {trainer.full_name?.[0]}
                          </div>
                        )}
                        <span className="text-xs text-muted-foreground">{trainer.full_name}</span>
                        {trainer.specialization && <Badge variant="outline" className="text-[10px] py-0">{trainer.specialization}</Badge>}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3 flex-wrap">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{l.duration_weeks} أسبوع</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-warning text-warning" />{Number(l.rating_avg || 0).toFixed(1)}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{l.purchase_count || 0} مبيعة</span>
                    </div>
                    {(l.tags || []).length > 0 && <div className="flex gap-1 flex-wrap mb-3">{l.tags.map((t: string) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}</div>}
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold text-primary">{l.price === 0 ? "مجاني" : `${l.price} ر.س`}</span>
                      {l.trainer_id !== user?.id && (
                        <Button size="sm" onClick={(e) => { e.stopPropagation(); handlePurchase(l); }} disabled={purchasing === l.id}>
                          {purchasing === l.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ShoppingCart className="w-4 h-4 ml-1" />شراء</>}
                        </Button>
                      )}
                      {l.trainer_id === user?.id && <Badge variant="secondary" className="text-xs">برنامجك</Badge>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        }

        <Dialog open={!!selectedListing} onOpenChange={() => setSelectedListing(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            {selectedListing && (() => {
              const l = selectedListing;
              const trainer = trainerProfiles[l.trainer_id];
              return (
                <>
                  <DialogHeader>
                    <DialogTitle className="text-xl">{l.title}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Badge>{l.difficulty}</Badge>
                      <span className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{l.duration_weeks} أسبوع</span>
                      <span className="text-sm text-muted-foreground flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-warning text-warning" />{Number(l.rating_avg || 0).toFixed(1)} ({l.rating_count || 0})</span>
                    </div>

                    {trainer && (
                      <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                        {trainer.avatar_url ? (
                          <img src={trainer.avatar_url} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                            {trainer.full_name?.[0]}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-secondary-foreground">{trainer.full_name}</p>
                          {trainer.specialization && <p className="text-xs text-muted-foreground">{trainer.specialization}</p>}
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 className="font-medium text-sm mb-1">الوصف</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{l.description || "لا يوجد وصف"}</p>
                    </div>

                    {(l.tags || []).length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm mb-1">الوسوم</h4>
                        <div className="flex gap-1 flex-wrap">{l.tags.map((t: string) => <Badge key={t} variant="outline">{t}</Badge>)}</div>
                      </div>
                    )}

                    {(l.equipment || []).length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm mb-1">الأدوات المطلوبة</h4>
                        <div className="flex gap-1 flex-wrap">{l.equipment.map((e: string) => <Badge key={e} variant="secondary">{e}</Badge>)}</div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <TrendingUp className="w-4 h-4" />
                      <span>{l.purchase_count || 0} مدرب اشترى هذا البرنامج</span>
                    </div>

                    <div className="border-t pt-4 flex items-center justify-between">
                      <span className="text-2xl font-bold text-primary">{l.price === 0 ? "مجاني" : `${l.price} ر.س`}</span>
                      {l.trainer_id !== user?.id ? (
                        <Button onClick={() => handlePurchase(l)} disabled={purchasing === l.id} className="gap-2">
                          {purchasing === l.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ShoppingCart className="w-4 h-4" />شراء والتسجيل فوراً</>}
                        </Button>
                      ) : (
                        <Badge variant="secondary" className="text-sm py-1.5 px-3">
                          <CheckCircle2 className="w-4 h-4 ml-1" />برنامجك
                        </Badge>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>
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
    </TrainerLayout>
  );
};

export default Marketplace;
