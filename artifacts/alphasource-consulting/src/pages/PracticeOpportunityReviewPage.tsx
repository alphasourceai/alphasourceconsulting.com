import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ContactForm from "@/components/ContactForm";

const includedItems = [
  "One practice/location",
  "Defined file set",
  "AI-assisted analysis",
  "Human consultant review",
  "One PDF summary",
  "One 30-minute review call",
  "One 30-day action plan",
];

const excludedItems = [
  "Unlimited file review",
  "Implementation work",
  "Ongoing monitoring",
  "Cleanup/project execution",
  "Custom financial modeling",
  "Guaranteed revenue lift",
  "PHI-heavy or sensitive document handling outside the Secure Upload process",
];

const bestFitProfiles = [
  "Single-location owner with unclear profitability",
  "Growth-oriented practice with lead flow but weak conversion",
  "Small group / multi-location operator with AR, claims, reporting, and operating visibility friction",
];

const sprintOffers = [
  {
    title: "Revenue Leak Sprint",
    price: "Starting at $3,500",
    body: "For production, collection, write-off, and conversion leakage.",
  },
  {
    title: "AR / Claims Cleanup Sprint",
    price: "Starting at $2,500",
    body: "For claims, collections, documentation, and follow-up workflow.",
  },
  {
    title: "Growth + New Patient Conversion Sprint",
    price: "Starting at $3,500",
    body: "For lead flow, scheduling, follow-up, consult conversion, and patient experience friction.",
  },
];

const partnerItems = [
  "Monthly file review",
  "KPI/action dashboard",
  "AR, claims, and financial trend review",
  "Workflow and team-efficiency recommendations",
  "Monthly leadership call",
  "Two implementation priorities per month",
  "Follow-up scorecard",
];

const faqItems = [
  {
    question: "What is the Practice Opportunity Review?",
    answer:
      "It is a consultant-reviewed diagnostic that turns approved practice files into prioritized findings, a PDF summary, a 30-minute review call, and a 30-day action plan.",
  },
  {
    question: "Is the analyzer the full product?",
    answer:
      "No. The analyzer provides an initial preview. The paid review adds human consultant interpretation, prioritization, and action planning.",
  },
  {
    question: "What files can I upload?",
    answer:
      "You can upload approved financial or operations files such as supported PDF, CSV, or XLSX exports. Do not upload HIPAA-protected PHI through the public analyzer; sensitive files should use the team-provided Secure Upload workflow.",
  },
  {
    question: "How do Secure Uploads work?",
    answer:
      "When sensitive or PHI-related documents are needed, the alphaSource Consulting team will provide a separate secure upload workflow.",
  },
  {
    question: "Is PHI allowed in the public analyzer?",
    answer:
      "No. Do not upload HIPAA-protected PHI through the public analyzer. Sensitive files should use the team-provided secure upload workflow.",
  },
  {
    question: "What happens after the review call?",
    answer:
      "The team will discuss the highest-priority findings and, when appropriate, recommend a focused sprint or ongoing advisory support.",
  },
  {
    question: "Do you guarantee revenue improvement?",
    answer:
      "No. The review is designed to provide operational clarity, prioritized findings, and recommended next steps, not guaranteed financial outcomes.",
  },
  {
    question: "What is included in the $995 review?",
    answer:
      "The founder-priced review includes one practice/location, a defined file set, AI-assisted analysis, human review, one PDF summary, one 30-minute call, and one 30-day action plan.",
  },
  {
    question: "What is excluded from the $995 review?",
    answer:
      "It excludes unlimited file review, implementation work, ongoing monitoring, cleanup execution, custom financial modeling, guaranteed revenue lift, and sensitive document handling outside Secure Upload.",
  },
];

function SectionIntro({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <div className="mx-auto mb-12 max-w-3xl text-center">
      <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-[#A380F6]">{eyebrow}</span>
      <h2 className="text-4xl font-black text-[#0A1547]">{title}</h2>
      {body && <p className="mt-4 text-[#0A1547]/65 leading-relaxed">{body}</p>}
    </div>
  );
}

function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm leading-6 text-[#0A1547]/65">
          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#02D99D]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function PracticeOpportunityReviewPage() {
  const [openFaqIndexes, setOpenFaqIndexes] = useState<number[]>([]);

  const toggleFaq = (index: number) => {
    setOpenFaqIndexes((current) => (
      current.includes(index)
        ? current.filter((item) => item !== index)
        : [...current, index]
    ));
  };

  return (
    <div className="min-h-screen bg-white font-sans">
      <Navbar />

      <section className="relative overflow-hidden bg-[#0A1547] pt-32 pb-20">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 20% 70%, rgba(2,217,157,0.16) 0%, transparent 55%), radial-gradient(ellipse at 80% 20%, rgba(163,128,246,0.22) 0%, transparent 50%)",
          }}
        />
        <div className="relative mx-auto max-w-5xl px-6 text-center lg:px-8">
          <span className="mb-6 inline-flex items-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white/75">
            Consultant-reviewed diagnostic
          </span>
          <h1 className="mb-6 text-5xl font-black leading-tight text-white lg:text-6xl">Practice Opportunity Review</h1>
          <p className="mx-auto mb-8 max-w-3xl text-xl leading-relaxed text-white/70">
            A consultant-reviewed AI diagnostic that turns your practice files into prioritized operational action.
          </p>
          <div className="mx-auto mb-9 flex max-w-xl flex-col gap-3 rounded-3xl border border-white/15 bg-white/8 p-6 text-left backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-[#02D99D]">$995 founder pricing</p>
              <p className="mt-1 text-sm text-white/60">Standard pricing will move to $1,500.</p>
            </div>
            <a
              href="#contact"
              className="inline-flex justify-center rounded-full bg-white px-5 py-3 text-sm font-bold text-[#0A1547] transition-colors hover:bg-[#A380F6] hover:text-white active:scale-95"
            >
              Book a Review Call
            </a>
          </div>
          <p className="mx-auto max-w-2xl text-sm leading-6 text-white/55">
            Use the public analyzer for approved financial and operations files only. For sensitive or PHI-related documents, our team will provide a secure upload workflow.
          </p>
        </div>
      </section>

      <section className="bg-white py-24">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-[#A380F6]">What It Is</span>
            <h2 className="mb-5 text-4xl font-black text-[#0A1547]">A paid diagnostic between a free preview and full implementation support.</h2>
            <p className="text-[#0A1547]/65 leading-relaxed">
              The analyzer creates the initial signal. The Practice Opportunity Review adds human interpretation, consultant validation, and a practical 30-day action plan for the practice.
            </p>
          </div>
          <div className="rounded-3xl border border-gray-100 bg-[#F8F9FD] p-8">
            <h3 className="mb-5 text-2xl font-black text-[#0A1547]">Best fit</h3>
            <CheckList items={bestFitProfiles} />
          </div>
        </div>
      </section>

      <section className="bg-[#F8F9FD] py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <SectionIntro
            eyebrow="Scope Control"
            title="Clear inclusions. Clear boundaries."
            body="The review keeps the first step focused: clear findings, practical recommendations, and a defined action plan before any larger engagement begins."
          />
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
              <h3 className="mb-6 text-2xl font-black text-[#0A1547]">What’s included</h3>
              <CheckList items={includedItems} />
            </div>
            <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
              <h3 className="mb-6 text-2xl font-black text-[#0A1547]">What’s excluded</h3>
              <CheckList items={excludedItems} />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-3xl bg-[#0A1547] p-8 text-white">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#02D99D]">Turnaround</p>
              <h2 className="mb-5 text-3xl font-black">Designed for a clear, fast read.</h2>
              <p className="text-sm leading-6 text-white/65">
                Standard files are typically reviewed within 3–5 business days, with the review call focused on the findings, recommended next steps, and the right path forward.
              </p>
            </div>
            <div className="rounded-3xl border border-gray-100 bg-[#F8F9FD] p-8 lg:col-span-2">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#A380F6]">Next Step</p>
              <h2 className="mb-5 text-3xl font-black text-[#0A1547]">Start with a review call.</h2>
              <p className="mb-7 text-[#0A1547]/65 leading-relaxed">
                The review call helps confirm the right file set, the sensitivity boundary, and whether the practice is best served by a diagnostic, sprint, or ongoing support.
              </p>
              <a
                href="#contact"
                className="inline-flex rounded-full bg-[#A380F6] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#0A1547] active:scale-95"
              >
                Book a Review Call
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#F8F9FD] py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <SectionIntro
            eyebrow="Focused Sprints"
            title="Project-based help for specific operational issues."
            body="Focused sprints are available when a specific issue needs attention before ongoing support makes sense."
          />
          <div className="grid gap-5 md:grid-cols-3">
            {sprintOffers.map((offer) => (
              <div key={offer.title} className="rounded-3xl border border-gray-100 bg-white p-7 shadow-sm">
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#A380F6]">{offer.price}</p>
                <h3 className="mb-4 text-2xl font-black text-[#0A1547]">{offer.title}</h3>
                <p className="text-sm leading-6 text-[#0A1547]/65">{offer.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="rounded-[2rem] bg-[#0A1547] p-8 text-white lg:p-12">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#02D99D]">Retainer</p>
                <h2 className="mb-5 text-4xl font-black">Operations Intelligence Partner</h2>
                <p className="mb-5 text-xl font-bold text-white">Starting at $2,500/month</p>
                <p className="text-sm leading-6 text-white/65">
                  Ongoing operating rhythm for practices ready to act.
                </p>
                <div className="mt-6 space-y-2 text-sm text-white/65">
                  <p>Starting at $2,500/month for single-location practices.</p>
                  <p>Multi-location support available by custom scope.</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {partnerItems.map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-white/8 p-4">
                    <p className="text-sm font-semibold leading-6 text-white/80">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#F8F9FD] py-24">
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          <SectionIntro
            eyebrow="FAQ"
            title="Common review questions"
            body="Clear answers about the analyzer, the paid review, file handling, and next steps."
          />
          <div className="grid gap-4">
            {faqItems.map((item, index) => {
              const isOpen = openFaqIndexes.includes(index);
              const panelId = `practice-review-faq-${index}`;

              return (
                <div key={item.question} className="rounded-3xl border border-gray-100 bg-white shadow-sm">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggleFaq(index)}
                    className="flex w-full items-center justify-between gap-4 rounded-3xl px-6 py-5 text-left transition-colors hover:bg-[#F8F9FD]"
                  >
                    <span className="text-base font-black text-[#0A1547]">{item.question}</span>
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-lg font-black transition-colors ${
                      isOpen
                        ? "border-[#02D99D]/30 bg-[#02D99D]/10 text-[#0A1547]"
                        : "border-[#A380F6]/30 bg-[#A380F6]/10 text-[#A380F6]"
                    }`}
                    >
                      {isOpen ? "-" : "+"}
                    </span>
                  </button>
                  {isOpen && (
                    <div id={panelId} className="px-6 pb-6">
                      <p className="border-t border-gray-100 pt-4 text-sm leading-6 text-[#0A1547]/65">
                        {item.answer}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="contact" className="bg-white py-24">
        <div className="mx-auto max-w-2xl px-6 lg:px-8">
          <div className="mb-12 text-center">
            <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-[#A380F6]">Next Step</span>
            <h2 className="text-4xl font-black text-[#0A1547]">Book a Review Call</h2>
            <p className="mt-4 text-[#0A1547]/55">
              Tell us about the practice, the file types available, and the operational questions you want answered.
            </p>
          </div>
          <ContactForm />
        </div>
      </section>

      <Footer />
    </div>
  );
}
