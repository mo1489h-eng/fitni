import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Lock, Sparkles, MessageSquare, ClipboardList, FileText,
} from "lucide-react";

import TrainerLayout from "@/components/TrainerLayout";
import UpgradeModal from "@/components/UpgradeModal";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import usePageTitle from "@/hooks/usePageTitle";
import CopilotPrograms from "@/components/copilot/CopilotPrograms";
import CopilotChat from "@/components/copilot/CopilotChat";
import CopilotReports from "@/components/copilot/CopilotReports";

const Copilot = () => {
  usePageTitle("AI كوبايلت");
  const { user } = useAuth();
  const { hasCopilotAccess } = usePlanLimits();
  const navigate = useNavigate();
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (!hasCopilotAccess) {
    return (
      <TrainerLayout title="AI كوبايلت">
        <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-border bg-card">
            <Lock className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <h2 className="mt-6 text-2xl font-bold text-foreground">هذه الميزة للباقة الاحترافية</h2>
          <p className="mt-3 max-w-md text-muted-foreground">
            كوبايلت الذكاء الاصطناعي يساعدك على إنشاء برامج تدريب متكاملة وتوصيات أسبوعية ذكية لكل عميل
          </p>
          <Button className="mt-8 rounded-full px-8" size="lg" onClick={() => setShowUpgrade(true)}>
            <Sparkles className="ml-2 h-4 w-4" strokeWidth={1.5} />
            ترقية الآن - 179 ر.س/شهر
          </Button>
          <UpgradeModal open={showUpgrade} onOpenChange={setShowUpgrade} title="هذه الميزة للباقة الاحترافية" description="كوبايلت الذكاء الاصطناعي متاح فقط في الباقة الاحترافية" onUpgrade={() => { setShowUpgrade(false); navigate("/subscription"); }} />
        </div>
      </TrainerLayout>
    );
  }

  return (
    <TrainerLayout title="AI كوبايلت">
      <div className="space-y-4 page-enter">
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
    </TrainerLayout>
  );
};

export default Copilot;
