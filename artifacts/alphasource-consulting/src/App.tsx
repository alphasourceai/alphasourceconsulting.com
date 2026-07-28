import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import NotFound from "@/pages/not-found";
import Seo from "@/components/Seo";
import PageAnalytics from "@/components/PageAnalytics";
import TrackingConsentNotice from "@/components/TrackingConsentNotice";
import { TrackingConsentProvider } from "@/context/TrackingConsentContext";

const HomePage = lazy(() => import("@/pages/HomePage"));
const DentalConsultingPage = lazy(() => import("@/pages/DentalConsultingPage"));
const AnalyzerPage = lazy(() => import("@/pages/AnalyzerPage"));
const AgreementSignerPage = lazy(() => import("@/pages/AgreementSignerPage"));
const AboutPage = lazy(() => import("@/pages/AboutPage"));
const PracticeOpportunityReviewPage = lazy(() => import("@/pages/PracticeOpportunityReviewPage"));
const PrivacyPage = lazy(() => import("@/pages/PrivacyPage"));
const TermsPage = lazy(() => import("@/pages/TermsPage"));
const PaymentSuccessPage = lazy(() =>
  import("@/pages/PaymentResultPage").then((module) => ({ default: module.PaymentSuccessPage })),
);
const PaymentCancelPage = lazy(() =>
  import("@/pages/PaymentResultPage").then((module) => ({ default: module.PaymentCancelPage })),
);
const HowItWorksPage = lazy(() =>
  import("@/pages/ConsultingResourcePages").then((module) => ({ default: module.HowItWorksPage })),
);
const DentalGroupsPage = lazy(() =>
  import("@/pages/ConsultingResourcePages").then((module) => ({ default: module.DentalGroupsPage })),
);
const ConsultingFaqPage = lazy(() =>
  import("@/pages/ConsultingResourcePages").then((module) => ({ default: module.ConsultingFaqPage })),
);
const SecurityPage = lazy(() =>
  import("@/pages/ConsultingResourcePages").then((module) => ({ default: module.SecurityPage })),
);
const ConsultingSupportPage = lazy(() =>
  import("@/pages/ConsultingResourcePages").then((module) => ({ default: module.ConsultingSupportPage })),
);

function RouteFallback() {
  return (
    <div className="min-h-screen bg-[#F8F9FD]" role="status" aria-live="polite">
      <span className="sr-only">Loading page...</span>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/dental-consulting" component={DentalConsultingPage} />
      <Route path="/how-it-works" component={HowItWorksPage} />
      <Route path="/for-dental-groups" component={DentalGroupsPage} />
      <Route path="/faq" component={ConsultingFaqPage} />
      <Route path="/security" component={SecurityPage} />
      <Route path="/support" component={ConsultingSupportPage} />
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
      <Suspense fallback={<RouteFallback />}>
        <Router />
      </Suspense>
      <TrackingConsentNotice />
    </>
  );
}

function App() {
  return (
    <TrackingConsentProvider>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <PublicSiteShell />
      </WouterRouter>
    </TrackingConsentProvider>
  );
}

export default App;
