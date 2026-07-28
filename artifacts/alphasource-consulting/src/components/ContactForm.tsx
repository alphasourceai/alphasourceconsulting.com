import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { hasContact, leadDraftId, saveLead, type LeadFields } from "@/lib/leadCapture";
import { trackEvent } from "@/lib/analytics";

const MAX_LENGTHS = {
  firstName: 100,
  lastName: 100,
  email: 254,
  phone: 40,
  message: 2000,
};
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ContactFormFields = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
  companyWebsite: string;
};

function completedFields(fields: ContactFormFields): string[] {
  return [
    fields.firstName && "first_name",
    fields.lastName && "last_name",
    fields.email && "email",
    fields.phone && "phone",
    fields.message && "message",
  ].filter(Boolean) as string[];
}

function leadFields(fields: ContactFormFields): LeadFields {
  return {
    first_name: fields.firstName.trim(),
    last_name: fields.lastName.trim(),
    email: fields.email.trim(),
    phone: fields.phone.trim(),
    message: fields.message.trim(),
  };
}

async function sendConfiguredContactEndpoint(payload: Record<string, string>): Promise<boolean> {
  const endpoint = String(import.meta.env.VITE_CONTACT_FORM_ENDPOINT || "").trim();
  if (!endpoint) return false;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export default function ContactForm() {
  const [location] = useLocation();
  const formId = useMemo(() => `public-contact-${location === "/" ? "home" : location.replace(/[^a-z0-9]+/gi, "-")}`, [location]);
  const draftId = useMemo(() => leadDraftId(formId), [formId]);
  const formRef = useRef<HTMLFormElement>(null);
  const viewedRef = useRef(false);
  const startedRef = useRef(false);
  const submittedRef = useRef(false);
  const lastFieldRef = useRef("");
  const [form, setForm] = useState<ContactFormFields>({ firstName: "", lastName: "", email: "", phone: "", message: "", companyWebsite: "" });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const node = formRef.current;
    const markViewed = () => {
      if (viewedRef.current) return;
      viewedRef.current = true;
      trackEvent("lead_form_viewed", { form_id: formId, form_type: "contact", product_interest: "Dental consulting" });
    };
    if (!node || typeof IntersectionObserver === "undefined") {
      markViewed();
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        markViewed();
        observer.disconnect();
      }
    }, { threshold: 0.35 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [formId]);

  useEffect(() => {
    const fields = leadFields(form);
    if (submittedRef.current || !startedRef.current || !hasContact(fields)) return;
    const timeout = window.setTimeout(() => {
      void saveLead({
        draftId,
        formId,
        formType: "contact",
        productInterest: "Dental consulting",
        status: "partial",
        fields,
        fieldsCompleted: completedFields(form).filter((field) => field !== "message"),
        lastField: lastFieldRef.current,
      });
    }, 900);
    return () => window.clearTimeout(timeout);
  }, [draftId, form, formId]);

  useEffect(() => {
    const saveAbandonedLead = () => {
      const fields = leadFields(form);
      if (submittedRef.current || !startedRef.current || !hasContact(fields)) return;
      void saveLead({
        draftId,
        formId,
        formType: "contact",
        productInterest: "Dental consulting",
        status: "abandoned",
        fields,
        fieldsCompleted: completedFields(form).filter((field) => field !== "message"),
        lastField: lastFieldRef.current,
        keepalive: true,
      });
      trackEvent("lead_form_abandoned", {
        form_id: formId,
        form_type: "contact",
        product_interest: "Dental consulting",
        fields_completed: completedFields(form).filter((field) => field !== "message"),
      });
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") saveAbandonedLead();
    };
    window.addEventListener("pagehide", saveAbandonedLead);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", saveAbandonedLead);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [draftId, form, formId]);

  const updateField = (field: keyof ContactFormFields, value: string) => {
    if (field !== "companyWebsite") {
      lastFieldRef.current = field;
      if (!startedRef.current) {
        startedRef.current = true;
        trackEvent("lead_form_started", { form_id: formId, form_type: "contact", product_interest: "Dental consulting", first_field: field });
      }
    }
    setError("");
    setForm((current) => ({ ...current, [field]: value }));
  };

  const trackFieldBlur = (field: Exclude<keyof ContactFormFields, "companyWebsite">) => {
    if (!form[field].trim()) return;
    trackEvent("lead_form_field_completed", {
      form_id: formId,
      form_type: "contact",
      product_interest: "Dental consulting",
      field_name: field,
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (form.companyWebsite.trim()) {
      setSubmitted(true);
      return;
    }
    const fields = leadFields(form);
    if (!fields.first_name || !fields.last_name || !fields.email) {
      setError("Please enter your first name, last name, and email address.");
      return;
    }
    if (!EMAIL_PATTERN.test(fields.email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (
      fields.first_name.length > MAX_LENGTHS.firstName ||
      fields.last_name.length > MAX_LENGTHS.lastName ||
      fields.email.length > MAX_LENGTHS.email ||
      fields.phone.length > MAX_LENGTHS.phone ||
      (fields.message || "").length > MAX_LENGTHS.message
    ) {
      setError("Please shorten your entry and try again.");
      return;
    }

    setSubmitting(true);
    trackEvent("lead_form_submit_attempted", { form_id: formId, form_type: "contact", product_interest: "Dental consulting" });
    const savedLead = await saveLead({
      draftId,
      formId,
      formType: "contact",
      productInterest: "Dental consulting",
      status: "submitted",
      fields,
      fieldsCompleted: completedFields(form),
      lastField: lastFieldRef.current,
      cta: "Submit Request",
    });
    const legacyDelivered = await sendConfiguredContactEndpoint({
      firstName: fields.first_name,
      lastName: fields.last_name,
      email: fields.email,
      phone: fields.phone,
      message: fields.message || "",
      sourcePath: window.location.pathname,
      submittedAt: new Date().toISOString(),
    });
    setSubmitting(false);
    if (!savedLead && !legacyDelivered) {
      setError("We couldn't send your message. Please try again or email hello@alphasourceconsulting.com.");
      trackEvent("lead_form_submit_failed", { form_id: formId, form_type: "contact", product_interest: "Dental consulting", error_type: "delivery" });
      return;
    }
    submittedRef.current = true;
    setSubmitted(true);
    trackEvent("lead_form_submit_succeeded", { form_id: formId, form_type: "contact", product_interest: "Dental consulting" });
  };

  const inputClass = "w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-[#0A1547] text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#A380F6]/30 focus:border-[#A380F6] transition-all";
  if (submitted) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-[#02D99D]/15 flex items-center justify-center mx-auto mb-6"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#02D99D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg></div>
        <h3 className="text-2xl font-black text-[#0A1547] mb-3">Message Received!</h3>
        <p className="text-[#0A1547]/55">We'll be in touch within 24 hours to schedule your free consultation.</p>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-5">
      <div className="absolute left-[-9999px]" aria-hidden="true"><label>Company Website<input type="text" name="companyWebsite" tabIndex={-1} autoComplete="off" value={form.companyWebsite} onChange={(event) => updateField("companyWebsite", event.target.value)} /></label></div>
      <div className="grid md:grid-cols-2 gap-5">
        <Field label="First Name"><input type="text" required maxLength={MAX_LENGTHS.firstName} value={form.firstName} onChange={(event) => updateField("firstName", event.target.value)} onBlur={() => trackFieldBlur("firstName")} placeholder="Jane" className={inputClass} /></Field>
        <Field label="Last Name"><input type="text" required maxLength={MAX_LENGTHS.lastName} value={form.lastName} onChange={(event) => updateField("lastName", event.target.value)} onBlur={() => trackFieldBlur("lastName")} placeholder="Smith" className={inputClass} /></Field>
      </div>
      <div className="grid md:grid-cols-2 gap-5">
        <Field label="Email Address"><input type="email" required maxLength={MAX_LENGTHS.email} value={form.email} onChange={(event) => updateField("email", event.target.value)} onBlur={() => trackFieldBlur("email")} placeholder="jane@mypractice.com" className={inputClass} /></Field>
        <Field label="Phone Number"><input type="tel" maxLength={MAX_LENGTHS.phone} value={form.phone} onChange={(event) => updateField("phone", event.target.value)} onBlur={() => trackFieldBlur("phone")} placeholder="(602) 555-0100" className={inputClass} /></Field>
      </div>
      <Field label="Message"><textarea rows={4} maxLength={MAX_LENGTHS.message} value={form.message} onChange={(event) => updateField("message", event.target.value)} onBlur={() => trackFieldBlur("message")} placeholder="Tell us about your practice and your biggest operational challenges..." className={`${inputClass} resize-none`} /></Field>
      <p className="text-xs leading-5 text-[#0A1547]/70">By submitting, you agree that alphaSource Consulting may use the contact details you provide to respond to your request. See our <Link href="/privacy" className="font-semibold text-[#6F4FE4] underline">Privacy Policy</Link>.</p>
      {error && <p className="text-sm font-semibold text-red-600" role="alert">{error}</p>}
      <button type="submit" disabled={submitting} className="w-full py-3.5 text-sm font-bold text-white rounded-full transition-all hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70" style={{ background: "linear-gradient(135deg, #A380F6 0%, #8b63f0 100%)" }} data-analytics-cta="Submit Request" data-analytics-placement={`${formId}-form`}>
        {submitting ? "Sending..." : "Submit Request"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div><label className="block text-xs font-bold text-[#0A1547]/60 uppercase tracking-wider mb-2">{label}</label>{children}</div>;
}
