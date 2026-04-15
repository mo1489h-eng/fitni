import { Outlet } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { PageWrapper } from "./PageWrapper";

/** Minimal shell for trainee web routes (performance hub). */
export function TraineeAppLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b border-border px-4 py-3">
        <p className="text-sm font-semibold text-foreground">مساحة المتدرب</p>
      </header>
      <AnimatePresence mode="wait" initial={false}>
        <PageWrapper key={location.pathname}>
          <Outlet />
        </PageWrapper>
      </AnimatePresence>
    </div>
  );
}
