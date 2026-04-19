import { useState, useEffect, useContext } from "react";
import { usePortalToken, usePortalPath, PortalBasePathContext } from "@/hooks/usePortalToken";
import { useNavigate } from "react-router-dom";
import ClientPortalLayout from "@/components/ClientPortalLayout";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  BookOpen, Lock, CheckCircle2, ArrowLeft, Layers, ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";
import { getAuthSiteOrigin } from "@/lib/auth-constants";

type PortalLesson = {
  id: string;
  title: string;
  content_type: string;
  content_url: string | null;
  content_text: string | null;
  lesson_order: number;
  completed: boolean;
  file_url?: string | null;
  file_type?: string | null;
  video_url?: string | null;
};

type PortalUnit = {
  id: string;
  title: string;
  description: string | null;
  cover_image_url?: string | null;
  lock_type?: string;
  locked?: boolean;
  time_locked?: boolean;
  pay_locked?: boolean;
  purchased?: boolean;
  is_free?: boolean;
  price?: number;
  audience?: string;
  trainer_id?: string;
  lessons: PortalLesson[];
};

const defaultGradients = [
  "linear-gradient(135deg, hsl(125 18% 22%), hsl(125 18% 32%))",
  "linear-gradient(135deg, hsl(200 35% 18%), hsl(200 35% 28%))",
  "linear-gradient(135deg, hsl(220 12% 18%), hsl(220 12% 26%))",
  "linear-gradient(135deg, hsl(30 40% 18%), hsl(30 40% 28%))",
  "linear-gradient(135deg, hsl(340 25% 18%), hsl(340 25% 26%))",
];

const PortalVault = () => {
  const { token } = usePortalToken();
  const path = usePortalPath();
  const portalBase = useContext(PortalBasePathContext) ?? "portal";
  const navigate = useNavigate();
  const [units, setUnits] = useState<PortalUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [myTrainerId, setMyTrainerId] = useState<string | null>(null);
  const [checkoutUnit, setCheckoutUnit] = useState<string | null>(null);

  const fetchVault = async () => {
    if (!token) return;
    const { data, error } = await supabase.rpc("get_portal_vault", { p_token: token });
    if (!error && data) {
      setUnits(data as unknown as PortalUnit[]);
    }
    const { data: cl } = await supabase
      .from("clients")
      .select("trainer_id")
      .eq("portal_token", token)
      .maybeSingle();
    setMyTrainerId((cl as { trainer_id?: string } | null)?.trainer_id ?? null);
    setLoading(false);
  };

  useEffect(() => { fetchVault(); }, [token]);

  const startPurchase = async (unitId: string) => {
    if (!token) return;
    setCheckoutUnit(unitId);
    try {
      const { data, error } = await supabase.functions.invoke<{
        success?: boolean;
        tap_payment_url?: string;
        error?: string;
      }>("create-vault-checkout", {
        body: {
          unit_id: unitId,
          portal_token: token,
          site_origin: getAuthSiteOrigin(),
          return_base: portalBase,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const url = data?.tap_payment_url;
      if (!url) throw new Error("لم يُرجَع رابط الدفع");
      window.location.assign(url);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "تعذّر بدء الدفع";
      toast.error(msg);
    } finally {
      setCheckoutUnit(null);
    }
  };

  const totalLessons = units.reduce((sum, u) => sum + u.lessons.length, 0);
  const completedLessons = units.reduce((sum, u) => sum + u.lessons.filter(l => l.completed).length, 0);
  const globalPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const findNextLesson = (): { unitId: string; lessonId: string } | null => {
    for (const unit of units) {
      if (unit.locked) continue;
      const sorted = [...unit.lessons].sort((a, b) => a.lesson_order - b.lesson_order);
      const next = sorted.find(l => !l.completed);
      if (next) return { unitId: unit.id, lessonId: next.id };
    }
    return null;
  };
  const nextLesson = findNextLesson();

  const coachUnits = myTrainerId
    ? units.filter((u) => u.trainer_id === myTrainerId)
    : units;
  const platformUnits = myTrainerId
    ? units.filter((u) => u.audience === "platform" && u.trainer_id !== myTrainerId)
    : [];

  const renderUnitCard = (unit: PortalUnit, idx: number) => {
    const completed = unit.lessons.filter(l => l.completed).length;
    const total = unit.lessons.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const isComplete = completed === total && total > 0;
    const isLocked = unit.locked === true;
    const payLocked = unit.pay_locked === true;
    const gradient = defaultGradients[idx % defaultGradients.length];
    const isFreeUnit = unit.is_free !== false && (unit.price == null || Number(unit.price) <= 0);
    const priceNum = Number(unit.price ?? 0);

    return (
      <div
        key={unit.id}
        className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
          isLocked
            ? "border-[hsl(0_0%_8%)] opacity-90"
            : "border-[hsl(0_0%_10%)] hover:border-[hsl(0_0%_18%)] active:scale-[0.98]"
        }`}
      >
        <button
          type="button"
          className="w-full text-right disabled:cursor-not-allowed"
          disabled={isLocked}
          onClick={() => {
            if (isLocked) return;
            const sorted = [...unit.lessons].sort((a, b) => a.lesson_order - b.lesson_order);
            const first = sorted[0];
            if (first) navigate(path(`vault/${unit.id}/${first.id}`));
          }}
        >
          <div
            className="h-28 relative"
            style={unit.cover_image_url ? { backgroundImage: `url(${unit.cover_image_url})`, backgroundSize: "cover", backgroundPosition: "center" } : { background: gradient }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(0_0%_4%)] via-black/30 to-transparent" />
            {isLocked && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none">
                <Lock className="h-6 w-6 text-[hsl(0_0%_60%)]" strokeWidth={1.5} />
              </div>
            )}
            {isComplete && !isLocked && (
              <div className="absolute top-2 left-2">
                <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                  <CheckCircle2 className="h-3.5 w-3.5 text-white" strokeWidth={2} />
                </div>
              </div>
            )}
            <div className="absolute bottom-2 right-2 flex flex-wrap gap-1 justify-end">
              {isFreeUnit ? (
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-600/95 text-white font-medium">مجاني</span>
              ) : (
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-600/95 text-white font-medium tabular-nums">
                  {priceNum} ر.س
                </span>
              )}
            </div>
          </div>
        </button>
        <div className="bg-[hsl(0_0%_6%)] p-3.5 space-y-2">
          <h3 className="font-bold text-white text-sm mb-1 truncate">{unit.title}</h3>
          {payLocked && (
            <Button
              type="button"
              size="sm"
              className="w-full gap-1.5 text-xs"
              disabled={checkoutUnit === unit.id}
              onClick={(e) => {
                e.stopPropagation();
                void startPurchase(unit.id);
              }}
            >
              {checkoutUnit === unit.id ? (
                "جاري التحويل..."
              ) : (
                <>
                  <ShoppingCart className="h-3.5 w-3.5" strokeWidth={1.5} />
                  اشترِ الآن
                </>
              )}
            </Button>
          )}
          {!isLocked && (
            <>
              <div className="flex items-center gap-2 mb-1">
                <Progress value={pct} className="h-1 flex-1 bg-[hsl(0_0%_12%)]" />
                <span className="text-[10px] text-[hsl(0_0%_35%)] shrink-0">{completed}/{total}</span>
              </div>
              <span className="text-[10px] text-[hsl(0_0%_35%)] flex items-center gap-1">
                <Layers className="h-2.5 w-2.5" strokeWidth={1.5} />
                {total} درس
              </span>
            </>
          )}
          {isLocked && unit.time_locked && !payLocked && (
            <p className="text-[10px] text-[hsl(0_0%_40%)]">مقفل حسب جدول المدرب</p>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <ClientPortalLayout>
        <div className="text-center py-20 text-[hsl(0_0%_30%)]">جاري التحميل...</div>
      </ClientPortalLayout>
    );
  }

  return (
    <ClientPortalLayout>
      <div className="space-y-6 animate-fade-in" dir="rtl">
        {units.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-20 w-20 rounded-2xl bg-[hsl(0_0%_8%)] border border-[hsl(0_0%_12%)] flex items-center justify-center mb-5">
              <BookOpen className="h-9 w-9 text-[hsl(0_0%_25%)]" strokeWidth={1.5} />
            </div>
            <p className="text-white font-bold text-lg mb-1">مكتبتك فارغة حالياً</p>
            <p className="text-sm text-[hsl(0_0%_35%)]">سيضيف مدربك محتوى قريباً</p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl bg-gradient-to-br from-[rgba(79,111,82,0.15)] to-[hsl(0_0%_6%)] border border-[hsl(0_0%_12%)] p-5">
              <div className="flex items-center justify-between mb-3">
                <h1 className="text-lg font-bold text-white">المكتبة التعليمية</h1>
                <span className="text-xs text-[hsl(0_0%_45%)]">{globalPct}%</span>
              </div>
              <Progress value={globalPct} className="h-2 mb-3 bg-[hsl(0_0%_12%)]" />
              <div className="flex items-center justify-between">
                <p className="text-sm text-[hsl(0_0%_45%)]">
                  أكملت {completedLessons} من {totalLessons} درساً
                </p>
                {nextLesson && (
                  <Button
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => navigate(path(`vault/${nextLesson.unitId}/${nextLesson.lessonId}`))}
                  >
                    <ArrowLeft className="h-3 w-3" strokeWidth={1.5} />
                    كمّل من حيث توقفت
                  </Button>
                )}
              </div>
            </div>

            {coachUnits.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm font-bold text-[hsl(0_0%_55%)]">من مدربي</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {coachUnits.map((unit, idx) => renderUnitCard(unit, idx))}
                </div>
              </div>
            )}

            {platformUnits.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm font-bold text-[hsl(0_0%_55%)]">من المنصة</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {platformUnits.map((unit, idx) => renderUnitCard(unit, idx + coachUnits.length))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ClientPortalLayout>
  );
};

export default PortalVault;
