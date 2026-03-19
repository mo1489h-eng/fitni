import { useState, useRef } from "react";
import { usePortalToken } from "@/hooks/usePortalToken";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ClientPortalLayout from "@/components/ClientPortalLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Calculator, Save, History, Edit, Camera, PenLine, Plus, TrendingDown, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

const ACTIVITY_LEVELS = [
  { value: "sedentary", label: "خامل", multiplier: 1.2 },
  { value: "light", label: "نشاط خفيف", multiplier: 1.375 },
  { value: "moderate", label: "نشاط متوسط", multiplier: 1.55 },
  { value: "high", label: "نشاط عالي", multiplier: 1.725 },
  { value: "extreme", label: "نشاط مكثف", multiplier: 1.9 },
];

interface ScanResult {
  bmi: number;
  bmiCategory: string;
  bmiColor: string;
  bodyFat: number;
  muscleMass: number;
  bmr: number;
  tdee: number;
  idealWeightMin: number;
  idealWeightMax: number;
  waterPercentage?: number;
  visceralFat?: number;
}

function calculateScan(
  height: number, weight: number, age: number, gender: string,
  activityLevel: string, waist?: number, neck?: number, hip?: number
): ScanResult {
  const heightM = height / 100;
  const bmi = weight / (heightM * heightM);
  let bmiCategory = "", bmiColor = "";
  if (bmi < 18.5) { bmiCategory = "نقص في الوزن"; bmiColor = "text-blue-500"; }
  else if (bmi < 25) { bmiCategory = "وزن طبيعي"; bmiColor = "text-green-500"; }
  else if (bmi < 30) { bmiCategory = "زيادة في الوزن"; bmiColor = "text-yellow-500"; }
  else { bmiCategory = "سمنة"; bmiColor = "text-red-500"; }

  let bodyFat: number;
  if (waist && neck && (gender === "male" || (gender === "female" && hip))) {
    bodyFat = gender === "male"
      ? 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450
      : 495 / (1.29579 - 0.35004 * Math.log10(waist + (hip || 0) - neck) + 0.221 * Math.log10(height)) - 450;
  } else {
    bodyFat = gender === "male" ? (1.2 * bmi) + (0.23 * age) - 16.2 : (1.2 * bmi) + (0.23 * age) - 5.4;
  }
  bodyFat = Math.max(3, Math.min(bodyFat, 60));
  const muscleMass = weight * (1 - bodyFat / 100);
  const bmr = gender === "male" ? 10 * weight + 6.25 * height - 5 * age + 5 : 10 * weight + 6.25 * height - 5 * age - 161;
  const tdee = bmr * (ACTIVITY_LEVELS.find(a => a.value === activityLevel)?.multiplier || 1.2);
  return {
    bmi: Math.round(bmi * 10) / 10, bmiCategory, bmiColor,
    bodyFat: Math.round(bodyFat * 10) / 10,
    muscleMass: Math.round(muscleMass * 10) / 10,
    bmr: Math.round(bmr), tdee: Math.round(tdee),
    idealWeightMin: Math.round(18.5 * heightM * heightM),
    idealWeightMax: Math.round(24.9 * heightM * heightM),
  };
}

const PortalBodyScan = () => {
  const { token } = usePortalToken();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showNewScanModal, setShowNewScanModal] = useState(false);
  const [mode, setMode] = useState<"choose" | "ocr" | "manual">("choose");
  const [isOcrLoading, setIsOcrLoading] = useState(false);

  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("male");
  const [activityLevel, setActivityLevel] = useState("sedentary");
  const [waist, setWaist] = useState("");
  const [neck, setNeck] = useState("");
  const [hip, setHip] = useState("");
  const [waterPercentage, setWaterPercentage] = useState("");
  const [visceralFat, setVisceralFat] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editResult, setEditResult] = useState<ScanResult | null>(null);

  const { data: scans, isLoading: scansLoading } = useQuery({
    queryKey: ["portal-body-scans", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_portal_body_scans" as any, { p_token: token! });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!token,
  });

  const saveScan = useMutation({
    mutationFn: async () => {
      const r = isEditing && editResult ? editResult : result!;
      const { error } = await supabase.rpc("insert_portal_body_scan" as any, {
        p_token: token!,
        p_height: parseFloat(height), p_weight: parseFloat(weight),
        p_age: parseInt(age), p_gender: gender, p_activity_level: activityLevel,
        p_waist: waist ? parseFloat(waist) : null,
        p_neck: neck ? parseFloat(neck) : null,
        p_hip: hip ? parseFloat(hip) : null,
        p_bmi: r.bmi, p_body_fat: r.bodyFat, p_muscle_mass: r.muscleMass,
        p_bmr: r.bmr, p_tdee: r.tdee,
        p_ideal_weight_min: r.idealWeightMin, p_ideal_weight_max: r.idealWeightMax,
        p_water_percentage: r.waterPercentage ?? (waterPercentage ? parseFloat(waterPercentage) : null),
        p_visceral_fat: r.visceralFat ?? (visceralFat ? parseFloat(visceralFat) : null),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-body-scans", token] });
      toast({ title: "تم حفظ النتائج" });
      resetForm();
    },
  });

  const resetForm = () => {
    setShowNewScanModal(false);
    setMode("choose");
    setResult(null);
    setEditResult(null);
    setIsEditing(false);
    setHeight(""); setWeight(""); setAge(""); setWaist(""); setNeck(""); setHip("");
    setWaterPercentage(""); setVisceralFat("");
  };

  const handleOcrUpload = async (file: File) => {
    setIsOcrLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          const { data, error } = await supabase.functions.invoke("ocr-body-scan", {
            body: { image_base64: base64 },
          });
          if (error) throw error;
          if (data?.error) {
            toast({ title: "تعذر قراءة الصورة", description: data.error, variant: "destructive" });
            setMode("manual");
            return;
          }
          const d = data?.data;
          if (d) {
            if (d.height) setHeight(String(d.height));
            if (d.weight) setWeight(String(d.weight));
            if (d.age) setAge(String(d.age));
            if (d.gender) setGender(d.gender === "female" ? "female" : "male");
            if (d.water_percentage) setWaterPercentage(String(d.water_percentage));
            if (d.visceral_fat) setVisceralFat(String(d.visceral_fat));

            const bmiVal = d.bmi || 0;
            const bodyFatVal = d.body_fat || 0;
            const muscleMassVal = d.muscle_mass || 0;
            const bmrVal = d.bmr || 0;

            setResult({
              bmi: bmiVal,
              bmiCategory: bmiVal < 18.5 ? "نقص في الوزن" : bmiVal < 25 ? "وزن طبيعي" : bmiVal < 30 ? "زيادة في الوزن" : "سمنة",
              bmiColor: bmiVal < 18.5 ? "text-blue-500" : bmiVal < 25 ? "text-green-500" : bmiVal < 30 ? "text-yellow-500" : "text-red-500",
              bodyFat: bodyFatVal,
              muscleMass: muscleMassVal,
              bmr: bmrVal,
              tdee: bmrVal * 1.2,
              idealWeightMin: d.height ? Math.round(18.5 * (d.height / 100) ** 2) : 0,
              idealWeightMax: d.height ? Math.round(24.9 * (d.height / 100) ** 2) : 0,
              waterPercentage: d.water_percentage || undefined,
              visceralFat: d.visceral_fat || undefined,
            });
            setEditResult(null);
            setIsEditing(true);
            toast({ title: "تم قراءة البيانات", description: "راجع البيانات وعدّل إذا احتجت" });
          }
          setMode("manual");
        } catch (err: any) {
          toast({ title: "خطأ في القراءة", description: err.message, variant: "destructive" });
          setMode("manual");
        } finally {
          setIsOcrLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setIsOcrLoading(false);
    }
  };

  const handleCalculate = () => {
    if (!height || !weight || !age) return;
    const r = calculateScan(
      parseFloat(height), parseFloat(weight), parseInt(age), gender, activityLevel,
      waist ? parseFloat(waist) : undefined, neck ? parseFloat(neck) : undefined, hip ? parseFloat(hip) : undefined,
    );
    r.waterPercentage = waterPercentage ? parseFloat(waterPercentage) : undefined;
    r.visceralFat = visceralFat ? parseFloat(visceralFat) : undefined;
    setResult(r);
    setEditResult(r);
  };

  const displayResult = isEditing && editResult ? editResult : result;

  const getBmiCat = (bmi: number) => {
    if (bmi < 18.5) return { label: "نقص في الوزن", color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10" };
    if (bmi < 25) return { label: "وزن طبيعي ✅", color: "text-green-500", bg: "bg-green-50 dark:bg-green-500/10" };
    if (bmi < 30) return { label: "زيادة في الوزن", color: "text-yellow-500", bg: "bg-yellow-50 dark:bg-yellow-500/10" };
    return { label: "سمنة", color: "text-red-500", bg: "bg-red-50 dark:bg-red-500/10" };
  };

  const latest = scans?.[0];
  const first = scans && scans.length > 1 ? scans[scans.length - 1] : null;

  const chartData = (scans || []).slice().reverse().map((s: any) => ({
    date: new Date(s.scan_date).toLocaleDateString("ar-SA", { month: "short", day: "numeric" }),
    weight: Number(s.weight),
    bodyFat: Number(s.body_fat),
  }));

  return (
    <ClientPortalLayout>
      <div className="space-y-5 animate-fade-in" dir="rtl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">سكان جسمي 📊</h1>
            <p className="text-sm text-muted-foreground mt-1">تتبع قياسات جسمك ومؤشراتك</p>
          </div>
          <Button size="sm" className="gap-1" onClick={() => setShowNewScanModal(true)}>
            <Plus className="w-4 h-4" />
            سكان جديد
          </Button>
        </div>

        {/* Latest scan summary */}
        {latest && (
          <Card className="p-4 border-primary/20">
            <h3 className="font-bold text-card-foreground mb-3 text-sm">
              آخر فحص — {new Date(latest.scan_date).toLocaleDateString("ar-SA")}
            </h3>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { label: "BMI", value: Number(latest.bmi), info: getBmiCat(Number(latest.bmi)) },
                { label: "الدهون", value: `${Number(latest.body_fat)}%` },
                { label: "العضلات", value: `${Number(latest.muscle_mass)} كجم` },
              ].map(s => (
                <div key={s.label} className="text-center bg-secondary rounded-lg p-2.5">
                  <p className={`text-base font-bold ${(s as any).info?.color || "text-secondary-foreground"}`}>
                    {typeof s.value === 'number' ? s.value : s.value}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  {(s as any).info && <p className={`text-[9px] font-medium ${(s as any).info.color}`}>{(s as any).info.label}</p>}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center bg-secondary rounded-lg p-2">
                <p className="text-sm font-bold text-secondary-foreground">{Number(latest.tdee).toLocaleString()} سعرة</p>
                <p className="text-[10px] text-muted-foreground">معدل الحرق</p>
              </div>
              <div className="text-center bg-secondary rounded-lg p-2">
                <p className="text-sm font-bold text-secondary-foreground">{Number(latest.ideal_weight_min)}-{Number(latest.ideal_weight_max)} كجم</p>
                <p className="text-[10px] text-muted-foreground">الوزن المثالي</p>
              </div>
            </div>
            {(latest.water_percentage || latest.visceral_fat) && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {latest.water_percentage && (
                  <div className="text-center bg-secondary rounded-lg p-2">
                    <p className="text-sm font-bold text-secondary-foreground">{Number(latest.water_percentage)}%</p>
                    <p className="text-[10px] text-muted-foreground">نسبة الماء</p>
                  </div>
                )}
                {latest.visceral_fat && (
                  <div className="text-center bg-secondary rounded-lg p-2">
                    <p className="text-sm font-bold text-secondary-foreground">{Number(latest.visceral_fat)}</p>
                    <p className="text-[10px] text-muted-foreground">الدهون الحشوية</p>
                  </div>
                )}
              </div>
            )}

            {first && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground mb-2">مقارنة: أول فحص ← آخر فحص</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: "الوزن", diff: Number(latest.weight) - Number(first.weight), unit: "كجم" },
                    { label: "الدهون", diff: Number(latest.body_fat) - Number(first.body_fat), unit: "%" },
                    { label: "العضلات", diff: Number(latest.muscle_mass) - Number(first.muscle_mass), unit: "كجم" },
                  ].map(c => (
                    <div key={c.label} className="bg-muted/50 rounded-lg p-2">
                      <p className="text-[10px] text-muted-foreground">{c.label}</p>
                      <p className={`text-sm font-bold flex items-center justify-center gap-0.5 ${c.diff < 0 ? "text-green-500" : c.diff > 0 ? "text-red-500" : "text-muted-foreground"}`}>
                        {c.diff > 0 ? <TrendingUp className="w-3 h-3" /> : c.diff < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                        {c.diff > 0 ? "+" : ""}{c.diff.toFixed(1)} {c.unit}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Chart */}
        {chartData.length > 1 && (
          <Card className="p-4">
            <h3 className="font-bold text-card-foreground mb-3 text-sm">📈 تطور الوزن والدهون</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} name="الوزن" />
                  <Line type="monotone" dataKey="bodyFat" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="الدهون %" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* History */}
        {scans && scans.length > 0 && (
          <Card className="p-4">
            <h3 className="font-bold text-card-foreground mb-3 flex items-center gap-2">
              <History className="w-4 h-4 text-primary" /> سجل الفحوصات
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {scans.map((s: any) => {
                const cat = getBmiCat(Number(s.bmi));
                return (
                  <div key={s.id} className="flex items-center justify-between bg-secondary rounded-lg p-3">
                    <div>
                      <p className="text-xs text-muted-foreground">{new Date(s.scan_date).toLocaleDateString("ar-SA")}</p>
                      <p className="text-sm font-bold text-secondary-foreground">
                        {Number(s.weight)} كجم • BMI: {Number(s.bmi)} • دهون: {Number(s.body_fat)}%
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${cat.bg} ${cat.color}`}>{cat.label}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {scansLoading && (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        )}

        {/* New Scan Modal */}
        <Dialog open={showNewScanModal} onOpenChange={(o) => { if (!o) resetForm(); else setShowNewScanModal(true); }}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-lg">سكان جديد 📷</DialogTitle>
            </DialogHeader>

            {mode === "choose" && (
              <div className="grid grid-cols-1 gap-3 py-4">
                <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) { handleOcrUpload(f); } }} />
                <Button variant="outline" className="h-24 gap-3 text-base flex-col" onClick={() => fileInputRef.current?.click()} disabled={isOcrLoading}>
                  {isOcrLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
                  صوّر ورقة السكان 📷
                  <span className="text-xs text-muted-foreground font-normal">التقط صورة وسنقرأ البيانات تلقائياً</span>
                </Button>
                <Button variant="outline" className="h-24 gap-3 text-base flex-col" onClick={() => setMode("manual")}>
                  <PenLine className="w-6 h-6" />
                  أدخل يدوياً ✏️
                  <span className="text-xs text-muted-foreground font-normal">أدخل القياسات بنفسك</span>
                </Button>
              </div>
            )}

            {mode === "manual" && !displayResult && (
              <div className="space-y-4 py-2">
                {result && isEditing && (
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-center">
                    <p className="text-sm font-medium text-primary">✅ تم قراءة البيانات — راجع وعدّل إذا احتجت</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">الطول (سم)</label>
                    <Input type="number" placeholder="170" value={height} onChange={e => setHeight(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">الوزن (كجم)</label>
                    <Input type="number" placeholder="75" value={weight} onChange={e => setWeight(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">العمر</label>
                    <Input type="number" placeholder="25" value={age} onChange={e => setAge(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">الجنس</label>
                    <Select value={gender} onValueChange={setGender}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">ذكر</SelectItem>
                        <SelectItem value="female">أنثى</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">مستوى النشاط</label>
                  <Select value={activityLevel} onValueChange={setActivityLevel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ACTIVITY_LEVELS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground mb-2">قياسات إضافية (اختياري)</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-1 block">الخصر (سم)</label>
                      <Input type="number" value={waist} onChange={e => setWaist(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-1 block">الرقبة (سم)</label>
                      <Input type="number" value={neck} onChange={e => setNeck(e.target.value)} />
                    </div>
                    {gender === "female" && (
                      <div>
                        <label className="text-[10px] text-muted-foreground mb-1 block">الورك (سم)</label>
                        <Input type="number" value={hip} onChange={e => setHip(e.target.value)} />
                      </div>
                    )}
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-1 block">نسبة الماء %</label>
                      <Input type="number" value={waterPercentage} onChange={e => setWaterPercentage(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-1 block">الدهون الحشوية</label>
                      <Input type="number" value={visceralFat} onChange={e => setVisceralFat(e.target.value)} />
                    </div>
                  </div>
                </div>
                <Button className="w-full gap-2" onClick={handleCalculate} disabled={!height || !weight || !age}>
                  <Calculator className="w-4 h-4" /> احسب الآن
                </Button>
              </div>
            )}

            {displayResult && (
              <div className="space-y-4 py-2 animate-fade-in">
                <div className="text-center">
                  <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full border-4 ${
                    displayResult.bmi < 18.5 ? "border-blue-400" : displayResult.bmi < 25 ? "border-green-400" : displayResult.bmi < 30 ? "border-yellow-400" : "border-red-400"
                  }`}>
                    <div>
                      <p className="text-2xl font-black text-foreground">{displayResult.bmi}</p>
                      <p className="text-[10px] text-muted-foreground">BMI</p>
                    </div>
                  </div>
                  <p className={`text-sm font-bold mt-2 ${displayResult.bmiColor}`}>{displayResult.bmiCategory}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "نسبة الدهون", value: `${displayResult.bodyFat}%`, icon: "🔥", key: "bodyFat" },
                    { label: "الكتلة العضلية", value: `${displayResult.muscleMass} كجم`, icon: "💪", key: "muscleMass" },
                    { label: "معدل الحرق", value: `${displayResult.tdee.toLocaleString()} سعرة`, icon: "⚡", key: "tdee" },
                    { label: "الوزن المثالي", value: `${displayResult.idealWeightMin}-${displayResult.idealWeightMax} كجم`, icon: "⚖️", key: "ideal" },
                  ].map(stat => (
                    <div key={stat.label} className="bg-secondary rounded-xl p-3 text-center">
                      <span className="text-lg">{stat.icon}</span>
                      {isEditing && stat.key !== "ideal" ? (
                        <Input type="number" className="mt-1 text-center h-8 text-sm font-bold"
                          value={stat.key === "bodyFat" ? editResult?.bodyFat ?? displayResult.bodyFat : stat.key === "muscleMass" ? editResult?.muscleMass ?? displayResult.muscleMass : editResult?.tdee ?? displayResult.tdee}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0;
                            setEditResult(prev => ({ ...(prev || displayResult), [stat.key]: val }));
                          }}
                        />
                      ) : (
                        <p className="text-base font-bold text-secondary-foreground mt-1">{stat.value}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button className="gap-1" onClick={() => saveScan.mutate()} disabled={saveScan.isPending}>
                    {saveScan.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    حفظ السكان
                  </Button>
                  <Button variant="outline" className="gap-1" onClick={() => { setIsEditing(!isEditing); if (!isEditing) setEditResult({ ...displayResult }); }}>
                    <Edit className="w-4 h-4" />
                    {isEditing ? "إلغاء التعديل" : "تعديل يدوي"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ClientPortalLayout>
  );
};

export default PortalBodyScan;
