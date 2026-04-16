import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import Onboarding from "@/pages/Onboarding";
import Splash from "@/pages/Splash";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ConfirmEmail from "@/pages/ConfirmEmail";
import { isOnboardingComplete } from "@/lib/onboarding";
import { SPLASH_SESSION_KEY } from "@/lib/splash-session";
import { useWorkoutStore } from "@/store/workout-store";
import MobileLogin from "./MobileLogin";
import TrainerMobileShell from "./trainer/TrainerMobileShell";
import ClientMobileShell from "./client/ClientMobileShell";
import TrainerSessionPage from "@/pages/TrainerSessionPage";
import { COACH_DASHBOARD, TRAINEE_HOME } from "@/lib/app-routes";

const queryClient = new QueryClient();

function LoginGate() {
  if (!isOnboardingComplete()) return <Navigate to="/onboarding" replace />;
  return <Login />;
}

function RegisterGate() {
  if (!isOnboardingComplete()) return <Navigate to="/onboarding" replace />;
  return <Register />;
}

function MobileAppGate() {
  if (!isOnboardingComplete()) return <Navigate to="/onboarding" replace />;
  return <MobileAppContent />;
}

function MobileHomeEntry() {
  try {
    if (sessionStorage.getItem(SPLASH_SESSION_KEY) !== "1") {
      return <Navigate to="/splash" replace />;
    }
  } catch {
    return <Navigate to="/splash" replace />;
  }
  return <MobileAppGate />;
}

function MobileAppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, user, loading, profileLoading, resolvedFitniRole, refreshProfile } = useAuth();
  const fitniRole = resolvedFitniRole;

  useEffect(() => {
    if (!session || !user) {
      useWorkoutStore.getState().clearFitniRole();
    }
  }, [session, user]);

  useEffect(() => {
    if (!fitniRole || !session) return;
    const path = fitniRole === "coach" ? COACH_DASHBOARD : TRAINEE_HOME;
    if (window.location.pathname !== path) {
      navigate(path, { replace: true });
    }
  }, [fitniRole, session, navigate]);

  if (loading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "#000000" }}>
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-transparent"
          style={{ borderTopColor: "#22C55E" }}
        />
      </div>
    );
  }

  if (!session || !user) {
    return (
      <MobileLogin
        onLoginSuccess={async () => {
          await refreshProfile();
        }}
      />
    );
  }

  if (!fitniRole) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center"
        style={{ background: "#000000", color: "#e5e5e5" }}
      >
        <p className="text-sm">تعذّر تحديد نوع حسابك. تحقق من الشبكة ثم أعد المحاولة.</p>
        <button
          type="button"
          className="rounded-lg border border-neutral-600 px-4 py-2 text-sm"
          onClick={() => void refreshProfile()}
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  if (fitniRole === "coach" && location.pathname.startsWith("/trainee")) {
    return <Navigate to={COACH_DASHBOARD} replace />;
  }
  if (fitniRole === "trainee" && location.pathname.startsWith("/coach")) {
    return <Navigate to={TRAINEE_HOME} replace />;
  }

  if (location.pathname === "/trainer/session" || location.pathname === "/coach/trainer/session") {
    if (fitniRole !== "coach") {
      return <Navigate to={fitniRole === "trainee" ? TRAINEE_HOME : COACH_DASHBOARD} replace />;
    }
    return <TrainerSessionPage />;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={fitniRole}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        className="min-h-screen"
      >
        {fitniRole === "coach" ? (
          <TrainerMobileShell onLogout={() => useWorkoutStore.getState().clearFitniRole()} />
        ) : (
          <ClientMobileShell />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function MobileRoutes() {
  return (
    <Routes>
      <Route path="/splash" element={<Splash />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/login" element={<LoginGate />} />
      <Route path="/register" element={<RegisterGate />} />
      <Route path="/confirm-email" element={<ConfirmEmail />} />
      <Route path="/dashboard" element={<Navigate to="/" replace />} />
      <Route path="/trainer/session" element={<MobileAppGate />} />
      <Route path="/coach/trainer/session" element={<MobileAppGate />} />
      <Route path="/coach/dashboard" element={<MobileAppGate />} />
      <Route path="/trainee/home" element={<MobileAppGate />} />
      <Route path="/trainee/dashboard" element={<Navigate to={TRAINEE_HOME} replace />} />
      <Route path="/" element={<MobileHomeEntry />} />
      <Route path="/*" element={<MobileAppGate />} />
    </Routes>
  );
}

const MobileApp = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" enableSystem={false}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <MobileRoutes />
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default MobileApp;
