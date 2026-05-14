import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ContactForm from "@/components/ContactForm";

const team = [
  {
    name: "Jason Gardner",
    role: "Co-Founder & CEO",
    photo: "headshot-jason.jpg",
    bio: "Jason brings over 15 years of dental industry experience, having served in operational leadership roles at multi-site DSOs and private practices. He founded alphaSource to bridge the gap between enterprise-grade analytics and the independent practice.",
  },
  {
    name: "Brent Ford",
    role: "Co-Founder & CRO",
    photo: "headshot-brent.jpg",
    bio: "Brent brings deep experience in digital marketing, growth strategy, and new-patient acquisition for dental and aesthetic practices. He helps practices attract the right patients, improve conversion, and use modern tools and AI-enabled systems to support sustainable growth.",
  },
  {
    name: "Destinee Konecny",
    role: "Consultant",
    photo: "headshot-destinee.jpg",
    bio: "Destinee leads client relationships and ensures every practice we work with achieves measurable results. Her background in dental team training and patient experience design shapes our people-first approach.",
  },
  {
    name: "Ashley Stephens",
    role: "Consultant",
    photo: "headshot-ashley.jpg",
    bio: "Ashley brings hands-on dental operations and patient experience expertise, with a background in office management, scheduling, treatment planning, team support, and workflow coordination. She helps practices operate efficiently while creating strong client and patient experiences.",
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

      {/* Team Cards */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#A380F6] mb-3">The People</span>
            <h2 className="text-4xl font-black text-[#0A1547]">Leadership Team</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">
            {team.map((member) => (
              <div key={member.name} className="group bg-white rounded-3xl overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-300">
                <div className="relative overflow-hidden h-72">
                  <img
                    src={`${import.meta.env.BASE_URL}${member.photo}`}
                    alt={member.name}
                    className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${member.name === "Ashley Stephens" ? "object-[center_18%]" : ""}`}
                  />
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

      {/* Mission, Story, Technology — white cards */}
      <section className="py-20 bg-[#F8F9FD]">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 space-y-6">

          {/* Our Mission */}
          <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#A380F6]/20 to-[#02ABE0]/10 flex items-center justify-center text-[#A380F6]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <h2 className="text-2xl font-black text-[#0A1547]">Our Mission</h2>
            </div>
            <p className="text-[#0A1547]/65 leading-relaxed mb-4">
              Our mission is to reclaim your time through the power of AI. Too many great dental practices are drowning in administrative complexity — scheduling inefficiencies, billing confusion, high turnover — and these problems steal time from what matters most: delivering exceptional patient care.
            </p>
            <p className="text-[#0A1547]/65 leading-relaxed">
              alphaSource exists to change that. By combining deep industry expertise with AI-powered tools, we help practices cut through the noise, focus on their highest-leverage opportunities, and build operations that run smoothly — so their people can thrive.
            </p>
          </div>

          {/* Our Story */}
          <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#A380F6]/20 to-[#02ABE0]/10 flex items-center justify-center text-[#A380F6]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
              </div>
              <h2 className="text-2xl font-black text-[#0A1547]">Our Story</h2>
            </div>
            <p className="text-[#0A1547]/65 leading-relaxed mb-4">
              alphaSource was born out of frustration — and love for the dental industry. Our founders spent years working inside dental organizations and repeatedly saw the same pattern: incredible clinicians and passionate teams held back by operational chaos that nobody had the time or tools to fix.
            </p>
            <p className="text-[#0A1547]/65 leading-relaxed mb-4">
              The data was always there. It just wasn't accessible. Practice management systems contain a goldmine of insights, but turning raw data into a clear action plan required expertise most practices couldn't afford to hire full-time.
            </p>
            <p className="text-[#0A1547]/65 leading-relaxed">
              So we built the tools we wished we'd had — and surrounded them with the consulting team we knew practices needed. Today, alphaSource brings enterprise-grade operational intelligence to practices of every size, giving every team the clarity and confidence to grow on their own terms.
            </p>
          </div>

          {/* Technology */}
          <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#A380F6]/20 to-[#02ABE0]/10 flex items-center justify-center text-[#A380F6]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                  <line x1="8" y1="21" x2="16" y2="21"/>
                  <line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
              </div>
              <h2 className="text-2xl font-black text-[#0A1547]">Technology</h2>
            </div>
            <p className="text-[#0A1547]/65 leading-relaxed mb-4">
              We build AI that augments human judgment — not replaces it. Our models are trained on real dental practice data and reviewed by our consulting team before every recommendation reaches you. Every finding comes with a plain-language explanation of why and how we got there.
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mt-6">
              {[
                { label: "HIPAA Compliant", body: "All data encrypted in transit and at rest. We never share your information with third parties." },
                { label: "Explainable AI", body: "Plain-language explanations with every recommendation — no black-box outputs." },
                { label: "Human-in-the-Loop", body: "Our consultants review AI outputs before delivery, adding context and catching edge cases." },
                { label: "Continuously Improving", body: "Our models improve over time — always with your permission and fully anonymized." },
              ].map((item) => (
                <div key={item.label} className="p-4 rounded-xl bg-[#F8F9FD] border border-gray-100">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-[#02D99D]" />
                    <span className="text-sm font-black text-[#0A1547]">{item.label}</span>
                  </div>
                  <p className="text-xs text-[#0A1547]/55 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section id="contact" className="py-24 bg-white">
        <div className="max-w-2xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#A380F6] mb-3">Work With Us</span>
            <h2 className="text-4xl font-black text-[#0A1547]">Get In Touch</h2>
            <p className="text-[#0A1547]/55 mt-4">
              Ready to start? Fill out the form and we'll be in touch within 24 hours.
            </p>
          </div>
          <ContactForm />
        </div>
      </section>

      <Footer />
    </div>
  );
}
