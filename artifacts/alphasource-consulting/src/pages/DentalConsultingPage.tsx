import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ContactForm from "@/components/ContactForm";
import { PoweredByAlphy } from "@/components/AlphyBrand";
import { publicRouteModifiedDisplay } from "@/lib/publicContent";

const services = [
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    title: "Operations Analysis",
    body: "We audit your scheduling, billing, and patient flow to surface the highest-leverage improvements — backed by real data from your practice management system.",
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    title: "Talent Strategy",
    body: "Attract, develop, and retain the people who make your practice great. We design hiring processes, team training programs, and culture frameworks tailored to dental operations.",
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
    title: "AI Integration",
    body: "We identify where AI can genuinely save time in your practice — and implement tools that your team will actually use, starting with our Dental Operations Analyzer.",
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3h18v18H3zM3 9h18M9 21V9"/>
      </svg>
    ),
    title: "Practice Growth",
    body: "From new patient acquisition to service expansion, we help you build a sustainable growth roadmap grounded in data, competitive context, and your team's capacity.",
  },
];

export default function DentalConsultingPage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-24 gradient-hero-dark overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 80% 30%, rgba(163,128,246,0.2) 0%, transparent 55%)" }}
        />
        <div className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 bg-white/5 text-xs font-bold text-white/80 uppercase tracking-wider mb-6">
            Dental Consulting Services
          </span>
          <h1 className="text-5xl lg:text-6xl font-black text-white mb-6 leading-tight">
            Expert Consulting for{" "}
            <span className="text-gradient-lilac">Modern Dental</span>{" "}
            Practices
          </h1>
          <p className="text-xl text-white/65 leading-relaxed max-w-2xl mx-auto mb-10">
            We combine decades of dental industry experience with AI-powered analytics to help your practice run smarter, grow faster, and serve patients better.
          </p>
          <a
            href="#contact"
            className="inline-flex items-center gap-2 px-8 py-4 text-sm font-bold text-white rounded-full transition-all hover:opacity-90 active:scale-95"
            style={{ background: "linear-gradient(135deg, #A380F6 0%, #8b63f0 100%)" }}
          >
            Book a Free Consultation
          </a>
          <p className="mt-5 text-sm font-semibold text-white/40">Last updated {publicRouteModifiedDisplay("/dental-consulting")}</p>
        </div>
      </section>

      {/* Intro */}
      <section className="py-16 bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-lg text-[#0A1547]/65 leading-relaxed">
            Whether you're a single-doctor practice or a growing multi-site group, alphaSource brings the same level of operational clarity and strategic guidance to your team. We don't just hand you a report — we stay with you through execution.
          </p>
        </div>
      </section>

      {/* Services — 4 cards */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#A380F6] mb-3">What We Offer</span>
            <h2 className="text-4xl font-black text-[#0A1547]">Consulting Services</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {services.map((s) => (
              <div key={s.title} className="group flex gap-6 p-8 rounded-3xl border border-gray-100 hover:border-[#A380F6]/30 hover:shadow-lg bg-white transition-all duration-300">
                <div className="shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-[#A380F6]/15 to-[#02ABE0]/10 flex items-center justify-center text-[#A380F6] group-hover:scale-110 transition-transform">
                  {s.icon}
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#0A1547] mb-2">{s.title}</h3>
                  <p className="text-[#0A1547]/60 text-sm leading-relaxed">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA row */}
      <section className="py-16 bg-[#F8F9FD]">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="rounded-3xl p-10 md:p-12 flex flex-col md:flex-row items-center gap-8" style={{ background: "linear-gradient(135deg, #0A1547 0%, #1A2460 100%)" }}>
            <div className="flex-1">
              <h2 className="text-2xl font-black text-white mb-3">
                Try the Dental Operations Analyzer
                <PoweredByAlphy className="ml-3 align-middle text-[8px] font-medium text-white/50" markClassName="h-6 w-6" />
              </h2>
              <p className="text-white/60 leading-relaxed text-sm">
                Our AI-powered tool analyzes your practice data in minutes — surfaces your highest-leverage opportunities automatically.
              </p>
            </div>
            <a
              href="/analyzer"
              className="shrink-0 inline-flex items-center gap-2 px-7 py-3.5 text-sm font-bold text-white rounded-full transition-all hover:opacity-90 active:scale-95"
              style={{ background: "linear-gradient(135deg, #A380F6 0%, #8b63f0 100%)" }}
            >
              Launch the Analyzer
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section id="contact" className="py-24 bg-white">
        <div className="max-w-2xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#A380F6] mb-3">Get In Touch</span>
            <h2 className="text-4xl font-black text-[#0A1547]">Book a Consultation</h2>
            <p className="text-[#0A1547]/55 mt-4">
              Fill out the form below and one of our consultants will reach out within 24 hours.
            </p>
          </div>
          <ContactForm />
        </div>
      </section>

      <Footer />
    </div>
  );
}
