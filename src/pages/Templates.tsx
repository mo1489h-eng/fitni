import usePageTitle from "@/hooks/usePageTitle";
import TemplatesLibrary from "@/components/templates/TemplatesLibrary";
import { BookOpen } from "lucide-react";
import { useRegisterTrainerShell } from "@/contexts/trainerShellContext";

const Templates = () => {
  usePageTitle("مكتبة القوالب");
  useRegisterTrainerShell({ title: "مكتبة القوالب" });

  return (
      <div className="space-y-6 animate-fade-in" dir="rtl">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            مكتبة القوالب
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">احفظ واستخدم قوالب برامج جاهزة</p>
        </div>
        <TemplatesLibrary />
      </div>
  );
};

export default Templates;
