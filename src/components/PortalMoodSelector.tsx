import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const moods = [
  { emoji: "😊", label: "ممتاز", value: "great" },
  { emoji: "🙂", label: "جيد", value: "good" },
  { emoji: "😐", label: "عادي", value: "okay" },
  { emoji: "😞", label: "تعبان", value: "tired" },
  { emoji: "😫", label: "مرهق", value: "exhausted" },
];

const PortalMoodSelector = () => {
  const { token } = useParams();
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
      toast({ title: "تم تسجيل مزاجك ✅" });
    } catch {
      toast({ title: "حدث خطأ", variant: "destructive" });
      setSelectedMood(null);
    } finally {
      setSaving(false);
    }
  };

  // Update activity on mount
  useEffect(() => {
    if (token) {
      supabase.rpc("update_portal_activity", { p_token: token });
    }
  }, [token]);

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <p className="text-sm font-medium text-card-foreground mb-3">كيف حالك اليوم؟</p>
      <div className="flex items-center justify-between gap-1">
        {moods.map(m => (
          <button
            key={m.value}
            onClick={() => handleSelectMood(m.value)}
            className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg transition-all ${
              selectedMood === m.value
                ? "bg-primary/10 ring-2 ring-primary scale-105"
                : "hover:bg-secondary"
            }`}
          >
            <span className="text-2xl">{m.emoji}</span>
            <span className="text-[10px] text-muted-foreground">{m.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default PortalMoodSelector;
