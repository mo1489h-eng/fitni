import { Routes, Route, Navigate } from "react-router-dom";
import { isOnboardingComplete } from "@/lib/onboarding";
import AuthGuard from "@/components/AuthGuard";
import { RoleGuard } from "@/components/routing/RoleGuard";
import { PortalTokenProvider } from "@/hooks/usePortalToken";
import Landing from "@/pages/Landing";
import Onboarding from "@/pages/Onboarding";
import Login from "@/pages/Login";
import ResetPassword from "@/pages/ResetPassword";
import ConfirmEmail from "@/pages/ConfirmEmail";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Clients from "@/pages/Clients";
import ClientProfile from "@/pages/ClientProfile";
import ProgramBuilder from "@/pages/ProgramBuilder";
import Payments from "@/pages/Payments";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import Subscription from "@/pages/Subscription";
import Nutrition from "@/pages/Nutrition";
import Calendar from "@/pages/Calendar";
import TrainerContent from "@/pages/TrainerContent";
import TrainerPublicPage from "@/pages/TrainerPublicPage";
import ClientLogin from "@/pages/ClientLogin";
import ClientRegister from "@/pages/ClientRegister";
import PortalHome from "@/pages/portal/PortalHome";
import PortalWorkout from "@/pages/portal/PortalWorkout";
import PortalProgress from "@/pages/portal/PortalProgress";
import PortalNutrition from "@/pages/portal/PortalNutrition";
import PortalContent from "@/pages/portal/PortalContent";
import PortalBodyScan from "@/pages/portal/PortalBodyScan";
import PortalSubscription from "@/pages/portal/PortalSubscription";
import PortalAccount from "@/pages/portal/PortalAccount";
import PortalChallenges from "@/pages/portal/PortalChallenges";
import NotFound from "@/pages/NotFound";
import Marketplace from "@/pages/Marketplace";
import Challenges from "@/pages/Challenges";
import GulfFoods from "@/pages/GulfFoods";
import Discover from "@/pages/Discover";
import LeadsInbox from "@/pages/LeadsInbox";
import TrainerPackages from "@/pages/TrainerPackages";
import PublicPayment from "@/pages/PublicPayment";
import AdminDashboard from "@/pages/AdminDashboard";
import PageBuilder from "@/pages/PageBuilder";
import Copilot from "@/pages/Copilot";
import Store from "@/pages/Store";
import ListingSalesPage from "@/pages/ListingSalesPage";
import Templates from "@/pages/Templates";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import Contact from "@/pages/Contact";
import ReferralRedirect from "@/pages/ReferralRedirect";
import PaymentCallback from "@/pages/PaymentCallback";
import PaymentSuccess from "@/pages/payment-success";
import Earnings from "@/pages/Earnings";
import Vault from "@/pages/Vault";
import VaultUnit from "@/pages/VaultUnit";
import PortalVault from "@/pages/portal/PortalVault";
import PortalLessonPlayer from "@/pages/portal/PortalLessonPlayer";
import { TrainerAppLayout } from "@/components/layout/TrainerAppLayout";
import { TraineeAppLayout } from "@/components/layout/TraineeAppLayout";
import TraineeDashboard from "@/pages/TraineeDashboard";
import { CLIENT_HOME, TRAINER_HOME } from "@/lib/app-routes";

const WEB_ONBOARDING_LANDING_GATE = false;

function WebLandingOrOnboarding() {
  if (WEB_ONBOARDING_LANDING_GATE && !isOnboardingComplete()) {
    return <Navigate to="/onboarding" replace />;
  }
  return <Landing />;
}

/** Web application routes (not used in Capacitor — see MobileApp). */
export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<WebLandingOrOnboarding />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/register" element={<Register />} />
      <Route path="/confirm-email" element={<ConfirmEmail />} />

      <Route path="/coach/dashboard" element={<Navigate to={TRAINER_HOME} replace />} />
      <Route path="/dashboard/coach" element={<Navigate to={TRAINER_HOME} replace />} />

      <Route element={<AuthGuard><RoleGuard allowed="coach"><TrainerAppLayout /></RoleGuard></AuthGuard>}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path={TRAINER_HOME.replace(/^\//, "")} element={<Dashboard />} />
        <Route path="clients" element={<Clients />} />
        <Route path="clients/:id" element={<ClientProfile />} />
        <Route path="programs" element={<ProgramBuilder />} />
        <Route path="workout-builder" element={<Navigate to="/programs" replace />} />
        <Route path="earnings" element={<Earnings />} />
        <Route path="payments" element={<Payments />} />
        <Route path="reports" element={<Reports />} />
        <Route path="nutrition" element={<Nutrition />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="content" element={<TrainerContent />} />
        <Route path="settings" element={<Settings />} />
        <Route path="subscription" element={<Subscription />} />
        <Route path="packages" element={<TrainerPackages />} />
        <Route path="settings/page" element={<PageBuilder />} />
        <Route path="vault" element={<Vault />} />
        <Route path="vault/:unitId" element={<VaultUnit />} />
        <Route path="copilot" element={<Copilot />} />
        <Route path="marketplace" element={<Marketplace />} />
        <Route path="challenges" element={<Challenges />} />
        <Route path="gulf-foods" element={<GulfFoods />} />
        <Route path="templates" element={<Templates />} />
        <Route path="leads" element={<LeadsInbox />} />
      </Route>

      <Route path="/trainee" element={<AuthGuard><RoleGuard allowed="trainee"><TraineeAppLayout /></RoleGuard></AuthGuard>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<TraineeDashboard />} />
      </Route>

      <Route path={CLIENT_HOME} element={<AuthGuard><RoleGuard allowed="trainee"><TraineeAppLayout /></RoleGuard></AuthGuard>}>
        <Route index element={<TraineeDashboard />} />
      </Route>

      <Route path="/trainer/:trainerId" element={<TrainerPublicPage />} />
      <Route path="/t/:username" element={<TrainerPublicPage />} />
      <Route path="/client-login" element={<ClientLogin />} />
      <Route path="/client-register/:token" element={<ClientRegister />} />

      <Route path="/pay/:trainerSlug" element={<PublicPayment />} />
      <Route path="/pay/:trainerSlug/:packageId" element={<PublicPayment />} />
      <Route path="/payment/callback" element={<PaymentCallback />} />
      <Route path="/payment/success" element={<PaymentSuccess />} />

      <Route path="/client-portal/:token/*" element={<PortalTokenProvider><PortalHome /></PortalTokenProvider>} />

      <Route path="/portal" element={<PortalTokenProvider><PortalHome /></PortalTokenProvider>} />
      <Route path="/portal/workout" element={<PortalTokenProvider><PortalWorkout /></PortalTokenProvider>} />
      <Route path="/portal/progress" element={<PortalTokenProvider><PortalProgress /></PortalTokenProvider>} />
      <Route path="/portal/nutrition" element={<PortalTokenProvider><PortalNutrition /></PortalTokenProvider>} />
      <Route path="/portal/body-scan" element={<PortalTokenProvider><PortalBodyScan /></PortalTokenProvider>} />
      <Route path="/portal/content" element={<PortalTokenProvider><PortalContent /></PortalTokenProvider>} />
      <Route path="/portal/subscription" element={<PortalTokenProvider><PortalSubscription /></PortalTokenProvider>} />
      <Route path="/portal/account" element={<PortalTokenProvider><PortalAccount /></PortalTokenProvider>} />
      <Route path="/portal/challenges" element={<PortalTokenProvider><PortalChallenges /></PortalTokenProvider>} />
      <Route path="/portal/vault" element={<PortalTokenProvider><PortalVault /></PortalTokenProvider>} />
      <Route path="/portal/vault/:unitId/:lessonId" element={<PortalTokenProvider><PortalLessonPlayer /></PortalTokenProvider>} />

      <Route path="/discover" element={<Discover />} />
      <Route path="/admin-CoachBase-dashboard" element={<AdminDashboard />} />
      <Route path="/store" element={<Store />} />
      <Route path="/store/:listingId" element={<ListingSalesPage />} />
      <Route path="/ref/:code" element={<ReferralRedirect />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/contact" element={<Contact />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
