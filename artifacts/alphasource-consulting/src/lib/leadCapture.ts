import { currentUtm, getAnonymousId, getSessionId, trackEvent } from "@/lib/analytics";
import { isAnalyticsConsentGranted } from "@/context/TrackingConsentContext";

export const LEAD_CAPTURE_NOTICE_VERSION = "consulting-public-lead-capture-v1-2026-07-27";

export type LeadDraftStatus = "partial" | "abandoned" | "submitted";
export type LeadFields = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  message?: string;
};

type SaveLeadInput = {
  draftId: string;
  formId: string;
  formType: string;
  productInterest: string;
  status: LeadDraftStatus;
  fields: LeadFields;
  fieldsCompleted: string[];
  lastField?: string;
  cta?: string;
  keepalive?: boolean;
};

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

function makeDraftId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch {
    // Use the fallback below.
  }
  const random = Math.random().toString(16).slice(2).padEnd(12, "0").slice(0, 12);
  return `10000000-1000-4000-8000-${random}`;
}

export function leadDraftId(formId: string): string {
  if (typeof window === "undefined") return makeDraftId();
  const key = `alphasource-consulting:lead-draft:${formId}`;
  try {
    const existing = String(window.localStorage.getItem(key) || "");
    if (existing) return existing;
    const next = makeDraftId();
    window.localStorage.setItem(key, next);
    return next;
  } catch {
    return makeDraftId();
  }
}

export function hasContact(fields: LeadFields): boolean {
  const email = String(fields.email || "").trim();
  const phoneDigits = String(fields.phone || "").replace(/\D+/g, "");
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || phoneDigits.length >= 7;
}

export async function saveLead(input: SaveLeadInput): Promise<boolean> {
  if (!hasContact(input.fields)) return false;
  const base = siteApiBase();
  if (!base) return false;
  const submitted = input.status === "submitted";
  const analyticsConsent = isAnalyticsConsentGranted();
  const payload = {
    draft_id: input.draftId,
    form_id: input.formId,
    form_type: input.formType,
    product_interest: input.productInterest,
    status: input.status,
    fields: {
      first_name: input.fields.first_name,
      last_name: input.fields.last_name,
      email: input.fields.email,
      phone: input.fields.phone,
      ...(submitted ? { message: input.fields.message || "" } : {}),
    },
    fields_completed: input.fieldsCompleted,
    last_field: input.lastField || "",
    anonymous_id: analyticsConsent ? getAnonymousId() : "",
    session_id: analyticsConsent ? getSessionId() : "",
    privacy_notice_version: LEAD_CAPTURE_NOTICE_VERSION,
    source: {
      path: window.location.pathname || "/",
      referrer_path: document.referrer || "",
      cta: input.cta || "",
      utm: currentUtm(),
    },
  };
  try {
    const response = await fetch(`${base}/api/public-leads/draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: input.keepalive === true,
    });
    if (!response.ok) return false;
    trackEvent("lead_draft_saved", {
      form_id: input.formId,
      form_type: input.formType,
      product_interest: input.productInterest,
      status: input.status,
      fields_completed: input.fieldsCompleted.filter((field) => field !== "message"),
    });
    return true;
  } catch {
    trackEvent("lead_draft_save_failed", {
      form_id: input.formId,
      form_type: input.formType,
      product_interest: input.productInterest,
      status: input.status,
      error_type: "network",
    });
    return false;
  }
}
