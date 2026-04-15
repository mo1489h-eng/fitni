import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
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
import MobileLogin from "./MobileLogin";
import TrainerMobileShell from "./trainer/TrainerMobileShell";
import ClientMobileShell from "./client/ClientMobileShell";

const queryClient = new QueryClient();

type MobileRole = "trainer" | "client" | null;

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

/** Cold start: animated splash once per session before home. */
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

const MobileAppContent = () => {
  const { session, user, profile, loading } = useAuth();
  const [role, setRole] = useState<MobileRole>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!session || !user) {
      setRole(null);
      setReady(true);
      return;
    }

    if (profile) {
      setRole("trainer");
      setReady(true);
    } else {
      setReady(true);
    }
  }, [session, user, profile, loading]);

  if (!ready || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "#0A0A0A" }}>
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-transparent"
          style={{ borderTopColor: "#22C55E" }}
        />
      </div>
    );
  }

  if (!session || !role) {
    return (
      <MobileLogin
        onLoginSuccess={(detectedRole) => {
          setRole(detectedRole);
        }}
      />
    );
  }

  if (role === "trainer") {
    return <TrainerMobileShell onLogout={() => setRole(null)} />;
  }

  return <ClientMobileShell />;
};

function MobileRoutes() {
  return (
    <Routes>
      <Route path="/splash" element={<Splash />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/login" element={<LoginGate />} />
      <Route path="/register" element={<RegisterGate />} />
      <Route path="/confirm-email" element={<ConfirmEmail />} />
      <Route path="/dashboard" element={<Navigate to="/" replace />} />
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
