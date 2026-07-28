import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/HomePage";
import DentalConsultingPage from "@/pages/DentalConsultingPage";
import AnalyzerPage from "@/pages/AnalyzerPage";
import AgreementSignerPage from "@/pages/AgreementSignerPage";
import AboutPage from "@/pages/AboutPage";
import PracticeOpportunityReviewPage from "@/pages/PracticeOpportunityReviewPage";
import { PaymentCancelPage, PaymentSuccessPage } from "@/pages/PaymentResultPage";
import PrivacyPage from "@/pages/PrivacyPage";
import TermsPage from "@/pages/TermsPage";
import Seo from "@/components/Seo";
import PageAnalytics from "@/components/PageAnalytics";
import TrackingConsentNotice from "@/components/TrackingConsentNotice";
import { TrackingConsentProvider } from "@/context/TrackingConsentContext";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/dental-consulting" component={DentalConsultingPage} />
      <Route path="/analyzer" component={AnalyzerPage} />
      <Route path="/agreements/sign/:token" component={AgreementSignerPage} />
      <Route path="/practice-opportunity-review" component={PracticeOpportunityReviewPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/payment-success" component={PaymentSuccessPage} />
      <Route path="/payment-cancel" component={PaymentCancelPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/terms" component={TermsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function PublicSiteShell() {
  const [location] = useLocation();

  return (
    <>
      <Seo location={location} />
      <PageAnalytics location={location} />
      <Router />
      <TrackingConsentNotice />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <TrackingConsentProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <PublicSiteShell />
          </WouterRouter>
        </TrackingConsentProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
