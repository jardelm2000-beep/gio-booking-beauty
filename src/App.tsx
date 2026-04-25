import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import BookingPage from "./pages/BookingPage.tsx";
import DashboardPage from "./pages/DashboardPage.tsx";
import AuthPage from "./pages/AuthPage.tsx";
import NotFound from "./pages/NotFound.tsx";
import HubPage from "./pages/HubPage.tsx";
import { BrandProvider, HUB_SLUG } from "./hooks/useBrand";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to={`/${HUB_SLUG}`} replace />} />
          <Route path={`/${HUB_SLUG}`} element={<HubPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/:slug" element={<BrandProvider><Index /></BrandProvider>} />
          <Route path="/:slug/agendar" element={<BrandProvider><BookingPage /></BrandProvider>} />
          <Route path="/:slug/admin" element={<BrandProvider><DashboardPage /></BrandProvider>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
