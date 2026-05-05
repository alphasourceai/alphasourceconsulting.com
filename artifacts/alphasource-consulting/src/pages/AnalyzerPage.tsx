import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

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
          <p className="text-xl text-white/65 leading-relaxed max-w-2xl mx-auto">
            An AI-powered tool designed to quickly identify trends and opportunities hidden in your practice's operational data — giving you clarity to act in minutes, not months.
          </p>
        </div>
      </section>

      {/* Analyzer Tool Embed Placeholder */}
      <section className="py-20 bg-[#F8F9FD]">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-black text-[#0A1547] mb-3">Analyzer Tool</h2>
            <p className="text-[#0A1547]/55 max-w-lg mx-auto text-sm">
              The embedded analyzer tool will appear in the container below. Paste your iframe embed code to activate it.
            </p>
          </div>

          {/* Iframe placeholder — minimum 600px tall, clearly labeled */}
          <div
            className="w-full rounded-3xl border-2 border-dashed border-[#A380F6]/40 bg-white flex flex-col items-center justify-center"
            style={{ minHeight: "600px" }}
          >
            <div className="text-center px-8 py-16 max-w-md">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#A380F6]/20 to-[#02ABE0]/15 flex items-center justify-center mx-auto mb-6">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#A380F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                  <line x1="8" y1="21" x2="16" y2="21"/>
                  <line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
              </div>
              <p className="text-base font-black text-[#0A1547] mb-2">
                The Dental Operations Analyzer tool will load here
              </p>
              <p className="text-sm text-[#0A1547]/50 leading-relaxed">
                Replace this placeholder with your iframe embed code. The container is sized to at least 600px tall and full-width to accommodate the tool.
              </p>
              <div className="mt-8 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-left">
                <p className="text-xs font-mono text-[#0A1547]/40 select-all">
                  {"<iframe src=\"YOUR_TOOL_URL\" width=\"100%\" height=\"600\" frameborder=\"0\" />"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
