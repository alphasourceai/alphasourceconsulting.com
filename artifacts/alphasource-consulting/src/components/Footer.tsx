import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="bg-[#0A1547] text-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <div className="mb-4">
              <img
                src={`${import.meta.env.BASE_URL}logo-color-no-bg.png`}
                alt="alphaSource Consulting"
                className="h-auto w-[240px] object-contain sm:w-[300px]"
              />
            </div>
            <p className="text-white/60 text-sm leading-relaxed max-w-xs">
              Expert dental consulting powered by AI — helping practices reclaim time and amplify what matters most.
            </p>
            <div className="flex gap-3 mt-6">
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center hover:bg-[#A380F6]/30 transition-colors"
                aria-label="LinkedIn"
              >
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Company</h4>
            <ul className="space-y-3">
              {[
                { label: "Home", href: "/" },
                { label: "Dental Consulting", href: "/dental-consulting" },
                { label: "Dental Operations Analyzer", href: "/analyzer" },
                { label: "About Us", href: "/about" },
              ].map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-white/60 hover:text-[#A380F6] transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Get in Touch</h4>
            <ul className="space-y-3">
              <li>
                <a href="mailto:info@alphasourceconsulting.com" className="text-sm text-white/60 hover:text-[#A380F6] transition-colors">
                  info@alphasourceconsulting.com
                </a>
              </li>
              <li>
                <Link href="/dental-consulting#contact" className="text-sm font-bold transition-colors hover:text-white" style={{ color: "#A380F6" }}>
                  Book a Consultation →
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-white/40 text-sm">
            &copy; {new Date().getFullYear()} alphaSource Consulting. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-white/40 text-sm hover:text-white/70 transition-colors">
              Terms &amp; Conditions
            </a>
            <a href="#" className="text-white/40 text-sm hover:text-white/70 transition-colors">
              Privacy Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
