import { useState, useEffect } from "react";
import { SmilePlus, Smile, Meh, Frown, BatteryWarning } from "lucide-react";
import { usePortalToken } from "@/hooks/usePortalToken";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const moods = [
  { icon: SmilePlus, label: "ممتاز", value: "great" },
  { icon: Smile, label: "جيد", value: "good" },
  { icon: Meh, label: "عادي", value: "okay" },
  { icon: Frown, label: "تعبان", value: "tired" },
  { icon: BatteryWarning, label: "مرهق", value: "exhausted" },
];

const PortalMoodSelector = () => {
  const { token } = usePortalToken();
  const { toast } = useToast();
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSelectMood = async (mood: string) => {
    if (!token || saving) return;
    setSaving(true);
    setSelectedMood(mood);

    try {
      const { error } = await supabase.rpc("log_portal_mood", {
        p_token: token,
        p_mood: mood,
      });
      if (error) throw error;
      toast({ title: "تم تسجيل حالتك" });
    } catch {
      toast({ title: "حدث خطأ", variant: "destructive" });
      setSelectedMood(null);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (token) {
      supabase.rpc("update_portal_activity", { p_token: token });
    }
  }, [token]);

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <p className="text-sm font-medium text-card-foreground mb-3">كيف حالك اليوم؟</p>
      <div className="flex items-center justify-between gap-1">
        {moods.map((m) => (
          <button
            key={m.value}
            onClick={() => handleSelectMood(m.value)}
            className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg transition-all ${
              selectedMood === m.value
                ? "bg-primary/10 ring-2 ring-primary scale-105"
                : "hover:bg-secondary"
            }`}
          >
            <m.icon className="w-5 h-5 text-primary" />
            <span className="text-[10px] text-muted-foreground">{m.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default PortalMoodSelector;
