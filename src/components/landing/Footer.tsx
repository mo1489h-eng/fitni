import { Link } from "react-router-dom";
import { Dumbbell, Instagram, Linkedin, Twitter, Mail } from "lucide-react";

const Footer = () => (
  <footer className="border-t border-border bg-card/50 px-4 py-10 md:px-6">
    <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.2fr_0.8fr_0.8fr] md:items-start">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary"><Dumbbell className="h-5 w-5" /></div>
          <div><div className="text-2xl font-black text-primary">CoachBase</div><div className="text-sm text-foreground/45">منصة المدرب الشخصي</div></div>
        </div>
        <p className="mt-4 max-w-md text-base leading-8 text-foreground/60">منصة عربية premium تساعد المدربين الشخصيين على إدارة العمل، تجربة العميل، والمدفوعات في مكان واحد.</p>
        {/* Social Icons */}
        <div className="flex items-center gap-3 mt-5">
          <a href="https://www.instagram.com/coachbase.health" target="_blank" rel="noopener noreferrer" aria-label="Instagram"
            className="rounded-full border border-border p-2.5 transition-colors duration-200 text-[#888888] hover:text-[#22c55e]">
            <Instagram className="h-5 w-5" />
          </a>
          <a href="https://x.com/CoachBasehealth" target="_blank" rel="noopener noreferrer" aria-label="Twitter"
            className="rounded-full border border-border p-2.5 transition-colors duration-200 text-[#888888] hover:text-[#22c55e]">
            <Twitter className="h-5 w-5" />
          </a>
          <a href="https://linkedin.com/company/coachbase" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"
            className="rounded-full border border-border p-2.5 transition-colors duration-200 text-[#888888] hover:text-[#22c55e]">
            <Linkedin className="h-5 w-5" />
          </a>
        </div>
      </div>
      <div>
        <div className="mb-4 text-sm font-bold text-foreground">روابط</div>
        <div className="space-y-3 text-foreground/60">
          <a href="#features" className="block transition-colors hover:text-foreground">المميزات</a>
          <a href="#pricing" className="block transition-colors hover:text-foreground">التسعير</a>
          <Link to="/contact" className="block transition-colors hover:text-foreground">تواصل معنا</Link>
          <Link to="/login" className="block transition-colors hover:text-foreground">تسجيل الدخول</Link>
        </div>
      </div>
      <div>
        <div className="mb-4 text-sm font-bold text-foreground">قانوني وتواصل</div>
        <div className="space-y-3 text-foreground/60">
          <Link to="/privacy" className="block transition-colors hover:text-foreground">سياسة الخصوصية</Link>
          <Link to="/terms" className="block transition-colors hover:text-foreground">الشروط والأحكام</Link>
          <a href="mailto:support@coachbase.health" className="flex items-center gap-2 transition-colors hover:text-foreground">
            <Mail className="h-4 w-4" />
            support@coachbase.health
          </a>
        </div>
      </div>
    </div>
    <div className="mx-auto mt-10 flex max-w-7xl flex-col gap-3 border-t border-border pt-6 text-sm text-foreground/40 md:flex-row md:items-center md:justify-between">
      <div>© 2026 CoachBase. جميع الحقوق محفوظة.</div>
      <div>صُنع في السعودية</div>
    </div>
  </footer>
);

export default Footer;
