import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const distRoot = path.join(projectRoot, "dist", "public");
const manifest = JSON.parse(fs.readFileSync(path.join(projectRoot, "render-routes.json"), "utf8"));
const errors = [];

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
    'type="application/ld+json"',
    '<script type="module"',
  ]) {
    if (!html.includes(required)) errors.push(`${route} missing ${required}`);
  }
  if (html.includes("fonts.googleapis.com") || html.includes("fonts.gstatic.com")) {
    errors.push(`${route} contains a render-blocking external font dependency`);
  }
  for (const match of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      JSON.parse(match[1]);
    } catch {
      errors.push(`${route} contains invalid JSON-LD`);
    }
  }
  if (route === "/about" && (html.match(/"@type":"Person"/g) || []).length !== 4) {
    errors.push("/about must include four published team Person schemas");
  }
}

const localFontPath = path.join(distRoot, "fonts", "raleway-latin-variable.woff2");
if (!fs.existsSync(localFontPath)) errors.push("Missing self-hosted Raleway font");

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

for (const privateDirectory of ["agreements", "payment-success", "payment-cancel"]) {
  const privatePath = path.join(distRoot, privateDirectory);
  if (fs.existsSync(privatePath)) errors.push(`Private/dynamic snapshot directory should not exist: ${privatePath}`);
}

if (errors.length) {
  console.error("Public route verification failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Verified ${manifest.publicRoutes.length} public route snapshots and generated routing rules.`);
