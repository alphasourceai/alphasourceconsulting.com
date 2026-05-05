import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "wouter";

const team = [
  {
    name: "Jason Gardner",
    role: "Co-Founder & CEO",
    photo: "headshot-jason.jpg",
    bio: "Jason brings over 15 years of dental industry experience, having served in operational leadership roles at multi-site DSOs and private practices. He founded alphaSource to bridge the gap between enterprise-grade analytics and the independent practice.",
  },
  {
    name: "Brent Ford",
    role: "Co-Founder & COO",
    photo: "headshot-brent.jpg",
    bio: "Brent has spent his career optimizing dental operations from the inside — as a practice administrator, consultant, and regional director. His hands-on experience informs every system and process we build.",
  },
  {
    name: "Destinee Konecny",
    role: "Director of Client Success",
    photo: "headshot-destinee.jpg",
    bio: "Destinee leads client relationships and ensures every practice we work with achieves measurable results. Her background in dental team training and patient experience design shapes our people-first approach.",
  },
];

const values = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    title: "People First",
    body: "Every recommendation we make starts with how it affects your team and your patients — not just your bottom line.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 16v-4M12 8h.01"/>
      </svg>
    ),
    title: "Radical Transparency",
    body: "We tell you what we see, even when it's hard to hear. Honest assessments lead to real transformation.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    title: "Measured Results",
    body: "We track outcomes, not activity. Every engagement is tied to specific, measurable goals from day one.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    title: "Trusted Partnership",
    body: "We're not here to drop a report and disappear. We invest in long-term relationships that grow with your practice.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-24 gradient-hero-dark overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 30% 50%, rgba(2,171,224,0.15) 0%, transparent 55%), radial-gradient(ellipse at 75% 30%, rgba(163,128,246,0.2) 0%, transparent 50%)" }}
        />
        <div className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 bg-white/5 text-xs font-bold text-white/80 uppercase tracking-wider mb-6">
            About Us
          </span>
          <h1 className="text-5xl lg:text-6xl font-black text-white mb-6 leading-tight">
            Meet the{" "}
            <span className="text-gradient-lilac">alphaSource</span> Team
          </h1>
          <p className="text-xl text-white/65 leading-relaxed max-w-2xl mx-auto">
            We're dental industry veterans, operators, and technologists who came together with one mission: help great practices reach their full potential.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#A380F6] mb-3">Our Mission</span>
              <h2 className="text-4xl font-black text-[#0A1547] mb-6">Reclaiming Time Through the Power of AI</h2>
              <p className="text-[#0A1547]/65 leading-relaxed mb-5">
                Too many great dental practices are drowning in administrative complexity. Scheduling inefficiencies, billing confusion, high turnover — these problems steal time from what matters most: delivering exceptional patient care.
              </p>
              <p className="text-[#0A1547]/65 leading-relaxed">
                alphaSource exists to change that. By combining deep industry expertise with AI-powered tools, we help practices cut through the noise, focus on their highest-leverage opportunities, and build operations that run smoothly — so their people can thrive.
              </p>
            </div>
            <div className="rounded-3xl p-10 flex flex-col gap-6" style={{ background: "linear-gradient(135deg, #0A1547 0%, #1A2460 100%)" }}>
              {[
                { label: "Mission", value: "Amplify What Matters" },
                { label: "Vision", value: "A practice where every team member and every patient wins" },
                { label: "Method", value: "People-driven insight, AI-powered speed" },
              ].map((item) => (
                <div key={item.label} className="border-b border-white/10 pb-6 last:border-0 last:pb-0">
                  <div className="text-xs font-bold uppercase tracking-widest text-[#A380F6] mb-1">{item.label}</div>
                  <div className="text-lg font-black text-white leading-snug">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-24 bg-[#F8F9FD]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#A380F6] mb-3">The People</span>
            <h2 className="text-4xl font-black text-[#0A1547]">Leadership Team</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {team.map((member) => (
              <div key={member.name} className="group bg-white rounded-3xl overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-300">
                <div className="relative overflow-hidden h-72">
                  <img
                    src={`${import.meta.env.BASE_URL}${member.photo}`}
                    alt={member.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A1547]/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <div className="p-7">
                  <h3 className="text-xl font-black text-[#0A1547] mb-1">{member.name}</h3>
                  <div className="text-xs font-bold text-[#A380F6] uppercase tracking-wider mb-4">{member.role}</div>
                  <p className="text-sm text-[#0A1547]/60 leading-relaxed">{member.bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#A380F6] mb-3">Our Story</span>
            <h2 className="text-4xl font-black text-[#0A1547]">Why We Started alphaSource</h2>
          </div>
          <div className="prose prose-lg max-w-none text-[#0A1547]/65">
            <p className="leading-relaxed mb-6">
              alphaSource was born out of frustration — and love for the dental industry. Our founders spent years working inside dental organizations and repeatedly saw the same pattern: incredible clinicians and passionate teams held back by operational chaos that nobody had the time or tools to fix.
            </p>
            <p className="leading-relaxed mb-6">
              The data was always there. It just wasn't accessible. Practice management systems contain a goldmine of insights, but turning raw data into a clear action plan required expertise most practices couldn't afford to hire full-time.
            </p>
            <p className="leading-relaxed">
              So we built the tools we wished we'd had — and surrounded them with the consulting team we knew practices needed. Today, alphaSource brings enterprise-grade operational intelligence to practices of every size, giving every team the clarity and confidence to grow on their own terms.
            </p>
          </div>
        </div>
      </section>

      {/* Technology */}
      <section className="py-24 bg-[#F8F9FD]">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#A380F6] mb-3">Technology</span>
            <h2 className="text-3xl font-black text-[#0A1547]">AI That Earns Your Trust</h2>
            <p className="text-[#0A1547]/55 mt-4 max-w-xl mx-auto">
              We build AI that augments human judgment — not replaces it. Our models are trained on real dental practice data and reviewed by our consulting team before every recommendation reaches you.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { title: "HIPAA Compliant", body: "All data is encrypted in transit and at rest. We never share your information with third parties." },
              { title: "Explainable Outputs", body: "Every AI recommendation comes with a plain-language explanation of why and how we got there." },
              { title: "Human-in-the-Loop", body: "Our consultants review AI outputs before they reach you, adding context and catching edge cases." },
              { title: "Continuously Improving", body: "Our models improve as we see more practice data — with your permission and always anonymized." },
            ].map((item) => (
              <div key={item.title} className="bg-white p-7 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-2 h-2 rounded-full bg-[#02D99D]" />
                  <h3 className="text-base font-black text-[#0A1547]">{item.title}</h3>
                </div>
                <p className="text-sm text-[#0A1547]/55 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#A380F6] mb-3">What We Stand For</span>
            <h2 className="text-4xl font-black text-[#0A1547]">Our Values</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v) => (
              <div key={v.title} className="text-center p-8 rounded-3xl border border-gray-100 hover:border-[#A380F6]/30 hover:shadow-lg transition-all duration-300">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#A380F6]/15 to-[#02ABE0]/10 flex items-center justify-center mx-auto mb-5 text-[#A380F6]">
                  {v.icon}
                </div>
                <h3 className="text-base font-black text-[#0A1547] mb-3">{v.title}</h3>
                <p className="text-sm text-[#0A1547]/55 leading-relaxed">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 gradient-hero-dark relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 60% 50%, rgba(163,128,246,0.2) 0%, transparent 60%)" }} />
        <div className="relative max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-black text-white mb-4">Ready to Work Together?</h2>
          <p className="text-white/65 text-lg mb-10">
            Book a free 30-minute strategy session with our team.
          </p>
          <Link
            href="/dental-consulting#contact"
            className="inline-flex items-center gap-2 px-8 py-4 text-base font-bold text-white rounded-full transition-all hover:opacity-90 active:scale-95"
            style={{ background: "linear-gradient(135deg, #A380F6 0%, #8b63f0 100%)" }}
          >
            Book a Consultation
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
