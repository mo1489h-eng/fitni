import usePageTitle from "@/hooks/usePageTitle";
import TrainerLayout from "@/components/TrainerLayout";
import TemplatesLibrary from "@/components/templates/TemplatesLibrary";
import { BookOpen } from "lucide-react";

const Templates = () => {
  usePageTitle("مكتبة القوالب");

  return (
    <TrainerLayout>
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
    </TrainerLayout>
  );
};

export default Templates;
