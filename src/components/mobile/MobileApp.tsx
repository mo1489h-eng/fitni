import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import MobileLogin from "./MobileLogin";
import TrainerMobileShell from "./trainer/TrainerMobileShell";
import ClientMobileShell from "./client/ClientMobileShell";

const queryClient = new QueryClient();

type MobileRole = "trainer" | "client" | null;

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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: "#22C55E" }} />
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

const MobileApp = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <MobileAppContent />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default MobileApp;
