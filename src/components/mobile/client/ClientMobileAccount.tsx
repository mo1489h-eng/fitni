import { useAuth } from "@/hooks/useAuth";
import { LogOut, User } from "lucide-react";
import { Pressable } from "../elite/Pressable";
import { ELITE } from "../workout/designTokens";

export default function ClientMobileAccount() {
  const { profile, signOut } = useAuth();

  return (
    <div className="space-y-6" dir="rtl">
      <h1 className="text-xl font-bold" style={{ color: ELITE.textPrimary }}>
        حسابي
      </h1>
      <div
        className="flex items-center gap-4 rounded-[20px] border border-white/[0.06] p-4"
        style={{ background: "#0A0A0A" }}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06]">
          <User className="h-7 w-7 text-white/50" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white">{profile?.full_name ?? "متدرب"}</p>
          <p className="text-xs" style={{ color: ELITE.textTertiary }}>
            حساب متدرب
          </p>
        </div>
      </div>
      <Pressable
        onClick={() => void signOut()}
        className="flex w-full items-center justify-center gap-2 rounded-[20px] border border-red-500/30 py-4 text-sm font-semibold text-red-400"
        style={{ background: "rgba(239,68,68,0.08)" }}
      >
        <LogOut className="h-4 w-4" />
        تسجيل الخروج
      </Pressable>
    </div>
  );
}
