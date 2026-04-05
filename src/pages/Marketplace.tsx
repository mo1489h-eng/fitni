import { useState, useEffect, useRef } from "react";
import TrainerLayout from "@/components/TrainerLayout";
import UpgradeModal from "@/components/UpgradeModal";
import TrialBanner from "@/components/TrialBanner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import usePageTitle from "@/hooks/usePageTitle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search, Plus, ShoppingCart, Star, Clock, Users, Filter, TrendingUp, CheckCircle2,
  Loader2, Lock, Package, Banknote, ExternalLink, ImagePlus, Pencil, X
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { uploadImage, validateImageFile } from "@/lib/image-upload";

const CATEGORIES = [
  { value: "weight_loss", label: "انقاص الوزن" },
  { value: "muscle_building", label: "بناء العضل" },
  { value: "general_fitness", label: "لياقة عامة" },
  { value: "nutrition", label: "تغذية" },
  { value: "rehab", label: "تاهيل" },
  { value: "sport_specific", label: "رياضات محددة" },
];

const Marketplace = () => {
  usePageTitle("سوق البرامج");
  const { user } = useAuth();
  const { hasMarketplaceAccess, getProFeatureBlockReason } = usePlanLimits();
  const [listings, setListings] = useState<any[]>([]);
  const [myListings, setMyListings] = useState<any[]>([]);
  const [mySales, setMySales] = useState<any[]>([]);
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
  const [tab, setTab] = useState("browse");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pubForm, setPubForm] = useState({
    program_id: "", title: "", description: "", price: 0,
    difficulty: "متوسط", duration_weeks: 8, tags: "", equipment: "",
    category: "general_fitness"
  });

  useEffect(() => { fetchListings(); fetchPrograms(); if (user) { fetchMyListings(); fetchMySales(); } }, [user]);

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

  const fetchMyListings = async () => {
    if (!user) return;
    const { data } = await supabase.from("marketplace_listings").select("*").eq("trainer_id", user.id).order("created_at", { ascending: false });
    setMyListings(data || []);
  };

  const fetchMySales = async () => {
    if (!user) return;
    const { data } = await supabase.from("marketplace_purchases").select("*").eq("trainer_id", user.id).order("created_at", { ascending: false });
    setMySales(data || []);
  };

  const fetchPrograms = async () => {
    if (!user || !hasMarketplaceAccess) return;
    const { data } = await supabase.from("programs").select("id, name, weeks").eq("trainer_id", user.id);
    setPrograms(data || []);
  };

  const resetForm = () => {
    setPubForm({ program_id: "", title: "", description: "", price: 0, difficulty: "متوسط", duration_weeks: 8, tags: "", equipment: "", category: "general_fitness" });
    setEditingId(null);
    setCoverPreview(null);
    setCoverFile(null);
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateImageFile(file);
    if (err) { toast({ title: "خطأ", description: err, variant: "destructive" }); return; }
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handlePublish = async () => {
    if (!hasMarketplaceAccess) { setShowUpgrade(true); return; }
    if (!user || !pubForm.title) return;

    let previewImages: string[] = [];

    // Upload cover image if selected
    if (coverFile) {
      setUploadingCover(true);
      try {
        const path = `marketplace/${user.id}/${Date.now()}_${coverFile.name}`;
        const result = await uploadImage(coverFile, "fitproject", path);
        previewImages = [result.signedUrl];
      } catch (e: any) {
        toast({ title: "خطأ في رفع الصورة", description: e.message, variant: "destructive" });
        setUploadingCover(false);
        return;
      }
      setUploadingCover(false);
    }

    const payload: any = {
      trainer_id: user.id, program_id: pubForm.program_id || null,
      title: pubForm.title, description: pubForm.description, price: pubForm.price,
      difficulty: pubForm.difficulty, duration_weeks: pubForm.duration_weeks,
      category: pubForm.category,
      tags: pubForm.tags.split(",").map(t => t.trim()).filter(Boolean),
      equipment: pubForm.equipment.split(",").map(t => t.trim()).filter(Boolean),
      status: "published"
    };

    if (previewImages.length > 0) payload.preview_images = previewImages;

    let error;
    if (editingId) {
      const { error: e } = await supabase.from("marketplace_listings").update(payload).eq("id", editingId);
      error = e;
    } else {
      const { error: e } = await supabase.from("marketplace_listings").insert(payload);
      error = e;
    }

    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    toast({ title: editingId ? "تم التحديث بنجاح" : "تم النشر بنجاح" });
    setShowPublish(false);
    resetForm();
    fetchListings(); fetchMyListings();
  };

  const openEditListing = (listing: any) => {
    setEditingId(listing.id);
    setPubForm({
      program_id: listing.program_id || "",
      title: listing.title || "",
      description: listing.description || "",
      price: listing.price || 0,
      difficulty: listing.difficulty || "متوسط",
      duration_weeks: listing.duration_weeks || 8,
      tags: (listing.tags || []).join(", "),
      equipment: (listing.equipment || []).join(", "),
      category: listing.category || "general_fitness",
    });
    setCoverPreview(listing.preview_images?.[0] || null);
    setCoverFile(null);
    setShowPublish(true);
  };

  const handlePurchase = async (listing: any) => {
    if (!user) { toast({ title: "يجب تسجيل الدخول اولا", variant: "destructive" }); return; }
    setPurchasing(listing.id);
    try {
      if (listing.price > 0) {
        // Fetch trainer's tap_destination_id for split payment
        const { data: trainerProfile } = await supabase
          .from("profiles").select("tap_destination_id").eq("user_id", listing.trainer_id).single();

        const destinations = trainerProfile?.tap_destination_id
          ? [{ id: trainerProfile.tap_destination_id, amount: Math.round(listing.price * 0.9 * 100) / 100, currency: listing.currency || "SAR" }]
          : undefined;

        const { data, error: fnError } = await supabase.functions.invoke("create-tap-charge", {
          body: {
            amount: listing.price, currency: listing.currency || "SAR",
            description: `شراء برنامج: ${listing.title}`,
            customer: { name: user.user_metadata?.full_name || "Customer", email: user.email || "" },
            redirect_url: `${window.location.origin}/payment/callback?type=marketplace&listing_id=${listing.id}`,
            metadata: { type: "marketplace", listing_id: listing.id, user_id: user.id },
            destinations,
          },
        });
        if (fnError || !data?.redirect_url) throw new Error(data?.error || "فشل انشاء عملية الدفع");
        window.location.href = data.redirect_url;
        return;
      }
      // Free program
      const { data, error } = await supabase.functions.invoke("public-purchase", { body: { listing_id: listing.id } });
      if (error || !data?.success) throw new Error(data?.error || error?.message || "تعذر اتمام الشراء");
      toast({ title: "تم الشراء بنجاح", description: data.program_cloned ? "تم نسخ البرنامج الى مكتبتك" : "يمكنك الان استخدام البرنامج" });
      setSelectedListing(null); fetchListings();
    } catch (error: any) {
      toast({ title: "خطأ", description: error?.message || "تعذر اتمام الشراء", variant: "destructive" });
    } finally { setPurchasing(null); }
  };

  const toggleListingStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "published" ? "draft" : "published";
    await supabase.from("marketplace_listings").update({ status: newStatus } as any).eq("id", id);
    toast({ title: newStatus === "published" ? "تم النشر" : "تم السحب من المتجر" });
    fetchMyListings(); fetchListings();
  };

  const totalRevenue = mySales.reduce((sum, s) => sum + (s.amount || 0), 0);
  const netRevenue = totalRevenue * 0.9;
  const commission = totalRevenue * 0.1;

  const filtered = listings.filter(l => {
    if (search && !l.title?.includes(search) && !l.description?.includes(search) && !(l.tags || []).some((t: string) => t.includes(search))) return false;
    if (filterDifficulty !== "all" && l.difficulty !== filterDifficulty) return false;
    if (filterGoal !== "all" && !(l.tags || []).some((t: string) => t.includes(filterGoal))) return false;
    if (l.price < priceRange[0] || l.price > priceRange[1]) return false;
    if (filterDuration !== "all") {
      const w = l.duration_weeks || 0;
      if (filterDuration === "short" && w > 4) return false;
      if (filterDuration === "medium" && (w < 5 || w > 8)) return false;
      if (filterDuration === "long" && w < 9) return false;
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
      <div className="space-y-5" dir="rtl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingCart className="w-6 h-6 text-primary" strokeWidth={1.5} />
            <div>
              <h1 className="text-2xl font-bold text-foreground">سوق البرامج</h1>
              <p className="text-xs text-muted-foreground">اشترِ برامج جاهزة أو انشر برامجك للبيع</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-1.5 text-xs bg-transparent border-[hsl(0_0%_10%)]" onClick={() => window.open("/store", "_blank")}>
              <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.5} />المتجر العام
            </Button>
            <Dialog open={showPublish} onOpenChange={o => {
              if (hasMarketplaceAccess) { setShowPublish(o); if (!o) resetForm(); }
              else setShowUpgrade(true);
            }}>
              <DialogTrigger asChild><Button className="gap-1.5"><Plus className="w-4 h-4" strokeWidth={1.5} />نشر برنامج</Button></DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-[hsl(0_0%_6%)] border-[hsl(0_0%_10%)]">
                <DialogHeader><DialogTitle className="text-foreground">{editingId ? "تعديل البرنامج" : "نشر برنامج في المتجر"}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  {/* Cover Image Upload */}
                  <div>
                    <Label>صورة الغلاف</Label>
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleCoverSelect} />
                    {coverPreview ? (
                      <div className="relative mt-2 rounded-xl overflow-hidden border border-[hsl(0_0%_10%)] aspect-video">
                        <img src={coverPreview} className="w-full h-full object-cover" alt="" />
                        <button onClick={() => { setCoverPreview(null); setCoverFile(null); }} className="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center">
                          <X className="w-4 h-4 text-white" strokeWidth={1.5} />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => fileInputRef.current?.click()} className="mt-2 w-full aspect-video rounded-xl border-2 border-dashed border-[hsl(0_0%_15%)] bg-[hsl(0_0%_4%)] flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/40 transition-colors">
                        <ImagePlus className="w-8 h-8" strokeWidth={1.5} />
                        <span className="text-xs">اضغط لاختيار صورة الغلاف</span>
                      </button>
                    )}
                  </div>

                  <div>
                    <Label>اختر برنامج موجود (اختياري)</Label>
                    <Select value={pubForm.program_id} onValueChange={v => {
                      const prog = programs.find(p => p.id === v);
                      setPubForm(f => ({ ...f, program_id: v, title: prog?.name || f.title, duration_weeks: prog?.weeks || f.duration_weeks }));
                    }}>
                      <SelectTrigger className="bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)]"><SelectValue placeholder="اختر برنامج..." /></SelectTrigger>
                      <SelectContent>{programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>اسم البرنامج</Label><Input value={pubForm.title} onChange={e => setPubForm(f => ({ ...f, title: e.target.value }))} className="bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)]" /></div>
                  <div><Label>الوصف التسويقي</Label><Textarea value={pubForm.description} onChange={e => setPubForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="وصف تفصيلي للبرنامج..." className="bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)]" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>السعر (ر.س)</Label><Input type="number" min={0} value={pubForm.price} onChange={e => setPubForm(f => ({ ...f, price: Math.max(0, +e.target.value) }))} className="bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)]" /></div>
                    <div><Label>المدة (اسابيع)</Label><Input type="number" min={1} value={pubForm.duration_weeks} onChange={e => setPubForm(f => ({ ...f, duration_weeks: Math.max(1, +e.target.value) }))} className="bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)]" /></div>
                  </div>
                  <div>
                    <Label>التصنيف</Label>
                    <Select value={pubForm.category} onValueChange={v => setPubForm(f => ({ ...f, category: v }))}>
                      <SelectTrigger className="bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>المستوى</Label>
                    <Select value={pubForm.difficulty} onValueChange={v => setPubForm(f => ({ ...f, difficulty: v }))}>
                      <SelectTrigger className="bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="مبتدئ">مبتدئ</SelectItem>
                        <SelectItem value="متوسط">متوسط</SelectItem>
                        <SelectItem value="متقدم">متقدم</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>الوسوم (مفصولة بفاصلة)</Label><Input value={pubForm.tags} onChange={e => setPubForm(f => ({ ...f, tags: e.target.value }))} placeholder="تضخيم, تنشيف, مبتدئ" className="bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)]" /></div>
                  <div><Label>الادوات المطلوبة (مفصولة بفاصلة)</Label><Input value={pubForm.equipment} onChange={e => setPubForm(f => ({ ...f, equipment: e.target.value }))} placeholder="دمبلز, بار, اجهزة" className="bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)]" /></div>
                  <Button onClick={handlePublish} className="w-full gap-2" disabled={uploadingCover || !pubForm.title}>
                    {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" strokeWidth={1.5} />}
                    {editingId ? "حفظ التعديلات" : "نشر في المتجر"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {!hasMarketplaceAccess && (
          <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-center gap-3">
            <Lock className="w-5 h-5 text-amber-400 shrink-0" strokeWidth={1.5} />
            <div className="flex-1">
              <p className="font-bold text-sm text-foreground">هذه الميزة للباقة الاحترافية</p>
              <p className="text-xs text-muted-foreground">فعّل الاحترافي لنشر برامجك وبيعها</p>
            </div>
            <Button size="sm" onClick={() => setShowUpgrade(true)}>ترقية</Button>
          </div>
        )}

        <Tabs value={tab} onValueChange={setTab} dir="rtl">
          <TabsList className="bg-[hsl(0_0%_6%)] border border-[hsl(0_0%_10%)]">
            <TabsTrigger value="browse" className="gap-1.5 text-xs">
              <Search className="w-3.5 h-3.5" strokeWidth={1.5} />تصفح
            </TabsTrigger>
            <TabsTrigger value="my_listings" className="gap-1.5 text-xs">
              <Package className="w-3.5 h-3.5" strokeWidth={1.5} />برامجي
            </TabsTrigger>
            <TabsTrigger value="sales" className="gap-1.5 text-xs">
              <Banknote className="w-3.5 h-3.5" strokeWidth={1.5} />مبيعاتي
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-4 mt-4">
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                <Input className="pr-10 bg-[hsl(0_0%_6%)] border-[hsl(0_0%_10%)]" placeholder="ابحث عن برنامج..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-36 bg-[hsl(0_0%_6%)] border-[hsl(0_0%_10%)]"><SelectValue placeholder="ترتيب" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">الأحدث</SelectItem>
                  <SelectItem value="popular">الأكثر مبيعاً</SelectItem>
                  <SelectItem value="rating">الأعلى تقييماً</SelectItem>
                  <SelectItem value="price_low">السعر: الأقل</SelectItem>
                  <SelectItem value="price_high">السعر: الأعلى</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => setShowFilters(!showFilters)} className="bg-transparent border-[hsl(0_0%_10%)]">
                <Filter className="w-4 h-4" strokeWidth={1.5} />
              </Button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-[hsl(0_0%_6%)] border border-[hsl(0_0%_10%)]">
                <div>
                  <Label className="text-xs">المستوى</Label>
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
                  <Label className="text-xs">الهدف</Label>
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
                  <Label className="text-xs">المدة</Label>
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
                <div>
                  <Label className="text-xs">السعر: {priceRange[0]}-{priceRange[1]} ر.س</Label>
                  <Slider value={priceRange} onValueChange={setPriceRange} min={0} max={1000} step={50} className="mt-2" />
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <Package className="w-12 h-12 text-muted-foreground/20 mx-auto" strokeWidth={1.5} />
                <p className="text-muted-foreground">لا توجد برامج مطابقة</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {filtered.map(l => {
                  const trainer = trainerProfiles[l.trainer_id];
                  return (
                    <div key={l.id} className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] p-5 space-y-3 cursor-pointer hover:border-primary/40 transition-all duration-200 hover:-translate-y-0.5" onClick={() => setSelectedListing(l)}>
                      <div className="flex items-start justify-between">
                        <h3 className="font-bold text-foreground line-clamp-2">{l.title}</h3>
                        <Badge variant="secondary" className="text-[10px] shrink-0">{l.difficulty}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{l.description}</p>
                      {trainer && (
                        <div className="flex items-center gap-2">
                          {trainer.avatar_url ? <img src={trainer.avatar_url} className="w-5 h-5 rounded-full object-cover" alt="" /> : <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary">{trainer.full_name?.[0]}</div>}
                          <span className="text-xs text-muted-foreground">{trainer.full_name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" strokeWidth={1.5} />{l.duration_weeks} أسبوع</span>
                        <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-amber-400 text-amber-400" />{Number(l.rating_avg || 0).toFixed(1)}</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" strokeWidth={1.5} />{l.purchase_count || 0}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-[hsl(0_0%_10%)]">
                        <span className="text-lg font-black text-primary">{l.price === 0 ? "مجاني" : `${l.price} ر.س`}</span>
                        {l.trainer_id !== user?.id ? (
                          <Button size="sm" className="text-xs gap-1" onClick={e => { e.stopPropagation(); handlePurchase(l); }} disabled={purchasing === l.id}>
                            {purchasing === l.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><ShoppingCart className="w-3.5 h-3.5" strokeWidth={1.5} />شراء</>}
                          </Button>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">برنامجك</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="my_listings" className="space-y-4 mt-4">
            {myListings.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <Package className="w-12 h-12 text-muted-foreground/20 mx-auto" strokeWidth={1.5} />
                <p className="text-muted-foreground">لم تنشر أي برنامج بعد</p>
                <Button onClick={() => hasMarketplaceAccess ? setShowPublish(true) : setShowUpgrade(true)} className="gap-2">
                  <Plus className="w-4 h-4" strokeWidth={1.5} />نشر برنامجك الأول
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {myListings.map(l => (
                  <div key={l.id} className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] p-4 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-foreground truncate">{l.title}</h3>
                        <Badge variant={l.status === "published" ? "default" : "secondary"} className="text-[10px] shrink-0">
                          {l.status === "published" ? "منشور" : "مسودة"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span>{l.price === 0 ? "مجاني" : `${l.price} ر.س`}</span>
                        <span>{l.purchase_count || 0} مبيعة</span>
                        <span>{l.difficulty}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="text-xs bg-transparent border-[hsl(0_0%_10%)] gap-1" onClick={() => openEditListing(l)}>
                        <Pencil className="w-3 h-3" strokeWidth={1.5} />تعديل
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs bg-transparent border-[hsl(0_0%_10%)]" onClick={() => toggleListingStatus(l.id, l.status)}>
                        {l.status === "published" ? "سحب" : "نشر"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sales" className="space-y-4 mt-4">
            {/* Revenue cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">إجمالي المبيعات</p>
                <p className="text-xl font-black text-foreground tabular-nums">{totalRevenue} ر.س</p>
              </div>
              <div className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">صافي الأرباح</p>
                <p className="text-xl font-black text-primary tabular-nums">{netRevenue.toFixed(0)} ر.س</p>
              </div>
              <div className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">العمولة (10%)</p>
                <p className="text-xl font-black text-muted-foreground tabular-nums">{commission.toFixed(0)} ر.س</p>
              </div>
            </div>

            {mySales.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <Banknote className="w-12 h-12 text-muted-foreground/20 mx-auto" strokeWidth={1.5} />
                <p className="text-muted-foreground">لا توجد مبيعات بعد</p>
                <p className="text-xs text-muted-foreground">انشر برنامجاً في المتجر وشاركه مع جمهورك</p>
              </div>
            ) : (
              <div className="space-y-2">
                {mySales.map(s => (
                  <div key={s.id} className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">عملية شراء</p>
                      <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString("ar-SA")}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-primary tabular-nums">{s.amount} ر.س</p>
                      <p className="text-[10px] text-muted-foreground">صافي: {(s.amount * (1 - s.commission_rate)).toFixed(0)} ر.س</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Detail dialog */}
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
                    </div>
                    {trainer && (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-[hsl(0_0%_4%)] border border-[hsl(0_0%_10%)]">
                        {trainer.avatar_url ? <img src={trainer.avatar_url} className="w-10 h-10 rounded-full object-cover" alt="" /> : <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">{trainer.full_name?.[0]}</div>}
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
                    {(l.tags || []).length > 0 && <div className="flex gap-1 flex-wrap">{l.tags.map((t: string) => <Badge key={t} variant="outline" className="border-[hsl(0_0%_15%)]">{t}</Badge>)}</div>}
                    {(l.equipment || []).length > 0 && (
                      <div>
                        <h4 className="font-medium text-xs mb-1.5 text-foreground">الأدوات المطلوبة</h4>
                        <div className="flex gap-1 flex-wrap">{l.equipment.map((e: string) => <Badge key={e} variant="secondary" className="text-[10px]">{e}</Badge>)}</div>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <TrendingUp className="w-4 h-4" strokeWidth={1.5} />
                      <span>{l.purchase_count || 0} مدرب اشترى هذا البرنامج</span>
                    </div>
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between">
                      <span className="text-2xl font-black text-primary">{l.price === 0 ? "مجاني" : `${l.price} ر.س`}</span>
                      {l.trainer_id !== user?.id ? (
                        <Button onClick={() => handlePurchase(l)} disabled={purchasing === l.id} className="gap-2">
                          {purchasing === l.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ShoppingCart className="w-4 h-4" strokeWidth={1.5} />شراء</>}
                        </Button>
                      ) : (
                        <Badge variant="secondary" className="py-1.5 px-3"><CheckCircle2 className="w-4 h-4 ml-1" strokeWidth={1.5} />برنامجك</Badge>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>
      <UpgradeModal open={showUpgrade} onOpenChange={setShowUpgrade} title={getProFeatureBlockReason().title} description={getProFeatureBlockReason().description} ctaText="ترقية للاحترافي" secondaryText="لاحقاً" onUpgrade={() => { setShowUpgrade(false); setShowPlans(true); }} />
      <TrialBanner showPlans={showPlans} onShowPlansChange={setShowPlans} />
    </TrainerLayout>
  );
};

export default Marketplace;
