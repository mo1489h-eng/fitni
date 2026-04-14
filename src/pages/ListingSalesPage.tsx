import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import usePageTitle from "@/hooks/usePageTitle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Star, Clock, Users, ShoppingCart, Loader2, Dumbbell, ArrowRight,
  Calendar, Package, ChevronRight
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { createPaymentSession } from "@/services/payments";

const ListingSalesPage = () => {
  const { listingId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listing, setListing] = useState<any>(null);
  const [trainer, setTrainer] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [myReview, setMyReview] = useState({ rating: 0, text: "" });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);

  usePageTitle(listing?.title || "تفاصيل البرنامج");

  useEffect(() => {
    if (listingId) fetchData();
  }, [listingId, user]);

  const fetchData = async () => {
    const { data: l } = await supabase
      .from("marketplace_listings")
      .select("*")
      .eq("id", listingId)
      .eq("status", "published")
      .single();

    if (!l) { setLoading(false); return; }
    setListing(l);

    const [trainerRes, reviewsRes] = await Promise.all([
      supabase.rpc("get_public_profile", { p_user_id: l.trainer_id }),
      supabase.from("marketplace_reviews").select("*").eq("listing_id", listingId!).order("created_at", { ascending: false }),
    ]);

    if (trainerRes.data && trainerRes.data.length > 0) setTrainer(trainerRes.data[0]);
    setReviews(reviewsRes.data || []);

    if (user) {
      const { data: purchase } = await supabase
        .from("marketplace_purchases").select("id")
        .eq("listing_id", listingId!).eq("buyer_id", user.id).eq("status", "completed").maybeSingle();
      setHasPurchased(!!purchase);

      const existing = (reviewsRes.data || []).find((r: any) => r.reviewer_id === user.id);
      if (existing) setMyReview({ rating: existing.rating, text: existing.review_text || "" });
    }
    setLoading(false);
  };

  const handlePurchase = async () => {
    if (!user) { navigate("/login"); return; }
    if (!listing) return;
    setPurchasing(true);
    try {
      if (listing.price > 0) {
        const { payment_url } = await createPaymentSession({
          amount: listing.price,
          currency: listing.currency || "SAR",
          description: `شراء برنامج: ${listing.title}`,
          customer: { name: user.user_metadata?.full_name || "Customer", email: user.email || "" },
          redirectUrl: `${window.location.origin}/payment/callback?type=marketplace&listing_id=${listing.id}`,
          metadata: {
            type: "marketplace",
            listing_id: listing.id,
            user_id: user.id,
            trainer_id: listing.trainer_id,
            reference_id: listing.id,
          },
        });
        window.location.href = payment_url;
        return;
      }
      const { data, error } = await supabase.functions.invoke("public-purchase", { body: { listing_id: listing.id } });
      if (error || !data?.success) throw new Error(data?.error || "فشل الشراء");
      toast({ title: "تم الشراء بنجاح", description: "تم نسخ البرنامج" });
      fetchData();
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally { setPurchasing(false); }
  };

  const handleSubmitReview = async () => {
    if (!user || !listing || myReview.rating < 1) return;
    setSubmittingReview(true);
    try {
      const { error } = await supabase.from("marketplace_reviews").upsert({
        listing_id: listing.id,
        reviewer_id: user.id,
        rating: myReview.rating,
        review_text: myReview.text.trim() || null,
      } as any, { onConflict: "listing_id,reviewer_id" });
      if (error) throw error;
      toast({ title: "تم ارسال التقييم" });
      fetchData();
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally { setSubmittingReview(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-[hsl(0_0%_2%)] flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  if (!listing) return (
    <div className="min-h-screen bg-[hsl(0_0%_2%)] flex items-center justify-center text-center" dir="rtl">
      <div className="space-y-4">
        <Package className="w-16 h-16 text-muted-foreground/20 mx-auto" strokeWidth={1.5} />
        <h2 className="text-xl font-bold text-foreground">البرنامج غير موجود</h2>
        <Button variant="outline" onClick={() => navigate("/store")} className="gap-2">
          <ArrowRight className="w-4 h-4" strokeWidth={1.5} />العودة للمتجر
        </Button>
      </div>
    </div>
  );

  const coverImage = listing.preview_images?.[0];
  const categoryLabels: Record<string, string> = {
    weight_loss: "انقاص الوزن", muscle_building: "بناء العضل", general_fitness: "لياقة عامة",
    nutrition: "تغذية", rehab: "تاهيل", sport_specific: "رياضات محددة", general: "عام",
  };

  return (
    <div className="min-h-screen bg-[hsl(0_0%_2%)] text-foreground" dir="rtl">
      {/* Breadcrumb */}
      <div className="max-w-4xl mx-auto px-4 pt-6">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <button onClick={() => navigate("/store")} className="hover:text-foreground transition-colors">المتجر</button>
          <ChevronRight className="w-3 h-3 rotate-180" strokeWidth={1.5} />
          <span className="text-foreground truncate">{listing.title}</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {coverImage && (
              <div className="rounded-xl overflow-hidden border border-[hsl(0_0%_10%)] aspect-video">
                <img src={coverImage} alt={listing.title} className="w-full h-full object-cover" />
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <Badge variant="secondary">{listing.difficulty}</Badge>
                <Badge variant="outline" className="border-[hsl(0_0%_15%)]">{categoryLabels[listing.category] || listing.category}</Badge>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-foreground mb-3">{listing.title}</h1>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{listing.description || "لا يوجد وصف"}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Clock, label: "المدة", value: `${listing.duration_weeks} اسبوع` },
                { icon: Dumbbell, label: "المستوى", value: listing.difficulty },
                { icon: Users, label: "المبيعات", value: listing.purchase_count || 0 },
              ].map(s => (
                <div key={s.label} className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] p-4 text-center">
                  <s.icon className="w-5 h-5 mx-auto mb-2 text-primary/60" strokeWidth={1.5} />
                  <p className="text-sm font-bold text-foreground">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            {(listing.tags || []).length > 0 && (
              <div>
                <h3 className="font-bold text-sm mb-2 text-foreground">الوسوم</h3>
                <div className="flex gap-1.5 flex-wrap">
                  {listing.tags.map((t: string) => <Badge key={t} variant="outline" className="border-[hsl(0_0%_15%)]">{t}</Badge>)}
                </div>
              </div>
            )}

            {(listing.equipment || []).length > 0 && (
              <div>
                <h3 className="font-bold text-sm mb-2 text-foreground">الادوات المطلوبة</h3>
                <div className="flex gap-1.5 flex-wrap">
                  {listing.equipment.map((e: string) => <Badge key={e} variant="secondary">{e}</Badge>)}
                </div>
              </div>
            )}

            {/* Reviews */}
            <div>
              <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                التقييمات ({listing.rating_count || 0})
              </h3>

              {hasPurchased && (
                <div className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] p-4 mb-4 space-y-3">
                  <p className="text-sm font-medium text-foreground">قيّم البرنامج</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(s => (
                      <button key={s} onClick={() => setMyReview(r => ({ ...r, rating: s }))}>
                        <Star className={`w-6 h-6 transition-colors ${s <= myReview.rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
                      </button>
                    ))}
                  </div>
                  <Textarea
                    value={myReview.text}
                    onChange={e => setMyReview(r => ({ ...r, text: e.target.value }))}
                    placeholder="اكتب تعليقك (اختياري)..."
                    rows={2}
                    className="bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)]"
                  />
                  <Button size="sm" onClick={handleSubmitReview} disabled={myReview.rating < 1 || submittingReview}>
                    {submittingReview ? <Loader2 className="w-4 h-4 animate-spin" /> : "ارسال التقييم"}
                  </Button>
                </div>
              )}

              {reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">لا توجد تقييمات بعد</p>
              ) : (
                <div className="space-y-3">
                  {reviews.map(r => (
                    <div key={r.id} className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] p-4">
                      <div className="flex items-center gap-1 mb-1">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/20"}`} />
                        ))}
                        <span className="text-[10px] text-muted-foreground mr-2">{new Date(r.created_at).toLocaleDateString("ar-SA")}</span>
                      </div>
                      {r.review_text && <p className="text-sm text-muted-foreground">{r.review_text}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Trainer card */}
            {trainer && (
              <div className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] p-5 space-y-3">
                <div className="flex items-center gap-3">
                  {trainer.avatar_url ? (
                    <img src={trainer.avatar_url} className="w-12 h-12 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                      {trainer.full_name?.[0]}
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-foreground">{trainer.full_name}</p>
                    {trainer.specialization && <p className="text-xs text-muted-foreground">{trainer.specialization}</p>}
                  </div>
                </div>
                {trainer.username && (
                  <Button variant="outline" size="sm" className="w-full text-xs bg-transparent border-[hsl(0_0%_10%)]" onClick={() => navigate(`/t/${trainer.username}`)}>
                    زيارة صفحة المدرب
                  </Button>
                )}
              </div>
            )}

            {/* Price card */}
            <div className="bg-[hsl(0_0%_6%)] rounded-xl border border-primary/20 p-5 space-y-4 sticky top-4">
              <div className="text-center">
                <p className="text-3xl font-black text-primary">
                  {listing.price === 0 ? "مجاني" : `${listing.price} ر.س`}
                </p>
                <p className="text-xs text-muted-foreground mt-1">شراء فوري</p>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{Number(listing.rating_avg || 0).toFixed(1)} ({listing.rating_count || 0} تقييم)</span>
              </div>

              {hasPurchased ? (
                <Button className="w-full gap-2" variant="secondary" disabled>
                  تم الشراء
                </Button>
              ) : (
                <Button className="w-full gap-2" onClick={handlePurchase} disabled={purchasing}>
                  {purchasing ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                    <>
                      <ShoppingCart className="w-4 h-4" strokeWidth={1.5} />
                      {listing.price === 0 ? "حمّل مجانا" : "اشتر الان"}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingSalesPage;
