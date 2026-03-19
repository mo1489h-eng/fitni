import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Activity, Scale, TrendingDown, TrendingUp, PenLine, Send, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ACTIVITY_LEVELS = [
  { value: "sedentary", label: "خامل", multiplier: 1.2 },
  { value: "light", label: "نشاط خفيف", multiplier: 1.375 },
  { value: "moderate", label: "نشاط متوسط", multiplier: 1.55 },
  { value: "high", label: "نشاط عالي", multiplier: 1.725 },
  { value: "extreme", label: "نشاط مكثف", multiplier: 1.9 },
];

function calculate(height: number, weight: number, age: number, gender: string, activityLevel: string, waist?: number, neck?: number, hip?: number) {
  const hm = height / 100;
  const bmi = weight / (hm * hm);
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
    bmi: Math.round(bmi * 10) / 10,
    body_fat: Math.round(bodyFat * 10) / 10,
    muscle_mass: Math.round(muscleMass * 10) / 10,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    ideal_weight_min: Math.round(18.5 * hm * hm),
    ideal_weight_max: Math.round(24.9 * hm * hm),
  };
}

interface Props {
  clientId: string;
  clientPhone?: string;
  clientName?: string;
  portalToken?: string | null;
}

const TrainerBodyScans = ({ clientId, clientPhone, clientName, portalToken }: Props) => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("male");
  const [activityLevel, setActivityLevel] = useState("sedentary");
  const [waist, setWaist] = useState("");
  const [neck, setNeck] = useState("");
  const [hip, setHip] = useState("");
  const [notes, setNotes] = useState("");

  const { data: scans, isLoading } = useQuery({
    queryKey: ["body-scans", clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from("body_scans").select("*").eq("client_id", clientId).order("scan_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const addScan = useMutation({
    mutationFn: async () => {
      const calc = calculate(parseFloat(height), parseFloat(weight), parseInt(age), gender, activityLevel,
        waist ? parseFloat(waist) : undefined, neck ? parseFloat(neck) : undefined, hip ? parseFloat(hip) : undefined);
      const { error } = await supabase.from("body_scans").insert({
        client_id: clientId,
        height: parseFloat(height), weight: parseFloat(weight), age: parseInt(age),
        gender, activity_level: activityLevel,
        waist: waist ? parseFloat(waist) : null,
        neck: neck ? parseFloat(neck) : null,
        hip: hip ? parseFloat(hip) : null,
        notes: notes || null,
        ...calc,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["body-scans", clientId] });
      setShowAddModal(false);
      setHeight(""); setWeight(""); setAge(""); setWaist(""); setNeck(""); setHip(""); setNotes("");
      toast({ title: "تم حفظ الفحص" });
    },
  });

  const getBmiInfo = (bmi: number) => {
    if (bmi < 18.5) return { label: "نقص في الوزن", color: "text-blue-500" };
    if (bmi < 25) return { label: "طبيعي", color: "text-green-500" };
    if (bmi < 30) return { label: "زيادة", color: "text-yellow-500" };
    return { label: "سمنة", color: "text-red-500" };
  };

  const latest = scans && scans.length > 0 ? scans[scans.length - 1] : null;
  const first = scans && scans.length > 0 ? scans[0] : null;

  const bmiChart = (scans || []).map((s) => ({
    date: new Date(s.scan_date).toLocaleDateString("ar-SA", { month: "short", day: "numeric" }),
    bmi: Number(s.bmi),
    bodyFat: Number(s.body_fat),
  }));

  const portalScanUrl = portalToken ? `${window.location.origin}/client-portal/${portalToken}` : null;
  const whatsappScanLink = clientPhone && portalScanUrl
    ? `https://wa.me/966${clientPhone.replace(/^0/, "")}?text=${encodeURIComponent(`أهلاً ${clientName || ""}!\nسوِّ فحص جسم جديد من هنا:\n${portalScanUrl}`)}`
    : null;

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  // Empty state
  if (!scans || scans.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center py-10">
          <Activity className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-sm font-medium text-muted-foreground">لا توجد بيانات جسم بعد</p>
          <p className="text-xs text-muted-foreground mt-1">سيظهر هنا فحص الجسم عند إضافته</p>
          <div className="flex flex-col gap-2 mt-5 max-w-xs mx-auto">
            <Button className="gap-2" onClick={() => setShowAddModal(true)}>
              <PenLine className="w-4 h-4" />
              أضف فحص نيابةً عن العميل ✏️
            </Button>
            {whatsappScanLink && (
              <a href={whatsappScanLink} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="gap-2 w-full">
                  <Send className="w-4 h-4" />
                  أرسل رابط الفحص للعميل 📤
                </Button>
              </a>
            )}
          </div>
        </div>

        {/* Add on behalf modal */}
        <AddScanModal
          open={showAddModal} onOpenChange={setShowAddModal}
          height={height} setHeight={setHeight} weight={weight} setWeight={setWeight}
          age={age} setAge={setAge} gender={gender} setGender={setGender}
          activityLevel={activityLevel} setActivityLevel={setActivityLevel}
          waist={waist} setWaist={setWaist} neck={neck} setNeck={setNeck}
          hip={hip} setHip={setHip} notes={notes} setNotes={setNotes}
          onSave={() => addScan.mutate()} isPending={addScan.isPending}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Latest Scan Summary - READ ONLY */}
      {latest && (
        <Card className="p-4 border-primary/20">
          <h3 className="font-bold text-card-foreground mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            آخر فحص - {new Date(latest.scan_date).toLocaleDateString("ar-SA")}
          </h3>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { label: "BMI", value: Number(latest.bmi), info: getBmiInfo(Number(latest.bmi)) },
              { label: "الدهون", value: `${Number(latest.body_fat)}%` },
              { label: "العضلات", value: `${Number(latest.muscle_mass)} كجم` },
            ].map(s => (
              <div key={s.label} className="text-center bg-secondary rounded-lg p-2.5">
                <p className={`text-base font-bold ${(s as any).info?.color || "text-secondary-foreground"}`}>{typeof s.value === 'number' ? s.value : s.value}</p>
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

          {/* First vs Latest comparison */}
          {first && first.id !== latest.id && (
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

      {/* Charts */}
      {bmiChart.length > 1 && (
        <Card className="p-4">
          <h3 className="font-bold text-card-foreground mb-3 flex items-center gap-2">
            <Scale className="w-4 h-4 text-primary" />
            تطور المؤشرات
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bmiChart}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="bmi" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} name="BMI" />
                <Line type="monotone" dataKey="bodyFat" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="الدهون %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Trainer actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="gap-2" onClick={() => setShowAddModal(true)}>
          <PenLine className="w-4 h-4" />
          أضف فحص نيابةً ✏️
        </Button>
        {whatsappScanLink && (
          <a href={whatsappScanLink} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="gap-2 w-full">
              <Send className="w-4 h-4" />
              أرسل رابط للعميل 📤
            </Button>
          </a>
        )}
      </div>

      {/* Full History - READ ONLY */}
      <Card className="p-4">
        <h3 className="font-bold text-card-foreground mb-3">جميع الفحوصات</h3>
        <div className="space-y-2">
          {[...scans].reverse().map((s) => {
            const info = getBmiInfo(Number(s.bmi));
            return (
              <div key={s.id} className="flex items-center justify-between bg-secondary rounded-lg p-3">
                <div>
                  <p className="text-xs text-muted-foreground">{new Date(s.scan_date).toLocaleDateString("ar-SA")}</p>
                  <p className="text-sm font-bold text-secondary-foreground">
                    {Number(s.weight)} كجم • BMI: {Number(s.bmi)} • دهون: {Number(s.body_fat)}%
                  </p>
                  {s.notes && <p className="text-xs text-muted-foreground mt-0.5">{s.notes}</p>}
                </div>
                <span className={`text-xs font-medium ${info.color}`}>{info.label}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Add on behalf modal */}
      <AddScanModal
        open={showAddModal} onOpenChange={setShowAddModal}
        height={height} setHeight={setHeight} weight={weight} setWeight={setWeight}
        age={age} setAge={setAge} gender={gender} setGender={setGender}
        activityLevel={activityLevel} setActivityLevel={setActivityLevel}
        waist={waist} setWaist={setWaist} neck={neck} setNeck={setNeck}
        hip={hip} setHip={setHip} notes={notes} setNotes={setNotes}
        onSave={() => addScan.mutate()} isPending={addScan.isPending}
      />
    </div>
  );
};

// Extracted modal for adding scan on behalf of client
function AddScanModal({ open, onOpenChange, height, setHeight, weight, setWeight, age, setAge, gender, setGender, activityLevel, setActivityLevel, waist, setWaist, neck, setNeck, hip, setHip, notes, setNotes, onSave, isPending }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  height: string; setHeight: (v: string) => void;
  weight: string; setWeight: (v: string) => void;
  age: string; setAge: (v: string) => void;
  gender: string; setGender: (v: string) => void;
  activityLevel: string; setActivityLevel: (v: string) => void;
  waist: string; setWaist: (v: string) => void;
  neck: string; setNeck: (v: string) => void;
  hip: string; setHip: (v: string) => void;
  notes: string; setNotes: (v: string) => void;
  onSave: () => void; isPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>إضافة فحص نيابةً عن العميل ✏️</DialogTitle>
        </DialogHeader>
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
              {ACTIVITY_LEVELS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">الخصر (سم)</label>
            <Input type="number" value={waist} onChange={e => setWaist(e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">الرقبة (سم)</label>
            <Input type="number" value={neck} onChange={e => setNeck(e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">الورك (سم)</label>
            <Input type="number" value={hip} onChange={e => setHip(e.target.value)} />
          </div>
        </div>
        <div className="mt-3">
          <label className="text-xs text-muted-foreground mb-1 block">ملاحظات</label>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="ملاحظات اختيارية..." />
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <Button onClick={onSave} disabled={!height || !weight || !age || isPending}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ الفحص"}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default TrainerBodyScans;
