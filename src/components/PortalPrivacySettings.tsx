import { useState, useEffect } from "react";
import { usePortalToken } from "@/hooks/usePortalToken";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Shield, Eye, EyeOff, Scale, Camera, ScanLine, Trophy } from "lucide-react";

const PortalPrivacySettings = () => {
  const { token } = usePortalToken();
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    privacy_weight: true,
    privacy_photos: true,
    privacy_scans: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!token) return;
      const { data } = await supabase.rpc("get_client_by_portal_token", { p_token: token });
      if (data && data.length > 0) {
        const c = data[0] as any;
        setSettings({
          privacy_weight: c.privacy_weight ?? true,
          privacy_photos: c.privacy_photos ?? true,
          privacy_scans: c.privacy_scans ?? true,
        });
      }
      setLoading(false);
    };
    fetch();
  }, [token]);

  const updatePrivacy = async (key: string, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    const { error } = await supabase.rpc("update_portal_privacy", {
      p_token: token!,
      p_privacy_weight: newSettings.privacy_weight,
      p_privacy_photos: newSettings.privacy_photos,
      p_privacy_scans: newSettings.privacy_scans,
    });

    if (error) {
      setSettings(settings);
      toast({ title: "حدث خطأ", variant: "destructive" });
    } else {
      toast({ title: "تم تحديث الإعدادات" });
    }
  };

  if (loading) return null;

  const items = [
    { key: "privacy_weight", label: "السماح للمدرب برؤية وزني", icon: Scale, value: settings.privacy_weight },
    { key: "privacy_photos", label: "السماح للمدرب برؤية صوري", icon: Camera, value: settings.privacy_photos },
    { key: "privacy_scans", label: "السماح للمدرب برؤية سكاناتي", icon: ScanLine, value: settings.privacy_scans },
  ];

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-card-foreground">إعدادات الخصوصية</h3>
      </div>
      <div className="space-y-4">
        {items.map(item => (
          <div key={item.key} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <item.icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-card-foreground">{item.label}</span>
            </div>
            <div className="flex items-center gap-2">
              {item.value ? <Eye className="w-3.5 h-3.5 text-primary" /> : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
              <Switch checked={item.value} onCheckedChange={(v) => updatePrivacy(item.key, v)} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default PortalPrivacySettings;
