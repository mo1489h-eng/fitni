import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Dumbbell, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import LanguageToggle from "@/components/LanguageToggle";

const Navbar = ({ scrolled }: { scrolled: boolean }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  const navLinks = [
    { label: t("nav.features"), href: "#features" },
    { label: t("nav.pricing"), href: "#pricing" },
    { label: t("nav.login"), href: "/login", isRoute: true },
  ];

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "border-b border-border bg-background/80 backdrop-blur-2xl" : "bg-transparent"
      }`}
      dir={isAr ? "rtl" : "ltr"}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
            <Dumbbell className="h-5 w-5" />
          </div>
          <div className="text-2xl font-black tracking-tight text-primary">CoachBase</div>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((item) =>
            item.isRoute ? (
              <Link key={item.label} to={item.href} className="text-sm font-medium text-foreground/65 transition-colors hover:text-foreground">
                {item.label}
              </Link>
            ) : (
              <a key={item.label} href={item.href} className="text-sm font-medium text-foreground/65 transition-colors hover:text-foreground">
                {item.label}
              </a>
            ),
          )}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <LanguageToggle />
          <Button asChild variant="ghost" className="rounded-full text-foreground/75 hover:bg-card hover:text-foreground">
            <Link to="/login">{t("nav.login")}</Link>
          </Button>
          <Button asChild className="rounded-full px-6 text-base font-bold shadow-[0_16px_50px_hsl(var(--primary)/0.28)]">
            <Link to="/register">{t("nav.startFree")}</Link>
          </Button>
        </div>

        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card/70 md:hidden"
          onClick={() => setMobileMenuOpen((c) => !c)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-border bg-background/95 px-4 py-4 backdrop-blur-2xl md:hidden">
          <div className="flex flex-col gap-3">
            <div className="flex justify-center mb-2">
              <LanguageToggle />
            </div>
            <a href="#features" className="rounded-2xl border border-border bg-card/70 px-4 py-3 text-foreground/80" onClick={() => setMobileMenuOpen(false)}>{t("nav.features")}</a>
            <a href="#pricing" className="rounded-2xl border border-border bg-card/70 px-4 py-3 text-foreground/80" onClick={() => setMobileMenuOpen(false)}>{t("nav.pricing")}</a>
            <Link to="/login" className="rounded-2xl border border-border bg-card/70 px-4 py-3 text-foreground/80" onClick={() => setMobileMenuOpen(false)}>{t("nav.login")}</Link>
            <Button asChild className="h-12 rounded-2xl text-base font-bold">
              <Link to="/register" onClick={() => setMobileMenuOpen(false)}>{t("nav.startFree")}</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
