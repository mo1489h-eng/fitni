import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ClientPortalLayout from "@/components/ClientPortalLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Calculator, Save, History, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
}

function calculateScan(
  height: number, weight: number, age: number, gender: string,
  activityLevel: string, waist?: number, neck?: number, hip?: number
): ScanResult {
  const heightM = height / 100;
  const bmi = weight / (heightM * heightM);

  let bmiCategory = "";
  let bmiColor = "";
  if (bmi < 18.5) { bmiCategory = "نقص في الوزن"; bmiColor = "text-blue-500"; }
  else if (bmi < 25) { bmiCategory = "وزن طبيعي ✅"; bmiColor = "text-green-500"; }
  else if (bmi < 30) { bmiCategory = "زيادة في الوزن"; bmiColor = "text-yellow-500"; }
  else { bmiCategory = "سمنة"; bmiColor = "text-red-500"; }

  let bodyFat: number;
  if (waist && neck && (gender === "male" || (gender === "female" && hip))) {
    if (gender === "male") {
      bodyFat = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450;
    } else {
      bodyFat = 495 / (1.29579 - 0.35004 * Math.log10(waist + (hip || 0) - neck) + 0.221 * Math.log10(height)) - 450;
    }
  } else {
    bodyFat = gender === "male"
      ? (1.2 * bmi) + (0.23 * age) - 16.2
      : (1.2 * bmi) + (0.23 * age) - 5.4;
  }
  bodyFat = Math.max(3, Math.min(bodyFat, 60));

  const muscleMass = weight * (1 - bodyFat / 100);

  const bmr = gender === "male"
    ? 10 * weight + 6.25 * height - 5 * age + 5
    : 10 * weight + 6.25 * height - 5 * age - 161;

  const activityMultiplier = ACTIVITY_LEVELS.find(a => a.value === activityLevel)?.multiplier || 1.2;
  const tdee = bmr * activityMultiplier;

  const idealWeightMin = 18.5 * heightM * heightM;
  const idealWeightMax = 24.9 * heightM * heightM;

  return {
    bmi: Math.round(bmi * 10) / 10,
    bmiCategory, bmiColor,
    bodyFat: Math.round(bodyFat * 10) / 10,
    muscleMass: Math.round(muscleMass * 10) / 10,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    idealWeightMin: Math.round(idealWeightMin),
    idealWeightMax: Math.round(idealWeightMax),
  };
}

const PortalBodyScan = () => {
  const { token } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("male");
  const [activityLevel, setActivityLevel] = useState("sedentary");
  const [waist, setWaist] = useState("");
  const [neck, setNeck] = useState("");
  const [hip, setHip] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [showHistory, setShowHistory] = useState(false);
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
        p_height: parseFloat(height),
        p_weight: parseFloat(weight),
        p_age: parseInt(age),
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
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-body-scans", token] });
      toast({ title: "تم حفظ النتائج ✅" });
      setIsEditing(false);
      setEditResult(null);
    },
  });

  const handleCalculate = () => {
    if (!height || !weight || !age) return;
    const r = calculateScan(
      parseFloat(height), parseFloat(weight), parseInt(age), gender,
      activityLevel,
      waist ? parseFloat(waist) : undefined,
      neck ? parseFloat(neck) : undefined,
      hip ? parseFloat(hip) : undefined,
    );
    setResult(r);
    setEditResult(r);
  };

  const displayResult = isEditing && editResult ? editResult : result;

  const getBmiCategoryForValue = (bmi: number) => {
    if (bmi < 18.5) return { label: "نقص في الوزن", color: "text-blue-500", bg: "bg-blue-50" };
    if (bmi < 25) return { label: "وزن طبيعي ✅", color: "text-green-500", bg: "bg-green-50" };
    if (bmi < 30) return { label: "زيادة في الوزن", color: "text-yellow-500", bg: "bg-yellow-50" };
    return { label: "سمنة", color: "text-red-500", bg: "bg-red-50" };
  };

  return (
    <ClientPortalLayout>
      <div className="space-y-5 animate-fade-in" dir="rtl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">سكان جسمي 📊</h1>
            <p className="text-sm text-muted-foreground mt-1">احسب مؤشرات جسمك الأساسية</p>
          </div>
          {scans && scans.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)} className="gap-1">
              <History className="w-4 h-4" />
              {showHistory ? "إخفاء" : "السجل"}
            </Button>
          )}
        </div>

        {/* History */}
        {showHistory && scans && scans.length > 0 && (
          <Card className="p-4">
            <h3 className="font-bold text-foreground mb-3">سجل الفحوصات</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {scans.map((s: any) => {
                const cat = getBmiCategoryForValue(Number(s.bmi));
                return (
                  <div key={s.id} className="flex items-center justify-between bg-secondary rounded-lg p-3">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(s.scan_date).toLocaleDateString("ar-SA")}
                      </p>
                      <p className="text-sm font-bold text-secondary-foreground">
                        {Number(s.weight)} كجم • BMI: {Number(s.bmi)}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${cat.bg} ${cat.color}`}>
                      {cat.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Input Form */}
        <Card className="p-4">
          <h3 className="font-bold text-foreground mb-3">بيانات الجسم</h3>
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

          <div className="mt-3">
            <label className="text-xs text-muted-foreground mb-1 block">مستوى النشاط</label>
            <Select value={activityLevel} onValueChange={setActivityLevel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTIVITY_LEVELS.map(a => (
                  <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Optional measurements */}
          <div className="mt-4 border-t border-border pt-3">
            <p className="text-xs text-muted-foreground mb-2">قياسات اختيارية (لنتائج أدق)</p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">الخصر (سم)</label>
                <Input type="number" placeholder="80" value={waist} onChange={e => setWaist(e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">الرقبة (سم)</label>
                <Input type="number" placeholder="37" value={neck} onChange={e => setNeck(e.target.value)} />
              </div>
              {gender === "female" && (
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">الورك (سم)</label>
                  <Input type="number" placeholder="95" value={hip} onChange={e => setHip(e.target.value)} />
                </div>
              )}
            </div>
          </div>

          <Button className="w-full mt-4 gap-2" onClick={handleCalculate} disabled={!height || !weight || !age}>
            <Calculator className="w-4 h-4" />
            احسب الآن
          </Button>
        </Card>

        {/* Results */}
        {displayResult && (
          <Card className="p-5 animate-fade-in border-primary/20">
            <h3 className="font-bold text-foreground mb-4 text-center">النتائج 📊</h3>

            {/* BMI Ring */}
            <div className="text-center mb-5">
              <div className={`inline-flex items-center justify-center w-28 h-28 rounded-full border-4 ${
                displayResult.bmi < 18.5 ? "border-blue-400" :
                displayResult.bmi < 25 ? "border-green-400" :
                displayResult.bmi < 30 ? "border-yellow-400" : "border-red-400"
              }`}>
                <div>
                  <p className="text-2xl font-black text-foreground">{displayResult.bmi}</p>
                  <p className="text-[10px] text-muted-foreground">BMI</p>
                </div>
              </div>
              <p className={`text-sm font-bold mt-2 ${displayResult.bmiColor}`}>{displayResult.bmiCategory}</p>
            </div>

            {/* Stats Grid */}
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
                    <Input
                      type="number"
                      className="mt-1 text-center h-8 text-sm font-bold"
                      value={stat.key === "bodyFat" ? editResult?.bodyFat : stat.key === "muscleMass" ? editResult?.muscleMass : editResult?.tdee}
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        setEditResult(prev => prev ? { ...prev, [stat.key]: val } : prev);
                      }}
                    />
                  ) : (
                    <p className="text-base font-bold text-secondary-foreground mt-1">{stat.value}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Button className="gap-1" onClick={() => saveScan.mutate()} disabled={saveScan.isPending}>
                {saveScan.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                حفظ النتائج
              </Button>
              <Button variant="outline" className="gap-1" onClick={() => setIsEditing(!isEditing)}>
                <Edit className="w-4 h-4" />
                {isEditing ? "إلغاء التعديل" : "تعديل يدوي"}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </ClientPortalLayout>
  );
};

export default PortalBodyScan;
