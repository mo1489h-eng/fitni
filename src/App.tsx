import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import AuthGuard from "@/components/AuthGuard";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientProfile from "./pages/ClientProfile";
import ProgramBuilder from "./pages/ProgramBuilder";
import Payments from "./pages/Payments";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Nutrition from "./pages/Nutrition";
import Calendar from "./pages/Calendar";
import TrainerContent from "./pages/TrainerContent";
import TrainerPublicPage from "./pages/TrainerPublicPage";
import ClientLogin from "./pages/ClientLogin";
import ClientRegister from "./pages/ClientRegister";
import PortalHome from "./pages/portal/PortalHome";
import PortalWorkout from "./pages/portal/PortalWorkout";
import PortalProgress from "./pages/portal/PortalProgress";
import PortalNutrition from "./pages/portal/PortalNutrition";
import PortalContent from "./pages/portal/PortalContent";
import PortalBodyScan from "./pages/portal/PortalBodyScan";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<AuthGuard><Dashboard /></AuthGuard>} />
            <Route path="/clients" element={<AuthGuard><Clients /></AuthGuard>} />
            <Route path="/clients/:id" element={<AuthGuard><ClientProfile /></AuthGuard>} />
            <Route path="/programs" element={<AuthGuard><ProgramBuilder /></AuthGuard>} />
            <Route path="/payments" element={<AuthGuard><Payments /></AuthGuard>} />
            <Route path="/reports" element={<AuthGuard><Reports /></AuthGuard>} />
            <Route path="/nutrition" element={<AuthGuard><Nutrition /></AuthGuard>} />
            <Route path="/calendar" element={<AuthGuard><Calendar /></AuthGuard>} />
            <Route path="/content" element={<AuthGuard><TrainerContent /></AuthGuard>} />
            <Route path="/trainer/:trainerId" element={<TrainerPublicPage />} />
            <Route path="/client-login" element={<ClientLogin />} />
            <Route path="/client-register/:token" element={<ClientRegister />} />
            <Route path="/settings" element={<AuthGuard><Settings /></AuthGuard>} />
            <Route path="/client-portal/:token" element={<PortalHome />} />
            <Route path="/client-portal/:token/workout" element={<PortalWorkout />} />
            <Route path="/client-portal/:token/progress" element={<PortalProgress />} />
            <Route path="/client-portal/:token/nutrition" element={<PortalNutrition />} />
            <Route path="/client-portal/:token/body-scan" element={<PortalBodyScan />} />
            <Route path="/client-portal/:token/content" element={<PortalContent />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
