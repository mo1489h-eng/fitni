import { Link } from "react-router-dom";
import { Dumbbell, Instagram, Linkedin, Twitter } from "lucide-react";

const Footer = () => (
  <footer className="border-t border-border bg-card/50 px-4 py-10 md:px-6">
    <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.2fr_0.8fr_0.8fr] md:items-start">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary"><Dumbbell className="h-5 w-5" /></div>
          <div><div className="text-2xl font-black text-primary">fitni</div><div className="text-sm text-foreground/45">منصة المدرب الشخصي</div></div>
        </div>
        <p className="mt-4 max-w-md text-base leading-8 text-foreground/60">منصة عربية premium تساعد المدربين الشخصيين على إدارة العمل، تجربة العميل، والمدفوعات في مكان واحد.</p>
      </div>
      <div>
        <div className="mb-4 text-sm font-bold text-foreground">روابط</div>
        <div className="space-y-3 text-foreground/60">
          <a href="#features" className="block transition-colors hover:text-foreground">المميزات</a>
          <a href="#pricing" className="block transition-colors hover:text-foreground">التسعير</a>
          <Link to="/login" className="block transition-colors hover:text-foreground">تسجيل الدخول</Link>
        </div>
      </div>
      <div>
        <div className="mb-4 text-sm font-bold text-foreground">قانوني وتواصل</div>
        <div className="space-y-3 text-foreground/60">
          <Link to="/privacy" className="block transition-colors hover:text-foreground">سياسة الخصوصية</Link>
          <Link to="/terms" className="block transition-colors hover:text-foreground">الشروط والأحكام</Link>
          <div className="flex items-center gap-3 pt-2 text-foreground/55">
            <a href="#" aria-label="Instagram" className="rounded-full border border-border p-2 transition-colors hover:text-primary"><Instagram className="h-4 w-4" /></a>
            <a href="#" aria-label="Twitter" className="rounded-full border border-border p-2 transition-colors hover:text-primary"><Twitter className="h-4 w-4" /></a>
            <a href="#" aria-label="LinkedIn" className="rounded-full border border-border p-2 transition-colors hover:text-primary"><Linkedin className="h-4 w-4" /></a>
          </div>
        </div>
      </div>
    </div>
    <div className="mx-auto mt-10 flex max-w-7xl flex-col gap-3 border-t border-border pt-6 text-sm text-foreground/40 md:flex-row md:items-center md:justify-between">
      <div>© 2026 fitni. جميع الحقوق محفوظة.</div>
      <div>صُنع في السعودية</div>
    </div>
  </footer>
);

export default Footer;
