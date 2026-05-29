type IconName =
  | "activity"
  | "alert"
  | "archive"
  | "arrow"
  | "check"
  | "chevron"
  | "clock"
  | "credit"
  | "download"
  | "file"
  | "filter"
  | "folder"
  | "link"
  | "lock"
  | "mail"
  | "more"
  | "pen"
  | "plus"
  | "search"
  | "shield"
  | "spark"
  | "users";

type StatusTone = "success" | "info" | "warning" | "danger" | "neutral" | "lilac";
type IconTone = "clients" | "agreements" | "billing" | "secure" | "analysis" | "reports" | StatusTone;

const moduleShortcuts = [
  { icon: "users", label: "Clients", metric: "128", meta: "24 active this month", iconTone: "clients" },
  { icon: "pen", label: "Agreements", metric: "9", meta: "2 need countersignature", iconTone: "agreements" },
  { icon: "credit", label: "Billing", metric: "$18.4k", meta: "open checkout value", iconTone: "billing" },
  { icon: "lock", label: "Secure Uploads", metric: "17", meta: "private files pending review", iconTone: "secure" },
  { icon: "activity", label: "Analysis", metric: "31", meta: "published results", iconTone: "analysis" },
  { icon: "file", label: "PDF Reports", metric: "6", meta: "ready to generate", iconTone: "reports" },
] as const;

const statusExamples: Array<{ label: string; tone: StatusTone }> = [
  { label: "Paid", tone: "success" },
  { label: "Open", tone: "info" },
  { label: "Pending BA Signature", tone: "lilac" },
  { label: "Needs Review", tone: "warning" },
  { label: "Voided", tone: "danger" },
  { label: "Archived", tone: "neutral" },
];

const clientFacts = [
  { label: "Legal name", value: "BrightPath Dental Group" },
  { label: "Primary signer", value: "Morgan Lee" },
  { label: "Email", value: "morgan@brightpath.example" },
  { label: "Phone", value: "(555) 016-2842" },
  { label: "State", value: "CO" },
  { label: "Last activity", value: "Today, 9:42 AM" },
];

const detailRows = [
  { label: "Client UUID", value: "2f9f6a34-3f31-4a8d-94ab-7028c7a79d13" },
  { label: "Draft PDF path", value: "agreements/.../draft.pdf" },
  { label: "Upload object", value: "secure-uploads/.../2026-q2-ar-aging.xlsx" },
  { label: "Audit correlation", value: "evt_agreement_signed_20260529" },
];

export default function UiMockupPage() {
  return (
    <div className="grid gap-6">
      <CompactHeader />
      <ModuleShortcuts />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <ClientSummary />
        <section className="grid gap-4">
          <BillingCards />
          <AgreementCards />
        </section>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <WorkflowRows />
        <UtilityPatterns />
      </section>
    </div>
  );
}

function CompactHeader() {
  return (
    <section className="rounded-lg border border-[#0A1547]/10 bg-white px-5 py-4 shadow-[0_12px_28px_rgba(10,21,71,0.05)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip label="Mockup only" tone="lilac" />
            <StatusChip label="No live data" tone="neutral" />
          </div>
          <h2 className="mt-3 text-2xl font-black text-[#0A1547]">Operations snapshot</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-64 items-center gap-2 rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] px-3 py-2 text-sm font-medium text-[#0A1547]/52">
            <Icon name="search" />
            <span>Search clients, files, agreements</span>
          </div>
          <IconButton icon="filter" label="Filter" />
          <IconButton icon="plus" label="Create" variant="primary" />
        </div>
      </div>
    </section>
  );
}

function ModuleShortcuts() {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {moduleShortcuts.map((item) => (
        <article
          key={item.label}
          className="rounded-lg border border-[#0A1547]/10 bg-white p-4 shadow-[0_10px_24px_rgba(10,21,71,0.04)]"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <IconBadge icon={item.icon} tone={item.iconTone} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#0A1547]">{item.label}</p>
                <p className="mt-1 text-xs font-medium text-[#0A1547]/52">{item.meta}</p>
              </div>
            </div>
            <p className="shrink-0 text-2xl font-black leading-none text-[#0A1547]">{item.metric}</p>
          </div>
        </article>
      ))}
    </section>
  );
}

function ClientSummary() {
  return (
    <section className="rounded-lg border border-[#0A1547]/10 bg-white shadow-[0_12px_28px_rgba(10,21,71,0.05)]">
      <div className="flex flex-col gap-4 border-b border-[#0A1547]/10 p-5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip label="Client detail" tone="info" />
            <StatusChip label="Agreement current" tone="success" />
          </div>
          <h3 className="mt-3 text-xl font-black text-[#0A1547]">BrightPath Dental Group</h3>
          <p className="mt-1 truncate text-sm font-medium text-[#0A1547]/56">morgan@brightpath.example</p>
        </div>
        <div className="flex gap-2">
          <IconButton icon="mail" label="Email" />
          <IconButton icon="link" label="Open client" variant="primary" />
          <ActionMenu />
        </div>
      </div>

      <dl className="grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
        {clientFacts.map((fact) => (
          <div key={fact.label} className="min-w-0">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0A1547]/36">{fact.label}</dt>
            <dd className="mt-1 truncate text-sm font-semibold text-[#0A1547]/82">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function BillingCards() {
  return (
    <section className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
      <MetricCard icon="credit" iconTone="billing" label="Open balance" value="$2,400" status="Checkout sent" statusTone="info" />
      <MetricCard icon="check" iconTone="success" label="Paid uploads" value="4" status="Protected" statusTone="success" />
      <MetricCard icon="clock" iconTone="secure" label="Open links" value="2" status="Expires soon" statusTone="warning" />
    </section>
  );
}

function AgreementCards() {
  return (
    <section className="rounded-lg border border-[#0A1547]/10 bg-white p-4 shadow-[0_10px_24px_rgba(10,21,71,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[#0A1547]">Agreement status</p>
          <p className="mt-1 text-xs font-medium text-[#0A1547]/52">BAA/Privacy Agreement</p>
        </div>
        <StatusChip label="Pending BA Signature" tone="lilac" />
      </div>
      <div className="mt-4 grid gap-2">
        <TimelineStep complete label="Client signed" value="Morgan Lee, 9:41 AM" />
        <TimelineStep active label="BA countersignature" value="Jason Gardner" />
        <TimelineStep label="Signed copy" value="Not available yet" />
      </div>
    </section>
  );
}

function WorkflowRows() {
  return (
    <section className="rounded-lg border border-[#0A1547]/10 bg-white shadow-[0_12px_28px_rgba(10,21,71,0.05)]">
      <div className="border-b border-[#0A1547]/10 p-5">
        <h3 className="text-lg font-black text-[#0A1547]">Work queue</h3>
      </div>
      <div className="divide-y divide-[#0A1547]/10">
        <CompactRow
          icon="lock"
          iconTone="secure"
          title="2026 Q2 AR Aging.xlsx"
          subtitle="Secure upload - private intake"
          meta="Uploaded today"
          status="Needs Review"
          statusTone="warning"
        />
        <CompactRow
          icon="activity"
          iconTone="analysis"
          title="Claims analysis results"
          subtitle="Document Analysis - structured output"
          meta="3 findings"
          status="Published"
          statusTone="success"
        />
        <CompactRow
          icon="file"
          iconTone="reports"
          title="Consultant Review PDF"
          subtitle="PDF Reports - draft ready"
          meta="BrightPath Dental"
          status="Ready"
          statusTone="info"
        />
      </div>
    </section>
  );
}

function UtilityPatterns() {
  return (
    <section className="grid gap-4">
      <section className="rounded-lg border border-[#0A1547]/10 bg-white p-5 shadow-[0_12px_28px_rgba(10,21,71,0.05)]">
        <h3 className="text-lg font-black text-[#0A1547]">Status chips</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          {statusExamples.map((status) => (
            <StatusChip key={status.label} label={status.label} tone={status.tone} />
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-[#0A1547]/10 bg-white p-5 shadow-[0_12px_28px_rgba(10,21,71,0.05)]">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-black text-[#0A1547]">Technical details</h3>
          <StatusChip label="Collapsed by default" tone="neutral" />
        </div>
        <details className="mt-4 rounded-lg border border-[#0A1547]/10 bg-[#F8F9FD] p-4">
          <summary className="admin-focus cursor-pointer text-sm font-semibold text-[#0A1547]">
            View metadata
          </summary>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            {detailRows.map((row) => (
              <div key={row.label} className="min-w-0">
                <dt className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#0A1547]/36">{row.label}</dt>
                <dd className="mt-1 truncate font-medium text-[#0A1547]/68">{row.value}</dd>
              </div>
            ))}
          </dl>
        </details>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <StateTile icon="clock" title="Loading" body="Fetching agreement history..." tone="info" />
        <StateTile icon="archive" title="Empty" body="No secure uploads found." tone="neutral" />
        <StateTile icon="alert" title="Error" body="Agreement history could not be loaded." tone="danger" />
      </section>
    </section>
  );
}

function CompactRow({
  icon,
  iconTone,
  meta,
  status,
  statusTone,
  subtitle,
  title,
}: {
  icon: IconName;
  iconTone: IconTone;
  meta: string;
  status: string;
  statusTone: StatusTone;
  subtitle: string;
  title: string;
}) {
  return (
    <article className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div className="flex min-w-0 items-start gap-3">
        <IconBadge icon={icon} tone={iconTone} />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[#0A1547]">{title}</p>
          <p className="mt-1 truncate text-xs font-medium text-[#0A1547]/52">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 md:justify-end">
        <span className="hidden text-xs font-medium text-[#0A1547]/44 sm:inline">{meta}</span>
        <StatusChip label={status} tone={statusTone} />
        <ActionMenu />
      </div>
    </article>
  );
}

function MetricCard({
  icon,
  iconTone,
  label,
  status,
  statusTone,
  value,
}: {
  icon: IconName;
  iconTone: IconTone;
  label: string;
  status: string;
  statusTone: StatusTone;
  value: string;
}) {
  return (
    <article className="rounded-lg border border-[#0A1547]/10 bg-white p-4 shadow-[0_10px_24px_rgba(10,21,71,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-3xl font-black leading-none text-[#0A1547]">{value}</p>
          <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[#0A1547]/40">{label}</p>
        </div>
        <IconBadge icon={icon} tone={iconTone} compact />
      </div>
      <div className="mt-4">
        <StatusChip label={status} tone={statusTone} />
      </div>
    </article>
  );
}

function TimelineStep({
  active = false,
  complete = false,
  label,
  value,
}: {
  active?: boolean;
  complete?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[24px_minmax(0,1fr)] gap-3">
      <span
        className={`mt-1 flex h-5 w-5 items-center justify-center rounded-full border ${
          complete
            ? "border-[#02D99D] bg-[#02D99D] text-white"
            : active
              ? "border-[#A380F6] bg-[#A380F6]/12 text-[#A380F6]"
              : "border-[#0A1547]/14 bg-[#F8F9FD] text-[#0A1547]/36"
        }`}
      >
        {complete ? <Icon name="check" size={12} /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[#0A1547]">{label}</p>
        <p className="mt-0.5 truncate text-xs font-medium text-[#0A1547]/50">{value}</p>
      </div>
    </div>
  );
}

function StateTile({ body, icon, title, tone }: { body: string; icon: IconName; title: string; tone: StatusTone }) {
  return (
    <div className="rounded-lg border border-[#0A1547]/10 bg-white p-4 text-center shadow-[0_10px_24px_rgba(10,21,71,0.04)]">
      <div className="mx-auto w-fit">
        <IconBadge icon={icon} tone={tone} />
      </div>
      <p className="mt-3 text-sm font-bold text-[#0A1547]">{title}</p>
      <p className="mt-1 text-xs font-medium leading-5 text-[#0A1547]/52">{body}</p>
    </div>
  );
}

function ActionMenu() {
  return (
    <details className="group relative">
      <summary className="admin-focus flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg border border-[#0A1547]/10 bg-white text-[#0A1547] transition hover:border-[#A380F6]/50 [&::-webkit-details-marker]:hidden">
        <Icon name="more" />
        <span className="sr-only">Actions</span>
      </summary>
      <div className="absolute right-0 z-10 mt-2 w-44 rounded-lg border border-[#0A1547]/10 bg-white p-1.5 shadow-xl">
        <MenuButton icon="arrow" label="Open record" />
        <MenuButton icon="download" label="Download PDF" />
        <MenuButton icon="archive" label="Archive" />
      </div>
    </details>
  );
}

function MenuButton({ icon, label }: { icon: IconName; label: string }) {
  return (
    <button
      type="button"
      className="admin-focus flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-semibold text-[#0A1547]/70 transition hover:bg-[#F8F9FD] hover:text-[#0A1547]"
    >
      <Icon name={icon} size={15} />
      {label}
    </button>
  );
}

function IconButton({
  icon,
  label,
  variant = "secondary",
}: {
  icon: IconName;
  label: string;
  variant?: "primary" | "secondary";
}) {
  const className = variant === "primary"
    ? "admin-focus inline-flex h-10 items-center gap-2 rounded-lg bg-[#A380F6] px-3 text-sm font-bold text-white transition hover:bg-[#906cf2]"
    : "admin-focus inline-flex h-10 items-center gap-2 rounded-lg border border-[#0A1547]/10 bg-white px-3 text-sm font-semibold text-[#0A1547]/78 transition hover:border-[#A380F6]/50 hover:text-[#0A1547]";

  return (
    <button type="button" className={className}>
      <Icon name={icon} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function IconBadge({ compact = false, icon, tone }: { compact?: boolean; icon: IconName; tone: IconTone }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-lg border border-[#0A1547]/10 bg-white ${compact ? "h-9 w-9" : "h-10 w-10"} ${iconToneClassName(tone)} [&_svg]:stroke-[2.6]`}>
      <Icon name={icon} size={compact ? 17 : 18} />
    </span>
  );
}

function StatusChip({ label, tone }: { label: string; tone: StatusTone }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${chipToneClassName(tone)}`}>
      {label}
    </span>
  );
}

function chipToneClassName(tone: StatusTone): string {
  switch (tone) {
    case "success":
      return "border-[#02D99D]/30 bg-[#02D99D]/10 text-[#0A1547]/80";
    case "info":
      return "border-[#02ABE0]/30 bg-[#02ABE0]/10 text-[#0A1547]/75";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-700/90";
    case "danger":
      return "border-red-200 bg-red-50 text-red-700/90";
    case "lilac":
      return "border-[#A380F6]/30 bg-[#A380F6]/10 text-[#0A1547]/80";
    case "neutral":
    default:
      return "border-[#0A1547]/10 bg-[#F8F9FD] text-[#0A1547]/58";
  }
}

function iconToneClassName(tone: IconTone): string {
  switch (tone) {
    case "clients":
      return "text-[#A380F6]";
    case "agreements":
      return "text-[#7C5CF2]";
    case "billing":
      return "text-[#02ABE0]";
    case "secure":
      return "text-[#F59E0B]";
    case "analysis":
      return "text-[#00CFC8]";
    case "reports":
      return "text-[#0A1547]";
    case "success":
      return "text-[#02D99D]";
    case "info":
      return "text-[#02ABE0]";
    case "warning":
      return "text-[#F59E0B]";
    case "danger":
      return "text-[#EF4444]";
    case "lilac":
      return "text-[#A380F6]";
    case "neutral":
    default:
      return "text-[#0A1547]/78";
  }
}

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width={size}
    >
      {iconPath(name)}
    </svg>
  );
}

function iconPath(name: IconName) {
  switch (name) {
    case "activity":
      return <path d="M4 12h4l2-7 4 14 2-7h4" />;
    case "alert":
      return (
        <>
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
          <path d="M10.3 4.3 2.8 17.2A2 2 0 0 0 4.5 20h15a2 2 0 0 0 1.7-2.8L13.7 4.3a2 2 0 0 0-3.4 0Z" />
        </>
      );
    case "archive":
      return (
        <>
          <path d="M4 7h16" />
          <path d="M6 7v12h12V7" />
          <path d="M9 11h6" />
          <path d="M5 4h14v3H5z" />
        </>
      );
    case "arrow":
      return (
        <>
          <path d="M7 17 17 7" />
          <path d="M8 7h9v9" />
        </>
      );
    case "check":
      return <path d="m5 12 4 4L19 6" />;
    case "chevron":
      return <path d="m9 18 6-6-6-6" />;
    case "clock":
      return (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v5l3 2" />
        </>
      );
    case "credit":
      return (
        <>
          <rect height="14" rx="2" width="18" x="3" y="5" />
          <path d="M3 10h18" />
          <path d="M7 15h3" />
        </>
      );
    case "download":
      return (
        <>
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M5 21h14" />
        </>
      );
    case "file":
      return (
        <>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
          <path d="M14 3v5h5" />
        </>
      );
    case "filter":
      return (
        <>
          <path d="M4 6h16" />
          <path d="M7 12h10" />
          <path d="M10 18h4" />
        </>
      );
    case "folder":
      return (
        <>
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
        </>
      );
    case "link":
      return (
        <>
          <path d="M10 13a5 5 0 0 0 7.1 0l1.4-1.4a5 5 0 0 0-7.1-7.1L10.5 5" />
          <path d="M14 11a5 5 0 0 0-7.1 0l-1.4 1.4a5 5 0 0 0 7.1 7.1l.9-.9" />
        </>
      );
    case "lock":
      return (
        <>
          <rect height="11" rx="2" width="16" x="4" y="10" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </>
      );
    case "mail":
      return (
        <>
          <rect height="14" rx="2" width="18" x="3" y="5" />
          <path d="m3 7 9 6 9-6" />
        </>
      );
    case "more":
      return (
        <>
          <circle cx="5" cy="12" r="1" />
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
        </>
      );
    case "pen":
      return (
        <>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </>
      );
    case "plus":
      return (
        <>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </>
      );
    case "search":
      return (
        <>
          <circle cx="11" cy="11" r="7" />
          <path d="m16 16 4 4" />
        </>
      );
    case "shield":
      return <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />;
    case "spark":
      return (
        <>
          <path d="M13 2 9 10l-7 2 7 2 4 8 4-8 7-2-7-2Z" />
        </>
      );
    case "users":
    default:
      return (
        <>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.9" />
          <path d="M16 3.1a4 4 0 0 1 0 7.8" />
        </>
      );
  }
}
