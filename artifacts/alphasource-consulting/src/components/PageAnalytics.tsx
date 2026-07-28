import { useEffect } from "react";
import { trackCtaClick, trackPageView } from "@/lib/analytics";
import { isPublicOptionalTrackingRoute, useTrackingConsent } from "@/context/TrackingConsentContext";

export default function PageAnalytics({ location }: { location: string }) {
  const { analyticsEnabled } = useTrackingConsent();

  useEffect(() => {
    if (analyticsEnabled && isPublicOptionalTrackingRoute(location)) trackPageView(location);
  }, [analyticsEnabled, location]);

  useEffect(() => {
    if (!analyticsEnabled) return;
    const onClick = (event: MouseEvent) => {
      if (!isPublicOptionalTrackingRoute(window.location.pathname || "/")) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const explicitCta = target.closest<HTMLElement>("[data-analytics-cta]");
      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      const cta = explicitCta || anchor;
      if (!cta) return;
      const label = String(cta.dataset.analyticsCta || cta.textContent || "").trim();
      if (!label) return;
      const placement = cta.dataset.analyticsPlacement || (anchor?.closest("nav") ? "navigation" : anchor?.closest("footer") ? "footer" : "public-content");
      const href = anchor?.href || String(cta.dataset.analyticsTarget || "");
      trackCtaClick(label, href, placement);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [analyticsEnabled]);

  return null;
}
