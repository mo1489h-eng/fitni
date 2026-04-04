import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Mail, MessageCircle, Share2, ArrowLeft, Loader2, CheckCircle,
  Dumbbell, Instagram, Twitter, Linkedin,
} from "lucide-react";

const INQUIRY_TYPES = [
  { value: "technical", label: "مشكلة تقنية" },
  { value: "question", label: "سؤال عن المنصة" },
  { value: "suggestion", label: "اقتراح" },
  { value: "partnership", label: "شراكة" },
  { value: "other", label: "أخرى" },
];

const Contact = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    inquiry_type: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast({ title: "يرجى تعبئة جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("send-contact-email", {
        body: {
          name: form.name.trim(),
          email: form.email.trim(),
          inquiry_type: INQUIRY_TYPES.find(t => t.value === form.inquiry_type)?.label || "أخرى",
          message: form.message.trim(),
        },
      });
      if (error) throw error;
      setSubmitted(true);
    } catch {
      toast({ title: "حدث خطأ في إرسال الرسالة", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-foreground" dir="rtl" style={{ backgroundColor: "#050505" }}>
      {/* Navbar */}
      <header className="fixed inset-x-0 top-0 z-50 border-b bg-background/80 backdrop-blur-2xl" style={{ borderColor: "#1e1e1e" }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <Dumbbell className="h-5 w-5" />
            </div>
            <div className="text-2xl font-black tracking-tight text-primary">CoachBase</div>
          </Link>
          <Button asChild variant="ghost" className="rounded-full">
            <Link to="/">الرئيسية</Link>
          </Button>
        </div>
      </header>

      <main className="pt-28 pb-20 px-4 md:px-6">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-black mb-4" style={{ color: "#ededed" }}>
              تواصل معنا
            </h1>
            <p className="text-lg leading-relaxed" style={{ color: "#888888" }}>
              نحن هنا للمساعدة<br />سنرد خلال 24 ساعة
            </p>
          </div>

          {/* Contact Cards */}
          <div className="grid md:grid-cols-3 gap-4 mb-16">
            {/* Email */}
            <div className="rounded-2xl border p-6 text-center" style={{ backgroundColor: "#111111", borderColor: "#1e1e1e" }}>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: "#16a34a15" }}>
                <Mail className="h-5 w-5" style={{ color: "#22c55e" }} strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-bold mb-1" style={{ color: "#ededed" }}>راسلنا</h3>
              <p className="text-sm mb-4" style={{ color: "#888888" }}>support@coachbase.health</p>
              <Button asChild variant="outline" className="rounded-xl gap-2 w-full" style={{ borderColor: "#1e1e1e", color: "#ededed" }}>
                <a href="mailto:support@coachbase.health">
                  مراسلة
                  <ArrowLeft className="h-4 w-4" />
                </a>
              </Button>
            </div>

            {/* WhatsApp */}
            <div className="rounded-2xl border p-6 text-center" style={{ backgroundColor: "#111111", borderColor: "#1e1e1e" }}>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: "#16a34a15" }}>
                <MessageCircle className="h-5 w-5" style={{ color: "#22c55e" }} strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-bold mb-1" style={{ color: "#ededed" }}>واتساب</h3>
              <p className="text-sm mb-4" style={{ color: "#888888" }}>للردود الفورية</p>
              <Button asChild variant="outline" className="rounded-xl gap-2 w-full" style={{ borderColor: "#1e1e1e", color: "#ededed" }}>
                <a href="https://wa.me/966500000000" target="_blank" rel="noopener noreferrer">
                  فتح واتساب
                  <ArrowLeft className="h-4 w-4" />
                </a>
              </Button>
            </div>

            {/* Social */}
            <div className="rounded-2xl border p-6 text-center" style={{ backgroundColor: "#111111", borderColor: "#1e1e1e" }}>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: "#16a34a15" }}>
                <Share2 className="h-5 w-5" style={{ color: "#22c55e" }} strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-bold mb-1" style={{ color: "#ededed" }}>تابعنا</h3>
              <p className="text-sm mb-4" style={{ color: "#888888" }}>@coachbase</p>
              <div className="flex items-center justify-center gap-3">
                <a href="https://www.instagram.com/coachbase.health" target="_blank" rel="noopener noreferrer"
                  className="rounded-full border p-2.5 transition-colors duration-200 hover:text-[#22c55e]"
                  style={{ borderColor: "#1e1e1e", color: "#888888" }}>
                  <Instagram className="h-5 w-5" />
                </a>
                <a href="https://x.com/CoachBasehealth" target="_blank" rel="noopener noreferrer"
                  className="rounded-full border p-2.5 transition-colors duration-200 hover:text-[#22c55e]"
                  style={{ borderColor: "#1e1e1e", color: "#888888" }}>
                  <Twitter className="h-5 w-5" />
                </a>
                <a href="https://linkedin.com/company/coachbase" target="_blank" rel="noopener noreferrer"
                  className="rounded-full border p-2.5 transition-colors duration-200 hover:text-[#22c55e]"
                  style={{ borderColor: "#1e1e1e", color: "#888888" }}>
                  <Linkedin className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="rounded-2xl border p-6 md:p-10" style={{ backgroundColor: "#111111", borderColor: "#1e1e1e" }}>
            {submitted ? (
              <div className="text-center py-10">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: "#16a34a20" }}>
                  <CheckCircle className="h-8 w-8" style={{ color: "#22c55e" }} />
                </div>
                <h3 className="text-2xl font-bold mb-2" style={{ color: "#ededed" }}>تم إرسال رسالتك بنجاح</h3>
                <p style={{ color: "#888888" }}>سنرد عليك خلال 24 ساعة</p>
                <Button
                  variant="outline"
                  className="mt-6 rounded-xl"
                  style={{ borderColor: "#1e1e1e", color: "#ededed" }}
                  onClick={() => { setSubmitted(false); setForm({ name: "", email: "", inquiry_type: "", message: "" }); }}
                >
                  إرسال رسالة أخرى
                </Button>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: "#ededed" }}>
                  أو أرسل لنا رسالة
                </h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <Label className="mb-2 block" style={{ color: "#ededed" }}>الاسم الكامل *</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="أدخل اسمك الكامل"
                      maxLength={200}
                      required
                      className="rounded-xl"
                      style={{ backgroundColor: "#0a0a0a", borderColor: "#1e1e1e", color: "#ededed" }}
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block" style={{ color: "#ededed" }}>البريد الإلكتروني *</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="example@email.com"
                      maxLength={255}
                      required
                      dir="ltr"
                      className="rounded-xl"
                      style={{ backgroundColor: "#0a0a0a", borderColor: "#1e1e1e", color: "#ededed" }}
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block" style={{ color: "#ededed" }}>نوع الاستفسار</Label>
                    <Select value={form.inquiry_type} onValueChange={(v) => setForm({ ...form, inquiry_type: v })}>
                      <SelectTrigger className="rounded-xl" style={{ backgroundColor: "#0a0a0a", borderColor: "#1e1e1e", color: "#ededed" }}>
                        <SelectValue placeholder="اختر نوع الاستفسار" />
                      </SelectTrigger>
                      <SelectContent>
                        {INQUIRY_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-2 block" style={{ color: "#ededed" }}>رسالتك *</Label>
                    <Textarea
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="اكتب رسالتك هنا..."
                      maxLength={5000}
                      required
                      rows={5}
                      className="rounded-xl"
                      style={{ backgroundColor: "#0a0a0a", borderColor: "#1e1e1e", color: "#ededed" }}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl h-12 text-base font-bold gap-2"
                    style={{ backgroundColor: "#22c55e", color: "#fff" }}
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                      <>
                        إرسال الرسالة
                        <ArrowLeft className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t px-4 py-8" style={{ borderColor: "#1e1e1e" }}>
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4 text-sm" style={{ color: "#555555" }}>
          <div className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-primary" />
            <span>CoachBase</span>
          </div>
          <div>جميع الحقوق محفوظة 2026</div>
        </div>
      </footer>
    </div>
  );
};

export default Contact;
