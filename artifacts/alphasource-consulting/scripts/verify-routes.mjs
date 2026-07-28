import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const distRoot = path.join(projectRoot, "dist", "public");
const manifest = JSON.parse(fs.readFileSync(path.join(projectRoot, "render-routes.json"), "utf8"));
const publicSiteContent = JSON.parse(
  fs.readFileSync(path.join(projectRoot, "src", "lib", "publicSiteContent.json"), "utf8"),
);
const SITE_URL = "https://alphasourceconsulting.com";
const errors = [];
const specializedTypes = {
  "/dental-consulting": "Service",
  "/practice-opportunity-review": "Service",
  "/for-dental-groups": "Service",
  "/analyzer": "SoftwareApplication",
  "/support": "ContactPage",
};
const faqCounts = {
  "/": publicSiteContent.homeFaqQuestions.length,
  "/faq": publicSiteContent.publicFaqSections.flatMap((section) => section.items).length,
  "/practice-opportunity-review": publicSiteContent.practiceReviewFaqItems.length,
  "/support": publicSiteContent.publicSupportQuestions.length,
};

for (const route of manifest.publicRoutes) {
  const filePath = route === "/"
    ? path.join(distRoot, "index.html")
    : path.join(distRoot, ...route.split("/").filter(Boolean), "index.html");
  if (!fs.existsSync(filePath)) {
    errors.push(`Missing prerendered route ${route}: ${filePath}`);
    continue;
  }
  const html = fs.readFileSync(filePath, "utf8");
  for (const required of [
    `data-public-prerender-route="${route}"`,
    '<meta name="robots" content="index,follow"',
    '<link rel="canonical"',
    'property="og:locale" content="en_US"',
    'type="application/ld+json"',
    '<script type="module"',
  ]) {
    if (!html.includes(required)) errors.push(`${route} missing ${required}`);
  }
  if (html.includes("fonts.googleapis.com") || html.includes("fonts.gstatic.com")) {
    errors.push(`${route} contains a render-blocking external font dependency`);
  }
  const schemas = [];
  for (const match of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      schemas.push(JSON.parse(match[1]));
    } catch {
      errors.push(`${route} contains invalid JSON-LD`);
    }
  }
  const schemaTypes = schemas.map((schema) => schema["@type"]);
  const pageSchema = schemas.find((schema) => ["WebPage", "AboutPage"].includes(schema["@type"]));
  if (pageSchema?.dateModified !== publicSiteContent.routeLastModified[route]) {
    errors.push(`${route} has stale or missing dateModified`);
  }
  if (route !== "/" && !schemaTypes.includes("BreadcrumbList")) {
    errors.push(`${route} is missing BreadcrumbList schema`);
  }
  if (specializedTypes[route] && !schemaTypes.includes(specializedTypes[route])) {
    errors.push(`${route} is missing ${specializedTypes[route]} schema`);
  }
  if (faqCounts[route]) {
    const faqSchema = schemas.find((schema) => schema["@type"] === "FAQPage");
    if (faqSchema?.mainEntity?.length !== faqCounts[route]) {
      errors.push(`${route} must include ${faqCounts[route]} FAQ questions`);
    }
  }
  if (route === "/") {
    for (const requiredCopy of [
      "Built for People, Powered by AI",
      "Turn practice files into operational priorities",
      "Who this is for",
      "What you get",
      "Who we are",
      "Free Analyzer",
      "Practice Opportunity Review",
      "Operations Intelligence Partner",
    ]) {
      if (!html.includes(requiredCopy)) errors.push(`/ crawler snapshot is missing ${requiredCopy}`);
    }
  }
  for (const disallowedType of ["ProfessionalService", "MedicalBusiness", "Dentist", "AggregateRating"]) {
    if (schemaTypes.includes(disallowedType)) {
      errors.push(`${route} contains unsupported or unverified ${disallowedType} schema`);
    }
  }
  if (route === "/about") {
    const personSchemas = schemas.filter((schema) => schema["@type"] === "Person");
    if (personSchemas.length !== publicSiteContent.teamMembers.length) {
      errors.push(`/about must include ${publicSiteContent.teamMembers.length} published team Person schemas`);
    }
    for (const member of publicSiteContent.teamMembers) {
      const person = personSchemas.find((schema) => schema.name === member.name);
      if (!person?.sameAs?.includes(member.linkedIn) || !html.includes(member.linkedIn)) {
        errors.push(`/about is missing the verified LinkedIn identity for ${member.name}`);
      }
    }
  }
}

const localFontPath = path.join(distRoot, "fonts", "raleway-latin-variable.woff2");
if (!fs.existsSync(localFontPath)) errors.push("Missing self-hosted Raleway font");

const robotsPath = path.join(distRoot, "robots.txt");
if (!fs.existsSync(robotsPath)) {
  errors.push("Missing robots.txt");
} else {
  const robots = fs.readFileSync(robotsPath, "utf8");
  for (const userAgent of ["OAI-SearchBot", "ChatGPT-User", "GPTBot", "Claude-SearchBot", "Claude-User", "ClaudeBot", "PerplexityBot"]) {
    if (!robots.includes(`User-agent: ${userAgent}\nAllow: /`)) {
      errors.push(`robots.txt does not explicitly allow ${userAgent}`);
    }
  }
  for (const privatePath of ["/agreements/sign/", "/payment-success", "/payment-cancel"]) {
    if (!robots.includes(`Disallow: ${privatePath}`)) errors.push(`robots.txt does not protect ${privatePath}`);
  }
}

const redirectsPath = path.join(distRoot, "_redirects");
if (!fs.existsSync(redirectsPath)) {
  errors.push("Missing generated _redirects file");
} else {
  const actualRules = fs.readFileSync(redirectsPath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  const expectedRules = [
    ...manifest.publicRedirects,
    ...manifest.publicRewrites,
    ...manifest.dynamicSpaRewrites,
  ].map((rule) => `${rule.source} ${rule.destination} ${rule.status}`);
  if (actualRules.length !== expectedRules.length) {
    errors.push(`Routing rule count mismatch: expected ${expectedRules.length}, found ${actualRules.length}`);
  }
  expectedRules.forEach((rule, index) => {
    if (actualRules[index] !== rule) errors.push(`Routing rule ${index + 1} mismatch`);
  });
}

const spaShellPath = path.join(distRoot, "spa-shell.html");
if (!fs.existsSync(spaShellPath)) {
  errors.push("Missing noindex SPA shell");
} else {
  const spaShell = fs.readFileSync(spaShellPath, "utf8");
  if (!spaShell.includes('content="noindex,nofollow,noarchive"')) errors.push("SPA shell is not noindex");
  if (spaShell.includes("as-crawler-snapshot")) errors.push("SPA shell contains a public crawler snapshot");
  if (!spaShell.includes('<script type="module"')) errors.push("SPA shell is missing the application module");
}

const sitemapPath = path.join(distRoot, "sitemap.xml");
if (!fs.existsSync(sitemapPath)) {
  errors.push("Missing generated sitemap.xml");
} else {
  const sitemap = fs.readFileSync(sitemapPath, "utf8");
  for (const route of manifest.publicRoutes) {
    const routeUrl = route === "/" ? `${SITE_URL}/` : `${SITE_URL}${route}`;
    const expected = `<loc>${routeUrl}</loc>\n    <lastmod>${publicSiteContent.routeLastModified[route]}</lastmod>`;
    if (!sitemap.includes(expected)) errors.push(`Sitemap entry is stale or missing for ${route}`);
  }
}

for (const privateDirectory of ["agreements", "payment-success", "payment-cancel"]) {
  const privatePath = path.join(distRoot, privateDirectory);
  if (fs.existsSync(privatePath)) errors.push(`Private/dynamic snapshot directory should not exist: ${privatePath}`);
}

if (errors.length) {
  console.error("Public route verification failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Verified ${manifest.publicRoutes.length} public route snapshots, schema, sitemap, and routing rules.`);
