type JsonLd = Record<string, unknown> | Array<Record<string, unknown>>;

export type SeoConfig = {
  title: string;
  description: string;
  path?: string;
  robots: string;
  jsonLd?: JsonLd;
};

const siteUrl = "https://alphasourceconsulting.com";
const organization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "alphaSource Consulting",
  legalName: "alphaSource Network, LLC",
  url: `${siteUrl}/`,
  logo: `${siteUrl}/alpha-symbol.png`,
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
  name: "alphaSource Consulting",
  url: `${siteUrl}/`,
  publisher: { "@type": "Organization", name: "alphaSource Consulting", url: `${siteUrl}/` },
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
    isPartOf: website,
    publisher: organization,
  };
}

const configs: Record<string, Omit<SeoConfig, "robots">> = {
  "/": {
    title: "alphaSource Consulting | Dental Operations Consulting",
    description: "alphaSource Consulting helps dental practices improve operational performance through practical consulting, financial analysis, and focused growth initiatives.",
    path: "/",
    jsonLd: [organization, website, pageSchema("/", "alphaSource Consulting", "Dental operations consulting and practical analysis support for dental practices.")],
  },
  "/dental-consulting": {
    title: "Dental Operations Consulting | alphaSource Consulting",
    description: "Get practical dental operations consulting for growth, revenue performance, workflows, leadership alignment, and measurable practice improvement.",
    path: "/dental-consulting",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "ProfessionalService",
        name: "alphaSource Consulting",
        url: canonical("/dental-consulting"),
        description: "Dental operations consulting for independent practices, dental groups, and multi-location organizations.",
        provider: organization,
        serviceType: "Dental operations consulting",
      },
      pageSchema("/dental-consulting", "Dental Operations Consulting", "Dental consulting services focused on operational performance, growth, and practical follow-through."),
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
        provider: organization,
        url: canonical("/practice-opportunity-review"),
      },
      pageSchema("/practice-opportunity-review", "Practice Opportunity Review", "A focused dental practice review that identifies operational opportunities and prioritized next steps."),
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
        provider: organization,
        description: "A web-based intake and analysis workflow for approved dental practice financial and operations files.",
      },
      pageSchema("/analyzer", "Dental Operations Analyzer", "Public intake page for approved dental practice financial and operations analysis."),
    ],
  },
  "/about": {
    title: "About alphaSource Consulting | Dental Industry Experience",
    description: "Meet the alphaSource Consulting team and learn how dental operations experience and practical analysis support better practice decisions.",
    path: "/about",
    jsonLd: pageSchema("/about", "About alphaSource Consulting", "Dental industry experience and practical operational consulting from alphaSource Consulting."),
  },
  "/privacy": {
    title: "Privacy Policy | alphaSource Consulting",
    description: "Learn how alphaSource Consulting handles public website analytics, contact form lead capture, privacy choices, and public website requests.",
    path: "/privacy",
    jsonLd: pageSchema("/privacy", "Privacy Policy", "Public website privacy policy for alphaSource Consulting."),
  },
  "/terms": {
    title: "Website Terms | alphaSource Consulting",
    description: "Review the public website terms for alphaSource Consulting.",
    path: "/terms",
    jsonLd: pageSchema("/terms", "Website Terms", "Public website terms for alphaSource Consulting."),
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
