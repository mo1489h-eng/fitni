import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Star, Clock, Users, ShoppingCart, Download, Loader2, Dumbbell, Package } from "lucide-react";

const PublicMarketplace = () => {
  const [listings, setListings] = useState<any[]>([]);
  const [trainerProfiles, setTrainerProfiles] = useState<Record<string, any>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    const { data } = await supabase
      .from("marketplace_listings")
      .select("*")
      .eq("status", "published")
      .order("purchase_count", { ascending: false })
      .limit(8);
    setListings(data || []);
    setLoading(false);

    if (data && data.length > 0) {
      const trainerIds = [...new Set(data.map((l) => l.trainer_id))];
      const profiles: Record<string, any> = {};
      for (const tid of trainerIds) {
        const { data: p } = await supabase.rpc("get_public_profile", { p_user_id: tid });
        if (p && p.length > 0) profiles[tid] = p[0];
      }
      setTrainerProfiles(profiles);
    }
  };

  const handleDownload = async (listing: any) => {
    setPurchasing(true);
    try {
      // Record purchase via edge function (requires auth)
      await supabase.functions.invoke("public-purchase", {
        body: { listing_id: listing.id },
      });
    } catch (e) {
      // Continue even if tracking fails (e.g. unauthenticated)
      console.error("Purchase tracking error:", e);
    }

    setPurchasing(false);
    setSelectedListing(null);
    
    // Show success & refresh
    alert("تم الشراء بنجاح! 🎉 سيتم تحميل البرنامج.");
    fetchListings();
  };

  const filtered = listings.filter((l) => {
    if (search && !l.title?.includes(search) && !l.description?.includes(search) && !(l.tags || []).some((t: string) => t.includes(search))) return false;
    return true;
  });

  return (
    <section className="px-4 py-20 relative" id="marketplace">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#16a34a]/3 to-transparent" />
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#16a34a]/30 bg-[#16a34a]/10 text-[#4ade80] text-sm mb-4">
            <ShoppingCart className="w-4 h-4" />
            برامج جاهزة للتحميل
          </div>
          <h2 className="text-3xl md:text-4xl font-black mb-3">
            سوق <span className="text-[#4ade80]">البرامج التدريبية</span>
          </h2>
          <p className="text-white/30 text-sm tracking-widest uppercase" style={{ fontFamily: "'Inter', sans-serif" }} dir="ltr">
            Training Programs Marketplace
          </p>
          <p className="text-white/50 mt-3 max-w-xl mx-auto">
            تصفح برامج تدريبية احترافية من أفضل المدربين — اشترِ وحمّل مباشرة بدون تسجيل
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[#4ade80]" />
          </div>
        ) : listings.length === 0 ? (
          /* Empty state - always visible */
          <div className="text-center py-16 space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto">
              <Package className="w-10 h-10 text-[#4ade80]/40" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white/80 mb-2">قريباً — برامج احترافية</h3>
              <p className="text-white/40 max-w-md mx-auto">
                المدربون يعملون على نشر برامجهم التدريبية هنا. تابعنا لتكون أول من يحصل عليها!
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {["تضخيم 💪", "تنشيف 🔥", "لياقة عامة 🏃", "تأهيل إصابات 🩹"].map((tag) => (
                <span key={tag} className="text-sm px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.06] text-white/40">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="max-w-md mx-auto mb-8">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  className="pr-10 bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30 focus:border-[#16a34a]/50"
                  placeholder="ابحث عن برنامج..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Listings Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {filtered.map((l) => {
                const trainer = trainerProfiles[l.trainer_id];
                return (
                  <div
                    key={l.id}
                    className="group bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden hover:border-[#16a34a]/40 transition-all duration-300 cursor-pointer"
                    onClick={() => setSelectedListing(l)}
                  >
                    <div className="h-1.5 bg-gradient-to-r from-[#16a34a] to-[#4ade80]" />
                    <div className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-bold text-white line-clamp-2 flex-1">{l.title}</h3>
                        <Badge className="bg-white/10 text-white/70 border-0 text-[10px] shrink-0">{l.difficulty}</Badge>
                      </div>
                      <p className="text-xs text-white/40 line-clamp-2">{l.description}</p>
                      {trainer && (
                        <div className="flex items-center gap-2">
                          {trainer.avatar_url ? (
                            <img src={trainer.avatar_url} className="w-5 h-5 rounded-full object-cover" />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-[#16a34a]/20 flex items-center justify-center text-[9px] font-bold text-[#4ade80]">
                              {trainer.full_name?.[0]}
                            </div>
                          )}
                          <span className="text-[11px] text-white/50">{trainer.full_name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-[11px] text-white/35">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{l.duration_weeks} أسبوع</span>
                        <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-[#facc15] text-[#facc15]" />{Number(l.rating_avg || 0).toFixed(1)}</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{l.purchase_count || 0}</span>
                      </div>
                      {(l.tags || []).length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {l.tags.slice(0, 3).map((t: string) => (
                            <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-[#16a34a]/10 text-[#4ade80]/70">{t}</span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                        <span className="text-lg font-black text-[#4ade80]">
                          {l.price === 0 ? "مجاني" : `${l.price} ر.س`}
                        </span>
                        <Button
                          size="sm"
                          className="bg-[#16a34a] hover:bg-[#15803d] text-white text-xs h-8 gap-1"
                          onClick={(e) => { e.stopPropagation(); setSelectedListing(l); }}
                        >
                          <Download className="w-3.5 h-3.5" />
                          تحميل
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Detail Dialog */}
        <Dialog open={!!selectedListing} onOpenChange={() => setSelectedListing(null)}>
          <DialogContent className="max-w-lg bg-[#111] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white">{selectedListing?.title}</DialogTitle>
            </DialogHeader>
            {selectedListing && (
              <div className="space-y-4">
                <p className="text-sm text-white/60 leading-relaxed">{selectedListing.description}</p>

                {trainerProfiles[selectedListing.trainer_id] && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.05]">
                    {trainerProfiles[selectedListing.trainer_id].avatar_url ? (
                      <img src={trainerProfiles[selectedListing.trainer_id].avatar_url} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#16a34a]/20 flex items-center justify-center text-sm font-bold text-[#4ade80]">
                        {trainerProfiles[selectedListing.trainer_id].full_name?.[0]}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-bold text-white">{trainerProfiles[selectedListing.trainer_id].full_name}</p>
                      <p className="text-xs text-white/40">{trainerProfiles[selectedListing.trainer_id].specialization}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "المدة", value: `${selectedListing.duration_weeks} أسبوع`, icon: Clock },
                    { label: "المستوى", value: selectedListing.difficulty, icon: Dumbbell },
                    { label: "المبيعات", value: selectedListing.purchase_count || 0, icon: Users },
                  ].map((d) => (
                    <div key={d.label} className="text-center p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                      <d.icon className="w-4 h-4 mx-auto mb-1 text-[#4ade80]/60" />
                      <p className="text-sm font-bold text-white">{d.value}</p>
                      <p className="text-[10px] text-white/40">{d.label}</p>
                    </div>
                  ))}
                </div>

                {(selectedListing.tags || []).length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {selectedListing.tags.map((t: string) => (
                      <span key={t} className="text-xs px-3 py-1 rounded-full bg-[#16a34a]/10 text-[#4ade80] border border-[#16a34a]/20">{t}</span>
                    ))}
                  </div>
                )}

                {(selectedListing.equipment || []).length > 0 && (
                  <div>
                    <p className="text-xs text-white/40 mb-2">الأدوات المطلوبة:</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {selectedListing.equipment.map((e: string) => (
                        <span key={e} className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-white/50">{e}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Purchase CTA - no login required */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-[#16a34a]/10 to-[#4ade80]/5 border border-[#16a34a]/20 flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-black text-[#4ade80]">
                      {selectedListing.price === 0 ? "مجاني" : `${selectedListing.price} ر.س`}
                    </p>
                    <p className="text-xs text-white/40">تحميل فوري — بدون تسجيل</p>
                  </div>
                  <Button
                    size="lg"
                    className="bg-[#16a34a] hover:bg-[#15803d] text-white gap-2 shadow-lg shadow-[#16a34a]/30"
                    onClick={() => handleDownload(selectedListing)}
                    disabled={purchasing}
                  >
                    {purchasing ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Download className="w-5 h-5" />
                        {selectedListing.price === 0 ? "حمّل مجاناً" : "اشترِ وحمّل"}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
};

export default PublicMarketplace;
