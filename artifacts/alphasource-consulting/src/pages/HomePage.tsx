import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "wouter";

const pillars = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    title: "People-Driven",
    body: "We believe technology should serve people — not the other way around. Every recommendation we make puts your team and patients first.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    title: "Data-Informed",
    body: "Our AI-powered analyzer surfaces the trends and patterns hidden in your operations data, giving you clarity to act with confidence.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 8v4l3 3"/>
      </svg>
    ),
    title: "Time Back",
    body: "Reclaim the hours spent on administrative overhead. Our tools and consulting expertise let you focus on delivering exceptional care.",
  },
];

const stats = [
  { value: "40+", label: "Practices Served" },
  { value: "2,000+", label: "Hours Saved Annually" },
  { value: "94%", label: "Client Satisfaction" },
  { value: "15 min", label: "Average Report Time" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      <Navbar />

      {/* Hero */}
      <section className="relative min-h-screen flex items-center overflow-hidden gradient-hero-dark">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 70% 40%, rgba(163,128,246,0.18) 0%, transparent 60%), radial-gradient(ellipse at 20% 80%, rgba(2,171,224,0.12) 0%, transparent 50%)",
          }}
        />

        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-32 grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 border border-white/20 bg-white/5 backdrop-blur-sm">
              <div className="w-2 h-2 rounded-full bg-[#02D99D] animate-pulse" />
              <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">Dental Operations Consulting</span>
            </div>

            <h1 className="text-5xl lg:text-6xl font-black text-white leading-tight mb-6">
              Unleash Your{" "}
              <span className="text-gradient-lilac">Talent</span>
              <br />
              Amplify What{" "}
              <span className="text-gradient-brand">Matters</span>
            </h1>

            <p className="text-lg text-white/70 leading-relaxed mb-10 max-w-md">
              Reclaiming your time through the power of AI — expert dental consulting that puts your people first and your practice ahead.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/dental-consulting#contact"
                className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-bold text-white rounded-full transition-all hover:opacity-90 active:scale-95"
                style={{ background: "linear-gradient(135deg, #A380F6 0%, #8b63f0 100%)" }}
              >
                Book a Consultation
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </Link>
              <Link
                href="/analyzer"
                className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-bold text-white rounded-full border border-white/30 bg-white/10 hover:bg-white/20 transition-all active:scale-95"
              >
                Try the Analyzer
              </Link>
            </div>
          </div>

          <div className="hidden md:flex flex-col gap-4">
            <div className="bg-white/8 backdrop-blur-sm border border-white/15 rounded-3xl p-8">
              <div className="grid grid-cols-2 gap-6">
                {stats.map((s) => (
                  <div key={s.label} className="text-center">
                    <div className="text-3xl font-black text-white mb-1">{s.value}</div>
                    <div className="text-xs text-white/55 font-medium">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t border-white/10 flex items-center gap-3">
                <div className="flex -space-x-2">
                  <img src={`${import.meta.env.BASE_URL}headshot-jason.jpg`} className="w-8 h-8 rounded-full border-2 border-white/20 object-cover" alt="Jason" />
                  <img src={`${import.meta.env.BASE_URL}headshot-brent.jpg`} className="w-8 h-8 rounded-full border-2 border-white/20 object-cover" alt="Brent" />
                  <img src={`${import.meta.env.BASE_URL}headshot-destinee.jpg`} className="w-8 h-8 rounded-full border-2 border-white/20 object-cover" alt="Destinee" />
                </div>
                <p className="text-xs text-white/60">Trusted by dental practices nationwide</p>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
          <span className="text-white/30 text-xs">Scroll</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-30">
            <path d="M12 5v14M5 12l7 7 7-7"/>
          </svg>
        </div>
      </section>

      {/* Pillars */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#A380F6] mb-3">Our Approach</span>
            <h2 className="text-4xl font-black text-[#0A1547]">Built for People, Powered by AI</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {pillars.map((p) => (
              <div key={p.title} className="group p-8 rounded-3xl border border-gray-100 hover:border-[#A380F6]/30 hover:shadow-lg transition-all duration-300">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#A380F6]/15 to-[#02ABE0]/10 flex items-center justify-center mb-6 text-[#A380F6] group-hover:scale-110 transition-transform">
                  {p.icon}
                </div>
                <h3 className="text-xl font-black text-[#0A1547] mb-3">{p.title}</h3>
                <p className="text-[#0A1547]/60 text-sm leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Teaser */}
      <section className="py-24 bg-[#F8F9FD]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#A380F6] mb-3">Who We Are</span>
              <h2 className="text-4xl font-black text-[#0A1547] mb-6">
                A Team That Knows Dentistry Inside and Out
              </h2>
              <p className="text-[#0A1547]/65 leading-relaxed mb-6">
                alphaSource Consulting was founded by dental industry veterans who have seen firsthand the administrative burden that keeps great practices from reaching their full potential. We combine deep domain expertise with cutting-edge AI to give your practice a real edge.
              </p>
              <p className="text-[#0A1547]/65 leading-relaxed mb-8">
                Our team has spent decades working inside dental organizations — not just consulting from the outside. That lived experience shapes every recommendation we make.
              </p>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-white bg-[#0A1547] rounded-full hover:bg-[#A380F6] transition-colors active:scale-95"
              >
                Meet the Team
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </Link>
            </div>
            <div className="flex gap-4">
              <div className="flex flex-col gap-4 mt-8">
                <img src={`${import.meta.env.BASE_URL}headshot-jason.jpg`} alt="Jason Gardner" className="w-40 h-48 object-cover rounded-3xl shadow-lg" />
                <img src={`${import.meta.env.BASE_URL}headshot-destinee.jpg`} alt="Destinee Konecny" className="w-40 h-40 object-cover rounded-3xl shadow-lg" />
              </div>
              <div className="flex flex-col gap-4">
                <img src={`${import.meta.env.BASE_URL}headshot-brent.jpg`} alt="Brent Ford" className="w-40 h-40 object-cover rounded-3xl shadow-lg" />
                <div className="w-40 h-48 rounded-3xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0A1547 0%, #1A2460 100%)" }}>
                  <div className="text-center px-4">
                    <div className="text-3xl font-black text-white mb-1">15+</div>
                    <div className="text-xs text-white/60 leading-tight">Years Dental Industry Experience</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <div className="w-12 h-12 rounded-full bg-[#A380F6]/10 flex items-center justify-center mx-auto mb-8">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#A380F6">
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
            </svg>
          </div>
          <blockquote className="text-2xl font-semibold text-[#0A1547] leading-relaxed mb-8 italic">
            "alphaSource transformed how our practice handles scheduling and patient flow. We got back 6 hours a week — and our team morale went through the roof."
          </blockquote>
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0A1547]/10 flex items-center justify-center">
              <span className="text-sm font-black text-[#0A1547]">DR</span>
            </div>
            <div className="text-left">
              <div className="text-sm font-black text-[#0A1547]">Dr. Rebecca Holt</div>
              <div className="text-xs text-[#0A1547]/50">Holt Family Dental, Phoenix AZ</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 gradient-hero-dark relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 60% 50%, rgba(163,128,246,0.2) 0%, transparent 60%)" }}
        />
        <div className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-black text-white mb-4">Ready to Amplify What Matters?</h2>
          <p className="text-white/65 text-lg mb-10">
            Book a free 30-minute strategy call with our team and discover what's possible.
          </p>
          <Link
            href="/dental-consulting#contact"
            className="inline-flex items-center gap-2 px-8 py-4 text-base font-bold text-white rounded-full transition-all hover:opacity-90 active:scale-95"
            style={{ background: "linear-gradient(135deg, #A380F6 0%, #8b63f0 100%)" }}
          >
            Get Started Today
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
