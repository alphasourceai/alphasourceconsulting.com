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
const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000;
const INACTIVITY_ACTIVITY_WRITE_THROTTLE_MS = 30 * 1000;
const LAST_ACTIVITY_STORAGE_KEY = "alphasource-consulting-admin:last-activity-ms";

const defaultAdminPermissions: AdminPermissions = {
  canReadClients: false,
  canWriteClients: false,
  canWriteUploads: false,
  canReadBilling: false,
  canWriteBilling: false,
  canReadAnalysis: false,
  canWriteAnalysis: false,
  canReadPdf: false,
  canGeneratePdf: false,
  canReadSecureUploads: false,
  canWriteSecureUploads: false,
  canReadAgreements: false,
  canWriteAgreements: false,
  canReadAdminManagement: false,
  canManageAdminAccess: false,
  canReadAudit: false,
  canReadSiteAnalytics: false,
  canManageSiteAnalytics: false,
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

function readLastActivityMs(): number | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(LAST_ACTIVITY_STORAGE_KEY);
    const parsedValue = rawValue ? Number.parseInt(rawValue, 10) : Number.NaN;
    return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null;
  } catch {
    return null;
  }
}

function writeLastActivityMs(value = Date.now()) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(LAST_ACTIVITY_STORAGE_KEY, String(value));
  } catch {
    // Ignore storage failures; the in-memory timer still protects the active tab.
  }
}

function clearLastActivityMs() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(LAST_ACTIVITY_STORAGE_KEY);
  } catch {
    // Ignore storage cleanup failures.
  }
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

      writeLastActivityMs();
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
      clearLastActivityMs();
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated") {
      return undefined;
    }

    let timeoutId: number | null = null;
    let signingOut = false;
    let lastActivityWriteMs = 0;

    const logoutForInactivity = () => {
      if (signingOut) {
        return;
      }
      signingOut = true;
      void signOut();
    };

    const clearTimer = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const scheduleCheck = () => {
      clearTimer();
      const lastActivityMs = readLastActivityMs() ?? Date.now();
      const elapsedMs = Date.now() - lastActivityMs;
      const remainingMs = Math.max(0, INACTIVITY_TIMEOUT_MS - elapsedMs);

      timeoutId = window.setTimeout(() => {
        const latestActivityMs = readLastActivityMs() ?? lastActivityMs;
        if (Date.now() - latestActivityMs >= INACTIVITY_TIMEOUT_MS) {
          logoutForInactivity();
          return;
        }
        scheduleCheck();
      }, remainingMs);
    };

    const recordActivity = () => {
      const now = Date.now();
      if (now - lastActivityWriteMs < INACTIVITY_ACTIVITY_WRITE_THROTTLE_MS) {
        return;
      }
      lastActivityWriteMs = now;
      writeLastActivityMs(now);
      scheduleCheck();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      const lastActivityMs = readLastActivityMs();
      if (lastActivityMs && Date.now() - lastActivityMs >= INACTIVITY_TIMEOUT_MS) {
        logoutForInactivity();
        return;
      }

      recordActivity();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === LAST_ACTIVITY_STORAGE_KEY) {
        scheduleCheck();
      }
    };

    const existingActivityMs = readLastActivityMs();
    if (existingActivityMs && Date.now() - existingActivityMs >= INACTIVITY_TIMEOUT_MS) {
      logoutForInactivity();
      return () => {
        clearTimer();
      };
    }

    if (!existingActivityMs) {
      writeLastActivityMs();
    }

    const activityEvents: Array<keyof WindowEventMap> = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, recordActivity, { passive: true });
    });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("storage", handleStorage);
    scheduleCheck();

    return () => {
      clearTimer();
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, recordActivity);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, [signOut, status]);

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
