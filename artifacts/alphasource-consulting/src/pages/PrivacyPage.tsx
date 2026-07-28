import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { useTrackingConsent } from "@/context/TrackingConsentContext";
import type { ReactNode } from "react";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-[#0A1547]/10 py-7 first:border-t-0 first:pt-0">
      <h2 className="text-lg font-black text-[#0A1547]">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-[#0A1547]/70">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  const { openPreferences } = useTrackingConsent();
  return (
    <div className="min-h-screen bg-[#F8F9FD] text-[#0A1547]">
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 pb-20 pt-32 lg:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A380F6]">alphaSource Consulting</p>
        <h1 className="mt-3 text-4xl font-black sm:text-5xl">Privacy Policy</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[#0A1547]/65">This policy explains how alphaSource Network, LLC dba alphaSource Consulting handles limited information from this public website, including privacy choices, public-site analytics, and contact requests.</p>
        <p className="mt-3 text-sm font-semibold text-[#0A1547]/50">Effective date: July 27, 2026</p>

        <article className="mt-10 rounded-2xl border border-[#0A1547]/10 bg-white p-6 shadow-sm sm:p-9">
          <Section title="Information we collect">
            <p>When you submit a contact request, we collect the business contact details you provide, such as your name, email address, phone number, and message, so we can respond to your inquiry. We may retain contact-ready partial form entries to help complete a request or follow up when appropriate.</p>
            <p>Public analytics, when you enable it, may include page paths, page titles, referral paths, campaign parameters, call-to-action interactions, and form progress signals. Analytics events are designed not to include names, email addresses, phone numbers, messages, passwords, file contents, agreement details, payment data, or other private client information.</p>
          </Section>
          <Section title="Privacy choices and cookies">
            <p>Essential technology supports the security and core operation of this public site. Optional first-party analytics is disabled until you choose to allow it. Your preference is stored in this browser. Turning analytics off stops future application-controlled analytics events and clears application-owned analytics identifiers where possible.</p>
            <button type="button" onClick={openPreferences} className="rounded-lg border border-[#0A1547]/15 px-4 py-2.5 text-sm font-bold text-[#0A1547] transition-colors hover:border-[#A380F6] hover:text-[#6F4FE4]">Manage privacy choices</button>
          </Section>
          <Section title="How we use information">
            <p>We use contact information to respond to requests, discuss consulting services, and maintain appropriate business records. We use aggregated public-site analytics to understand site performance, improve content and navigation, measure interest in services, and troubleshoot abuse or spam.</p>
          </Section>
          <Section title="Information we do not put in public analytics">
            <p>Do not use public contact forms to send patient records, protected health information, payment card information, passwords, or other confidential files. Secure client workflows and approved agreements govern the handling of information submitted through consulting services.</p>
          </Section>
          <Section title="Service providers and retention">
            <p>We use service providers for hosting, database operations, email, payments, secure storage, and related business operations. Public lead captures are retained only as long as reasonably necessary for follow-up and business administration; public analytics is retained to measure site performance and improve the public experience.</p>
          </Section>
          <Section title="Questions and requests">
            <p>For privacy questions, requests to update or delete contact information, or requests not to be contacted, email <a className="font-semibold text-[#6F4FE4] underline" href="mailto:hello@alphasourceconsulting.com">hello@alphasourceconsulting.com</a>.</p>
          </Section>
          <Section title="Updates to this policy">
            <p>We may update this policy as the public website and consulting services evolve. The effective date above identifies the current version.</p>
          </Section>
        </article>
      </main>
      <Footer />
    </div>
  );
}
