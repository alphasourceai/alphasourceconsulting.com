import { useEffect, type ReactNode } from "react";
import { Route, Router as WouterRouter, Switch, useLocation, type RouteComponentProps } from "wouter";
import { AuthProvider, useAuth } from "@/auth/AuthProvider";
import AdminLayout from "@/components/AdminLayout";
import AcceptInvitePage from "@/pages/AcceptInvitePage";
import AdminManagementPage from "@/pages/AdminManagementPage";
import BillingPage from "@/pages/BillingPage";
import ClientDetailPage from "@/pages/ClientDetailPage";
import ClientsPage from "@/pages/ClientsPage";
import DocumentAnalysisPage from "@/pages/DocumentAnalysisPage";
import HelpFaqPage from "@/pages/HelpFaqPage";
import LoginPage from "@/pages/LoginPage";
import PDFGeneratorPage from "@/pages/PDFGeneratorPage";
import SecureUploadsPage from "@/pages/SecureUploadsPage";
import type { AdminPermissions } from "@/lib/types";

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

function AccessRestrictedPanel() {
  return (
    <div className="admin-card p-8">
      <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-[#A380F6]">Access restricted</p>
      <h2 className="mt-3 text-2xl font-black text-[#0A1547]">This module is not available to your role</h2>
      <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#0A1547]/62">
        The Admin API is the source of truth for permissions. Contact a super admin if your dashboard access needs to change.
      </p>
    </div>
  );
}

function AccessRestrictedScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8F9FD] px-5 text-[#0A1547]">
      <div className="w-full max-w-2xl">
        <AccessRestrictedPanel />
      </div>
    </div>
  );
}

function firstAccessiblePath(permissions: AdminPermissions): string {
  if (permissions.canReadClients) {
    return "/clients";
  }
  if (permissions.canReadAnalysis || permissions.canWriteAnalysis) {
    return "/analysis";
  }
  if (permissions.canReadSecureUploads) {
    return "/secure-uploads";
  }
  if (permissions.canReadPdf) {
    return "/pdf-generator";
  }
  if (permissions.canReadBilling) {
    return "/billing";
  }
  if (permissions.canReadAdminManagement) {
    return "/admin-management";
  }
  return "/help";
}

function ProtectedRoute({
  canAccess,
  children,
  description,
  title,
}: {
  canAccess: (permissions: AdminPermissions) => boolean;
  children: ReactNode;
  description: string;
  title: string;
}) {
  const { permissions, status } = useAuth();

  if (status === "loading") {
    return <LoadingScreen />;
  }

  if (status === "unauthenticated" || status === "config-error") {
    return <Navigate to="/login" />;
  }

  if (status === "forbidden") {
    return <AccessRestrictedScreen />;
  }

  if (!canAccess(permissions)) {
    return (
      <AdminLayout title={title} description={description}>
        <AccessRestrictedPanel />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={title} description={description}>
      {children}
    </AdminLayout>
  );
}

function RootRoute() {
  const { permissions, status } = useAuth();

  if (status === "loading") {
    return <LoadingScreen />;
  }

  if (status === "authenticated") {
    const destination = firstAccessiblePath(permissions);
    if (destination) {
      return <Navigate to={destination} />;
    }

    return <AccessRestrictedScreen />;
  }

  if (status === "forbidden") {
    return <AccessDenied />;
  }

  return <Navigate to="/login" />;
}

function ClientsRoute() {
  return (
    <ProtectedRoute
      canAccess={(permissions) => permissions.canReadClients}
      title="Clients"
      description="Review client records, submissions, uploads, and related status visibility from the Admin API."
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
      canAccess={(permissions) => permissions.canReadBilling}
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
      canAccess={(permissions) => permissions.canReadAnalysis || permissions.canWriteAnalysis}
      title="Document Analysis"
      description="Run admin-managed analysis for approved, sanitized, and appropriate files. Secure PHI intake stays separate."
    >
      <DocumentAnalysisPage />
    </ProtectedRoute>
  );
}

function SecureUploadsRoute() {
  return (
    <ProtectedRoute
      canAccess={(permissions) => permissions.canReadSecureUploads}
      title="Secure Uploads"
      description="Review secure portal file intake for potentially sensitive or PHI-related uploads. This workflow stays separate from AI analysis."
    >
      <SecureUploadsPage />
    </ProtectedRoute>
  );
}

function PdfGeneratorRoute() {
  return (
    <ProtectedRoute
      canAccess={(permissions) => permissions.canReadPdf}
      title="PDF Reports"
      description="Review analysis outputs and generate client-ready PDF reports from promoted records."
    >
      <PDFGeneratorPage />
    </ProtectedRoute>
  );
}

function BillingRoute() {
  return (
    <ProtectedRoute
      canAccess={(permissions) => permissions.canReadBilling}
      title="Billing"
      description="Manage checkout sessions, payment visibility, and manual billing overrides."
    >
      <BillingPage />
    </ProtectedRoute>
  );
}

function AdminManagementRoute() {
  return (
    <ProtectedRoute
      canAccess={(permissions) => permissions.canReadAdminManagement}
      title="Admin Access"
      description="Manage dashboard access, roles, and active or inactive admin users."
    >
      <AdminManagementPage />
    </ProtectedRoute>
  );
}

function HelpRoute() {
  return (
    <ProtectedRoute
      canAccess={() => true}
      title="Help & FAQ"
      description="Understand dashboard workflows, role requirements, file handling boundaries, and common troubleshooting steps."
    >
      <HelpFaqPage />
    </ProtectedRoute>
  );
}

function AppRoutes() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <Switch>
        <Route path="/" component={RootRoute} />
        <Route path="/login" component={LoginPage} />
        <Route path="/accept-invite" component={AcceptInvitePage} />
        <Route path="/clients/:email" component={ClientDetailRoute} />
        <Route path="/clients" component={ClientsRoute} />
        <Route path="/analysis" component={AnalysisRoute} />
        <Route path="/secure-uploads" component={SecureUploadsRoute} />
        <Route path="/pdf-generator" component={PdfGeneratorRoute} />
        <Route path="/billing" component={BillingRoute} />
        <Route path="/admin-management" component={AdminManagementRoute} />
        <Route path="/help" component={HelpRoute} />
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
