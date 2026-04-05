import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePortalToken } from "@/hooks/usePortalToken";
import ClientPortalLayout from "@/components/ClientPortalLayout";
import {
  AlertCircle, Dumbbell, Flame, Play, Loader2, CheckCircle, Calendar, Moon,
  CalendarClock, Clock, ScanLine, Megaphone, ChevronLeft, Trophy, Check, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const PortalHome = () => {
  const navigate = useNavigate();
  const { token } = usePortalToken();
  const queryClient = useQueryClient();

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
    queryKey: ["portal-program-summary", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_portal_program", { p_token: token! });
      if (error || !data) return null;
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      const days = parsed.days || [];
      const WEEKDAYS = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
      const todayName = WEEKDAYS[new Date().getDay()];
      const todayDay = days.find((d: any) => d.day_name.includes(todayName));
      const exerciseCount = todayDay ? (todayDay.exercises || []).length : 0;
      return { ...parsed, todayDay, exerciseCount, totalDays: days.length };
    },
    enabled: !!token,
  });

  const { data: workoutStats } = useQuery({
    queryKey: ["portal-workout-stats", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_portal_workout_stats" as any, { p_token: token! });
      if (error) return { total_workouts: 0, current_streak: 0 };
      return data as any;
    },
    enabled: !!token,
  });

  const { data: upcomingSessions = [] } = useQuery({
    queryKey: ["portal-upcoming-sessions", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_portal_upcoming_sessions" as any, { p_token: token! });
      if (error) return [];
      return (typeof data === 'string' ? JSON.parse(data) : data) || [];
    },
    enabled: !!token,
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
  const totalWorkouts = (workoutStats as any)?.total_workouts || 0;
  const currentStreak = (workoutStats as any)?.current_streak || 0;
  const sessions = Array.isArray(upcomingSessions) ? upcomingSessions : [];

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
                {program?.exerciseCount} تمرين
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

        {/* Stats Row - Real Data */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Flame, value: String(currentStreak), label: "يوم", sub: "سلسلة" },
            { icon: CheckCircle, value: String(totalWorkouts), label: "تمرين", sub: "مكتمل" },
            { icon: Calendar, value: `${weekNumber}`, label: "أسبوع", sub: "الحالي" },
          ].map((s, i) => (
            <div key={i} className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] p-4 text-center">
              <s.icon className="w-5 h-5 text-primary mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-xl font-bold text-white">{s.value}</p>
              <p className="text-[10px] text-[hsl(0_0%_40%)]">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Upcoming Sessions */}
        {sessions.length > 0 && (
          <div className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <CalendarClock className="w-4 h-4 text-primary" strokeWidth={1.5} />
              <h3 className="font-bold text-white text-sm">الجلسات القادمة</h3>
            </div>
            <div className="space-y-2">
              {sessions.map((session: any) => {
                const confirmStatus = session.confirmation_status || "pending";
                return (
                  <div key={session.id} className="bg-[hsl(0_0%_4%)] rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Dumbbell className="w-4 h-4 text-primary" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">{session.session_type}</p>
                        <p className="text-xs text-[hsl(0_0%_40%)]">
                          {new Date(session.session_date).toLocaleDateString("ar-SA", { weekday: "long", day: "numeric", month: "long" })}
                        </p>
                      </div>
                      <div className="text-left shrink-0">
                        <div className="flex items-center gap-1 text-xs text-[hsl(0_0%_50%)]">
                          <Clock className="w-3 h-3" strokeWidth={1.5} />
                          <span dir="ltr">{session.start_time?.slice(0, 5)}</span>
                        </div>
                        <p className="text-[10px] text-[hsl(0_0%_35%)]">{session.duration_minutes} دقيقة</p>
                      </div>
                    </div>
                    {/* Confirmation buttons */}
                    {confirmStatus === "pending" && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[hsl(0_0%_8%)]">
                        <Button
                          size="sm"
                          className="flex-1 h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                          onClick={async () => {
                            await supabase.from("trainer_sessions").update({ confirmation_status: "confirmed" } as any).eq("id", session.id);
                            queryClient.invalidateQueries({ queryKey: ["portal-upcoming-sessions"] });
                          }}
                        >
                          <Check className="w-3.5 h-3.5" strokeWidth={1.5} />
                          سأحضر
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 gap-1.5 border-[hsl(0_0%_15%)] text-[hsl(0_0%_50%)] hover:text-red-400 hover:border-red-500/30 text-xs"
                          onClick={async () => {
                            await supabase.from("trainer_sessions").update({ confirmation_status: "declined" } as any).eq("id", session.id);
                            queryClient.invalidateQueries({ queryKey: ["portal-upcoming-sessions"] });
                          }}
                        >
                          <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                          لا أستطيع
                        </Button>
                      </div>
                    )}
                    {confirmStatus === "confirmed" && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-400">
                        <CheckCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
                        <span>تم التأكيد</span>
                      </div>
                    )}
                    {confirmStatus === "declined" && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-red-400">
                        <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                        <span>تم الاعتذار</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Access Cards */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => navigate("/portal/body-scan")}
            className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] p-4 text-right transition-colors hover:border-primary/20"
          >
            <ScanLine className="w-5 h-5 text-primary mb-2" strokeWidth={1.5} />
            <p className="text-xs font-bold text-white">سكان جسمي</p>
          </button>
          <button
            onClick={() => navigate("/portal/content")}
            className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] p-4 text-right transition-colors hover:border-primary/20"
          >
            <Megaphone className="w-5 h-5 text-primary mb-2" strokeWidth={1.5} />
            <p className="text-xs font-bold text-white">محتوى مدربك</p>
          </button>
          <button
            onClick={() => navigate("/portal/challenges")}
            className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] p-4 text-right transition-colors hover:border-primary/20"
          >
            <Trophy className="w-5 h-5 text-primary mb-2" strokeWidth={1.5} />
            <p className="text-xs font-bold text-white">تحدياتي</p>
          </button>
        </div>
      </div>
    </ClientPortalLayout>
  );
};

export default PortalHome;
