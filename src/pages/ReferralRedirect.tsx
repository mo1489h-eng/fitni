import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const ReferralRedirect = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!code) {
      setError(true);
      return;
    }

    const resolve = async () => {
      // Find client with this referral code
      const { data: client } = await supabase
        .from("clients")
        .select("trainer_id")
        .eq("referral_code", code)
        .maybeSingle();

      if (!client?.trainer_id) {
        setError(true);
        return;
      }

      // Get trainer username
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("user_id", client.trainer_id)
        .maybeSingle();

      // Store referral code in sessionStorage for the signup flow
      sessionStorage.setItem("referral_code", code);

      if (profile?.username) {
        navigate(`/t/${profile.username}`, { replace: true });
      } else {
        navigate(`/trainer/${client.trainer_id}`, { replace: true });
      }
    };

    resolve();
  }, [code, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <p className="text-foreground font-bold">رابط الإحالة غير صالح</p>
          <p className="text-muted-foreground text-sm">تأكد من الرابط وحاول مجددا</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
};

export default ReferralRedirect;
