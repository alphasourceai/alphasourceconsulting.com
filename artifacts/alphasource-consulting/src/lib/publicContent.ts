export const PUBLIC_CONTENT_LAST_UPDATED = "July 28, 2026";

export type PublicFaqItem = {
  question: string;
  answer: string;
};

export type PublicFaqSection = {
  title: string;
  intro: string;
  items: PublicFaqItem[];
};

export const publicFaqSections: PublicFaqSection[] = [
  {
    title: "Consulting and fit",
    intro: "What alphaSource Consulting does and which dental organizations are the best fit.",
    items: [
      {
        question: "What is alphaSource Consulting?",
        answer:
          "alphaSource Consulting is a dental operations consulting firm that combines dental industry experience, practical analysis, and AI-assisted tools to help practices identify priorities and improve operational follow-through.",
      },
      {
        question: "Who does alphaSource Consulting work with?",
        answer:
          "The services are designed for independent dental practices, growth-oriented offices, dental groups, and multi-location organizations that want clearer operational priorities and practical implementation support.",
      },
      {
        question: "What types of operational issues can you review?",
        answer:
          "Engagements can focus on production and collections, revenue leakage, accounts receivable and claims workflows, new-patient conversion, scheduling, reporting visibility, leadership cadence, team efficiency, and related operating priorities.",
      },
      {
        question: "Do you work with multi-location dental groups?",
        answer:
          "Yes. Multi-location work can include location-level comparison, shared KPI definitions, operating rhythm, revenue-cycle visibility, leadership reporting, and prioritization across the group. Scope is confirmed before an engagement begins.",
      },
      {
        question: "Does alphaSource Consulting guarantee financial results?",
        answer:
          "No. Consulting and analysis are intended to improve clarity, prioritization, and execution. Outcomes depend on the practice, available data, decisions, and implementation, so financial or operational results are not guaranteed.",
      },
    ],
  },
  {
    title: "Reviews, sprints, and ongoing support",
    intro: "How the available engagement formats differ.",
    items: [
      {
        question: "What is the Practice Opportunity Review?",
        answer:
          "It is a focused, consultant-reviewed diagnostic for one practice or location. The published scope includes a defined file set, AI-assisted analysis, human consultant review, a PDF summary, a 30-minute review call, and a 30-day action plan.",
      },
      {
        question: "What is a focused consulting sprint?",
        answer:
          "A sprint is a project-based engagement for a defined operational issue. Current examples include revenue leakage, AR and claims cleanup, and growth or new-patient conversion. Final scope, timing, and fees are confirmed in writing.",
      },
      {
        question: "What is the Operations Intelligence Partner engagement?",
        answer:
          "It is an ongoing advisory option for practices that need a recurring operating rhythm. The published offer can include monthly file review, KPI and trend review, a leadership call, implementation priorities, and a follow-up scorecard.",
      },
      {
        question: "How do I know which engagement is appropriate?",
        answer:
          "An initial conversation confirms the operating question, available data, sensitivity requirements, urgency, and desired level of implementation support. The team can then recommend a review, focused sprint, or ongoing advisory scope.",
      },
      {
        question: "How long does a Practice Opportunity Review take?",
        answer:
          "The current published target for standard files is typically three to five business days after the approved file set is available. Timing can change with file readiness, scope, and data quality.",
      },
    ],
  },
  {
    title: "Data, AI, and deliverables",
    intro: "How analysis works and what clients receive.",
    items: [
      {
        question: "How is AI used in the consulting workflow?",
        answer:
          "AI-assisted tools can organize and analyze approved financial or operational files, surface patterns, and support draft findings. Human consultants review and interpret the output before client-facing recommendations are delivered.",
      },
      {
        question: "Is the Dental Operations Analyzer the full consulting service?",
        answer:
          "No. The public analyzer is an initial intake and analysis workflow. Paid consulting adds scope confirmation, human interpretation, prioritization, client-facing deliverables, and the agreed level of review or implementation support.",
      },
      {
        question: "What files can be reviewed?",
        answer:
          "The exact file set depends on the engagement. Approved financial or operational exports may include supported PDF, CSV, or XLSX files. The team confirms required files and the correct transfer method before sensitive data is submitted.",
      },
      {
        question: "What deliverables will I receive?",
        answer:
          "Deliverables depend on the written scope. A focused review can include a PDF summary, prioritized findings, a review call, and an action plan. Sprints and ongoing engagements may add implementation priorities, scorecards, trend review, and follow-up.",
      },
      {
        question: "Can alphaSource help implement recommendations?",
        answer:
          "Implementation support is available when included in a sprint or ongoing advisory scope. The Practice Opportunity Review is a diagnostic and action-planning engagement and does not include unlimited implementation work.",
      },
    ],
  },
  {
    title: "Privacy, security, and agreements",
    intro: "Important boundaries for public forms, sensitive documents, and engagement records.",
    items: [
      {
        question: "Can I submit PHI through the public website or analyzer?",
        answer:
          "No. Do not submit protected health information, patient records, passwords, payment card data, or confidential files through public contact forms or the public analyzer. Use only the secure workflow provided by the alphaSource Consulting team.",
      },
      {
        question: "How are sensitive files transferred?",
        answer:
          "When an engagement requires sensitive files, the team provides a separate Secure Upload workflow. Public forms and public analytics are intentionally kept separate from client file-transfer workflows.",
      },
      {
        question: "Is a BAA/Privacy Agreement available?",
        answer:
          "alphaSource Consulting has an agreement workflow for BAA/Privacy Agreements when appropriate to the engagement. The applicable agreement is generated, reviewed, signed by both parties, and retained through private document workflows.",
      },
      {
        question: "How are agreement documents accessed?",
        answer:
          "Agreement PDFs are stored privately. Authorized admin access and short-lived document links are used for review and retrieval rather than permanent public document URLs.",
      },
      {
        question: "Where can I read the public privacy policy?",
        answer:
          "The public Privacy Policy explains website analytics, contact lead capture, privacy choices, and public request handling. Consulting scope, confidentiality, and sensitive-data handling are governed by the applicable written engagement documents.",
      },
    ],
  },
  {
    title: "Billing and support",
    intro: "Payment-link, agreement, and support basics.",
    items: [
      {
        question: "How are consulting payments collected?",
        answer:
          "The admin team can send secure Stripe Checkout links for one-time offers, approved upload-based work, and recurring consulting engagements. The applicable offer, amount, and term are shown before payment.",
      },
      {
        question: "Where can I find an existing payment link or agreement?",
        answer:
          "Use the original email link or contact alphaSource Consulting from the email address associated with the engagement. Do not send passwords, tokens, payment card information, or sensitive files by email.",
      },
      {
        question: "How do I get support?",
        answer:
          "Email hello@alphasourceconsulting.com with your name, organization, the email associated with the engagement, and a short description of the issue. Sensitive files should only be sent through an approved secure workflow.",
      },
    ],
  },
];

export const publicFaqItems = publicFaqSections.flatMap((section) => section.items);

export const publicSupportTopics = [
  {
    title: "Getting started",
    body:
      "Questions about fit, consultation requests, engagement options, or the Practice Opportunity Review.",
    links: [
      { label: "How it works", href: "/how-it-works" },
      { label: "Practice Opportunity Review", href: "/practice-opportunity-review" },
    ],
  },
  {
    title: "Agreements",
    body:
      "Help locating a signature request, resolving an unavailable signer link, or retrieving a completed agreement.",
    links: [{ label: "Security and data handling", href: "/security" }],
  },
  {
    title: "Billing",
    body:
      "Help with an existing Stripe Checkout link, offer details, recurring terms, or payment confirmation.",
    links: [{ label: "Consulting services", href: "/dental-consulting" }],
  },
  {
    title: "Secure file transfer",
    body:
      "Help with a team-issued Secure Upload request. Do not send PHI, confidential files, passwords, or access tokens by email.",
    links: [{ label: "Security and data handling", href: "/security" }],
  },
  {
    title: "Analysis and reports",
    body:
      "Questions about approved file types, analysis status, consultant review, or an existing PDF report.",
    links: [
      { label: "Dental Operations Analyzer", href: "/analyzer" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  {
    title: "Dental groups",
    body:
      "Questions about multi-location scope, leadership reporting, location comparisons, or ongoing advisory support.",
    links: [{ label: "For dental groups", href: "/for-dental-groups" }],
  },
];

export const publicSupportQuestions: PublicFaqItem[] = [
  {
    question: "What information should I include in a support email?",
    answer:
      "Include your name, organization, the email associated with the engagement, the relevant workflow, and a short description of what happened. Do not include passwords, raw access tokens, payment card data, PHI, or confidential files.",
  },
  {
    question: "What should I do if an agreement signing link is unavailable?",
    answer:
      "Contact hello@alphasourceconsulting.com from the signer or client email address and identify the organization. The team can review the agreement status and determine whether a new request is appropriate.",
  },
  {
    question: "What should I do if a payment link is expired?",
    answer:
      "Contact the alphaSource Consulting team with the client email and the offer name. The team can verify the local checkout status and issue a replacement link when appropriate.",
  },
  {
    question: "Can I email files to support?",
    answer:
      "Do not email PHI, patient records, confidential exports, passwords, or access tokens. When sensitive files are needed, use only the Secure Upload workflow supplied by the team.",
  },
  {
    question: "How do I request changes to contact information?",
    answer:
      "Email hello@alphasourceconsulting.com from the current or new business email and explain the requested change. Additional verification may be required before client records are updated.",
  },
];
