import { AnimatePresence } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";

import { TrainerShellOptionsContext, useTrainerShellOptionsState } from "@/contexts/trainerShellContext";

import { PageWrapper } from "./PageWrapper";
import { TrainerShellLayout } from "./TrainerShellLayout";

/**
 * Authenticated trainer area: persistent shell, animated page transitions via `Outlet`.
 */
export function TrainerAppLayout() {
  const location = useLocation();
  const { shellOptions, contextValue } = useTrainerShellOptionsState();

  return (
    <TrainerShellOptionsContext.Provider value={contextValue}>
      <TrainerShellLayout title={shellOptions.title} onQuickAdd={shellOptions.onQuickAdd}>
        <AnimatePresence mode="wait" initial={false}>
          <PageWrapper key={location.pathname}>
            <Outlet />
          </PageWrapper>
        </AnimatePresence>
      </TrainerShellLayout>
    </TrainerShellOptionsContext.Provider>
  );
}
