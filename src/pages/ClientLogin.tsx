import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dumbbell, Link2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ClientLogin = () => {
  const [portalLink, setPortalLink] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handlePortalLink = () => {
    // Extract token from URL or raw token
    let token = portalLink.trim();
    const match = token.match(/client-portal\/([a-zA-Z0-9]+)/);
    if (match) token = match[1];
    
    if (!token || token.length < 8) {
      toast({ title: "رابط غير صالح", description: "تأكد من الرابط اللي أرسله لك مدربك", variant: "destructive" });
      return;
    }
    navigate(`/client-portal/${token}`);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col" dir="rtl">
      {/* Header */}
      <header className="px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#16a34a] flex items-center justify-center">
              <Dumbbell className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-black">fitni</span>
          </Link>
          <Link to="/login">
            <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/10 text-xs">
              أنا مدرب ←
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-20">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-black">دخول المتدرب 💪</h1>
            <p className="text-white/50">تابع تمارينك وتقدمك</p>
          </div>

          {/* Portal Link Option */}
          <Card className="bg-white/[0.04] border-white/[0.08] p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Link2 className="w-5 h-5 text-[#4ade80]" />
              <h2 className="text-base font-bold text-white">دخول برابط خاص</h2>
            </div>
            <p className="text-sm text-white/40">استخدم الرابط اللي أرسله لك مدربك عبر الواتساب</p>
            <Input
              placeholder="الصق رابطك هنا..."
              value={portalLink}
              onChange={e => setPortalLink(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
              onKeyDown={e => e.key === "Enter" && handlePortalLink()}
            />
            <Button className="w-full gap-2 bg-[#16a34a] hover:bg-[#15803d] text-white" onClick={handlePortalLink}>
              <ArrowLeft className="w-4 h-4" />
              دخول
            </Button>
          </Card>

          {/* Info */}
          <div className="text-center space-y-3 pt-2">
            <p className="text-sm text-white/30">
              ما عندك رابط؟ تواصل مع مدربك ليرسل لك رابط الدخول
            </p>
            <Link to="/">
              <Button variant="ghost" size="sm" className="text-white/40 hover:text-white/70 text-xs">
                ← الرئيسية
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ClientLogin;
