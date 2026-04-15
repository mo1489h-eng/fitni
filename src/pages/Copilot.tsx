import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Lock, MessageSquare, ClipboardList, FileText,
} from "lucide-react";
import { CoachBaseAIMark } from "@/components/brand/CoachBaseAIMark";

import { useRegisterTrainerShell } from "@/contexts/trainerShellContext";
import UpgradeModal from "@/components/UpgradeModal";
import FeatureTooltip from "@/components/FeatureTooltip";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import usePageTitle from "@/hooks/usePageTitle";
import CopilotPrograms from "@/components/copilot/CopilotPrograms";
import CopilotChat from "@/components/copilot/CopilotChat";
import CopilotReports from "@/components/copilot/CopilotReports";

const Copilot = () => {
  usePageTitle("CoachBase AI");
  useRegisterTrainerShell({ title: "CoachBase AI" });
  const { hasCopilotAccess } = usePlanLimits();
  const navigate = useNavigate();
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (!hasCopilotAccess) {
    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-border bg-card">
            <Lock className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <h2 className="mt-6 text-2xl font-bold text-foreground">هذه الميزة للباقة الاحترافية</h2>
          <p className="mt-3 max-w-md text-muted-foreground">
            CoachBase AI يساعدك على إنشاء برامج تدريب وتنفيذ تعديلات ذكية لكل عميل — مدعوم بالذكاء
          </p>
          <Button className="mt-8 rounded-full px-8" size="lg" onClick={() => setShowUpgrade(true)}>
            ترقية الآن - 179 ر.س/شهر
          </Button>
          <UpgradeModal open={showUpgrade} onOpenChange={setShowUpgrade} title="هذه الميزة للباقة الاحترافية" description="CoachBase AI متاح فقط في الباقة الاحترافية" onUpgrade={() => { setShowUpgrade(false); navigate("/subscription"); }} />
        </div>
    );
  }

  return (
      <div className="space-y-4 page-enter">
        <div className="flex items-center gap-3 pb-2">
          <CoachBaseAIMark size="md" />
          <p className="text-xs text-muted-foreground">CoachBase AI Assistant · مدعوم بالذكاء</p>
        </div>
        <FeatureTooltip
          id="copilot-agent"
          targetSelector="[value='chat']"
          message="CoachBase AI يقدر يعدّل برنامج العميل مباشرة عند اختياره — جرّب: عدّل البرنامج وخفّف الكارديو"
        />
        <Tabs defaultValue="programs" dir="rtl">
          <TabsList className="grid w-full grid-cols-3 bg-card border border-border">
            <TabsTrigger value="programs" className="gap-1.5 text-xs sm:text-sm">
              <ClipboardList className="w-4 h-4" strokeWidth={1.5} />
              توليد برنامج
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-1.5 text-xs sm:text-sm">
              <MessageSquare className="w-4 h-4" strokeWidth={1.5} />
              الشات
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-1.5 text-xs sm:text-sm">
              <FileText className="w-4 h-4" strokeWidth={1.5} />
              التقارير
            </TabsTrigger>
          </TabsList>

          <TabsContent value="programs">
            <CopilotPrograms />
          </TabsContent>

          <TabsContent value="chat">
            <CopilotChat />
          </TabsContent>

          <TabsContent value="reports">
            <CopilotReports />
          </TabsContent>
        </Tabs>
      </div>
  );
};

export default Copilot;
