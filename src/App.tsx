import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/hooks/useAuth";
import { useIsNativePlatform } from "@/hooks/useNativePlatform";
import MobileApp from "@/components/mobile/MobileApp";
import { AppRouter } from "@/components/routing/AppRouter";

const queryClient = new QueryClient();

const App = () => {
  const isNative = useIsNativePlatform();

  if (isNative) {
    return <MobileApp />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AuthProvider>
            <AppRouter />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
