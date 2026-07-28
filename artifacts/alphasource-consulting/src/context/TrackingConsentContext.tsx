import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export const TRACKING_PREFERENCES_STORAGE_KEY = "alphasource-consulting:tracking-preferences:v1";
export const ANALYTICS_ANONYMOUS_ID_STORAGE_KEY = "alphasource-consulting:analytics-anonymous-id";
export const ANALYTICS_SESSION_ID_STORAGE_KEY = "alphasource-consulting:analytics-session-id";

type TrackingPreferences = {
  analytics: boolean;
};

type TrackingConsentContextValue = {
  analyticsEnabled: boolean;
  hasSelection: boolean;
  preferencesOpen: boolean;
  acceptAnalytics: () => void;
  rejectOptionalTracking: () => void;
  savePreferences: (preferences: TrackingPreferences) => void;
  openPreferences: () => void;
  closePreferences: () => void;
};

const TrackingConsentContext = createContext<TrackingConsentContextValue | null>(null);
const publicTrackingPaths = new Set([
  "/",
  "/dental-consulting",
  "/practice-opportunity-review",
  "/how-it-works",
  "/for-dental-groups",
  "/faq",
  "/security",
  "/support",
  "/about",
  "/privacy",
  "/terms",
]);

function normalizePath(value: string): string {
  const path = String(value || "/").split("?")[0].split("#")[0] || "/";
  return path.length > 1 ? path.replace(/\/+$/, "") : "/";
}

function readPreferences(): TrackingPreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(TRACKING_PREFERENCES_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TrackingPreferences>;
    return typeof parsed.analytics === "boolean" ? { analytics: parsed.analytics } : null;
  } catch {
    return null;
  }
}

function clearAnalyticsIdentifiers() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ANALYTICS_ANONYMOUS_ID_STORAGE_KEY);
    window.sessionStorage.removeItem(ANALYTICS_SESSION_ID_STORAGE_KEY);
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
}

export function isAnalyticsConsentGranted(): boolean {
  return readPreferences()?.analytics === true;
}

export function isPublicOptionalTrackingRoute(path: string): boolean {
  return publicTrackingPaths.has(normalizePath(path));
}

export function TrackingConsentProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<TrackingPreferences | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  useEffect(() => {
    setPreferences(readPreferences());
    setLoaded(true);
  }, []);

  const savePreferences = useCallback((nextPreferences: TrackingPreferences) => {
    const normalized = { analytics: nextPreferences.analytics === true };
    try {
      window.localStorage.setItem(TRACKING_PREFERENCES_STORAGE_KEY, JSON.stringify(normalized));
    } catch {
      // The in-memory preference still stops tracking in this browser tab.
    }
    if (!normalized.analytics) clearAnalyticsIdentifiers();
    setPreferences(normalized);
    setPreferencesOpen(false);
  }, []);

  const value = useMemo<TrackingConsentContextValue>(
    () => ({
      analyticsEnabled: preferences?.analytics === true,
      hasSelection: loaded && preferences !== null,
      preferencesOpen,
      acceptAnalytics: () => savePreferences({ analytics: true }),
      rejectOptionalTracking: () => savePreferences({ analytics: false }),
      savePreferences,
      openPreferences: () => setPreferencesOpen(true),
      closePreferences: () => setPreferencesOpen(false),
    }),
    [loaded, preferences, preferencesOpen, savePreferences],
  );

  return <TrackingConsentContext.Provider value={value}>{children}</TrackingConsentContext.Provider>;
}

export function useTrackingConsent(): TrackingConsentContextValue {
  const context = useContext(TrackingConsentContext);
  if (!context) throw new Error("useTrackingConsent must be used inside TrackingConsentProvider.");
  return context;
}
