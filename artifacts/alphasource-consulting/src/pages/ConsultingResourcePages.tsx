import type { ReactNode } from "react";
import { useLocation } from "wouter";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FileSearch,
  FileText,
  Headphones,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UploadCloud,
  Users,
  Workflow,
} from "lucide-react";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { AlphyMark } from "@/components/AlphyBrand";
import {
  publicFaqItems,
  publicFaqSections,
  publicRouteModifiedDisplay,
  publicSupportQuestions,
  publicSupportTopics,
} from "@/lib/publicContent";

const resourceLinks = [
  { label: "How it works", href: "/how-it-works" },
  { label: "FAQ", href: "/faq" },
  { label: "Security", href: "/security" },
  { label: "For dental groups", href: "/for-dental-groups" },
  { label: "Support", href: "/support" },
];

const iconTone = {
  lilac: "text-[#7C5CF2]",
  blue: "text-[#02ABE0]",
  teal: "text-[#00AFA9]",
  green: "text-[#00A979]",
  amber: "text-[#D97706]",
  navy: "text-[#0A1547]",
} as const;

function IconBadge({
  children,
  tone = "lilac",
}: {
  children: ReactNode;
  tone?: keyof typeof iconTone;
}) {
  return (
    <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#0A1547]/10 bg-white ${iconTone[tone]}`}>
      {children}
    </span>
  );
}

function PageHero({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  const [location] = useLocation();
  return (
    <section className="bg-[#0A1547] pb-16 pt-32 text-white lg:pb-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <p className="text-xs font-bold uppercase text-[#A380F6]">{eyebrow}</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">{title}</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-white/68">{body}</p>
        <p className="mt-5 text-sm font-semibold text-white/45">Last updated {publicRouteModifiedDisplay(location)}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a
            href="/#contact"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#A380F6] px-5 text-sm font-bold text-white transition-colors hover:bg-[#9270E8]"
            data-analytics-cta="Talk with alphaSource Consulting"
            data-analytics-placement="resource-page-hero"
          >
            Talk with our team
            <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href="/practice-opportunity-review"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/20 bg-white/5 px-5 text-sm font-bold text-white transition-colors hover:bg-white/10"
            data-analytics-cta="Explore Practice Opportunity Review"
            data-analytics-placement="resource-page-hero"
          >
            Explore the Practice Opportunity Review
          </a>
        </div>
      </div>
    </section>
  );
}

function SectionHeading({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body?: string;
}) {
  return (
    <div className="mb-9 max-w-3xl">
      <p className="text-xs font-bold uppercase text-[#7C5CF2]">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-black leading-tight text-[#0A1547] lg:text-4xl">{title}</h2>
      {body ? <p className="mt-4 text-base leading-7 text-[#0A1547]/62">{body}</p> : null}
    </div>
  );
}

function RelatedResources({ current }: { current: string }) {
  return (
    <section className="border-t border-[#0A1547]/8 bg-white py-12">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <p className="text-xs font-bold uppercase text-[#7C5CF2]">Related resources</p>
        <nav className="mt-4 flex flex-wrap gap-2" aria-label="Related consulting resources">
          {resourceLinks
            .filter((link) => link.href !== current)
            .map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-full border border-[#0A1547]/12 bg-white px-4 py-2 text-sm font-semibold text-[#0A1547]/72 transition-colors hover:border-[#A380F6] hover:text-[#7C5CF2]"
                data-analytics-cta={link.label}
                data-analytics-placement="related-resources"
              >
                {link.label}
              </a>
            ))}
        </nav>
      </div>
    </section>
  );
}

function ResourcePageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F8F9FD] font-sans">
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}

function FaqList({
  items,
}: {
  items: Array<{ question: string; answer: string }>;
}) {
  return (
    <div className="divide-y divide-[#0A1547]/10 rounded-lg border border-[#0A1547]/10 bg-white">
      {items.map((item) => (
        <details key={item.question} className="group px-5 py-1">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-4 text-left text-base font-bold text-[#0A1547]">
            {item.question}
            <span className="text-xl font-medium text-[#7C5CF2] group-open:rotate-45" aria-hidden="true">+</span>
          </summary>
          <p className="max-w-4xl pb-5 pr-8 text-sm leading-7 text-[#0A1547]/65">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}

export function HowItWorksPage() {
  const steps = [
    {
      title: "Start with the operating question",
      body: "We begin with the practice, locations, operating concern, available files, and the decision the leadership team needs to make.",
      icon: <ClipboardList className="h-5 w-5" />,
      tone: "lilac" as const,
    },
    {
      title: "Choose the right engagement",
      body: "The next step may be a Practice Opportunity Review, a focused sprint, or an ongoing advisory scope.",
      icon: <Workflow className="h-5 w-5" />,
      tone: "blue" as const,
    },
    {
      title: "Confirm scope and agreements",
      body: "Fees, deliverables, confidentiality, data handling, and applicable agreement requirements are confirmed before sensitive work begins.",
      icon: <FileText className="h-5 w-5" />,
      tone: "navy" as const,
    },
    {
      title: "Use the approved data path",
      body: "Public forms stay separate from client files. When sensitive information is required, the team provides the appropriate Secure Upload workflow.",
      icon: <UploadCloud className="h-5 w-5" />,
      tone: "amber" as const,
    },
    {
      title: "Analyze and validate",
      body: "AI-assisted analysis can organize approved files and surface patterns. A human consultant reviews the output and operating context.",
      icon: <AlphyMark className="h-7 w-7" />,
      tone: "teal" as const,
    },
    {
      title: "Prioritize findings",
      body: "Client-facing findings focus on the most important operational issues, supporting evidence, and practical next actions.",
      icon: <BarChart3 className="h-5 w-5" />,
      tone: "blue" as const,
    },
    {
      title: "Review the recommendations",
      body: "The consultant and client review the findings, assumptions, data notes, and recommended path forward.",
      icon: <Users className="h-5 w-5" />,
      tone: "lilac" as const,
    },
    {
      title: "Implement and follow through",
      body: "Implementation support, scorecards, and recurring review are included only when they are part of the agreed sprint or advisory scope.",
      icon: <CheckCircle2 className="h-5 w-5" />,
      tone: "green" as const,
    },
  ];

  return (
    <ResourcePageShell>
      <PageHero
        eyebrow="How it works"
        title="From dental practice data to focused operating priorities."
        body="alphaSource Consulting uses a defined workflow to confirm the business question, protect the data path, review the evidence, and turn findings into practical next steps."
      />
      <main>
        <section className="bg-white py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <SectionHeading
              eyebrow="Step by step"
              title="A consulting workflow with clear boundaries."
              body="The exact scope changes by engagement, but the sequence keeps commercial setup, sensitive file handling, analysis, and client-facing recommendations distinct."
            />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, index) => (
                <article key={step.title} className="rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] p-5">
                  <div className="flex items-center justify-between">
                    <IconBadge tone={step.tone}>{step.icon}</IconBadge>
                    <span className="text-sm font-bold text-[#0A1547]/35">{String(index + 1).padStart(2, "0")}</span>
                  </div>
                  <h2 className="mt-5 text-lg font-bold text-[#0A1547]">{step.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-[#0A1547]/62">{step.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#F8F9FD] py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <SectionHeading
              eyebrow="Engagement paths"
              title="Start at the level of support the practice needs."
            />
            <div className="grid gap-5 lg:grid-cols-3">
              {[
                ["Practice Opportunity Review", "A defined diagnostic with consultant review, a PDF summary, a review call, and an action plan.", "/practice-opportunity-review"],
                ["Focused sprint", "Project-based support for a specific operating issue such as revenue leakage, claims, AR, or conversion.", "/dental-consulting"],
                ["Operations Intelligence Partner", "Ongoing file, KPI, trend, leadership, and implementation-priority review under an agreed recurring scope.", "/dental-consulting"],
              ].map(([title, body, href]) => (
                <article key={title} className="rounded-lg border border-[#0A1547]/10 bg-white p-6">
                  <h2 className="text-xl font-bold text-[#0A1547]">{title}</h2>
                  <p className="mt-3 text-sm leading-7 text-[#0A1547]/62">{body}</p>
                  <a href={href} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#7C5CF2]">
                    Learn more <ArrowRight className="h-4 w-4" />
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <RelatedResources current="/how-it-works" />
    </ResourcePageShell>
  );
}

export function ConsultingFaqPage() {
  return (
    <ResourcePageShell>
      <PageHero
        eyebrow="Frequently asked questions"
        title="Dental operations consulting questions, answered."
        body="Clear public answers about engagement fit, reviews and sprints, AI-assisted analysis, deliverables, security boundaries, agreements, billing, and support."
      />
      <main className="bg-[#F8F9FD] py-16 lg:py-20">
        <div className="mx-auto max-w-5xl space-y-12 px-6 lg:px-8">
          <div className="rounded-lg border border-[#A380F6]/25 bg-white p-6">
            <p className="text-sm leading-7 text-[#0A1547]/68">
              These answers describe public workflows and current published offers. Final scope, fees, timing, confidentiality, and deliverables are governed by the applicable written agreement.
            </p>
          </div>
          {publicFaqSections.map((section) => (
            <section key={section.title}>
              <SectionHeading eyebrow="FAQ" title={section.title} body={section.intro} />
              <FaqList items={section.items} />
            </section>
          ))}
          <p className="text-sm font-semibold text-[#0A1547]/45">{publicFaqItems.length} public questions answered.</p>
        </div>
      </main>
      <RelatedResources current="/faq" />
    </ResourcePageShell>
  );
}

export function SecurityPage() {
  const controls = [
    {
      title: "Public website boundary",
      body: "Public contact forms and the public analyzer are not approved channels for PHI, patient records, passwords, payment card data, or confidential files.",
      icon: <ShieldCheck className="h-5 w-5" />,
      tone: "green" as const,
    },
    {
      title: "Secure Upload workflow",
      body: "When sensitive files are required, the team provides a separate request and private cloud-storage workflow tied to the client engagement.",
      icon: <UploadCloud className="h-5 w-5" />,
      tone: "amber" as const,
    },
    {
      title: "Private agreements",
      body: "Draft and signed agreement documents are stored privately and retrieved through authorized or short-lived access paths.",
      icon: <LockKeyhole className="h-5 w-5" />,
      tone: "lilac" as const,
    },
    {
      title: "Two-party signatures",
      body: "The BAA/Privacy Agreement workflow requires client signature followed by alphaSource countersignature before the document is final.",
      icon: <FileText className="h-5 w-5" />,
      tone: "navy" as const,
    },
    {
      title: "Restricted administration",
      body: "Client, file, agreement, billing, report, and analysis workflows are accessed through authenticated admin routes with permission checks.",
      icon: <Users className="h-5 w-5" />,
      tone: "blue" as const,
    },
    {
      title: "Separate payment workflow",
      body: "Stripe Checkout is used for approved payment links. Payment workflows remain separate from client file analysis and secure document transfer.",
      icon: <CreditCard className="h-5 w-5" />,
      tone: "teal" as const,
    },
  ];

  return (
    <ResourcePageShell>
      <PageHero
        eyebrow="Security and data handling"
        title="Use the right path for public inquiries, agreements, and sensitive files."
        body="alphaSource Consulting separates public website activity from client agreements, billing, secure file transfer, analysis, and report workflows."
      />
      <main>
        <section className="bg-white py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <SectionHeading
              eyebrow="Workflow controls"
              title="Practical safeguards around each client workflow."
              body="These controls describe the current application workflow. The applicable consulting and privacy agreements determine the final scope for a client engagement."
            />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {controls.map((control) => (
                <article key={control.title} className="rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] p-6">
                  <IconBadge tone={control.tone}>{control.icon}</IconBadge>
                  <h2 className="mt-5 text-lg font-bold text-[#0A1547]">{control.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-[#0A1547]/62">{control.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#F8F9FD] py-16 lg:py-20">
          <div className="mx-auto grid max-w-7xl gap-8 px-6 lg:grid-cols-2 lg:px-8">
            <div>
              <SectionHeading
                eyebrow="Before sharing data"
                title="Confirm the transfer method first."
              />
              <ul className="space-y-4">
                {[
                  "Do not place PHI or confidential files in a public contact form.",
                  "Do not upload PHI through the public analyzer.",
                  "Do not email passwords, raw signer tokens, payment card data, or private files.",
                  "Use the Secure Upload request supplied by the alphaSource Consulting team.",
                  "Ask the team when the sensitivity or file classification is unclear.",
                ].map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-7 text-[#0A1547]/68">
                    <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-[#00A979]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <aside className="rounded-lg border border-[#0A1547]/10 bg-white p-6 lg:p-8">
              <IconBadge tone="amber"><Mail className="h-5 w-5" /></IconBadge>
              <h2 className="mt-5 text-2xl font-bold text-[#0A1547]">Need the correct secure workflow?</h2>
              <p className="mt-4 text-sm leading-7 text-[#0A1547]/65">
                Contact the team with the organization name and a general description of the file type. Do not attach sensitive files to the initial email.
              </p>
              <a href="mailto:hello@alphasourceconsulting.com" className="mt-6 inline-flex rounded-lg bg-[#0A1547] px-5 py-3 text-sm font-bold text-white">
                Email alphaSource Consulting
              </a>
            </aside>
          </div>
        </section>
      </main>
      <RelatedResources current="/security" />
    </ResourcePageShell>
  );
}

export function DentalGroupsPage() {
  const focusAreas = [
    ["Location-level visibility", "Create a clearer view of operating performance, trends, and differences across locations.", <BarChart3 className="h-5 w-5" />, "blue" as const],
    ["Shared operating definitions", "Align leadership on KPI definitions, review cadence, and the operating questions each measure should answer.", <Workflow className="h-5 w-5" />, "teal" as const],
    ["Revenue-cycle priorities", "Review collections, adjustments, accounts receivable, claims, and follow-up patterns within the agreed scope.", <CreditCard className="h-5 w-5" />, "green" as const],
    ["Growth and conversion", "Evaluate lead flow, scheduling, follow-up, consult conversion, and patient-experience friction where relevant.", <Users className="h-5 w-5" />, "lilac" as const],
    ["Leadership follow-through", "Turn findings into named priorities, review checkpoints, and a repeatable operating rhythm.", <ClipboardList className="h-5 w-5" />, "navy" as const],
    ["Controlled data intake", "Coordinate the correct public, agreement, payment, and secure file-transfer workflow for each engagement.", <ShieldCheck className="h-5 w-5" />, "amber" as const],
  ];

  return (
    <ResourcePageShell>
      <PageHero
        eyebrow="For dental groups"
        title="Operational clarity across locations, leaders, and priorities."
        body="alphaSource Consulting helps dental groups organize location-level evidence, align leadership around shared operating questions, and focus implementation on the issues that matter most."
      />
      <main>
        <section className="bg-white py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <SectionHeading
              eyebrow="Multi-location focus"
              title="Make group-level review more actionable."
              body="The objective is not more reporting for its own sake. It is a clearer connection between location performance, operating patterns, leadership decisions, and follow-through."
            />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {focusAreas.map(([title, body, icon, tone]) => (
                <article key={String(title)} className="rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] p-6">
                  <IconBadge tone={tone as keyof typeof iconTone}>{icon}</IconBadge>
                  <h2 className="mt-5 text-lg font-bold text-[#0A1547]">{title}</h2>
                  <p className="mt-3 text-sm leading-7 text-[#0A1547]/62">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#F8F9FD] py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <SectionHeading
              eyebrow="Ways to engage"
              title="Use a focused starting point or establish a recurring cadence."
            />
            <div className="grid gap-5 lg:grid-cols-3">
              {[
                ["One-location diagnostic", "Use a Practice Opportunity Review when one location needs a defined diagnostic and action plan."],
                ["Group-focused sprint", "Use a scoped project when a specific issue needs comparison, cleanup, workflow design, or implementation support across selected locations."],
                ["Ongoing operating rhythm", "Use an Operations Intelligence Partner scope for recurring file review, leadership discussion, priorities, and follow-up."],
              ].map(([title, body]) => (
                <article key={title} className="rounded-lg border border-[#0A1547]/10 bg-white p-6">
                  <h2 className="text-xl font-bold text-[#0A1547]">{title}</h2>
                  <p className="mt-3 text-sm leading-7 text-[#0A1547]/62">{body}</p>
                </article>
              ))}
            </div>
            <p className="mt-7 max-w-4xl text-sm leading-7 text-[#0A1547]/58">
              Multi-location scope and pricing are confirmed based on the locations, file set, sensitivity requirements, operating questions, deliverables, and level of implementation support.
            </p>
          </div>
        </section>
      </main>
      <RelatedResources current="/for-dental-groups" />
    </ResourcePageShell>
  );
}

export function ConsultingSupportPage() {
  return (
    <ResourcePageShell>
      <PageHero
        eyebrow="Support"
        title="Help with consulting setup, agreements, payments, files, and reports."
        body="Use these public support paths to identify the workflow involved and contact alphaSource Consulting without sending sensitive information through an unapproved channel."
      />
      <main>
        <section className="bg-white py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[1fr_0.65fr]">
              <div>
                <SectionHeading
                  eyebrow="Support areas"
                  title="Start with the workflow involved."
                  body="Include enough business context for the team to locate the right client, agreement, checkout, upload request, analysis, or report record."
                />
                <div className="grid gap-4 md:grid-cols-2">
                  {publicSupportTopics.map((topic, index) => (
                    <article key={topic.title} className="rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] p-5">
                      <div className="flex items-center gap-3">
                        <IconBadge tone={index % 2 === 0 ? "blue" : "lilac"}>
                          {index === 0 ? <Headphones className="h-5 w-5" /> : index === 1 ? <FileText className="h-5 w-5" /> : index === 2 ? <CreditCard className="h-5 w-5" /> : index === 3 ? <UploadCloud className="h-5 w-5" /> : index === 4 ? <FileSearch className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                        </IconBadge>
                        <h2 className="text-lg font-bold text-[#0A1547]">{topic.title}</h2>
                      </div>
                      <p className="mt-4 text-sm leading-7 text-[#0A1547]/62">{topic.body}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {topic.links.map((link) => (
                          <a key={link.href} href={link.href} className="text-sm font-bold text-[#7C5CF2]">
                            {link.label}
                          </a>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
              <aside className="h-fit rounded-lg border border-[#A380F6]/25 bg-[#F8F9FD] p-6 lg:mt-24">
                <IconBadge tone="lilac"><Mail className="h-5 w-5" /></IconBadge>
                <h2 className="mt-5 text-2xl font-bold text-[#0A1547]">Contact support</h2>
                <p className="mt-3 text-sm leading-7 text-[#0A1547]/65">
                  Include your name, organization, client email, the workflow involved, and a short description of the issue.
                </p>
                <a href="mailto:hello@alphasourceconsulting.com" className="mt-5 block break-all text-sm font-bold text-[#7C5CF2]">
                  hello@alphasourceconsulting.com
                </a>
                <p className="mt-5 border-t border-[#0A1547]/10 pt-5 text-xs leading-6 text-[#0A1547]/52">
                  Do not email PHI, confidential files, passwords, payment card information, or raw access tokens.
                </p>
              </aside>
            </div>
          </div>
        </section>

        <section className="bg-[#F8F9FD] py-16 lg:py-20">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <SectionHeading
              eyebrow="Support FAQ"
              title="Common recovery and setup questions."
            />
            <FaqList items={publicSupportQuestions} />
          </div>
        </section>
      </main>
      <RelatedResources current="/support" />
    </ResourcePageShell>
  );
}
