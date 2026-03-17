import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { PortalTokenProvider } from "@/hooks/usePortalToken";
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
import Subscription from "./pages/Subscription";
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
import PortalSubscription from "./pages/portal/PortalSubscription";
import NotFound from "./pages/NotFound";
import Marketplace from "./pages/Marketplace";
import Challenges from "./pages/Challenges";
import GulfFoods from "./pages/GulfFoods";
import Discover from "./pages/Discover";
import LeadsInbox from "./pages/LeadsInbox";
import TrainerPackages from "./pages/TrainerPackages";
import PublicPayment from "./pages/PublicPayment";
import AdminDashboard from "./pages/AdminDashboard";

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
            <Route path="/t/:username" element={<TrainerPublicPage />} />
            <Route path="/client-login" element={<ClientLogin />} />
            <Route path="/client-register/:token" element={<ClientRegister />} />
            <Route path="/settings" element={<AuthGuard><Settings /></AuthGuard>} />
            <Route path="/subscription" element={<AuthGuard><Subscription /></AuthGuard>} />
            <Route path="/packages" element={<AuthGuard><TrainerPackages /></AuthGuard>} />

            {/* Public payment pages */}
            <Route path="/pay/:trainerSlug" element={<PublicPayment />} />
            <Route path="/pay/:trainerSlug/:packageId" element={<PublicPayment />} />

            {/* Portal entry with token */}
            <Route path="/client-portal/:token/*" element={<PortalTokenProvider><PortalHome /></PortalTokenProvider>} />

            {/* Clean portal routes */}
            <Route path="/portal" element={<PortalTokenProvider><PortalHome /></PortalTokenProvider>} />
            <Route path="/portal/workout" element={<PortalTokenProvider><PortalWorkout /></PortalTokenProvider>} />
            <Route path="/portal/progress" element={<PortalTokenProvider><PortalProgress /></PortalTokenProvider>} />
            <Route path="/portal/nutrition" element={<PortalTokenProvider><PortalNutrition /></PortalTokenProvider>} />
            <Route path="/portal/body-scan" element={<PortalTokenProvider><PortalBodyScan /></PortalTokenProvider>} />
            <Route path="/portal/content" element={<PortalTokenProvider><PortalContent /></PortalTokenProvider>} />
            <Route path="/portal/subscription" element={<PortalTokenProvider><PortalSubscription /></PortalTokenProvider>} />

            <Route path="/marketplace" element={<AuthGuard><Marketplace /></AuthGuard>} />
            <Route path="/challenges" element={<AuthGuard><Challenges /></AuthGuard>} />
            <Route path="/gulf-foods" element={<AuthGuard><GulfFoods /></AuthGuard>} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/leads" element={<AuthGuard><LeadsInbox /></AuthGuard>} />
            <Route path="/admin-fitni-dashboard" element={<AdminDashboard />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
