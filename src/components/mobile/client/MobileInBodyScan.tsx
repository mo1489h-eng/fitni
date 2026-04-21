import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Calculator,
  Camera,
  Check,
  Dumbbell,
  Edit3,
  Heart,
  Loader2,
  PenLine,
  Save,
  Scale,
  ScanLine,
  Upload,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ACCENT = "#4F6F52";
const ACCENT_SOFT = "rgba(79,111,82,0.12)";
const CARD_BG = "#111111";
const CARD_BORDER = "rgba(255,255,255,0.06)";
const INPUT_BG = "#0A0A0A";
const MUTED = "#888";
const FAINT = "#555";

const ACTIVITY_LEVELS = [
  { value: "sedentary", label: "خامل", multiplier: 1.2 },
  { value: "light", label: "نشاط خفيف", multiplier: 1.375 },
  { value: "moderate", label: "نشاط متوسط", multiplier: 1.55 },
  { value: "high", label: "نشاط عالي", multiplier: 1.725 },
  { value: "extreme", label: "نشاط مكثف", multiplier: 1.9 },
];

type Mode = "closed" | "choose" | "ocr-loading" | "review" | "manual";

type ScanResult = {
  bmi: number;
  bodyFat: number;
  muscleMass: number;
  bmr: number;
  tdee: number;
  idealWeightMin: number;
  idealWeightMax: number;
  waterPercentage?: number;
  visceralFat?: number;
};

function calculate(
  height: number,
  weight: number,
  age: number,
  gender: string,
  activity: string,
  waist?: number,
  neck?: number,
  hip?: number,
): ScanResult {
  const hM = height / 100;
  const bmi = weight / (hM * hM);
  let bf: number;
  if (waist && neck && (gender === "male" || (gender === "female" && hip))) {
    bf =
      gender === "male"
        ? 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450
        : 495 /
            (1.29579 - 0.35004 * Math.log10(waist + (hip || 0) - neck) + 0.221 * Math.log10(height)) -
          450;
  } else {
    bf = gender === "male" ? 1.2 * bmi + 0.23 * age - 16.2 : 1.2 * bmi + 0.23 * age - 5.4;
  }
  bf = Math.max(3, Math.min(bf, 60));
  const muscleMass = weight * (1 - bf / 100);
  const bmr =
    gender === "male"
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;
  const tdee = bmr * (ACTIVITY_LEVELS.find((a) => a.value === activity)?.multiplier || 1.2);
  return {
    bmi: Math.round(bmi * 10) / 10,
    bodyFat: Math.round(bf * 10) / 10,
    muscleMass: Math.round(muscleMass * 10) / 10,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    idealWeightMin: Math.round(18.5 * hM * hM),
    idealWeightMax: Math.round(24.9 * hM * hM),
  };
}

function bmiCategory(bmi: number): { label: string; color: string; border: string } {
  if (bmi < 18.5) return { label: "نقص في الوزن", color: "#60A5FA", border: "#60A5FA" };
  if (bmi < 25) return { label: "وزن طبيعي", color: ACCENT, border: ACCENT };
  if (bmi < 30) return { label: "زيادة في الوزن", color: "#F59E0B", border: "#F59E0B" };
  return { label: "سمنة", color: "#EF4444", border: "#EF4444" };
}

type Props = {
  token: string | null | undefined;
};

const MobileInBodyScan = ({ token }: Props) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<Mode>("closed");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [activityLevel, setActivityLevel] = useState("sedentary");
  const [waist, setWaist] = useState("");
  const [neck, setNeck] = useState("");
  const [hip, setHip] = useState("");
  const [waterPct, setWaterPct] = useState("");
  const [visceralFat, setVisceralFat] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [editMode, setEditMode] = useState(false);

  const open = mode !== "closed";

  const reset = () => {
    setMode("closed");
    setResult(null);
    setEditMode(false);
    setHeight("");
    setWeight("");
    setAge("");
    setGender("male");
    setActivityLevel("sedentary");
    setWaist("");
    setNeck("");
    setHip("");
    setWaterPct("");
    setVisceralFat("");
  };

  const handleOcrUpload = async (file: File) => {
    setMode("ocr-loading");
    try {
      const base64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("تعذّر قراءة الصورة"));
        reader.readAsDataURL(file);
      });
      const { data, error } = await supabase.functions.invoke("ocr-body-scan", {
        body: { image_base64: base64 },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) {
        toast({
          title: "تعذّر قراءة التقرير",
          description: (data as { error?: string }).error,
          variant: "destructive",
        });
        setMode("choose");
        return;
      }
      const d = (data as { data?: Record<string, unknown> })?.data;
      if (!d) {
        toast({
          title: "تعذّر قراءة التقرير",
          description: "لم يتم استخراج أي بيانات من الصورة",
          variant: "destructive",
        });
        setMode("choose");
        return;
      }

      if (d.height != null) setHeight(String(d.height));
      if (d.weight != null) setWeight(String(d.weight));
      if (d.age != null) setAge(String(d.age));
      if (d.gender) setGender(d.gender === "female" ? "female" : "male");
      if (d.water_percentage != null) setWaterPct(String(d.water_percentage));
      if (d.visceral_fat != null) setVisceralFat(String(d.visceral_fat));

      const hVal = Number(d.height ?? 0);
      const scan: ScanResult = {
        bmi: Number(d.bmi ?? 0),
        bodyFat: Number(d.body_fat ?? 0),
        muscleMass: Number(d.muscle_mass ?? 0),
        bmr: Number(d.bmr ?? 0),
        tdee: Number(d.bmr ?? 0) * 1.2,
        idealWeightMin: hVal ? Math.round(18.5 * (hVal / 100) ** 2) : 0,
        idealWeightMax: hVal ? Math.round(24.9 * (hVal / 100) ** 2) : 0,
        waterPercentage: d.water_percentage != null ? Number(d.water_percentage) : undefined,
        visceralFat: d.visceral_fat != null ? Number(d.visceral_fat) : undefined,
      };
      setResult(scan);
      setMode("review");
    } catch (err) {
      toast({
        title: "خطأ في القراءة",
        description: err instanceof Error ? err.message : "حاول مرة أخرى",
        variant: "destructive",
      });
      setMode("choose");
    }
  };

  const handleCalculate = () => {
    if (!height || !weight || !age) return;
    const r = calculate(
      parseFloat(height),
      parseFloat(weight),
      parseInt(age),
      gender,
      activityLevel,
      waist ? parseFloat(waist) : undefined,
      neck ? parseFloat(neck) : undefined,
      hip ? parseFloat(hip) : undefined,
    );
    r.waterPercentage = waterPct ? parseFloat(waterPct) : undefined;
    r.visceralFat = visceralFat ? parseFloat(visceralFat) : undefined;
    setResult(r);
    setMode("review");
  };

  const saveScan = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error("رمز البوابة مفقود");
      if (!result) throw new Error("لا توجد نتيجة لحفظها");
      const r = result;
      const { error } = await supabase.rpc("insert_portal_body_scan" as never, {
        p_token: token,
        p_height: height ? parseFloat(height) : null,
        p_weight: weight ? parseFloat(weight) : null,
        p_age: age ? parseInt(age) : null,
        p_gender: gender,
        p_activity_level: activityLevel,
        p_waist: waist ? parseFloat(waist) : null,
        p_neck: neck ? parseFloat(neck) : null,
        p_hip: hip ? parseFloat(hip) : null,
        p_bmi: r.bmi,
        p_body_fat: r.bodyFat,
        p_muscle_mass: r.muscleMass,
        p_bmr: r.bmr,
        p_tdee: r.tdee,
        p_ideal_weight_min: r.idealWeightMin,
        p_ideal_weight_max: r.idealWeightMax,
        p_water_percentage: r.waterPercentage ?? (waterPct ? parseFloat(waterPct) : null),
        p_visceral_fat: r.visceralFat ?? (visceralFat ? parseFloat(visceralFat) : null),
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobile-portal-body-scans", token] });
      queryClient.invalidateQueries({ queryKey: ["portal-body-scans", token] });
      toast({ title: "تم حفظ نتائج الفحص" });
      reset();
    },
    onError: (err) => {
      toast({
        title: "تعذّر حفظ الفحص",
        description: err instanceof Error ? err.message : "حاول مرة أخرى",
        variant: "destructive",
      });
    },
  });

  const cat = result ? bmiCategory(result.bmi) : null;

  return (
    <>
      {/* Entry card shown inside تقدمي tab */}
      <div
        className="rounded-2xl p-4"
        style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
      >
        <div className="mb-3 flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: ACCENT_SOFT }}
          >
            <ScanLine className="h-4 w-4" style={{ color: ACCENT }} strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white">مسح InBody</p>
            <p className="text-[11px] leading-tight" style={{ color: MUTED }}>
              صوّر تقرير InBody وسنقرأ أرقامك تلقائياً
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="flex h-[52px] items-center justify-center gap-2 rounded-xl text-sm font-bold text-white transition active:scale-[0.98]"
            style={{ background: ACCENT }}
            onClick={() => setMode("choose")}
          >
            <Camera className="h-4 w-4" strokeWidth={1.75} />
            إضافة نتيجة InBody
          </button>
          <button
            type="button"
            className="flex h-[52px] items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white transition active:scale-[0.98]"
            style={{ background: INPUT_BG, border: `1px solid ${CARD_BORDER}` }}
            onClick={() => {
              setMode("manual");
            }}
          >
            <PenLine className="h-4 w-4" strokeWidth={1.75} />
            إدخال يدوي
          </button>
        </div>
      </div>

      {/* Hidden inputs — rely on native file picker / capture */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) handleOcrUpload(f);
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) handleOcrUpload(f);
        }}
      />

      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) reset();
        }}
      >
        <DialogContent
          dir="rtl"
          className="max-h-[92vh] max-w-md overflow-y-auto p-5"
          style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-white">
              <ScanLine className="h-4 w-4" style={{ color: ACCENT }} strokeWidth={1.75} />
              {mode === "manual" && !result
                ? "إدخال يدوي"
                : mode === "review"
                  ? "مراجعة النتائج"
                  : "مسح InBody"}
            </DialogTitle>
          </DialogHeader>

          {mode === "choose" && (
            <div className="space-y-3 pt-2">
              <p className="text-[12px]" style={{ color: MUTED }}>
                اختر طريقة الإضافة:
              </p>
              <ActionRow
                icon={Camera}
                title="التقط صورة بالكاميرا"
                subtitle="صوّر تقرير InBody مباشرةً"
                onClick={() => cameraInputRef.current?.click()}
              />
              <ActionRow
                icon={Upload}
                title="اختر من المعرض"
                subtitle="ارفع صورة أو ملف PDF"
                onClick={() => galleryInputRef.current?.click()}
              />
              <ActionRow
                icon={PenLine}
                title="أدخل البيانات يدوياً"
                subtitle="إذا لم يتوفر تقرير InBody"
                onClick={() => setMode("manual")}
              />
            </div>
          )}

          {mode === "ocr-loading" && (
            <div className="space-y-4 py-10 text-center">
              <div className="relative mx-auto h-20 w-20">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{ border: `2px solid ${ACCENT_SOFT}` }}
                />
                <div
                  className="absolute inset-0 animate-spin rounded-full border-2 border-transparent"
                  style={{ borderTopColor: ACCENT }}
                />
                <div
                  className="absolute inset-3 flex items-center justify-center rounded-full"
                  style={{ background: ACCENT_SOFT }}
                >
                  <ScanLine className="h-6 w-6 animate-pulse" style={{ color: ACCENT }} strokeWidth={1.75} />
                </div>
              </div>
              <p className="text-sm font-medium text-white">الذكاء الاصطناعي يحلّل تقريرك…</p>
              <p className="text-[11px]" style={{ color: MUTED }}>
                نستخرج الوزن، نسبة الدهون، والكتلة العضلية
              </p>
            </div>
          )}

          {mode === "manual" && !result && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <LabeledInput label="الطول (سم)" placeholder="170" value={height} setValue={setHeight} />
                <LabeledInput label="الوزن (كجم)" placeholder="75" value={weight} setValue={setWeight} />
                <LabeledInput label="العمر" placeholder="25" value={age} setValue={setAge} />
                <div>
                  <label className="mb-1 block text-[11px]" style={{ color: MUTED }}>
                    الجنس
                  </label>
                  <Select value={gender} onValueChange={(v) => setGender(v as "male" | "female")}>
                    <SelectTrigger
                      className="h-11 text-white"
                      style={{ background: INPUT_BG, borderColor: CARD_BORDER }}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">ذكر</SelectItem>
                      <SelectItem value="female">أنثى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px]" style={{ color: MUTED }}>
                  مستوى النشاط
                </label>
                <Select value={activityLevel} onValueChange={setActivityLevel}>
                  <SelectTrigger
                    className="h-11 text-white"
                    style={{ background: INPUT_BG, borderColor: CARD_BORDER }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_LEVELS.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <details className="rounded-xl p-3" style={{ background: INPUT_BG, border: `1px solid ${CARD_BORDER}` }}>
                <summary className="cursor-pointer text-[11px] font-medium" style={{ color: MUTED }}>
                  قياسات إضافية (اختياري)
                </summary>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <LabeledInput label="الخصر (سم)" value={waist} setValue={setWaist} small />
                  <LabeledInput label="الرقبة (سم)" value={neck} setValue={setNeck} small />
                  {gender === "female" ? (
                    <LabeledInput label="الورك (سم)" value={hip} setValue={setHip} small />
                  ) : null}
                  <LabeledInput label="نسبة الماء %" value={waterPct} setValue={setWaterPct} small />
                  <LabeledInput label="الدهون الحشوية" value={visceralFat} setValue={setVisceralFat} small />
                </div>
              </details>

              <Button
                className="h-12 w-full gap-2 text-sm font-bold"
                style={{ background: ACCENT, color: "#fff" }}
                onClick={handleCalculate}
                disabled={!height || !weight || !age}
              >
                <Calculator className="h-4 w-4" strokeWidth={1.75} />
                احسب الآن
              </Button>
            </div>
          )}

          {mode === "review" && result && cat && (
            <div className="space-y-4 pt-2">
              {/* Hero BMI ring */}
              <div className="flex flex-col items-center gap-1">
                <div
                  className="flex h-24 w-24 items-center justify-center rounded-full"
                  style={{ border: `3px solid ${cat.border}` }}
                >
                  <div className="text-center">
                    <p className="text-2xl font-black text-white tabular-nums">{result.bmi}</p>
                    <p className="text-[9px]" style={{ color: MUTED }}>
                      BMI
                    </p>
                  </div>
                </div>
                <p className="text-sm font-bold" style={{ color: cat.color }}>
                  {cat.label}
                </p>
              </div>

              {/* Metrics grid */}
              <div className="grid grid-cols-2 gap-2">
                <MetricCard
                  icon={Scale}
                  label="الوزن"
                  value={`${weight || "—"} كجم`}
                  editable={editMode}
                  numericValue={weight}
                  onNumericChange={setWeight}
                />
                <MetricCard
                  icon={Activity}
                  label="نسبة الدهون"
                  value={`${result.bodyFat}%`}
                  editable={editMode}
                  numericValue={String(result.bodyFat)}
                  onNumericChange={(v) =>
                    setResult((prev) => (prev ? { ...prev, bodyFat: parseFloat(v) || 0 } : prev))
                  }
                />
                <MetricCard
                  icon={Dumbbell}
                  label="الكتلة العضلية"
                  value={`${result.muscleMass} كجم`}
                  editable={editMode}
                  numericValue={String(result.muscleMass)}
                  onNumericChange={(v) =>
                    setResult((prev) => (prev ? { ...prev, muscleMass: parseFloat(v) || 0 } : prev))
                  }
                />
                <MetricCard
                  icon={Heart}
                  label="معدل الأيض"
                  value={`${result.bmr.toLocaleString()} سعرة`}
                  editable={editMode}
                  numericValue={String(result.bmr)}
                  onNumericChange={(v) =>
                    setResult((prev) => (prev ? { ...prev, bmr: parseFloat(v) || 0 } : prev))
                  }
                />
                {result.waterPercentage != null ? (
                  <MetricCard icon={Activity} label="نسبة الماء" value={`${result.waterPercentage}%`} />
                ) : null}
                {result.visceralFat != null ? (
                  <MetricCard icon={Activity} label="الدهون الحشوية" value={String(result.visceralFat)} />
                ) : null}
              </div>

              <div className="rounded-xl p-3" style={{ background: INPUT_BG, border: `1px solid ${CARD_BORDER}` }}>
                <p className="text-[11px]" style={{ color: MUTED }}>
                  الوزن المثالي: <span className="text-white">{result.idealWeightMin}–{result.idealWeightMax} كجم</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  className="h-12 gap-2 text-sm font-bold"
                  style={{ background: ACCENT, color: "#fff" }}
                  onClick={() => saveScan.mutate()}
                  disabled={saveScan.isPending}
                >
                  {saveScan.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" strokeWidth={1.75} />
                  )}
                  تأكيد وحفظ
                </Button>
                <Button
                  variant="outline"
                  className="h-12 gap-2 text-sm font-semibold text-white"
                  style={{ background: INPUT_BG, borderColor: CARD_BORDER }}
                  onClick={() => setEditMode((v) => !v)}
                >
                  {editMode ? <Check className="h-4 w-4" strokeWidth={1.75} /> : <Edit3 className="h-4 w-4" strokeWidth={1.75} />}
                  {editMode ? "انتهيت من التعديل" : "تعديل"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

/* ─────────── small sub-components ─────────── */

function ActionRow({
  icon: Icon,
  title,
  subtitle,
  onClick,
}: {
  icon: typeof Camera;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl p-4 text-right transition active:scale-[0.99]"
      style={{ background: INPUT_BG, border: `1px solid ${CARD_BORDER}` }}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ background: ACCENT_SOFT }}
      >
        <Icon className="h-5 w-5" style={{ color: ACCENT }} strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-white">{title}</p>
        <p className="mt-0.5 truncate text-[11px]" style={{ color: MUTED }}>
          {subtitle}
        </p>
      </div>
    </button>
  );
}

function LabeledInput({
  label,
  value,
  setValue,
  placeholder,
  small,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  placeholder?: string;
  small?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px]" style={{ color: MUTED }}>
        {label}
      </label>
      <Input
        type="number"
        inputMode="decimal"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={`text-white ${small ? "h-9 text-sm" : "h-11"}`}
        style={{ background: INPUT_BG, borderColor: CARD_BORDER }}
      />
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  editable,
  numericValue,
  onNumericChange,
}: {
  icon: typeof Scale;
  label: string;
  value: string;
  editable?: boolean;
  numericValue?: string;
  onNumericChange?: (v: string) => void;
}) {
  return (
    <div
      className="rounded-xl p-3 text-center"
      style={{ background: INPUT_BG, border: `1px solid ${CARD_BORDER}` }}
    >
      <Icon className="mx-auto mb-1 h-4 w-4" style={{ color: ACCENT }} strokeWidth={1.75} />
      {editable && onNumericChange ? (
        <Input
          type="number"
          inputMode="decimal"
          value={numericValue}
          onChange={(e) => onNumericChange(e.target.value)}
          className="mt-1 h-8 text-center text-sm font-bold text-white"
          style={{ background: CARD_BG, borderColor: CARD_BORDER }}
        />
      ) : (
        <p className="text-sm font-bold text-white">{value}</p>
      )}
      <p className="mt-0.5 text-[10px]" style={{ color: FAINT }}>
        {label}
      </p>
    </div>
  );
}

export default MobileInBodyScan;
