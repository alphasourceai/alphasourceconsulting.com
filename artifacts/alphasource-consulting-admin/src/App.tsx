import { useEffect, type ReactNode } from "react";
import { Route, Router as WouterRouter, Switch, useLocation, type RouteComponentProps } from "wouter";
import { AuthProvider, useAuth } from "@/auth/AuthProvider";
import AdminLayout from "@/components/AdminLayout";
import BillingPage from "@/pages/BillingPage";
import ClientDetailPage from "@/pages/ClientDetailPage";
import ClientsPage from "@/pages/ClientsPage";
import DocumentAnalysisPage from "@/pages/DocumentAnalysisPage";
import LoginPage from "@/pages/LoginPage";
import PDFGeneratorPage from "@/pages/PDFGeneratorPage";
import PlaceholderPage from "@/pages/PlaceholderPage";
import SecureUploadsPage from "@/pages/SecureUploadsPage";

function Navigate({ to }: { to: string }) {
  const [, navigate] = useLocation();

  useEffect(() => {
    navigate(to);
  }, [navigate, to]);

  return null;
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8F9FD] px-5 text-[#0A1547]">
      <div className="admin-card w-full max-w-md p-8 text-center">
        <div className="mx-auto h-3 w-24 rounded-full bg-[#A380F6]" />
        <h1 className="mt-5 text-xl font-black">Checking admin access</h1>
        <p className="mt-2 text-sm font-medium text-[#0A1547]/60">
          Validating your Supabase session with the Admin API.
        </p>
      </div>
    </div>
  );
}

function AccessDenied() {
  const { error, signOut } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8F9FD] px-5 text-[#0A1547]">
      <div className="admin-card w-full max-w-lg p-8">
        <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-[#A380F6]">Access denied</p>
        <h1 className="mt-3 text-3xl font-black">Admin role required</h1>
        <p className="mt-3 text-sm font-medium leading-6 text-[#0A1547]/62">
          {error || "Your account is authenticated but is not authorized for this dashboard."}
        </p>
        <button
          type="button"
          onClick={() => void signOut()}
          className="admin-focus mt-6 rounded-xl bg-[#0A1547] px-5 py-3 text-sm font-extrabold text-white"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

function ProtectedRoute({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  const { status } = useAuth();

  if (status === "loading") {
    return <LoadingScreen />;
  }

  if (status === "unauthenticated" || status === "config-error") {
    return <Navigate to="/login" />;
  }

  if (status === "forbidden") {
    return <AccessDenied />;
  }

  return (
    <AdminLayout title={title} description={description}>
      {children}
    </AdminLayout>
  );
}

function RootRoute() {
  const { status } = useAuth();

  if (status === "loading") {
    return <LoadingScreen />;
  }

  if (status === "authenticated") {
    return <Navigate to="/clients" />;
  }

  if (status === "forbidden") {
    return <AccessDenied />;
  }

  return <Navigate to="/login" />;
}

function ClientsRoute() {
  return (
    <ProtectedRoute
      title="Client Submissions"
      description="Search clients and review submission, upload, and billing summary data from the Admin API."
    >
      <ClientsPage />
    </ProtectedRoute>
  );
}

function decodeEmailParam(value: string): string {
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return "";
  }
}

function ClientDetailRoute({ params }: RouteComponentProps<{ email: string }>) {
  const email = decodeEmailParam(params.email);

  return (
    <ProtectedRoute
      title="Client Detail"
      description="Review billing, checkout, upload, and manual override records for one client."
    >
      <ClientDetailPage email={email} />
    </ProtectedRoute>
  );
}

function AnalysisRoute() {
  return (
    <ProtectedRoute
      title="Document Analysis"
      description="Create Financial Analyzer intake jobs and track durable file storage status."
    >
      <DocumentAnalysisPage />
    </ProtectedRoute>
  );
}

function SecureUploadsRoute() {
  return (
    <ProtectedRoute
      title="Secure Uploads"
      description="Read-only inbox for completed secure upload portal files."
    >
      <SecureUploadsPage />
    </ProtectedRoute>
  );
}

function PdfGeneratorRoute() {
  return (
    <ProtectedRoute
      title="PDF Generator"
      description="Read-only preview of existing report-ready analysis uploads and PDF metadata."
    >
      <PDFGeneratorPage />
    </ProtectedRoute>
  );
}

function BillingRoute() {
  return (
    <ProtectedRoute
      title="Billing"
      description="Read-only Stripe checkout session and manual override visibility from local admin records."
    >
      <BillingPage />
    </ProtectedRoute>
  );
}

function AdminManagementRoute() {
  return (
    <ProtectedRoute
      title="Admin Management"
      description="Future React workflow for admin account visibility and management."
    >
      <PlaceholderPage
        title="Admin Management"
        description="This section will come after auth and core admin dashboard parity are stable."
      />
    </ProtectedRoute>
  );
}

function AppRoutes() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <Switch>
        <Route path="/" component={RootRoute} />
        <Route path="/login" component={LoginPage} />
        <Route path="/clients/:email" component={ClientDetailRoute} />
        <Route path="/clients" component={ClientsRoute} />
        <Route path="/analysis" component={AnalysisRoute} />
        <Route path="/secure-uploads" component={SecureUploadsRoute} />
        <Route path="/pdf-generator" component={PdfGeneratorRoute} />
        <Route path="/billing" component={BillingRoute} />
        <Route path="/admin-management" component={AdminManagementRoute} />
        <Route component={RootRoute} />
      </Switch>
    </WouterRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
