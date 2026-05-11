import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { AdminApiError, getAdminMe } from "@/lib/adminApi";
import { getSupabaseClient } from "@/lib/supabase";
import type { AdminMeResponse, AdminPermissions, AdminUser } from "@/lib/types";

type AuthStatus =
  | "loading"
  | "unauthenticated"
  | "authenticated"
  | "forbidden"
  | "config-error";

type AuthContextValue = {
  status: AuthStatus;
  session: Session | null;
  adminUser: AdminUser | null;
  permissions: AdminPermissions;
  error: string;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshAdmin: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const defaultAdminPermissions: AdminPermissions = {
  canReadClients: false,
  canReadBilling: false,
  canWriteBilling: false,
  canReadAnalysis: false,
  canWriteAnalysis: false,
  canReadPdf: false,
  canGeneratePdf: false,
  canReadSecureUploads: false,
  canWriteSecureUploads: false,
  canReadAdminManagement: false,
  canManageAdminAccess: false,
};

function normalizeAdminPermissions(response: AdminMeResponse): AdminPermissions {
  return {
    ...defaultAdminPermissions,
    ...response.permissions,
  };
}

function safeAuthMessage(error: unknown): string {
  if (error instanceof AdminApiError) {
    if (error.status === 403) {
      return "Your account is signed in, but it is not authorized for this admin dashboard.";
    }

    if (error.status === 401) {
      return "Your session has expired. Please sign in again.";
    }
  }

  if (error instanceof Error && error.message.includes("VITE_")) {
    return "The admin dashboard is missing required environment configuration.";
  }

  return "We could not validate your admin access. Please try again.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [permissions, setPermissions] = useState<AdminPermissions>(defaultAdminPermissions);
  const [error, setError] = useState("");

  const validateSession = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);
    setAdminUser(null);
    setPermissions(defaultAdminPermissions);
    setError("");

    if (!nextSession?.access_token) {
      setStatus("unauthenticated");
      return;
    }

    setStatus("loading");

    try {
      const admin = await getAdminMe(nextSession.access_token);
      setAdminUser(admin.admin ?? { ...admin.user, role: admin.role, status: "active" });
      setPermissions(normalizeAdminPermissions(admin));
      setStatus("authenticated");
    } catch (validationError) {
      setError(safeAuthMessage(validationError));

      if (validationError instanceof AdminApiError && validationError.status === 403) {
        setStatus("forbidden");
        return;
      }

      if (validationError instanceof Error && validationError.message.includes("VITE_")) {
        setStatus("config-error");
        return;
      }

      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    try {
      const supabase = getSupabaseClient();

      supabase.auth.getSession().then(({ data }) => {
        if (mounted) {
          void validateSession(data.session);
        }
      }).catch((sessionError: unknown) => {
        if (!mounted) {
          return;
        }

        setError(safeAuthMessage(sessionError));
        setStatus("unauthenticated");
      });

      const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        if (mounted) {
          void validateSession(nextSession);
        }
      });

      return () => {
        mounted = false;
        listener.subscription.unsubscribe();
      };
    } catch (configError) {
      setError(safeAuthMessage(configError));
      setStatus("config-error");
      return () => {
        mounted = false;
      };
    }
  }, [validateSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    setError("");
    setStatus("loading");

    try {
      const supabase = getSupabaseClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      await validateSession(data.session);
    } catch {
      setAdminUser(null);
      setSession(null);
      setPermissions(defaultAdminPermissions);
      setError("Sign in failed. Check your email and password, then try again.");
      setStatus("unauthenticated");
    }
  }, [validateSession]);

  const signOut = useCallback(async () => {
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
    } finally {
      setSession(null);
      setAdminUser(null);
      setPermissions(defaultAdminPermissions);
      setError("");
      setStatus("unauthenticated");
    }
  }, []);

  const refreshAdmin = useCallback(async () => {
    await validateSession(session);
  }, [session, validateSession]);

  const value = useMemo<AuthContextValue>(() => ({
    status,
    session,
    adminUser,
    permissions,
    error,
    signIn,
    signOut,
    refreshAdmin,
  }), [adminUser, error, permissions, refreshAdmin, session, signIn, signOut, status]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
