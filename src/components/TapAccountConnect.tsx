import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, Save, LinkIcon } from "lucide-react";

const TapAccountConnect = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [destinationId, setDestinationId] = useState("");
  const [saving, setSaving] = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("tap_destination_id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.tap_destination_id) {
          setDestinationId(data.tap_destination_id);
          setConnected(true);
        }
      });
  }, [user]);

  const handleSave = async () => {
    if (!user || !destinationId.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ tap_destination_id: destinationId.trim() } as any)
        .eq("user_id", user.id);
      if (error) throw error;
      setConnected(true);
      toast({ title: "تم ربط حساب Tap بنجاح" });
    } catch {
      toast({ title: "حدث خطأ في الربط", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground">الحالة:</span>
        {connected ? (
          <span className="flex items-center gap-1.5 text-sm text-primary font-medium">
            <CheckCircle className="w-4 h-4" /> متصل
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">غير متصل</span>
        )}
      </div>

      <div>
        <label className="text-sm font-medium text-foreground">Tap Destination ID</label>
        <Input
          value={destinationId}
          onChange={(e) => setDestinationId(e.target.value)}
          placeholder="dest_xxxxx"
          dir="ltr"
        />
        <p className="text-xs text-muted-foreground mt-1">
          تحصل عليه من لوحة تحكم Tap بعد تفعيل حسابك كبائع
        </p>
      </div>

      <Button
        variant="outline"
        className="w-full gap-2"
        disabled={saving || !destinationId.trim()}
        onClick={handleSave}
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
        {connected ? "تحديث الربط" : "ربط الحساب"}
      </Button>
    </div>
  );
};

export default TapAccountConnect;
