import { useState, useRef, useCallback } from "react";
import { usePortalToken } from "@/hooks/usePortalToken";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import ClientPortalLayout from "@/components/ClientPortalLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import {
  TrendingUp, Calendar, Dumbbell, Flame, Trophy, Loader2,
  Plus, Scale, Activity, Heart, ScanLine, Upload, ArrowLeft,
  ChevronLeft
} from "lucide-react";
import ProgressPhotos from "@/components/ProgressPhotos";
import PortalAchievements from "@/components/PortalAchievements";
import { useToast } from "@/hooks/use-toast";

const PortalProgress = () => {
  const { token } = usePortalToken();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [newWeight, setNewWeight] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState(false);

  const handleOcrUpload = async (file: File) => {
    setIsOcrLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          const { data, error } = await supabase.functions.invoke("ocr-body-scan", { body: { image_base64: base64 } });
          if (error) throw error;
          if (data?.error) {
            toast({ title: "تعذر قراءة التقرير", description: data.error, variant: "destructive" });
          } else {
            toast({ title: "تم قراءة التقرير بنجاح" });
            navigate("/portal/body-scan");
          }
        } catch (err: any) {
          toast({ title: "خطأ", description: err.message, variant: "destructive" });
        } finally {
          setIsOcrLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setIsOcrLoading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith("image/") || file.type === "application/pdf")) {
      handleOcrUpload(file);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const { data: client } = useQuery({
    queryKey: ["portal-client", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_client_by_portal_token", { p_token: token! });
      if (error) throw error;
      return data && data.length > 0 ? data[0] : null;
    },
    enabled: !!token,
  });

  const { data: scans } = useQuery({
    queryKey: ["portal-body-scans", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_portal_body_scans" as any, { p_token: token! });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!token,
  });

  const chartData = (scans || []).slice().reverse().map((s: any) => ({
    date: new Date(s.scan_date).toLocaleDateString("ar-SA", { month: "short", day: "numeric" }),
    weight: Number(s.weight),
  }));

  const latestScan = scans?.[0];

  return (
    <ClientPortalLayout>
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" strokeWidth={1.5} />
            تقدمي
          </h1>
          <Button size="sm" variant="outline" className="gap-1 border-[hsl(0_0%_15%)] text-[hsl(0_0%_60%)] hover:border-primary/30"
            onClick={() => setShowWeightModal(true)}>
            <Plus className="w-3.5 h-3.5" strokeWidth={1.5} /> تسجيل الوزن
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Dumbbell, value: "48", label: "إجمالي التمارين" },
            { icon: Trophy, value: "110", label: "أفضل وزن (كجم)" },
            { icon: Flame, value: "12", label: "أطول سلسلة" },
          ].map((s, i) => (
            <div key={i} className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] p-3 text-center">
              <s.icon className="w-4 h-4 text-primary mx-auto mb-1" strokeWidth={1.5} />
              <p className="text-lg font-bold text-white">{s.value}</p>
              <p className="text-[10px] text-[hsl(0_0%_35%)] leading-tight">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Weight Chart */}
        {chartData.length > 1 && (
          <div className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] p-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-primary" strokeWidth={1.5} />
              <h3 className="font-bold text-white text-sm">تقدم الوزن</h3>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 10%)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(0 0% 40%)" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(0 0% 40%)" }} domain={["auto", "auto"]} />
                <Tooltip contentStyle={{ background: "hsl(0 0% 8%)", border: "1px solid hsl(0 0% 15%)", borderRadius: 8, color: "white" }} />
                <Line type="monotone" dataKey="weight" stroke="hsl(142 76% 36%)" strokeWidth={2} dot={{ r: 4, fill: "hsl(142 76% 36%)" }} name="الوزن (كجم)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Body Scan Summary */}
        {latestScan && (
          <div className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <ScanLine className="w-4 h-4 text-primary" strokeWidth={1.5} />
              <h3 className="font-bold text-white text-sm">بيانات الجسم</h3>
              <span className="text-[10px] text-[hsl(0_0%_35%)] mr-auto">
                {new Date(latestScan.scan_date).toLocaleDateString("ar-SA")}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "نسبة الدهون", value: `${Number(latestScan.body_fat)}%`, icon: Activity },
                { label: "الكتلة العضلية", value: `${Number(latestScan.muscle_mass)} كجم`, icon: Dumbbell },
                { label: "معدل الأيض", value: `${Number(latestScan.tdee)}`, icon: Heart },
              ].map((s, i) => (
                <div key={i} className="bg-[hsl(0_0%_4%)] rounded-lg p-2.5 text-center">
                  <s.icon className="w-4 h-4 text-primary mx-auto mb-1" strokeWidth={1.5} />
                  <p className="text-sm font-bold text-white">{s.value}</p>
                  <p className="text-[10px] text-[hsl(0_0%_35%)]">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* InBody Upload + Body Scan CTA */}
        <div className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ScanLine className="w-4 h-4 text-primary" strokeWidth={1.5} />
              <h3 className="font-bold text-white text-sm">سكان الجسم</h3>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1 border-[hsl(0_0%_15%)] text-[hsl(0_0%_60%)] hover:border-primary/30 text-xs"
              onClick={() => navigate("/portal/body-scan")}
            >
              عرض الكل
              <ChevronLeft className="w-3 h-3" strokeWidth={1.5} />
            </Button>
          </div>

          {/* Drop zone for InBody */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`relative rounded-xl border-2 border-dashed p-5 text-center transition-all cursor-pointer ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-[hsl(0_0%_15%)] hover:border-primary/30"
            }`}
            onClick={() => {
              const inp = document.createElement("input");
              inp.type = "file";
              inp.accept = "image/*,.pdf";
              inp.onchange = (e: any) => {
                const f = e.target.files?.[0];
                if (f) handleOcrUpload(f);
              };
              inp.click();
            }}
          >
            {isOcrLoading ? (
              <div className="flex flex-col items-center">
                <Loader2 className="w-6 h-6 text-primary animate-spin mb-2" strokeWidth={1.5} />
                <p className="text-xs text-[hsl(0_0%_45%)]">جاري قراءة التقرير...</p>
              </div>
            ) : (
              <>
                <Upload className="w-6 h-6 text-primary/60 mx-auto mb-1.5" strokeWidth={1.5} />
                <p className="text-xs font-medium text-white">ارفع تقرير InBody</p>
                <p className="text-[10px] text-[hsl(0_0%_40%)] mt-0.5">JPG, PNG, PDF</p>
              </>
            )}
          </div>

          <Button
            variant="outline"
            className="w-full gap-2 border-[hsl(0_0%_15%)] text-[hsl(0_0%_60%)] hover:border-primary/30 hover:text-white"
            onClick={() => navigate("/portal/body-scan")}
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
            إدخال بيانات يدوياً
          </Button>
        </div>

        {/* Achievements */}
        <PortalAchievements />

        {/* Progress Photos */}
        {client && (
          <div className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] p-4">
            <ProgressPhotos clientId={client.id} uploadedBy="client" trainerId={client.trainer_id || undefined} portalToken={token} />
          </div>
        )}

        {/* Attendance Calendar */}
        <div className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-primary" strokeWidth={1.5} />
            <h3 className="font-bold text-white text-sm">سجل الحضور</h3>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"].map(d => (
              <div key={d} className="text-[10px] text-[hsl(0_0%_30%)] text-center">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {(() => {
              const now = new Date();
              const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
              const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
              const workoutDays = new Set([1, 2, 3, 5, 6, 8, 9, 10, 12, 13, 15, 16, 17, 19, 20, 22, 23, 24, 26, 27]);
              return (
                <>
                  {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const isWorkout = workoutDays.has(day);
                    const isToday = day === now.getDate();
                    return (
                      <div key={day} className={`aspect-square rounded-full flex items-center justify-center text-xs font-medium ${
                        isWorkout ? "bg-primary text-white" : isToday ? "border border-primary text-primary" : "text-[hsl(0_0%_30%)]"
                      }`}>{day}</div>
                    );
                  })}
                </>
              );
            })()}
          </div>
        </div>

        {/* Weight Modal */}
        <Dialog open={showWeightModal} onOpenChange={setShowWeightModal}>
          <DialogContent className="max-w-sm bg-[hsl(0_0%_6%)] border-[hsl(0_0%_12%)]">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Scale className="w-5 h-5 text-primary" strokeWidth={1.5} />
                تسجيل الوزن
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-xs text-[hsl(0_0%_45%)] mb-1.5 block">الوزن (كجم)</label>
                <Input type="number" dir="ltr" value={newWeight} onChange={e => setNewWeight(e.target.value)}
                  className="text-center text-2xl font-bold h-16 bg-[hsl(0_0%_4%)] border-[hsl(0_0%_12%)] text-white"
                  placeholder="85.0" />
              </div>
              <Button className="w-full h-12" onClick={() => {
                toast({ title: "تم تسجيل الوزن" });
                setShowWeightModal(false);
                setNewWeight("");
              }}>
                حفظ
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ClientPortalLayout>
  );
};

export default PortalProgress;
