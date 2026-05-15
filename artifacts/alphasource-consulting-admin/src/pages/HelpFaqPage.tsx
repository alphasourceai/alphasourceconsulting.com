import { useState, type ReactNode } from "react";

type HelpTopic = {
  title: string;
  summary: string;
  content: ReactNode;
};

type HelpCategory = {
  title: string;
  description: string;
  tone: "lilac" | "teal" | "green" | "navy";
  topics: HelpTopic[];
};

const toneClasses: Record<HelpCategory["tone"], { badge: string; border: string }> = {
  lilac: {
    badge: "bg-[#A380F6]/12 text-[#6F4FD8]",
    border: "border-[#A380F6]/24",
  },
  teal: {
    badge: "bg-[#02ABE0]/12 text-[#087EA3]",
    border: "border-[#02ABE0]/24",
  },
  green: {
    badge: "bg-[#02D99D]/12 text-[#047C5D]",
    border: "border-[#02D99D]/24",
  },
  navy: {
    badge: "bg-[#0A1547]/8 text-[#0A1547]",
    border: "border-[#0A1547]/12",
  },
};

const glossaryTerms = [
  { term: "Client", definition: "A client record associated with submissions, uploads, billing, and report activity." },
  { term: "Submission", definition: "A client intake or published analysis record." },
  { term: "Upload", definition: "A file record used for analysis, reports, or billing visibility." },
  { term: "Document Analysis", definition: "Admin-run AI analysis for approved and sanitized files." },
  { term: "Secure Upload", definition: "Secure intake for potentially sensitive files, separate from AI analysis." },
  { term: "Published Analysis", definition: "Completed analysis made visible to Clients and PDF Reports." },
  { term: "PDF Report", definition: "A generated client-ready report from selected published analysis content." },
  { term: "Checkout Session", definition: "A Stripe checkout link used for payment collection." },
  { term: "Paid Upload", definition: "An upload marked paid through completed checkout association or existing billing status." },
  { term: "Admin Access", definition: "Dashboard user access, role assignment, and active or inactive status." },
  { term: "Role", definition: "A permission set that controls page visibility and available actions." },
  { term: "Text-based PDF", definition: "A PDF with selectable text that can be extracted without OCR." },
  { term: "Scanned PDF", definition: "An image-only PDF that usually needs OCR and may not process." },
  { term: "Technical Details", definition: "Collapsed IDs and storage fields used for troubleshooting." },
];

const helpCategories: HelpCategory[] = [
  {
    title: "Dashboard Overview",
    description: "Where the dashboard fits in daily admin operations.",
    tone: "lilac",
    topics: [
      {
        title: "What this dashboard is for",
        summary: "Internal tools for alphaSource Consulting operations.",
        content: (
          <TextBlock>
            <p>
              This dashboard is the internal admin workspace for alphaSource Consulting. Use it to review clients, run approved document analysis, manage secure upload intake, generate PDF reports, create checkout links, review billing visibility, and manage admin access.
            </p>
          </TextBlock>
        ),
      },
      {
        title: "What this dashboard is not",
        summary: "It is not a public portal or automatic delivery system.",
        content: (
          <TextBlock>
            <ul>
              <li>It is not a public client portal.</li>
              <li>It is not a replacement for Secure Uploads review when files may contain PHI or sensitive information.</li>
              <li>It is not an automatic report delivery system. PDF generation, billing, email, and delivery are separate actions unless a workflow explicitly says otherwise.</li>
            </ul>
          </TextBlock>
        ),
      },
      {
        title: "Recommended workflow overview",
        summary: "A practical order for common dashboard work.",
        content: (
          <TextBlock>
            <ol>
              <li>Review the client or submission record.</li>
              <li>Use Document Analysis only for approved, sanitized, analysis-appropriate files.</li>
              <li>Publish completed analysis when it should become visible to Clients and PDF Reports.</li>
              <li>Build and review a PDF Report draft before generating a client-ready PDF.</li>
              <li>Create checkout links from Billing or Client Detail when payment is needed.</li>
              <li>Use Secure Uploads for sensitive intake and review only, not for AI analysis.</li>
            </ol>
          </TextBlock>
        ),
      },
    ],
  },
  {
    title: "Roles & Permissions",
    description: "What each dashboard role can normally do.",
    tone: "navy",
    topics: [
      {
        title: "Role summary",
        summary: "Access is role-based and enforced by the backend.",
        content: (
          <TextBlock>
            <ul>
              <li><strong>Super Admin:</strong> Full access, including Admin Access management.</li>
              <li><strong>Admin:</strong> Operational access, but cannot manage admin access.</li>
              <li><strong>Analyst:</strong> Clients, Document Analysis, PDF Reports, and Secure Uploads.</li>
              <li><strong>Billing Admin:</strong> Clients and Billing.</li>
              <li><strong>Viewer:</strong> Read-only visibility only.</li>
            </ul>
          </TextBlock>
        ),
      },
      {
        title: "Why a page or button may be hidden",
        summary: "Dashboard access is role-based.",
        content: (
          <TextBlock>
            <p>
              Some pages and action buttons are hidden or disabled based on role. Permission checks are enforced before actions are allowed. If something is unavailable, the signed-in user likely lacks the required role permission.
            </p>
          </TextBlock>
        ),
      },
    ],
  },
  {
    title: "Clients",
    description: "How to find and understand client records.",
    tone: "teal",
    topics: [
      {
        title: "Searching clients",
        summary: "Use Search Clients to find records quickly.",
        content: (
          <TextBlock>
            <p>
              Use Search Clients to find clients by email, name, office, or other supported fields. Search results reflect the records available to your role.
            </p>
          </TextBlock>
        ),
      },
      {
        title: "Opening client detail",
        summary: "View Details opens billing and upload context when allowed.",
        content: (
          <TextBlock>
            <p>
              Use View Details when available. Billing-related detail requires billing access, so the link or deeper billing context may not appear for every role.
            </p>
          </TextBlock>
        ),
      },
      {
        title: "Understanding client records",
        summary: "Submissions, uploads, payments, and checkout sessions are separate but related.",
        content: (
          <TextBlock>
            <ul>
              <li><strong>Submissions</strong> identify client intake or published analysis records.</li>
              <li><strong>Uploads</strong> identify analyzed files and their paid or unpaid status.</li>
              <li><strong>Related checkout sessions</strong> show payment links connected to the client or selected uploads.</li>
            </ul>
            <p>
              Technical IDs are intentionally hidden or collapsed in most places because they are for troubleshooting, not daily workflow.
            </p>
          </TextBlock>
        ),
      },
    ],
  },
  {
    title: "Document Analysis",
    description: "Admin-run AI analysis for approved files only.",
    tone: "lilac",
    topics: [
      {
        title: "What Document Analysis is for",
        summary: "Approved, sanitized, analysis-appropriate files.",
        content: (
          <TextBlock>
            <p>
              Document Analysis is for admin-run AI analysis of files that have already been approved for this workflow. It sends extracted content to AI providers, so it must not be treated as a general file intake area.
            </p>
            <p className="font-semibold text-red-700">
              Do not upload unsanitized PHI or sensitive files to Document Analysis.
            </p>
          </TextBlock>
        ),
      },
      {
        title: "Supported files",
        summary: "Financial, AR, and Claims support different file types.",
        content: (
          <TextBlock>
            <ul>
              <li><strong>Financial:</strong> CSV and XLSX processing. PDF handling may remain limited or deferred based on the current page copy.</li>
              <li><strong>AR:</strong> CSV, XLSX, and text-based PDF.</li>
              <li><strong>Claims:</strong> CSV, XLSX, and text-based PDF.</li>
            </ul>
            <p>
              Text-based PDFs must have selectable text. Scanned or image-only PDFs are not supported unless OCR is enabled later.
            </p>
          </TextBlock>
        ),
      },
      {
        title: "Creating and processing an analysis job",
        summary: "Intake and processing are separate steps.",
        content: (
          <TextBlock>
            <ol>
              <li>Choose an existing client or enter new client information.</li>
              <li>Select Financial, AR, or Claims analysis.</li>
              <li>Upload the supported file.</li>
              <li>Create the intake job.</li>
              <li>Run admin-reviewed processing when the job is eligible.</li>
            </ol>
            <p>
              Provider output becomes internal admin output first. It is not automatically sent to the client.
            </p>
          </TextBlock>
        ),
      },
      {
        title: "Publishing",
        summary: "Publishing makes completed analysis available elsewhere in the dashboard.",
        content: (
          <TextBlock>
            <p>
              Publishing makes completed analysis visible in Clients and PDF Reports. Publishing does not send email, update GHL, trigger payment actions, generate PDFs, or deliver reports.
            </p>
          </TextBlock>
        ),
      },
      {
        title: "What not to upload",
        summary: "Keep Secure Uploads and AI analysis separated.",
        content: (
          <TextBlock>
            <p>
              Do not upload unsanitized PHI or sensitive files. Do not pull files from Secure Uploads into Document Analysis unless a future sanitization or redaction workflow exists and has been approved.
            </p>
          </TextBlock>
        ),
      },
    ],
  },
  {
    title: "Secure Uploads",
    description: "Sensitive file intake and review, separate from AI analysis.",
    tone: "green",
    topics: [
      {
        title: "What Secure Uploads is for",
        summary: "Secure intake and review for potentially sensitive files.",
        content: (
          <TextBlock>
            <p>
              Secure Uploads is for secure file intake and review when files may be sensitive or PHI-related. Treat files on this page as potentially sensitive.
            </p>
          </TextBlock>
        ),
      },
      {
        title: "What Secure Uploads is not for",
        summary: "It is not an AI analysis intake path.",
        content: (
          <TextBlock>
            <p>
              Secure Uploads does not send files to Document Analysis. The page does not import files into AI analysis, create reports, or create billing actions.
            </p>
          </TextBlock>
        ),
      },
      {
        title: "Sending and reviewing upload requests",
        summary: "Requests require permission and an existing client email.",
        content: (
          <TextBlock>
            <ul>
              <li>Sending secure upload requests requires Secure Uploads write permission.</li>
              <li>The recipient email must belong to an existing client.</li>
              <li>Use filters to review completed and incomplete uploads.</li>
              <li>Technical and storage details are collapsed because they are for troubleshooting.</li>
            </ul>
          </TextBlock>
        ),
      },
      {
        title: "PHI and sensitive-file handling",
        summary: "Do not move files into AI workflows without review.",
        content: (
          <TextBlock>
            <p>
              Do not move Secure Upload files into AI workflows without explicit sanitization or redaction approval. When unsure, leave the file in Secure Uploads and escalate for review.
            </p>
          </TextBlock>
        ),
      },
    ],
  },
  {
    title: "PDF Reports",
    description: "Draft and generate client-ready PDFs from published analysis.",
    tone: "teal",
    topics: [
      {
        title: "What PDF Reports is for",
        summary: "Review published analysis and generate client-ready PDFs.",
        content: (
          <TextBlock>
            <p>
              PDF Reports lets authorized users review published analysis outputs and generate client-ready PDF reports. It uses existing published analysis data.
            </p>
          </TextBlock>
        ),
      },
      {
        title: "Selecting client and upload",
        summary: "Choose an eligible client and upload before drafting.",
        content: (
          <TextBlock>
            <ol>
              <li>Search for and select an eligible client.</li>
              <li>Choose an eligible upload.</li>
              <li>Review existing PDF metadata and upload details before editing the draft.</li>
            </ol>
          </TextBlock>
        ),
      },
      {
        title: "Building the report draft",
        summary: "Only selected content goes into the draft.",
        content: (
          <TextBlock>
            <p>
              Report content starts unchecked. Select only the opportunities, trends, and notes intended for the client-ready report. Use Preview draft to inspect selected content before generating.
            </p>
          </TextBlock>
        ),
      },
      {
        title: "Generating PDFs and versions",
        summary: "Generation stores report metadata but does not deliver the report.",
        content: (
          <TextBlock>
            <p>
              PDF generation requires PDF generation permission. Generating a PDF stores report metadata and increments the version. It does not email the client, deliver the report, update GHL, or trigger billing.
            </p>
          </TextBlock>
        ),
      },
    ],
  },
  {
    title: "Billing & Checkout Links",
    description: "Checkout session creation and billing visibility.",
    tone: "green",
    topics: [
      {
        title: "What Billing is for",
        summary: "Review checkout sessions, payments, and billing status.",
        content: (
          <TextBlock>
            <p>
              Billing is for checkout sessions, payment visibility, and billing status review. Billing actions require billing permissions.
            </p>
          </TextBlock>
        ),
      },
      {
        title: "Creating checkout links",
        summary: "Select unpaid uploads and create a Stripe checkout session.",
        content: (
          <TextBlock>
            <ol>
              <li>Open Billing or Client Detail with billing write permission.</li>
              <li>Select one or more unpaid uploads to associate with the checkout session.</li>
              <li>Paid uploads cannot be selected again.</li>
              <li>Create the checkout session and copy or send the link manually as appropriate.</li>
            </ol>
          </TextBlock>
        ),
      },
      {
        title: "Multi-upload checkout behavior",
        summary: "One checkout session can cover multiple uploads.",
        content: (
          <TextBlock>
            <p>
              A single checkout session can relate to multiple uploads. When Stripe checkout is paid, the related uploads are marked paid.
            </p>
          </TextBlock>
        ),
      },
      {
        title: "Billing filters and automation boundaries",
        summary: "Filters are for list review, not delivery automation.",
        content: (
          <TextBlock>
            <p>
              Use available filters such as Total Sessions, Paid, Open, and Overrides if shown to review billing records. Billing does not automatically send reports, email clients, or update GHL unless that is explicitly built later.
            </p>
          </TextBlock>
        ),
      },
    ],
  },
  {
    title: "Admin Access",
    description: "How Super Admins manage dashboard access.",
    tone: "navy",
    topics: [
      {
        title: "Adding admin access",
        summary: "Super Admin only.",
        content: (
          <TextBlock>
            <p>
              Super Admins can add admin access by name, email, and role. If the user needs a sign-in account, an invite email is sent.
            </p>
          </TextBlock>
        ),
      },
      {
        title: "Accepting invites and editing roles",
        summary: "Invited users set a password, then sign in.",
        content: (
          <TextBlock>
            <ol>
              <li>The invited user follows the invite link.</li>
              <li>The user sets a password.</li>
              <li>The user signs in to the dashboard.</li>
            </ol>
            <p>
              Super Admins can change roles after access is created.
            </p>
          </TextBlock>
        ),
      },
      {
        title: "Activate, inactivate, and safety rules",
        summary: "Access can be removed without deleting users.",
        content: (
          <TextBlock>
            <ul>
              <li>Inactivation removes dashboard access without hard deleting the user.</li>
              <li>No hard delete action exists in the dashboard.</li>
              <li>A Super Admin cannot deactivate or demote their own Super Admin access.</li>
              <li>At least one active Super Admin must remain.</li>
            </ul>
          </TextBlock>
        ),
      },
    ],
  },
  {
    title: "File Safety / PHI Boundary",
    description: "The most important boundary in the dashboard.",
    tone: "lilac",
    topics: [
      {
        title: "Secure Uploads vs Document Analysis",
        summary: "These workflows must stay separate.",
        content: (
          <TextBlock>
            <p>
              Secure Uploads may contain PHI or sensitive information. Document Analysis sends content to AI providers and should only use approved, sanitized, and appropriate files.
            </p>
          </TextBlock>
        ),
      },
      {
        title: "Sanitization expectation",
        summary: "Review before AI processing.",
        content: (
          <TextBlock>
            <p>
              If a file may contain PHI, do not upload it to Document Analysis unless it has been reviewed and sanitized for that workflow.
            </p>
          </TextBlock>
        ),
      },
      {
        title: "OCR and scanned PDFs",
        summary: "Scanned PDFs may not process.",
        content: (
          <TextBlock>
            <p>
              Scanned PDFs may not process because OCR is not part of the safe first-phase PDF processing. Text-based PDFs with selectable text are the supported path for AR and Claims PDF analysis.
            </p>
          </TextBlock>
        ),
      },
      {
        title: "When unsure",
        summary: "Do not process the file through AI.",
        content: (
          <TextBlock>
            <p>
              If you are unsure whether a file is appropriate for Document Analysis, do not process it through AI. Escalate for review before taking action.
            </p>
          </TextBlock>
        ),
      },
    ],
  },
  {
    title: "Troubleshooting",
    description: "Common symptoms and first checks.",
    tone: "teal",
    topics: [
      {
        title: "I cannot see a page",
        summary: "Check role permissions first.",
        content: <TextBlock><p>Your role may not include that module permission. Ask a Super Admin to review your access.</p></TextBlock>,
      },
      {
        title: "A button is missing",
        summary: "Write actions usually need elevated permission.",
        content: <TextBlock><p>The page may be visible in read-only mode. Creating, generating, inviting, and processing actions require the matching write permission.</p></TextBlock>,
      },
      {
        title: "PDF will not process",
        summary: "It may be scanned or image-only.",
        content: <TextBlock><p>AR and Claims PDFs must be text-selectable. Scanned or image-only PDFs are not supported because OCR is not enabled.</p></TextBlock>,
      },
      {
        title: "Secure upload request fails",
        summary: "The email must already belong to a client.",
        content: <TextBlock><p>Secure upload request emails must belong to an existing client. Confirm the client record and email spelling.</p></TextBlock>,
      },
      {
        title: "Checkout upload is not selectable",
        summary: "Already-paid uploads cannot be selected again.",
        content: <TextBlock><p>Paid uploads stay visible for context but cannot be selected for a new checkout session.</p></TextBlock>,
      },
      {
        title: "Generated PDF looks wrong",
        summary: "Adjust the draft before regenerating.",
        content: <TextBlock><p>Regenerate only after adjusting draft content. Report delivery is not automatic.</p></TextBlock>,
      },
      {
        title: "Browser cache or deploy oddities",
        summary: "Refresh the browser state.",
        content: <TextBlock><p>Try a hard refresh, or use Chrome if Safari appears stale after a deploy.</p></TextBlock>,
      },
    ],
  },
  {
    title: "Glossary",
    description: "Shared terms used across the dashboard.",
    tone: "navy",
    topics: [
      {
        title: "Core terms",
        summary: "Concise definitions for dashboard language.",
        content: (
          <dl className="grid gap-3 text-sm leading-6 text-[#0A1547]/70 sm:grid-cols-2">
            {glossaryTerms.map((term) => (
              <div key={term.term} className="rounded-xl border border-[#0A1547]/10 bg-white p-3">
                <dt className="font-bold text-[#0A1547]">{term.term}</dt>
                <dd className="mt-1 font-medium">{term.definition}</dd>
              </div>
            ))}
          </dl>
        ),
      },
    ],
  },
];

export default function HelpFaqPage() {
  return (
    <div className="grid gap-6">
      <section className="admin-card overflow-hidden">
        <div className="border-b border-[#0A1547]/10 bg-white p-6 md:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#A380F6]">Internal Guide</p>
          <h2 className="mt-3 text-2xl font-black text-[#0A1547] md:text-3xl">Help & FAQ</h2>
          <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-[#0A1547]/64">
            Use this guide to understand dashboard workflows, role requirements, file handling boundaries, and common troubleshooting steps.
          </p>
        </div>
        <div className="grid gap-3 bg-[#F8F9FD] p-4 md:grid-cols-3 md:p-5">
          <BoundaryCard title="Keep PHI Out Of AI Analysis" body="Document Analysis should only use approved, sanitized, analysis-appropriate files." />
          <BoundaryCard title="Secure Uploads Stay Separate" body="Secure Uploads is for potentially sensitive intake and review, not AI analysis." />
          <BoundaryCard title="Separate Steps Matter" body="Processing, publishing, PDF generation, billing, and delivery are separate workflow steps." />
        </div>
      </section>

      {helpCategories.map((category) => (
        <CategorySection key={category.title} category={category} />
      ))}
    </div>
  );
}

function BoundaryCard({ body, title }: { body: string; title: string }) {
  return (
    <div className="rounded-2xl border border-[#A380F6]/20 bg-white p-4">
      <p className="text-sm font-bold text-[#0A1547]">{title}</p>
      <p className="mt-2 text-sm font-medium leading-6 text-[#0A1547]/62">{body}</p>
    </div>
  );
}

function CategorySection({ category }: { category: HelpCategory }) {
  const tone = toneClasses[category.tone];

  return (
    <section className={`admin-card overflow-hidden border ${tone.border}`}>
      <div className="flex flex-col gap-3 border-b border-[#0A1547]/10 bg-white p-5 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-xl font-black text-[#0A1547]">{category.title}</h3>
          <p className="mt-1 text-sm font-medium leading-6 text-[#0A1547]/62">{category.description}</p>
        </div>
        <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${tone.badge}`}>
          {category.topics.length} topics
        </span>
      </div>
      <div className="divide-y divide-[#0A1547]/8">
        {category.topics.map((topic) => (
          <HelpAccordion key={topic.title} topic={topic} />
        ))}
      </div>
    </section>
  );
}

function HelpAccordion({ topic }: { topic: HelpTopic }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="admin-focus flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition hover:bg-[#F8F9FD]"
        aria-expanded={open}
      >
        <span>
          <span className="block text-sm font-bold text-[#0A1547]">{topic.title}</span>
          <span className="mt-1 block text-sm font-medium leading-5 text-[#0A1547]/58">{topic.summary}</span>
        </span>
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#0A1547]/10 bg-[#F8F9FD] text-base font-bold text-[#0A1547]">
          {open ? "-" : "+"}
        </span>
      </button>
      {open && (
        <div className="px-5 pb-5">
          <div className="rounded-2xl border border-[#0A1547]/8 bg-[#F8F9FD] p-4">
            {topic.content}
          </div>
        </div>
      )}
    </div>
  );
}

function TextBlock({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-3 text-sm font-medium leading-6 text-[#0A1547]/70 [&_li]:mb-1 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_strong]:font-bold [&_strong]:text-[#0A1547] [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
      {children}
    </div>
  );
}
