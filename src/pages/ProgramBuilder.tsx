import TrainerLayout from "@/components/TrainerLayout";
import { Card } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";

const ProgramBuilder = () => {
  return (
    <TrainerLayout>
      <div className="space-y-4 animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">بناء البرامج</h1>

        <div className="text-center py-20 text-muted-foreground">
          <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium text-foreground mb-1">قريباً</p>
          <p className="text-sm">أداة بناء البرامج التدريبية ستكون متاحة قريباً</p>
        </div>
      </div>
    </TrainerLayout>
  );
};

export default ProgramBuilder;
