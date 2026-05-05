import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "wouter";

const features = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    label: "Trend Detection",
    desc: "Automatically identifies patterns across appointment, revenue, and patient data.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 8v4l3 3"/>
      </svg>
    ),
    label: "15-Minute Reports",
    desc: "Get a full operational assessment in the time it takes to have a coffee.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
    label: "Actionable Recommendations",
    desc: "Every finding comes with a prioritized recommendation and estimated impact.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    ),
    label: "Secure & Private",
    desc: "Your data never leaves a secure environment. HIPAA-compliant from the ground up.",
  },
];

export default function AnalyzerPage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-20 gradient-hero-dark overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 30% 60%, rgba(2,171,224,0.15) 0%, transparent 55%), radial-gradient(ellipse at 80% 20%, rgba(163,128,246,0.2) 0%, transparent 50%)" }}
        />
        <div className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 bg-white/5 text-xs font-bold text-white/80 uppercase tracking-wider mb-6">
            <div className="w-2 h-2 rounded-full bg-[#02ABE0] animate-pulse" />
            AI-Powered Tool
          </span>
          <h1 className="text-5xl lg:text-6xl font-black text-white mb-6 leading-tight">
            Dental Operations{" "}
            <span className="text-gradient-brand">Analyzer</span>
          </h1>
          <p className="text-xl text-white/65 leading-relaxed max-w-2xl mx-auto mb-10">
            An AI-powered tool designed to quickly identify trends and opportunities hidden in your practice's operational data — giving you clarity to act in minutes, not months.
          </p>
        </div>
      </section>

      {/* Features bar */}
      <section className="py-16 bg-[#F8F9FD]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <div key={f.label} className="flex gap-4 items-start bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-[#A380F6]/15 to-[#02ABE0]/10 flex items-center justify-center text-[#A380F6]">
                  {f.icon}
                </div>
                <div>
                  <div className="text-sm font-black text-[#0A1547] mb-1">{f.label}</div>
                  <div className="text-xs text-[#0A1547]/55 leading-relaxed">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tool Embed Area */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-[#0A1547] mb-4">Launch the Analyzer</h2>
            <p className="text-[#0A1547]/55 max-w-xl mx-auto">
              Input your practice metrics below and our AI will generate a comprehensive operational assessment within minutes.
            </p>
          </div>

          <div
            className="rounded-3xl overflow-hidden border-2 border-dashed border-[#A380F6]/30 flex flex-col items-center justify-center min-h-[520px] relative"
            style={{ background: "linear-gradient(135deg, #F8F9FD 0%, #f0f2fb 100%)" }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(163,128,246,0.08) 0%, transparent 70%)" }}
            />
            <div className="relative text-center px-8 py-16">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#A380F6]/20 to-[#02ABE0]/15 flex items-center justify-center mx-auto mb-6">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#A380F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              </div>
              <h3 className="text-2xl font-black text-[#0A1547] mb-3">Analyzer Tool</h3>
              <p className="text-[#0A1547]/55 text-sm leading-relaxed max-w-sm mx-auto mb-8">
                The Dental Operations Analyzer is an embedded AI tool. Contact us to get access to your personalized practice dashboard.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/dental-consulting#contact"
                  className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-bold text-white rounded-full transition-all hover:opacity-90 active:scale-95"
                  style={{ background: "linear-gradient(135deg, #A380F6 0%, #8b63f0 100%)" }}
                >
                  Request Access
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </Link>
                <a
                  href="mailto:info@alphasourceconsulting.com"
                  className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-bold text-[#0A1547] rounded-full border border-[#0A1547]/15 hover:border-[#A380F6] hover:text-[#A380F6] transition-all active:scale-95"
                >
                  Contact Us
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-[#F8F9FD]">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#A380F6] mb-3">Simple Process</span>
            <h2 className="text-3xl font-black text-[#0A1547]">How the Analyzer Works</h2>
          </div>
          <div className="space-y-6">
            {[
              { n: "1", title: "Connect Your Data", body: "Securely share your practice management system data — we support most major platforms including Dentrix, Eaglesoft, and Open Dental." },
              { n: "2", title: "AI Analysis Runs", body: "Our models analyze your scheduling, production, collection, and patient retention data to identify trends and anomalies." },
              { n: "3", title: "Receive Your Report", body: "Within 15 minutes, you receive a prioritized report with findings, benchmarks, and specific recommendations." },
              { n: "4", title: "Act With Confidence", body: "Use your report as a standalone resource or as the foundation for a deeper consulting engagement with our team." },
            ].map((item) => (
              <div key={item.n} className="flex gap-6 items-start bg-white p-7 rounded-2xl border border-gray-100 shadow-sm">
                <div className="shrink-0 w-10 h-10 rounded-xl bg-[#0A1547] flex items-center justify-center">
                  <span className="text-sm font-black text-white">{item.n}</span>
                </div>
                <div>
                  <h3 className="text-base font-black text-[#0A1547] mb-1">{item.title}</h3>
                  <p className="text-sm text-[#0A1547]/55 leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
