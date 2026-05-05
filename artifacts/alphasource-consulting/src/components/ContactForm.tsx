import { useState, type FormEvent } from "react";

const MAX_LENGTHS = {
  firstName: 100,
  lastName: 100,
  email: 254,
  phone: 40,
  message: 2000,
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ContactForm() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    message: "",
    companyWebsite: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.companyWebsite.trim()) {
      setSubmitted(true);
      return;
    }

    const endpoint = import.meta.env.VITE_CONTACT_FORM_ENDPOINT?.trim();
    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      message: form.message.trim(),
      sourcePath: window.location.pathname,
      submittedAt: new Date().toISOString(),
    };

    if (!payload.firstName || !payload.lastName || !payload.email) {
      setError("Please enter your first name, last name, and email address.");
      return;
    }

    if (!EMAIL_PATTERN.test(payload.email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (
      payload.firstName.length > MAX_LENGTHS.firstName ||
      payload.lastName.length > MAX_LENGTHS.lastName ||
      payload.email.length > MAX_LENGTHS.email ||
      payload.phone.length > MAX_LENGTHS.phone ||
      payload.message.length > MAX_LENGTHS.message
    ) {
      setError("Please shorten your entry and try again.");
      return;
    }

    if (!endpoint) {
      setError("The contact form is not configured yet. Please email us directly.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Form submission failed with status ${response.status}`);
      }

      setSubmitted(true);
    } catch {
      setError("We couldn't send your message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-[#0A1547] text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#A380F6]/30 focus:border-[#A380F6] transition-all";

  if (submitted) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-[#02D99D]/15 flex items-center justify-center mx-auto mb-6">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#02D99D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h3 className="text-2xl font-black text-[#0A1547] mb-3">Message Received!</h3>
        <p className="text-[#0A1547]/55">
          We'll be in touch within 24 hours to schedule your free consultation.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-5">
      <div className="absolute left-[-9999px]" aria-hidden="true">
        <label>
          Company Website
          <input
            type="text"
            name="companyWebsite"
            tabIndex={-1}
            autoComplete="off"
            value={form.companyWebsite}
            onChange={(e) => setForm({ ...form, companyWebsite: e.target.value })}
          />
        </label>
      </div>
      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <label className="block text-xs font-bold text-[#0A1547]/60 uppercase tracking-wider mb-2">First Name</label>
          <input
            type="text"
            required
            maxLength={MAX_LENGTHS.firstName}
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            placeholder="Jane"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-[#0A1547]/60 uppercase tracking-wider mb-2">Last Name</label>
          <input
            type="text"
            required
            maxLength={MAX_LENGTHS.lastName}
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            placeholder="Smith"
            className={inputClass}
          />
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <label className="block text-xs font-bold text-[#0A1547]/60 uppercase tracking-wider mb-2">Email Address</label>
          <input
            type="email"
            required
            maxLength={MAX_LENGTHS.email}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="jane@mypractice.com"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-[#0A1547]/60 uppercase tracking-wider mb-2">Phone Number</label>
          <input
            type="tel"
            maxLength={MAX_LENGTHS.phone}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="(602) 555-0100"
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold text-[#0A1547]/60 uppercase tracking-wider mb-2">Message</label>
        <textarea
          rows={4}
          maxLength={MAX_LENGTHS.message}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          placeholder="Tell us about your practice and your biggest operational challenges..."
          className={`${inputClass} resize-none`}
        />
      </div>
      {error && (
        <p className="text-sm font-semibold text-red-600" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3.5 text-sm font-bold text-white rounded-full transition-all hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
        style={{ background: "linear-gradient(135deg, #A380F6 0%, #8b63f0 100%)" }}
      >
        {submitting ? "Sending..." : "Submit Request"}
      </button>
    </form>
  );
}
