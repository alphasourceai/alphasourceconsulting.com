import {
  ANALYTICS_ANONYMOUS_ID_STORAGE_KEY,
  ANALYTICS_SESSION_ID_STORAGE_KEY,
  isAnalyticsConsentGranted,
} from "@/context/TrackingConsentContext";

type AnalyticsProperties = Record<string, unknown>;

const env = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : {};
const analyticsEnabled = (env as Record<string, unknown>).VITE_PUBLIC_ANALYTICS_ENABLED !== "false";
const piiPropertyKeys = new Set(["email", "phone", "name", "first_name", "last_name", "message"]);

function createId(prefix: string): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}_${crypto.randomUUID()}`;
  } catch {
    // Use the timestamp fallback below.
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function storage(kind: "local" | "session"): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function storedId(kind: "local" | "session", key: string, prefix: string): string {
  const target = storage(kind);
  try {
    const existing = String(target?.getItem(key) || "");
    if (existing) return existing;
    const next = createId(prefix);
    target?.setItem(key, next);
    return next;
  } catch {
    return createId(prefix);
  }
}

export function getAnonymousId(): string {
  return storedId("local", ANALYTICS_ANONYMOUS_ID_STORAGE_KEY, "anon");
}

export function getSessionId(): string {
  return storedId("session", ANALYTICS_SESSION_ID_STORAGE_KEY, "session");
}

function cleanPath(value: string): string {
  if (!value) return "/";
  try {
    return new URL(value, window.location.origin).pathname || "/";
  } catch {
    const path = String(value).split("?")[0].split("#")[0];
    return path.startsWith("/") ? path : "/";
  }
}

export function currentUtm(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search || "");
  const utm: Record<string, string> = {};
  ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach((key) => {
    const value = String(params.get(key) || "").trim();
    if (value) utm[key] = value.slice(0, 160);
  });
  return utm;
}

function sanitizeProperties(properties: AnalyticsProperties): AnalyticsProperties {
  const result: AnalyticsProperties = {};
  for (const [key, value] of Object.entries(properties)) {
    const normalizedKey = key.trim().toLowerCase();
    if (!normalizedKey || piiPropertyKeys.has(normalizedKey) || value === null || value === undefined) continue;
    if (typeof value === "string") result[normalizedKey] = value.slice(0, 180);
    else if (typeof value === "number" || typeof value === "boolean") result[normalizedKey] = value;
    else if (Array.isArray(value)) result[normalizedKey] = value.slice(0, 20).map((item) => String(item).slice(0, 80));
  }
  return result;
}

function siteApiBase(): string {
  const candidates = [
    import.meta.env.VITE_SITE_API_BASE_URL,
    import.meta.env.VITE_ADMIN_API_BASE_URL,
    import.meta.env.VITE_AGREEMENTS_API_BASE_URL,
  ];
  for (const candidate of candidates) {
    const normalized = String(candidate || "").trim().replace(/\/$/, "");
    if (normalized) return normalized;
  }
  return "";
}

export function trackEvent(eventName: string, properties: AnalyticsProperties = {}) {
  if (!analyticsEnabled || !isAnalyticsConsentGranted() || typeof window === "undefined") return;
  const base = siteApiBase();
  if (!base) return;
  const payload = {
    event_name: eventName,
    anonymous_id: getAnonymousId(),
    session_id: getSessionId(),
    path: window.location.pathname || "/",
    page_title: document.title || "",
    referrer_path: cleanPath(document.referrer || ""),
    utm: currentUtm(),
    properties: sanitizeProperties(properties),
  };
  try {
    void fetch(`${base}/api/public-analytics/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Optional analytics must never interrupt the public site.
  }
}

export function trackPageView(path: string) {
  trackEvent("page_viewed", { path: cleanPath(path) });
}

export function trackCtaClick(label: string, target: string, placement?: string) {
  trackEvent("cta_clicked", {
    cta_label: label.slice(0, 180),
    cta_target: cleanPath(target),
    placement: (placement || "unknown").slice(0, 120),
  });
}
