import { LayoutDashboard } from "lucide-react";

/** Trainee web home — performance hub entry (extend with charts, today’s session). */
export default function TraineeDashboard() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8" dir="rtl">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15">
          <LayoutDashboard className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">لوحة المتدرب</h1>
          <p className="text-sm text-muted-foreground">تمرينك، تقدمك، ودعم الذكاء الاصطناعي — في مكان واحد.</p>
        </div>
      </div>
    </div>
  );
}
