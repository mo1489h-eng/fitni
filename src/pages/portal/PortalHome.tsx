import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { usePortalToken } from "@/hooks/usePortalToken";
import ClientPortalLayout from "@/components/ClientPortalLayout";
import { AlertCircle, Dumbbell, Flame, Play, Loader2, CheckCircle, Calendar, Moon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const PortalHome = () => {
  const navigate = useNavigate();
  const { token } = usePortalToken();

  const { data: client, isLoading } = useQuery({
    queryKey: ["portal-client", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_client_by_portal_token", { p_token: token! });
      if (error) throw error;
      return data && data.length > 0 ? data[0] : null;
    },
    enabled: !!token,
  });

  const { data: trainerProfile } = useQuery({
    queryKey: ["portal-trainer-profile", client?.trainer_id],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_public_profile", { p_user_id: client!.trainer_id! });
      return data?.[0] || null;
    },
    enabled: !!client?.trainer_id,
  });

  const { data: program } = useQuery({
    queryKey: ["portal-program-summary", client?.program_id],
    queryFn: async () => {
      if (!client?.program_id) return null;
      const { data: prog } = await supabase
        .from("programs").select("id, name, weeks").eq("id", client.program_id).maybeSingle();
      if (!prog) return null;
      const { data: days } = await supabase
        .from("program_days").select("id, day_name, day_order")
        .eq("program_id", prog.id).order("day_order");
      const WEEKDAYS = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
      const todayName = WEEKDAYS[new Date().getDay()];
      const todayDay = (days || []).find(d => d.day_name.includes(todayName));
      let exerciseCount = 0;
      if (todayDay) {
        const { count } = await supabase
          .from("program_exercises").select("id", { count: "exact", head: true }).eq("day_id", todayDay.id);
        exerciseCount = count || 0;
      }
      return { ...prog, todayDay, exerciseCount, totalDays: (days || []).length };
    },
    enabled: !!client?.program_id,
  });

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "صباح الخير";
    if (h < 17) return "مساء الخير";
    return "مساء الخير";
  };

  const todayDate = new Date().toLocaleDateString("ar-SA", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  if (isLoading) {
    return (
      <ClientPortalLayout>
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      </ClientPortalLayout>
    );
  }

  if (!client) {
    return (
      <ClientPortalLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-destructive" strokeWidth={1.5} />
          <h1 className="text-xl font-bold text-white">رابط غير صحيح</h1>
          <p className="text-sm text-[hsl(0_0%_40%)]">هذا الرابط غير صالح أو منتهي الصلاحية. تواصل مع مدربك للحصول على الرابط الصحيح.</p>
        </div>
      </ClientPortalLayout>
    );
  }

  const weekNumber = client.week_number || 1;
  const hasWorkoutToday = !!program?.todayDay;

  return (
    <ClientPortalLayout>
      <div className="space-y-5 animate-fade-in">
        {/* Hero Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-bl from-primary/20 via-primary/10 to-[hsl(0_0%_4%)] border border-primary/10 p-6">
          <div className="absolute top-0 left-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
          <h1 className="text-2xl font-bold text-white mb-1">{getGreeting()}، {client.name.split(" ")[0]}</h1>
          <p className="text-sm text-[hsl(0_0%_50%)] mb-1">{todayDate}</p>
          {trainerProfile && (
            <p className="text-xs text-[hsl(0_0%_40%)]">مدربك: {(trainerProfile as any).full_name}</p>
          )}
        </div>

        {/* Today's Workout Card */}
        <div className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] border-t-2 border-t-primary overflow-hidden">
          {hasWorkoutToday ? (
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Dumbbell className="w-7 h-7 text-primary" strokeWidth={1.5} />
                <div>
                  <p className="text-xs text-[hsl(0_0%_45%)]">تمرين اليوم</p>
                  <h2 className="text-lg font-bold text-white">{program?.todayDay?.day_name}</h2>
                </div>
              </div>
              <p className="text-sm text-[hsl(0_0%_40%)] mb-4">
                {program?.exerciseCount} تمرين • ~{(program?.exerciseCount || 0) * 6} دقيقة
              </p>
              <Button className="w-full h-12 text-base gap-2" onClick={() => navigate("/portal/workout")}>
                <Play className="w-5 h-5" strokeWidth={1.5} />
                ابدأ التمرين
              </Button>
            </div>
          ) : (
            <div className="p-5 text-center">
              <Moon className="w-8 h-8 text-[hsl(0_0%_30%)] mx-auto mb-2" strokeWidth={1.5} />
              <h2 className="text-lg font-bold text-white mb-1">يوم راحة</h2>
              <p className="text-sm text-[hsl(0_0%_40%)]">استرح واستعد لتمرين الغد</p>
            </div>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Flame, value: "5", label: "يوم", sub: "سلسلة" },
            { icon: CheckCircle, value: "12", label: "تمرين", sub: "مكتمل" },
            { icon: Calendar, value: `${weekNumber}`, label: `أسبوع`, sub: "الحالي" },
          ].map((s, i) => (
            <div key={i} className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] p-4 text-center">
              <s.icon className="w-5 h-5 text-primary mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-xl font-bold text-white">{s.value}</p>
              <p className="text-[10px] text-[hsl(0_0%_40%)]">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </ClientPortalLayout>
  );
};

export default PortalHome;
