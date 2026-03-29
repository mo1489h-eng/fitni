import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";

const LanguageToggle = ({ className = "" }: { className?: string }) => {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  const toggle = () => {
    i18n.changeLanguage(isAr ? "en" : "ar");
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={`flex items-center gap-1.5 rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all duration-200 hover:border-primary/30 hover:text-foreground ${className}`}
      aria-label="Switch language"
    >
      <Languages className="h-3.5 w-3.5" strokeWidth={1.5} />
      <span>{isAr ? "EN" : "عربي"}</span>
    </button>
  );
};

export default LanguageToggle;
