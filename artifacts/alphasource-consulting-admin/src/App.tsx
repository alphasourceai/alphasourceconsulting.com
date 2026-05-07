import { useEffect, type ReactNode } from "react";
import { Route, Router as WouterRouter, Switch, useLocation } from "wouter";
import { AuthProvider, useAuth } from "@/auth/AuthProvider";
import AdminLayout from "@/components/AdminLayout";
import ClientsPage from "@/pages/ClientsPage";
import LoginPage from "@/pages/LoginPage";
import PlaceholderPage from "@/pages/PlaceholderPage";

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

function AnalysisRoute() {
  return (
    <ProtectedRoute
      title="Document Analysis"
      description="Future React workflow for admin-created financial, AR, and claims analyses."
    >
      <PlaceholderPage
        title="Document Analysis"
        description="This section will preserve the existing Streamlit document analysis workflow after API parity is ready."
      />
    </ProtectedRoute>
  );
}

function SecureUploadsRoute() {
  return (
    <ProtectedRoute
      title="Secure Uploads"
      description="Future React workflow for team-assisted HIPAA-compliant file collection."
    >
      <PlaceholderPage
        title="Secure Uploads"
        description="This section will later manage secure upload requests and completed upload review."
      />
    </ProtectedRoute>
  );
}

function PdfGeneratorRoute() {
  return (
    <ProtectedRoute
      title="PDF Generator"
      description="Future React workflow for report metadata, content selection, generation, and signed report links."
    >
      <PlaceholderPage
        title="PDF Generator"
        description="This section remains read-only placeholder content until PDF API endpoints are implemented."
      />
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
        <Route path="/clients" component={ClientsRoute} />
        <Route path="/analysis" component={AnalysisRoute} />
        <Route path="/secure-uploads" component={SecureUploadsRoute} />
        <Route path="/pdf-generator" component={PdfGeneratorRoute} />
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
