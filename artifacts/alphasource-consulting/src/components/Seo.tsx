import { useEffect } from "react";
import { canonicalUrl, getSeoConfig } from "@/lib/seo";

function upsertMeta(selector: string, attributes: Record<string, string>, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    Object.entries(attributes).forEach(([key, value]) => element?.setAttribute(key, value));
    document.head.appendChild(element);
  }
  element.content = content;
}

function upsertCanonical(href: string | null) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!href) {
    element?.remove();
    return;
  }
  if (!element) {
    element = document.createElement("link");
    element.rel = "canonical";
    document.head.appendChild(element);
  }
  element.href = href;
}

function upsertJsonLd(data: unknown) {
  const idPrefix = "alphasource-consulting-route-jsonld";
  document.querySelectorAll('script[data-prerender-jsonld]').forEach((element) => element.remove());
  const existing = Array.from(document.querySelectorAll<HTMLScriptElement>(`script[id^="${idPrefix}"]`));
  const entries = Array.isArray(data) ? data : data ? [data] : [];
  entries.forEach((entry, index) => {
    const id = index === 0 ? idPrefix : `${idPrefix}-${index}`;
    let element = document.getElementById(id) as HTMLScriptElement | null;
    if (!element) {
      element = document.createElement("script");
      element.id = id;
      element.type = "application/ld+json";
      document.head.appendChild(element);
    }
    element.textContent = JSON.stringify(entry);
  });
  existing.slice(entries.length).forEach((element) => element.remove());
}

export default function Seo({ location }: { location: string }) {
  useEffect(() => {
    document.querySelector('style[data-prerender-styles]')?.remove();
    const config = getSeoConfig(location);
    const indexable = config.robots.startsWith("index") && Boolean(config.path);
    const url = indexable && config.path ? canonicalUrl(config.path) : null;
    const image = "https://alphasourceconsulting.com/opengraph.jpg";
    document.title = config.title;
    upsertMeta('meta[name="description"]', { name: "description" }, config.description);
    upsertMeta('meta[name="robots"]', { name: "robots" }, config.robots);
    upsertMeta('meta[property="og:type"]', { property: "og:type" }, "website");
    upsertMeta('meta[property="og:site_name"]', { property: "og:site_name" }, "alphaSource Consulting");
    upsertMeta('meta[property="og:title"]', { property: "og:title" }, config.title);
    upsertMeta('meta[property="og:description"]', { property: "og:description" }, config.description);
    upsertMeta('meta[property="og:image"]', { property: "og:image" }, image);
    upsertMeta('meta[name="twitter:card"]', { name: "twitter:card" }, "summary_large_image");
    upsertMeta('meta[name="twitter:title"]', { name: "twitter:title" }, config.title);
    upsertMeta('meta[name="twitter:description"]', { name: "twitter:description" }, config.description);
    upsertMeta('meta[name="twitter:image"]', { name: "twitter:image" }, image);
    upsertCanonical(url);
    upsertMeta('meta[property="og:url"]', { property: "og:url" }, url || "https://alphasourceconsulting.com/");
    upsertJsonLd(config.jsonLd || null);
  }, [location]);
  return null;
}
