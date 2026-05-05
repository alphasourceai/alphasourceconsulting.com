import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "wouter";

const services = [
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
    title: "Scheduling Optimization",
    body: "Analyze appointment patterns, reduce no-shows, and build a schedule that maximizes chair time without burning out your team.",
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
    title: "Revenue Cycle Management",
    body: "Streamline billing workflows, reduce claim denials, and accelerate collections through process redesign and targeted coaching.",
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    title: "Team Training & Culture",
    body: "Build high-performing front office and clinical teams with customized training programs, communication coaching, and leadership development.",
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    title: "Operational Analytics",
    body: "Turn your practice data into actionable insights with custom KPI dashboards and our AI-powered Dental Operations Analyzer.",
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
    title: "Practice Growth Strategy",
    body: "From new patient acquisition to service expansion, we help you build a sustainable growth roadmap grounded in data and experience.",
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 8v4l3 3"/>
      </svg>
    ),
    title: "Implementation Support",
    body: "We don't just hand you a report and leave. Our team stays with you through execution, adjusting strategy as your practice evolves.",
  },
];

const process = [
  { step: "01", title: "Discovery Call", body: "We start with a 30-minute conversation to understand your practice, your challenges, and your goals." },
  { step: "02", title: "Data Analysis", body: "Using our Dental Operations Analyzer, we surface key trends and identify your highest-leverage opportunities." },
  { step: "03", title: "Strategy Session", body: "We present a custom roadmap with clear priorities, timelines, and measurable outcomes." },
  { step: "04", title: "Execution & Support", body: "Our team supports implementation and tracks results, iterating alongside you every step of the way." },
];

export default function DentalConsultingPage() {
  const [form, setForm] = useState({ name: "", email: "", practice: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

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
            <span className="text-gradient-lilac">Modern Dental</span> Practices
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
        </div>
      </section>

      {/* Services */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#A380F6] mb-3">What We Offer</span>
            <h2 className="text-4xl font-black text-[#0A1547]">Consulting Services</h2>
            <p className="text-[#0A1547]/55 mt-4 max-w-xl mx-auto">
              Tailored support across every dimension of your practice operations.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((s) => (
              <div key={s.title} className="group p-8 rounded-3xl border border-gray-100 hover:border-[#A380F6]/30 hover:shadow-lg bg-white transition-all duration-300">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#A380F6]/15 to-[#02ABE0]/10 flex items-center justify-center mb-5 text-[#A380F6] group-hover:scale-110 transition-transform">
                  {s.icon}
                </div>
                <h3 className="text-lg font-black text-[#0A1547] mb-3">{s.title}</h3>
                <p className="text-[#0A1547]/60 text-sm leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-24 bg-[#F8F9FD]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#A380F6] mb-3">How It Works</span>
            <h2 className="text-4xl font-black text-[#0A1547]">Our Process</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {process.map((p, i) => (
              <div key={p.step} className="relative">
                {i < process.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[calc(50%+32px)] right-0 h-px bg-gradient-to-r from-[#A380F6]/40 to-transparent" />
                )}
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-[#0A1547] flex items-center justify-center mx-auto mb-4">
                    <span className="text-sm font-black text-white">{p.step}</span>
                  </div>
                  <h3 className="text-base font-black text-[#0A1547] mb-2">{p.title}</h3>
                  <p className="text-sm text-[#0A1547]/55 leading-relaxed">{p.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Analyzer CTA */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="rounded-3xl p-10 md:p-14 flex flex-col md:flex-row items-center gap-10" style={{ background: "linear-gradient(135deg, #0A1547 0%, #1A2460 100%)" }}>
            <div className="flex-1">
              <span className="text-xs font-bold uppercase tracking-widest text-[#A380F6] mb-3 block">New Tool</span>
              <h2 className="text-3xl font-black text-white mb-4">Try the Dental Operations Analyzer</h2>
              <p className="text-white/60 leading-relaxed">
                Our AI-powered tool analyzes your practice data in minutes and surfaces the most impactful opportunities for improvement — free to try.
              </p>
            </div>
            <Link
              href="/analyzer"
              className="shrink-0 inline-flex items-center gap-2 px-7 py-3.5 text-sm font-bold text-white rounded-full transition-all hover:opacity-90 active:scale-95"
              style={{ background: "linear-gradient(135deg, #A380F6 0%, #8b63f0 100%)" }}
            >
              Launch the Analyzer
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section id="contact" className="py-24 bg-[#F8F9FD]">
        <div className="max-w-2xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#A380F6] mb-3">Get In Touch</span>
            <h2 className="text-4xl font-black text-[#0A1547]">Book a Consultation</h2>
            <p className="text-[#0A1547]/55 mt-4">
              Fill out the form below and one of our consultants will reach out within 24 hours.
            </p>
          </div>

          {submitted ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
              <div className="w-16 h-16 rounded-full bg-[#02D99D]/15 flex items-center justify-center mx-auto mb-6">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#02D99D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h3 className="text-2xl font-black text-[#0A1547] mb-3">Message Received!</h3>
              <p className="text-[#0A1547]/55">We'll be in touch within 24 hours to schedule your free consultation.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-5">
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-[#0A1547]/60 uppercase tracking-wider mb-2">Your Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Dr. Jane Smith"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-[#0A1547] text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#A380F6]/30 focus:border-[#A380F6] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0A1547]/60 uppercase tracking-wider mb-2">Email Address</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="jane@mypractice.com"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-[#0A1547] text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#A380F6]/30 focus:border-[#A380F6] transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#0A1547]/60 uppercase tracking-wider mb-2">Practice Name</label>
                <input
                  type="text"
                  value={form.practice}
                  onChange={(e) => setForm({ ...form, practice: e.target.value })}
                  placeholder="Smith Family Dental"
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-[#0A1547] text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#A380F6]/30 focus:border-[#A380F6] transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#0A1547]/60 uppercase tracking-wider mb-2">How Can We Help?</label>
                <textarea
                  rows={4}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Tell us about your practice and your biggest operational challenges..."
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-[#0A1547] text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#A380F6]/30 focus:border-[#A380F6] transition-all resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3.5 text-sm font-bold text-white rounded-full transition-all hover:opacity-90 active:scale-[0.99]"
                style={{ background: "linear-gradient(135deg, #A380F6 0%, #8b63f0 100%)" }}
              >
                Submit Request
              </button>
            </form>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
