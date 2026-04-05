import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import usePageTitle from "@/hooks/usePageTitle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Search, Star, Clock, Users, ShoppingCart, Loader2, Dumbbell, Filter,
  ArrowRight, CheckCircle2, TrendingUp, Package
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Store = () => {
  usePageTitle("متجر البرامج التدريبية");
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState<any[]>([]);
  const [trainerProfiles, setTrainerProfiles] = useState<Record<string, any>>({});
  const [search, setSearch] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("all");
  const [filterGoal, setFilterGoal] = useState("all");
  const [filterDuration, setFilterDuration] = useState("all");
  const [sortBy, setSortBy] = useState("popular");
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => { fetchListings(); }, []);

  const fetchListings = async () => {
    const { data } = await supabase.from("marketplace_listings").select("*").eq("status", "published").order("purchase_count", { ascending: false });
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

  const handlePurchase = async (listing: any) => {
    if (!user) { navigate("/login"); return; }
    setPurchasing(true);
    try {
      if (listing.price > 0) {
        // Fetch trainer's tap_destination_id for split payment (90% to trainer)
        const { data: trainerProfile } = await supabase
          .from("profiles")
          .select("tap_destination_id")
          .eq("user_id", listing.trainer_id)
          .single();

        const destinations = trainerProfile?.tap_destination_id
          ? [{ id: trainerProfile.tap_destination_id, amount: Math.round(listing.price * 0.9 * 100) / 100, currency: listing.currency || "SAR" }]
          : undefined;

        const { data, error: fnError } = await supabase.functions.invoke("create-tap-charge", {
          body: {
            amount: listing.price,
            currency: listing.currency || "SAR",
            description: `شراء برنامج: ${listing.title}`,
            customer: {
              name: user.user_metadata?.full_name || "Customer",
              email: user.email || "",
            },
            redirect_url: `${window.location.origin}/payment/callback?type=marketplace&listing_id=${listing.id}`,
            metadata: { type: "marketplace", listing_id: listing.id, user_id: user.id },
            destinations,
          },
        });
        if (fnError || !data?.redirect_url) throw new Error(data?.error || "فشل انشاء عملية الدفع");
        window.location.href = data.redirect_url;
        return;
      }
      // Free program — clone directly
      const { data, error } = await supabase.functions.invoke("public-purchase", { body: { listing_id: listing.id } });
      if (error || !data?.success) throw new Error(data?.error || "فشل الشراء");
      toast({ title: "تم الشراء بنجاح", description: "تم نسخ البرنامج إلى مكتبتك" });
      setSelectedListing(null);
      fetchListings();
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally { setPurchasing(false); }
  };

  const filtered = listings.filter(l => {
    if (search && !l.title?.includes(search) && !l.description?.includes(search) && !(l.tags || []).some((t: string) => t.includes(search))) return false;
    if (filterDifficulty !== "all" && l.difficulty !== filterDifficulty) return false;
    if (filterGoal !== "all" && !(l.tags || []).some((t: string) => t.includes(filterGoal))) return false;
    if (filterDuration !== "all") {
      const w = l.duration_weeks || 0;
      if (filterDuration === "short" && w > 4) return false;
      if (filterDuration === "medium" && (w < 5 || w > 8)) return false;
      if (filterDuration === "long" && w < 9) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === "popular") return (b.purchase_count || 0) - (a.purchase_count || 0);
    if (sortBy === "rating") return (b.rating_avg || 0) - (a.rating_avg || 0);
    if (sortBy === "price_low") return a.price - b.price;
    if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    return 0;
  });

  return (
    <div className="min-h-screen bg-[hsl(0_0%_2%)] text-foreground" dir="rtl">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm mb-6">
            <Package className="w-4 h-4" strokeWidth={1.5} />
            برامج جاهزة من أفضل المدربين
          </div>
          <h1 className="text-3xl md:text-5xl font-black mb-4">
            متجر <span className="text-primary">البرامج التدريبية</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            تصفح برامج تدريبية احترافية مصممة من مدربين محترفين — اشترِ وابدأ التمرين فوراً
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-16">
        {/* Search & Filters */}
        <div className="flex gap-3 flex-wrap mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
            <Input className="pr-10 bg-[hsl(0_0%_6%)] border-[hsl(0_0%_10%)]" placeholder="ابحث عن برنامج..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40 bg-[hsl(0_0%_6%)] border-[hsl(0_0%_10%)]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">الأكثر مبيعاً</SelectItem>
              <SelectItem value="rating">الأعلى تقييماً</SelectItem>
              <SelectItem value="price_low">السعر: الأقل</SelectItem>
              <SelectItem value="newest">الأحدث</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => setShowFilters(!showFilters)} className="bg-transparent border-[hsl(0_0%_10%)]">
            <Filter className="w-4 h-4" strokeWidth={1.5} />
          </Button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6 p-4 rounded-xl bg-[hsl(0_0%_6%)] border border-[hsl(0_0%_10%)]">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">المستوى</label>
              <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                <SelectTrigger className="bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="مبتدئ">مبتدئ</SelectItem>
                  <SelectItem value="متوسط">متوسط</SelectItem>
                  <SelectItem value="متقدم">متقدم</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">الهدف</label>
              <Select value={filterGoal} onValueChange={setFilterGoal}>
                <SelectTrigger className="bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)]"><SelectValue /></SelectTrigger>
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
              <label className="text-xs text-muted-foreground mb-1 block">المدة</label>
              <Select value={filterDuration} onValueChange={setFilterDuration}>
                <SelectTrigger className="bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="short">1-4 أسابيع</SelectItem>
                  <SelectItem value="medium">5-8 أسابيع</SelectItem>
                  <SelectItem value="long">9+ أسابيع</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Listings Grid */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <Package className="w-16 h-16 text-muted-foreground/20 mx-auto" strokeWidth={1.5} />
            <h3 className="text-lg font-bold text-foreground">لا توجد برامج مطابقة</h3>
            <p className="text-sm text-muted-foreground">جرب تغيير الفلاتر أو البحث بكلمات أخرى</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(l => {
              const trainer = trainerProfiles[l.trainer_id];
              return (
                 <div
                  key={l.id}
                  className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] overflow-hidden hover:border-primary/40 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
                  onClick={() => navigate(`/store/${l.id}`)}
                >
                  <div className="h-1 bg-gradient-to-r from-primary to-primary/50" />
                  <div className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-foreground line-clamp-2 flex-1">{l.title}</h3>
                      <Badge variant="secondary" className="text-[10px] shrink-0">{l.difficulty}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{l.description}</p>

                    {trainer && (
                      <div className="flex items-center gap-2">
                        {trainer.avatar_url ? (
                          <img src={trainer.avatar_url} className="w-6 h-6 rounded-full object-cover" alt="" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                            {trainer.full_name?.[0]}
                          </div>
                        )}
                        <span className="text-xs text-muted-foreground">{trainer.full_name}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" strokeWidth={1.5} />{l.duration_weeks} أسبوع</span>
                      <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-amber-400 text-amber-400" />{Number(l.rating_avg || 0).toFixed(1)}</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" strokeWidth={1.5} />{l.purchase_count || 0}</span>
                    </div>

                    {(l.tags || []).length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {l.tags.slice(0, 3).map((t: string) => (
                          <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{t}</span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-[hsl(0_0%_10%)]">
                      <span className="text-lg font-black text-primary">{l.price === 0 ? "مجاني" : `${l.price} ر.س`}</span>
                      <Button size="sm" className="gap-1.5 text-xs" onClick={e => { e.stopPropagation(); setSelectedListing(l); }}>
                        <ShoppingCart className="w-3.5 h-3.5" strokeWidth={1.5} />معاينة
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedListing} onOpenChange={() => setSelectedListing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-[hsl(0_0%_6%)] border-[hsl(0_0%_10%)]">
          {selectedListing && (() => {
            const l = selectedListing;
            const trainer = trainerProfiles[l.trainer_id];
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="text-xl text-foreground">{l.title}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant="secondary">{l.difficulty}</Badge>
                    <span className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="w-3.5 h-3.5" strokeWidth={1.5} />{l.duration_weeks} أسبوع</span>
                    <span className="text-sm text-muted-foreground flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />{Number(l.rating_avg || 0).toFixed(1)} ({l.rating_count || 0})</span>
                    <span className="text-sm text-muted-foreground flex items-center gap-1"><Users className="w-3.5 h-3.5" strokeWidth={1.5} />{l.purchase_count || 0} مبيعة</span>
                  </div>

                  {trainer && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-[hsl(0_0%_4%)] border border-[hsl(0_0%_10%)]">
                      {trainer.avatar_url ? (
                        <img src={trainer.avatar_url} className="w-10 h-10 rounded-full object-cover" alt="" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                          {trainer.full_name?.[0]}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-foreground">{trainer.full_name}</p>
                        {trainer.specialization && <p className="text-xs text-muted-foreground">{trainer.specialization}</p>}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="font-medium text-sm mb-1 text-foreground">الوصف</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{l.description || "لا يوجد وصف"}</p>
                  </div>

                  {(l.tags || []).length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2 text-foreground">الوسوم</h4>
                      <div className="flex gap-1.5 flex-wrap">{l.tags.map((t: string) => <Badge key={t} variant="outline" className="border-[hsl(0_0%_15%)]">{t}</Badge>)}</div>
                    </div>
                  )}

                  {(l.equipment || []).length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2 text-foreground">الأدوات المطلوبة</h4>
                      <div className="flex gap-1.5 flex-wrap">{l.equipment.map((e: string) => <Badge key={e} variant="secondary">{e}</Badge>)}</div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="w-4 h-4" strokeWidth={1.5} />
                    <span>{l.purchase_count || 0} مدرب اشترى هذا البرنامج</span>
                  </div>

                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-black text-primary">{l.price === 0 ? "مجاني" : `${l.price} ر.س`}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">شراء فوري — تحميل مباشر</p>
                    </div>
                    <Button onClick={() => handlePurchase(l)} disabled={purchasing} className="gap-2">
                      {purchasing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ShoppingCart className="w-4 h-4" strokeWidth={1.5} />{l.price === 0 ? "حمّل مجاناً" : "اشترِ الآن"}</>}
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Store;
