import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const distRoot = path.join(projectRoot, "dist", "public");
const indexPath = path.join(distRoot, "index.html");
const spaShellPath = path.join(distRoot, "spa-shell.html");
const manifestPath = path.join(projectRoot, "render-routes.json");
const SITE_URL = "https://alphasourceconsulting.com";
const LAST_UPDATED = "July 28, 2026";

if (!fs.existsSync(indexPath)) {
  throw new Error(`Build output not found at ${indexPath}. Run Vite build before prerendering.`);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const builtIndexHtml = fs.readFileSync(indexPath, "utf8");
const existingSpaShell = fs.existsSync(spaShellPath) ? fs.readFileSync(spaShellPath, "utf8") : "";
const baseHtml = builtIndexHtml.includes("as-crawler-snapshot") && !existingSpaShell.includes("as-crawler-snapshot")
  ? existingSpaShell
  : builtIndexHtml;

if (!baseHtml || baseHtml.includes("as-crawler-snapshot")) {
  throw new Error("A clean SPA shell is unavailable. Run a fresh Vite build before prerendering.");
}

const navLinks = [
  ["Home", "/"],
  ["Dental Consulting", "/dental-consulting"],
  ["How It Works", "/how-it-works"],
  ["For Dental Groups", "/for-dental-groups"],
  ["Practice Opportunity Review", "/practice-opportunity-review"],
  ["FAQ", "/faq"],
  ["Security", "/security"],
  ["Support", "/support"],
  ["Analyzer", "/analyzer"],
  ["About", "/about"],
];

const faqItems = [
  ["What is alphaSource Consulting?", "alphaSource Consulting is a dental operations consulting firm that combines dental industry experience, practical analysis, and AI-assisted tools to help practices identify priorities and improve operational follow-through."],
  ["Who does alphaSource Consulting work with?", "The services are designed for independent dental practices, growth-oriented offices, dental groups, and multi-location organizations that want clearer operational priorities and practical implementation support."],
  ["What is the Practice Opportunity Review?", "It is a focused, consultant-reviewed diagnostic for one practice or location. The published scope includes a defined file set, AI-assisted analysis, human consultant review, a PDF summary, a 30-minute review call, and a 30-day action plan."],
  ["How is AI used in the consulting workflow?", "AI-assisted tools can organize and analyze approved financial or operational files, surface patterns, and support draft findings. Human consultants review and interpret the output before client-facing recommendations are delivered."],
  ["Can I submit PHI through the public website or analyzer?", "No. Do not submit protected health information, patient records, passwords, payment card data, or confidential files through public contact forms or the public analyzer. Use only the secure workflow provided by the alphaSource Consulting team."],
  ["How are sensitive files transferred?", "When an engagement requires sensitive files, the team provides a separate Secure Upload workflow. Public forms and public analytics are intentionally kept separate from client file-transfer workflows."],
  ["Is a BAA/Privacy Agreement available?", "alphaSource Consulting has an agreement workflow for BAA/Privacy Agreements when appropriate to the engagement. The applicable agreement is generated, reviewed, signed by both parties, and retained through private document workflows."],
  ["Do you work with multi-location dental groups?", "Yes. Multi-location work can include location-level comparison, shared KPI definitions, operating rhythm, revenue-cycle visibility, leadership reporting, and prioritization across the group. Scope is confirmed before an engagement begins."],
  ["Does alphaSource Consulting guarantee financial results?", "No. Consulting and analysis are intended to improve clarity, prioritization, and execution. Outcomes depend on the practice, available data, decisions, and implementation, so financial or operational results are not guaranteed."],
  ["How do I get support?", "Email hello@alphasourceconsulting.com with your name, organization, the email associated with the engagement, and a short description of the issue. Sensitive files should only be sent through an approved secure workflow."],
];

const routeContent = {
  "/": {
    title: "alphaSource Consulting | Dental Operations Consulting",
    description: "alphaSource Consulting helps dental practices improve operational performance through practical consulting, financial analysis, and focused growth initiatives.",
    eyebrow: "Dental operations consulting",
    h1: "Practical operating clarity for dental practices and groups.",
    intro: "alphaSource Consulting combines dental industry experience, AI-assisted analysis, and human consultant review to help practices identify priorities and improve follow-through.",
    sections: [
      ["Consulting services", ["Engagements can address operations analysis, talent strategy, AI integration, practice growth, revenue leakage, accounts receivable, claims, new-patient conversion, and leadership visibility."]],
      ["Ways to engage", ["Start with a Practice Opportunity Review, use a focused sprint for a defined operating issue, or establish an ongoing Operations Intelligence Partner cadence."]],
      ["Public and secure workflows", ["Public contact and analyzer routes are separate from agreements, payments, Secure Uploads, client analysis, and private report workflows."]],
    ],
  },
  "/dental-consulting": {
    title: "Dental Operations Consulting | alphaSource Consulting",
    description: "Get practical dental operations consulting for growth, revenue performance, workflows, leadership alignment, and measurable practice improvement.",
    eyebrow: "Dental consulting services",
    h1: "Expert consulting for modern dental practices.",
    intro: "alphaSource Consulting supports independent practices and dental groups with practical operating analysis, focused recommendations, and implementation support under an agreed scope.",
    sections: [
      ["Operations analysis", ["Review scheduling, billing, patient flow, financial and operational exports, and the highest-leverage improvement opportunities supported by the available evidence."]],
      ["Practice growth", ["Clarify new-patient acquisition, scheduling, follow-up, conversion, service expansion, and the capacity required to support sustainable growth."]],
      ["Talent strategy and AI integration", ["Strengthen hiring, team development, operating workflows, and appropriate use of AI-assisted tools while keeping leadership decisions with the practice."]],
    ],
  },
  "/how-it-works": {
    title: "How Dental Operations Consulting Works | alphaSource Consulting",
    description: "See how alphaSource Consulting scopes dental operations work, handles approved files, reviews evidence, prioritizes findings, and supports implementation.",
    eyebrow: "How it works",
    h1: "From dental practice data to focused operating priorities.",
    intro: "A defined workflow separates scope, agreements, approved data transfer, analysis, human review, client recommendations, and implementation follow-through.",
    sections: [
      ["Confirm the operating question and engagement", ["Begin with the practice, locations, available files, sensitivity requirements, and decision the leadership team needs to make. Select a review, focused sprint, or ongoing advisory scope."]],
      ["Confirm agreements and the approved data path", ["Fees, deliverables, confidentiality, and data handling are documented before sensitive work begins. Public forms stay separate from Secure Uploads and client files."]],
      ["Analyze, validate, and prioritize", ["AI-assisted analysis can surface patterns in approved files. A human consultant reviews the evidence, context, data notes, and client-facing recommendations."]],
      ["Review and follow through", ["The client and consultant review the findings and next actions. Implementation support and ongoing scorecards are included only when part of the agreed scope."]],
    ],
    howTo: [
      "Start with the operating question",
      "Choose the right engagement",
      "Confirm scope and agreements",
      "Use the approved data path",
      "Analyze and validate",
      "Prioritize findings",
      "Review recommendations",
      "Implement and follow through",
    ],
  },
  "/for-dental-groups": {
    title: "Dental Group Operations Consulting | alphaSource Consulting",
    description: "Operational consulting for dental groups and multi-location practices focused on location visibility, shared KPIs, revenue-cycle priorities, and leadership follow-through.",
    eyebrow: "For dental groups",
    h1: "Operational clarity across locations, leaders, and priorities.",
    intro: "Dental group consulting connects location-level evidence, shared operating definitions, leadership decisions, and practical implementation priorities.",
    sections: [
      ["Location-level visibility", ["Create a clearer view of performance, trends, and operating differences across selected locations without adding reporting for its own sake."]],
      ["Shared operating definitions", ["Align leaders on KPI definitions, review cadence, and the business questions each measure should answer."]],
      ["Revenue cycle, growth, and follow-through", ["Review collections, AR, claims, lead flow, conversion, and leadership priorities within the agreed scope."]],
      ["Engagement options", ["Use a one-location diagnostic, a group-focused sprint, or an ongoing advisory cadence. Multi-location scope and pricing are confirmed in writing."]],
    ],
  },
  "/practice-opportunity-review": {
    title: "Practice Opportunity Review | alphaSource Consulting",
    description: "A focused review to identify operational opportunities, prioritize practical next steps, and clarify where a dental practice can improve performance.",
    eyebrow: "Consultant-reviewed diagnostic",
    h1: "Practice Opportunity Review.",
    intro: "A defined diagnostic that turns approved practice files into prioritized findings, a PDF summary, a consultant review call, and a 30-day action plan.",
    sections: [
      ["What is included", ["The current published scope covers one practice or location, a defined file set, AI-assisted analysis, human consultant review, one PDF summary, one 30-minute review call, and one 30-day action plan."]],
      ["What is not included", ["The review does not include unlimited file review, implementation work, ongoing monitoring, custom financial modeling, guaranteed revenue lift, or sensitive document handling outside Secure Upload."]],
      ["Turnaround and next steps", ["Standard files are typically reviewed within three to five business days. Timing depends on file readiness, scope, and data quality."]],
    ],
  },
  "/faq": {
    title: "Dental Consulting FAQ | alphaSource Consulting",
    description: "Answers about dental operations consulting, Practice Opportunity Reviews, focused sprints, AI-assisted analysis, secure files, agreements, billing, and support.",
    eyebrow: "Frequently asked questions",
    h1: "Dental operations consulting questions, answered.",
    intro: "Public answers about engagement fit, reviews, sprints, AI-assisted analysis, deliverables, security boundaries, agreements, billing, and support.",
    sections: [
      ["Common consulting questions", ["Final scope, fees, timing, confidentiality, and deliverables are governed by the applicable written agreement."]],
    ],
    qa: faqItems,
  },
  "/security": {
    title: "Security and Data Handling | alphaSource Consulting",
    description: "Learn how alphaSource Consulting separates public forms, agreements, payments, Secure Uploads, analysis, reports, and sensitive client file workflows.",
    eyebrow: "Security and data handling",
    h1: "Use the right path for public inquiries, agreements, and sensitive files.",
    intro: "alphaSource Consulting separates public website activity from client agreements, billing, secure file transfer, analysis, and private report workflows.",
    sections: [
      ["Public website boundary", ["Do not submit PHI, patient records, passwords, payment card data, or confidential files through public contact forms or the public analyzer."]],
      ["Secure Upload workflow", ["When sensitive files are required, the team provides a separate request and private cloud-storage workflow tied to the client engagement."]],
      ["Private agreements and reports", ["Agreement documents and client reports are stored privately and retrieved through authenticated or short-lived access paths rather than permanent public URLs."]],
      ["Before sharing data", ["Confirm the transfer method with the alphaSource Consulting team whenever file sensitivity or classification is unclear."]],
    ],
  },
  "/support": {
    title: "alphaSource Consulting Support",
    description: "Get help with alphaSource Consulting setup, agreements, payment links, Secure Uploads, analysis workflows, PDF reports, and client records.",
    eyebrow: "Support",
    h1: "Help with consulting setup, agreements, payments, files, and reports.",
    intro: "Identify the workflow involved and contact alphaSource Consulting without sending sensitive information through an unapproved channel.",
    sections: [
      ["Contact support", ["Email hello@alphasourceconsulting.com with your name, organization, client email, the workflow involved, and a short description of the issue."]],
      ["Information not to email", ["Do not email PHI, confidential files, passwords, payment card information, signature data, or raw access tokens."]],
      ["Support areas", ["The team can help with consultation setup, agreements, payment links, Secure Uploads, approved analysis workflows, and existing PDF reports."]],
    ],
    qa: [
      ["What should I do if an agreement signing link is unavailable?", "Contact hello@alphasourceconsulting.com from the signer or client email address and identify the organization. The team can review the agreement status and determine whether a new request is appropriate."],
      ["What should I do if a payment link is expired?", "Contact the team with the client email and offer name. The team can verify the local checkout status and issue a replacement link when appropriate."],
      ["Can I email files to support?", "Do not email PHI, patient records, confidential exports, passwords, or access tokens. Use only the Secure Upload workflow supplied by the team."],
    ],
  },
  "/analyzer": {
    title: "Dental Operations Analyzer | alphaSource Consulting",
    description: "Use the alphaSource Dental Operations Analyzer to submit approved financial and practice operations files for a focused consulting review.",
    eyebrow: "Dental Operations Analyzer",
    h1: "Turn approved practice files into an initial operating analysis.",
    intro: "The public analyzer supports approved financial and operational files and is separate from the Secure Upload workflow used for sensitive or PHI-related documents.",
    sections: [
      ["Approved file intake", ["Follow the on-page file requirements and acknowledgments. Do not submit PHI, patient records, passwords, payment card data, or confidential files through this public workflow."]],
      ["AI-assisted processing", ["The analyzer can organize supported files and surface initial patterns. Paid consulting adds human consultant review, prioritization, and the agreed deliverables."]],
      ["Secure files", ["When sensitive files are needed, stop and request the separate Secure Upload workflow from the alphaSource Consulting team."]],
    ],
  },
  "/about": {
    title: "About alphaSource Consulting | Dental Industry Experience",
    description: "Meet the alphaSource Consulting team and learn how dental operations experience and practical analysis support better practice decisions.",
    eyebrow: "About alphaSource Consulting",
    h1: "Dental industry veterans, operators, and technologists.",
    intro: "The alphaSource Consulting team combines dental operations experience, practical consulting, and technology to help practices focus on the work that matters most.",
    sections: [
      ["Mission", ["Help dental practices reduce administrative friction, understand operating performance, and turn evidence into practical priorities."]],
      ["Leadership and experience", ["The public team page identifies the leaders and backgrounds behind alphaSource Consulting."]],
      ["Technology", ["Technology supports the consulting workflow, while human consultants review client-facing findings and recommendations."]],
    ],
  },
  "/privacy": {
    title: "Privacy Policy | alphaSource Consulting",
    description: "Learn how alphaSource Consulting handles public website analytics, contact form lead capture, privacy choices, and public website requests.",
    eyebrow: "Privacy policy",
    h1: "How alphaSource Consulting handles public website information.",
    intro: "The policy covers public analytics choices, contact lead capture, service providers, retention, public form boundaries, and privacy requests.",
    sections: [
      ["Public analytics", ["Optional first-party analytics is disabled until the visitor allows it. Analytics events are designed not to include contact details, messages, passwords, file contents, agreement details, or payment data."]],
      ["Contact information", ["Business contact details submitted through public forms are used to respond to inquiries and maintain appropriate business records."]],
      ["Sensitive information", ["Do not submit PHI, patient records, passwords, payment card information, or confidential files through public contact forms."]],
    ],
  },
  "/terms": {
    title: "Website Terms | alphaSource Consulting",
    description: "Review the public website terms for alphaSource Consulting.",
    eyebrow: "Website terms",
    h1: "Terms for using the public alphaSource Consulting website.",
    intro: "Public website content is informational and does not replace a written consulting agreement.",
    sections: [
      ["Public website use", ["Use the public site lawfully and do not interfere with its operation or attempt to access restricted systems."]],
      ["Informational content", ["Public content is not a guarantee of results, professional advice for a specific practice, or a substitute for a written engagement."]],
      ["Engagements and confidential information", ["Consulting scope, fees, deliverables, confidentiality, and data handling are governed by the applicable written agreement and approved workflows."]],
    ],
  },
};

for (const route of manifest.publicRoutes) {
  const content = routeContent[route];
  if (!content) throw new Error(`Missing prerender content for ${route}`);
  writeRoute(route, renderRouteHtml(baseHtml, route, content));
}

writeSpaShell();
writeRoutingFile();
console.log(`Prerendered ${manifest.publicRoutes.length} public routes in ${distRoot}.`);

function renderRouteHtml(html, route, content) {
  const schemas = createSchemas(route, content);
  let next = html.replace(/<div id="root"><\/div>/, `<div id="root">${renderSnapshot(route, content)}</div>`);
  next = replaceTitle(next, content.title);
  next = replaceOrInsert(next, /<meta\s+name=["']description["'][\s\S]*?>/i, `<meta name="description" content="${escapeAttr(content.description)}" />`);
  next = replaceOrInsert(next, /<meta\s+name=["']robots["'][\s\S]*?>/i, '<meta name="robots" content="index,follow" />');
  next = replaceOrInsert(next, /<link\s+rel=["']canonical["'][\s\S]*?>/i, `<link rel="canonical" href="${routeUrl(route)}" />`);
  next = replaceOrInsert(next, /<meta\s+property=["']og:type["'][\s\S]*?>/i, '<meta property="og:type" content="website" />');
  next = replaceOrInsert(next, /<meta\s+property=["']og:site_name["'][\s\S]*?>/i, '<meta property="og:site_name" content="alphaSource Consulting" />');
  next = replaceOrInsert(next, /<meta\s+property=["']og:title["'][\s\S]*?>/i, `<meta property="og:title" content="${escapeAttr(content.title)}" />`);
  next = replaceOrInsert(next, /<meta\s+property=["']og:description["'][\s\S]*?>/i, `<meta property="og:description" content="${escapeAttr(content.description)}" />`);
  next = replaceOrInsert(next, /<meta\s+property=["']og:url["'][\s\S]*?>/i, `<meta property="og:url" content="${routeUrl(route)}" />`);
  next = replaceOrInsert(next, /<meta\s+property=["']og:image["'][\s\S]*?>/i, `<meta property="og:image" content="${SITE_URL}/opengraph.jpg" />`);
  next = replaceOrInsert(next, /<meta\s+name=["']twitter:card["'][\s\S]*?>/i, '<meta name="twitter:card" content="summary_large_image" />');
  next = replaceOrInsert(next, /<meta\s+name=["']twitter:title["'][\s\S]*?>/i, `<meta name="twitter:title" content="${escapeAttr(content.title)}" />`);
  next = replaceOrInsert(next, /<meta\s+name=["']twitter:description["'][\s\S]*?>/i, `<meta name="twitter:description" content="${escapeAttr(content.description)}" />`);
  next = replaceOrInsert(next, /<meta\s+name=["']twitter:image["'][\s\S]*?>/i, `<meta name="twitter:image" content="${SITE_URL}/opengraph.jpg" />`);
  const schemaTags = schemas
    .map((schema, index) => `<script type="application/ld+json" data-prerender-jsonld="${index}">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script>`)
    .join("\n    ");
  return next.replace("</head>", `    ${snapshotStyles()}\n    ${schemaTags}\n  </head>`);
}

function createSchemas(route, content) {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "alphaSource Consulting",
    legalName: "alphaSource Network, LLC",
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/alpha-symbol.png`,
    contactPoint: {
      "@type": "ContactPoint",
      email: "hello@alphasourceconsulting.com",
      contactType: "sales and support",
    },
  };
  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: content.title,
      description: content.description,
      url: routeUrl(route),
      isPartOf: { "@type": "WebSite", name: "alphaSource Consulting", url: `${SITE_URL}/` },
      publisher: organization,
    },
  ];
  if (route === "/") schemas.unshift(organization);
  if (content.qa) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: content.qa.map(([question, answer]) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      })),
    });
  }
  if (content.howTo) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: content.h1,
      step: content.howTo.map((name, index) => ({
        "@type": "HowToStep",
        position: index + 1,
        name,
      })),
    });
  }
  return schemas;
}

function renderSnapshot(route, content) {
  const sectionHtml = content.sections
    .map(([heading, paragraphs]) => `
        <section class="as-snapshot-section">
          <h2>${escapeHtml(heading)}</h2>
          ${paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("\n          ")}
        </section>`)
    .join("\n");
  const qaHtml = content.qa
    ? `
        <section class="as-snapshot-section">
          <h2>Questions and answers</h2>
          <div class="as-faq-list">
            ${content.qa.map(([question, answer]) => `<article><h3>${escapeHtml(question)}</h3><p>${escapeHtml(answer)}</p></article>`).join("\n            ")}
          </div>
        </section>`
    : "";
  return `
    <div class="as-crawler-snapshot" data-public-prerender-route="${escapeAttr(route)}">
      <nav class="as-snapshot-nav" aria-label="Public navigation">
        <a class="as-brand" href="/">alphaSource Consulting</a>
        <div>${navLinks.map(([label, href]) => `<a href="${href}">${escapeHtml(label)}</a>`).join("")}</div>
      </nav>
      <main>
        <section class="as-snapshot-hero">
          <p class="as-eyebrow">${escapeHtml(content.eyebrow)}</p>
          <h1>${escapeHtml(content.h1)}</h1>
          <p class="as-intro">${escapeHtml(content.intro)}</p>
          <p class="as-updated">Last updated ${LAST_UPDATED}</p>
        </section>
        ${sectionHtml}
        ${qaHtml}
        <section class="as-snapshot-section as-related-links">
          <h2>Related public resources</h2>
          <nav aria-label="Related public resources">
            ${navLinks.filter(([, href]) => href !== route).map(([label, href]) => `<a href="${href}">${escapeHtml(label)}</a>`).join("")}
          </nav>
        </section>
      </main>
      <footer class="as-snapshot-footer">
        <strong>alphaSource Consulting</strong>
        <p>Dental operations consulting, focused reviews, and practical analysis support.</p>
        <a href="mailto:hello@alphasourceconsulting.com">hello@alphasourceconsulting.com</a>
        <nav aria-label="Legal links"><a href="/privacy">Privacy</a><a href="/terms">Terms</a></nav>
      </footer>
    </div>`;
}

function snapshotStyles() {
  return `<style data-prerender-styles>
      .as-crawler-snapshot{font-family:Raleway,Arial,sans-serif;color:#0A1547;background:#F8F9FD;line-height:1.6}
      .as-crawler-snapshot a{color:#6F4FE4;text-decoration:none}
      .as-snapshot-nav,.as-snapshot-footer{display:flex;flex-wrap:wrap;gap:1rem;justify-content:space-between;padding:1.25rem 2rem;background:#fff;border-bottom:1px solid rgba(10,21,71,.1)}
      .as-snapshot-nav div,.as-snapshot-footer nav{display:flex;flex-wrap:wrap;gap:.8rem}
      .as-brand{font-weight:800;color:#0A1547!important}
      .as-snapshot-hero,.as-snapshot-section{max-width:960px;margin:0 auto;padding:2.5rem 1.5rem}
      .as-snapshot-hero h1{max-width:880px;margin:.4rem 0 1rem;font-size:clamp(2.25rem,5vw,4rem);line-height:1.08;letter-spacing:0}
      .as-eyebrow{margin:0;color:#7C5CF2;font-size:.85rem;font-weight:800;text-transform:uppercase}
      .as-intro{max-width:760px;font-size:1.08rem;color:rgba(10,21,71,.68)}
      .as-updated{font-size:.9rem;font-weight:700;color:rgba(10,21,71,.48)}
      .as-snapshot-section{background:#fff;border-top:1px solid rgba(10,21,71,.08)}
      .as-snapshot-section h2{margin:0 0 .75rem;font-size:1.55rem;line-height:1.2}
      .as-snapshot-section h3{margin:0 0 .4rem;font-size:1rem}
      .as-snapshot-section p{margin:.5rem 0;color:rgba(10,21,71,.68)}
      .as-faq-list{display:grid;gap:1rem;margin-top:1.25rem}
      .as-faq-list article{padding:1rem;border:1px solid rgba(10,21,71,.1);border-radius:8px;background:#F8F9FD}
      .as-related-links nav{display:flex;flex-wrap:wrap;gap:.65rem}
      .as-related-links a{border:1px solid rgba(10,21,71,.12);border-radius:999px;padding:.5rem .8rem;background:#fff;font-weight:700}
      .as-snapshot-footer{border-top:1px solid rgba(10,21,71,.1);border-bottom:0;background:#0A1547;color:#fff}
      .as-snapshot-footer p{margin:.35rem 0;color:rgba(255,255,255,.7)}
      .as-snapshot-footer a{color:#c7b4ff}
    </style>`;
}

function writeRoute(route, html) {
  const target = route === "/"
    ? indexPath
    : path.join(distRoot, ...route.split("/").filter(Boolean), "index.html");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, html);
}

function writeSpaShell() {
  let shell = replaceTitle(baseHtml, "alphaSource Consulting");
  shell = replaceOrInsert(shell, /<meta\s+name=["']robots["'][\s\S]*?>/i, '<meta name="robots" content="noindex,nofollow,noarchive" />');
  shell = shell.replace(/<link\s+rel=["']canonical["'][\s\S]*?>/i, "");
  shell = shell.replace(/<meta\s+name=["']description["'][\s\S]*?>/i, '<meta name="description" content="alphaSource Consulting secure application workflow." />');
  fs.writeFileSync(spaShellPath, shell);
}

function writeRoutingFile() {
  const rules = [
    "# Code-owned Render static routing. Source: render-routes.json.",
    ...manifest.publicRedirects.map(formatRule),
    ...manifest.publicRewrites.map(formatRule),
    ...manifest.dynamicSpaRewrites.map(formatRule),
    formatRule(manifest.catchAll),
    "",
  ];
  fs.writeFileSync(path.join(distRoot, "_redirects"), rules.join("\n"));
}

function formatRule(rule) {
  if (!rule?.source || !rule?.destination || !rule?.status) {
    throw new Error(`Invalid routing rule: ${JSON.stringify(rule)}`);
  }
  return `${rule.source} ${rule.destination} ${rule.status}`;
}

function routeUrl(route) {
  return route === "/" ? `${SITE_URL}/` : `${SITE_URL}${route}`;
}

function replaceTitle(html, title) {
  const tag = `<title>${escapeHtml(title)}</title>`;
  return /<title>[\s\S]*?<\/title>/.test(html)
    ? html.replace(/<title>[\s\S]*?<\/title>/, tag)
    : html.replace("</head>", `    ${tag}\n  </head>`);
}

function replaceOrInsert(html, pattern, tag) {
  return pattern.test(html)
    ? html.replace(pattern, tag)
    : html.replace("</head>", `    ${tag}\n  </head>`);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}
