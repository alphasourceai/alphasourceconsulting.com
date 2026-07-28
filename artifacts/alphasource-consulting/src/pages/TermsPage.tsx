import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import type { ReactNode } from "react";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-[#0A1547]/10 py-7 first:border-t-0 first:pt-0">
      <h2 className="text-lg font-black text-[#0A1547]">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-[#0A1547]/70">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FD] text-[#0A1547]">
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 pb-20 pt-32 lg:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A380F6]">alphaSource Consulting</p>
        <h1 className="mt-3 text-4xl font-black sm:text-5xl">Website Terms</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[#0A1547]/65">These terms govern your use of the public alphaSource Consulting website.</p>
        <p className="mt-3 text-sm font-semibold text-[#0A1547]/50">Effective date: July 27, 2026</p>
        <article className="mt-10 rounded-2xl border border-[#0A1547]/10 bg-white p-6 shadow-sm sm:p-9">
          <Section title="Public website use"><p>Use this public site lawfully and do not attempt to interfere with its operation, access restricted systems, or submit harmful content.</p></Section>
          <Section title="Informational content"><p>Public website content describes alphaSource Consulting services and is provided for general information. It is not a guarantee of results, professional advice for a specific practice, or a substitute for a written consulting agreement.</p></Section>
          <Section title="Confidential information"><p>Do not submit patient information, protected health information, passwords, payment card details, or confidential files through public contact forms. Use approved secure workflows only when instructed by alphaSource Consulting.</p></Section>
          <Section title="Engagements"><p>Consulting scope, fees, deliverables, confidentiality, and data handling are governed by the applicable written agreement. A public contact request or use of this website does not create a consulting engagement.</p></Section>
          <Section title="Contact"><p>Questions about these terms can be sent to <a className="font-semibold text-[#6F4FE4] underline" href="mailto:hello@alphasourceconsulting.com">hello@alphasourceconsulting.com</a>.</p></Section>
        </article>
      </main>
      <Footer />
    </div>
  );
}
