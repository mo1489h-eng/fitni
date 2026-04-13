import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

export interface TrainerShellOptions {
  title?: string;
  onQuickAdd?: () => void;
}

type TrainerShellContextValue = {
  setShellOptions: (partial: Partial<TrainerShellOptions>) => void;
  resetShellOptions: () => void;
};

const TrainerShellOptionsContext = createContext<TrainerShellContextValue | null>(null);

export function useTrainerShellOptions(): TrainerShellContextValue {
  const ctx = useContext(TrainerShellOptionsContext);
  if (!ctx) {
    throw new Error("useTrainerShellOptions must be used within TrainerAppLayout");
  }
  return ctx;
}

/**
 * Registers title / quick-add for the trainer shell header. Clears on unmount and on route change (handled by provider).
 */
export function useRegisterTrainerShell(options: TrainerShellOptions): void {
  const { setShellOptions, resetShellOptions } = useTrainerShellOptions();
  const { title, onQuickAdd } = options;

  useEffect(() => {
    setShellOptions({ title, onQuickAdd });
    return () => resetShellOptions();
  }, [title, onQuickAdd, setShellOptions, resetShellOptions]);
}

export function useTrainerShellOptionsState(): {
  shellOptions: TrainerShellOptions;
  contextValue: TrainerShellContextValue;
} {
  const location = useLocation();
  const [shellOptions, setShellOptionsState] = useState<TrainerShellOptions>({});

  const setShellOptions = useCallback((partial: Partial<TrainerShellOptions>) => {
    setShellOptionsState((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetShellOptions = useCallback(() => {
    setShellOptionsState({});
  }, []);

  useEffect(() => {
    resetShellOptions();
  }, [location.pathname, resetShellOptions]);

  const contextValue = useMemo(
    () => ({ setShellOptions, resetShellOptions }),
    [setShellOptions, resetShellOptions],
  );

  return { shellOptions, contextValue };
}

export { TrainerShellOptionsContext };
