import {
  practiceReviewFaqItems,
  publicFaqItems,
  publicRouteModifiedIso,
  publicSupportQuestions,
  publicTeamMembers,
} from "@/lib/publicContent";

type JsonLd = Record<string, unknown> | Array<Record<string, unknown>>;

export type SeoConfig = {
  title: string;
  description: string;
  path?: string;
  robots: string;
  jsonLd?: JsonLd;
};

const siteUrl = "https://alphasourceconsulting.com";
const organizationId = `${siteUrl}/#organization`;
const websiteId = `${siteUrl}/#website`;
const teamMembers = publicTeamMembers.map((member) => ({
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": `${siteUrl}/about#${member.name.toLowerCase().replace(/\s+/g, "-")}`,
  name: member.name,
  jobTitle: member.role,
  description: member.bio,
  image: `${siteUrl}/${member.photo}`,
  sameAs: [member.linkedIn],
  worksFor: { "@id": organizationId },
}));
const organization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": organizationId,
  name: "alphaSource Consulting",
  legalName: "alphaSource Network, LLC",
  url: `${siteUrl}/`,
  logo: `${siteUrl}/alpha-symbol.png`,
  description: "Dental operations consulting and practical analysis support for independent practices and dental groups.",
  areaServed: { "@type": "Country", name: "United States" },
  knowsAbout: [
    "Dental operations consulting",
    "Dental practice financial analysis",
    "Revenue cycle operations",
    "Multi-location dental operations",
    "Dental practice growth strategy",
  ],
  founder: teamMembers.slice(0, 2).map((member) => ({ "@id": member["@id"] })),
  employee: teamMembers.slice(2).map((member) => ({ "@id": member["@id"] })),
  contactPoint: {
    "@type": "ContactPoint",
    email: "hello@alphasourceconsulting.com",
    contactType: "sales and support",
  },
  sameAs: ["https://www.linkedin.com/company/alphasource-consulting"],
};

const website = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": websiteId,
  name: "alphaSource Consulting",
  url: `${siteUrl}/`,
  publisher: { "@id": organizationId },
};

function canonical(path = "/"): string {
  return path === "/" ? `${siteUrl}/` : `${siteUrl}${path}`;
}

function pageSchema(path: string, name: string, description: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name,
    description,
    url: canonical(path),
    dateModified: publicRouteModifiedIso(path),
    isPartOf: website,
    publisher: organization,
  };
}

function breadcrumbSchema(items: Array<[string, string]>): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map(([name, path], index) => ({
      "@type": "ListItem",
      position: index + 1,
      name,
      item: canonical(path),
    })),
  };
}

const configs: Record<string, Omit<SeoConfig, "robots">> = {
  "/": {
    title: "alphaSource Consulting | Dental Operations Consulting",
    description: "alphaSource Consulting helps dental practices improve operational performance through practical consulting, financial analysis, and focused growth initiatives.",
    path: "/",
    jsonLd: [
      organization,
      website,
      pageSchema("/", "alphaSource Consulting", "Dental operations consulting and practical analysis support for dental practices."),
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: publicFaqItems.slice(0, 3).map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  },
  "/dental-consulting": {
    title: "Dental Operations Consulting | alphaSource Consulting",
    description: "Get practical dental operations consulting for growth, revenue performance, workflows, leadership alignment, and measurable practice improvement.",
    path: "/dental-consulting",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Service",
        name: "Dental operations consulting",
        url: canonical("/dental-consulting"),
        description: "Dental operations consulting for independent practices, dental groups, and multi-location organizations.",
        provider: { "@id": organizationId },
        serviceType: "Dental operations consulting",
        areaServed: { "@type": "Country", name: "United States" },
        audience: {
          "@type": "BusinessAudience",
          audienceType: "Independent dental practices, dental groups, and multi-location dental organizations",
        },
      },
      pageSchema("/dental-consulting", "Dental Operations Consulting", "Dental consulting services focused on operational performance, growth, and practical follow-through."),
      breadcrumbSchema([["Home", "/"], ["Dental Consulting", "/dental-consulting"]]),
    ],
  },
  "/practice-opportunity-review": {
    title: "Practice Opportunity Review | alphaSource Consulting",
    description: "A focused review to identify operational opportunities, prioritize practical next steps, and clarify where a dental practice can improve performance.",
    path: "/practice-opportunity-review",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Service",
        name: "Practice Opportunity Review",
        serviceType: "Dental practice operations review",
        provider: { "@id": organizationId },
        url: canonical("/practice-opportunity-review"),
      },
      pageSchema("/practice-opportunity-review", "Practice Opportunity Review", "A focused dental practice review that identifies operational opportunities and prioritized next steps."),
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: practiceReviewFaqItems.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
      breadcrumbSchema([["Home", "/"], ["Practice Opportunity Review", "/practice-opportunity-review"]]),
    ],
  },
  "/how-it-works": {
    title: "How Dental Operations Consulting Works | alphaSource Consulting",
    description: "See how alphaSource Consulting scopes dental operations work, handles approved files, reviews evidence, prioritizes findings, and supports implementation.",
    path: "/how-it-works",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: "How an alphaSource Consulting engagement works",
        description: "A practical workflow for scoping, data handling, analysis, consultant review, recommendations, and implementation follow-through.",
        step: [
          "Start with the operating question",
          "Choose the right engagement",
          "Confirm scope and agreements",
          "Use the approved data path",
          "Analyze and validate",
          "Prioritize findings",
          "Review recommendations",
          "Implement and follow through",
        ].map((name, index) => ({
          "@type": "HowToStep",
          position: index + 1,
          name,
        })),
      },
      pageSchema("/how-it-works", "How alphaSource Consulting Works", "The alphaSource Consulting workflow from scope confirmation through operating recommendations and follow-through."),
      breadcrumbSchema([["Home", "/"], ["How It Works", "/how-it-works"]]),
    ],
  },
  "/for-dental-groups": {
    title: "Dental Group Operations Consulting | alphaSource Consulting",
    description: "Operational consulting for dental groups and multi-location practices focused on location visibility, shared KPIs, revenue-cycle priorities, and leadership follow-through.",
    path: "/for-dental-groups",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Service",
        name: "Dental group operations consulting",
        serviceType: "Multi-location dental operations consulting",
        provider: { "@id": organizationId },
        audience: {
          "@type": "BusinessAudience",
          audienceType: "Dental groups and multi-location dental practices",
        },
        url: canonical("/for-dental-groups"),
      },
      pageSchema("/for-dental-groups", "Dental Group Operations Consulting", "Operational consulting for dental groups and multi-location dental practices."),
      breadcrumbSchema([["Home", "/"], ["For Dental Groups", "/for-dental-groups"]]),
    ],
  },
  "/faq": {
    title: "Dental Consulting FAQ | alphaSource Consulting",
    description: "Answers about dental operations consulting, Practice Opportunity Reviews, focused sprints, AI-assisted analysis, secure files, agreements, billing, and support.",
    path: "/faq",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: publicFaqItems.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      },
      pageSchema("/faq", "alphaSource Consulting FAQ", "Public questions and answers about alphaSource Consulting services and workflows."),
      breadcrumbSchema([["Home", "/"], ["FAQ", "/faq"]]),
    ],
  },
  "/security": {
    title: "Security and Data Handling | alphaSource Consulting",
    description: "Learn how alphaSource Consulting separates public forms, agreements, payments, Secure Uploads, analysis, reports, and sensitive client file workflows.",
    path: "/security",
    jsonLd: [
      pageSchema("/security", "Security and Data Handling", "Public overview of alphaSource Consulting data-handling boundaries and workflow safeguards."),
      breadcrumbSchema([["Home", "/"], ["Security and Data Handling", "/security"]]),
    ],
  },
  "/support": {
    title: "alphaSource Consulting Support",
    description: "Get help with alphaSource Consulting setup, agreements, payment links, Secure Uploads, analysis workflows, PDF reports, and client records.",
    path: "/support",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "ContactPage",
        name: "alphaSource Consulting Support",
        url: canonical("/support"),
        mainEntity: organization,
      },
      pageSchema("/support", "alphaSource Consulting Support", "Public support for alphaSource Consulting workflows."),
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: publicSupportQuestions.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
      breadcrumbSchema([["Home", "/"], ["Support", "/support"]]),
    ],
  },
  "/analyzer": {
    title: "Dental Operations Analyzer | alphaSource Consulting",
    description: "Use the alphaSource Dental Operations Analyzer to submit approved financial and practice operations files for a focused consulting review.",
    path: "/analyzer",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "Dental Operations Analyzer",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: canonical("/analyzer"),
        provider: { "@id": organizationId },
        description: "A web-based intake and analysis workflow for approved dental practice financial and operations files.",
      },
      pageSchema("/analyzer", "Dental Operations Analyzer", "Public intake page for approved dental practice financial and operations analysis."),
      breadcrumbSchema([["Home", "/"], ["Dental Operations Analyzer", "/analyzer"]]),
    ],
  },
  "/about": {
    title: "About alphaSource Consulting | Dental Industry Experience",
    description: "Meet the alphaSource Consulting team and learn how dental operations experience and practical analysis support better practice decisions.",
    path: "/about",
    jsonLd: [
      organization,
      ...teamMembers,
      {
        "@context": "https://schema.org",
        "@type": "AboutPage",
        name: "About alphaSource Consulting",
        description: "Dental industry experience and practical operational consulting from alphaSource Consulting.",
        url: canonical("/about"),
        dateModified: publicRouteModifiedIso("/about"),
        isPartOf: { "@id": websiteId },
        publisher: { "@id": organizationId },
        mainEntity: { "@id": organizationId },
        about: teamMembers.map((member) => ({ "@id": member["@id"] })),
      },
      breadcrumbSchema([["Home", "/"], ["About", "/about"]]),
    ],
  },
  "/privacy": {
    title: "Privacy Policy | alphaSource Consulting",
    description: "Learn how alphaSource Consulting handles public website analytics, contact form lead capture, privacy choices, and public website requests.",
    path: "/privacy",
    jsonLd: [
      pageSchema("/privacy", "Privacy Policy", "Public website privacy policy for alphaSource Consulting."),
      breadcrumbSchema([["Home", "/"], ["Privacy Policy", "/privacy"]]),
    ],
  },
  "/terms": {
    title: "Website Terms | alphaSource Consulting",
    description: "Review the public website terms for alphaSource Consulting.",
    path: "/terms",
    jsonLd: [
      pageSchema("/terms", "Website Terms", "Public website terms for alphaSource Consulting."),
      breadcrumbSchema([["Home", "/"], ["Website Terms", "/terms"]]),
    ],
  },
};

const noIndex: SeoConfig = {
  title: "alphaSource Consulting",
  description: "alphaSource Consulting application page.",
  robots: "noindex,nofollow,noarchive",
};

export function canonicalUrl(path: string): string {
  return canonical(path);
}

export function getSeoConfig(pathname: string): SeoConfig {
  const path = String(pathname || "/").split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";
  const config = configs[path];
  return config ? { ...config, robots: "index,follow" } : noIndex;
}
