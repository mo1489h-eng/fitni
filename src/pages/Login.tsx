import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dumbbell, Phone } from "lucide-react";

const Login = () => {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const navigate = useNavigate();

  const handleSendOtp = () => {
    if (phone.length >= 10) setOtpSent(true);
  };

  const handleLogin = () => {
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-accent p-4">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary mb-4">
            <Dumbbell className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">فت بوس</h1>
          <p className="text-muted-foreground mt-2">منصة المدرب الشخصي</p>
        </div>

        {/* Form */}
        <div className="bg-card rounded-xl p-6 shadow-lg border border-border">
          <h2 className="text-xl font-bold mb-6 text-center text-card-foreground">تسجيل الدخول</h2>

          {!otpSent ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-card-foreground">رقم الجوال</label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="tel"
                    placeholder="05XXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pr-10 text-right"
                    dir="ltr"
                  />
                </div>
              </div>
              <Button onClick={handleSendOtp} className="w-full" size="lg">
                إرسال رمز التحقق
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                تم إرسال رمز التحقق إلى {phone}
              </p>
              <div>
                <label className="block text-sm font-medium mb-2 text-card-foreground">رمز التحقق</label>
                <Input
                  type="text"
                  placeholder="0000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="text-center text-2xl tracking-[0.5em]"
                  maxLength={4}
                  dir="ltr"
                />
              </div>
              <Button onClick={handleLogin} className="w-full" size="lg">
                دخول
              </Button>
              <button
                onClick={() => setOtpSent(false)}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                تغيير الرقم
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
