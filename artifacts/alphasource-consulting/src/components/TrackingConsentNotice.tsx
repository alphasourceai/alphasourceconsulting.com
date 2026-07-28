import { Link } from "wouter";
import { useEffect, useState } from "react";
import { useTrackingConsent } from "@/context/TrackingConsentContext";

export default function TrackingConsentNotice() {
  const {
    analyticsEnabled,
    hasSelection,
    preferencesOpen,
    acceptAnalytics,
    savePreferences,
    openPreferences,
    closePreferences,
  } = useTrackingConsent();
  const [draftAnalytics, setDraftAnalytics] = useState(analyticsEnabled);

  useEffect(() => {
    if (preferencesOpen) setDraftAnalytics(analyticsEnabled);
  }, [analyticsEnabled, preferencesOpen]);

  if (!hasSelection && !preferencesOpen) {
    return (
      <aside
        className="fixed inset-x-4 bottom-4 z-[70] mx-auto max-w-2xl rounded-2xl border border-[#0A1547]/10 bg-white p-5 shadow-xl sm:p-6"
        style={{ fontFamily: "Arial, sans-serif" }}
        aria-label="Privacy choices"
      >
        <p className="text-sm font-bold text-[#0A1547]">Privacy choices</p>
        <p className="mt-2 text-sm leading-6 text-[#0A1547]/65">
          We use essential technology to operate this site. Optional first-party analytics helps us understand public page and form activity without placing contact details in analytics events. Read our <Link href="/privacy" className="font-semibold text-[#6F4FE4] underline">Privacy Policy</Link>.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={openPreferences} className="rounded-lg border border-[#0A1547]/15 px-4 py-2.5 text-sm font-semibold text-[#0A1547]">Configure</button>
          <button type="button" onClick={acceptAnalytics} className="rounded-lg bg-[#6F4FE4] px-4 py-2.5 text-sm font-bold text-white">Allow</button>
        </div>
      </aside>
    );
  }

  if (!preferencesOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end bg-[#0A1547]/30 p-4 sm:items-center sm:justify-center" role="presentation">
      <section className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="privacy-choices-title">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="privacy-choices-title" className="text-xl font-black text-[#0A1547]">Privacy choices</h2>
            <p className="mt-1 text-sm leading-6 text-[#0A1547]/62">Choose whether optional first-party public-site analytics may run in this browser.</p>
          </div>
          <button type="button" onClick={closePreferences} className="rounded-md px-2 py-1 text-sm font-semibold text-[#0A1547]/60">Close</button>
        </div>
        <div className="mt-5 rounded-xl border border-[#0A1547]/10 p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" checked={draftAnalytics} onChange={(event) => setDraftAnalytics(event.target.checked)} className="mt-1 h-4 w-4 accent-[#A380F6]" />
            <span>
              <span className="block text-sm font-bold text-[#0A1547]">Optional analytics</span>
              <span className="mt-1 block text-xs leading-5 text-[#0A1547]/60">Measures public page views, call-to-action interactions, and form progress without recording names, emails, phone numbers, or messages as analytics events.</span>
            </span>
          </label>
        </div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Link href="/privacy" onClick={closePreferences} className="rounded-lg border border-[#0A1547]/15 px-4 py-2.5 text-center text-sm font-semibold text-[#0A1547]">Privacy Policy</Link>
          <button type="button" onClick={() => savePreferences({ analytics: draftAnalytics })} className="rounded-lg bg-[#6F4FE4] px-4 py-2.5 text-sm font-bold text-white">Save choices</button>
        </div>
      </section>
    </div>
  );
}
