import { useState } from "react";
import { Link, useLocation } from "wouter";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Dental Consulting", href: "/dental-consulting" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "About Us", href: "/about" },
];
const resourceLinks = [
  { label: "Dental Groups", href: "/for-dental-groups" },
  { label: "Practice Opportunity Review", href: "/practice-opportunity-review" },
  { label: "Dental Operations Analyzer", href: "/analyzer" },
  { label: "FAQ", href: "/faq" },
  { label: "Security", href: "/security" },
  { label: "Support", href: "/support" },
];
const contactPagePaths = new Set(["/", "/dental-consulting", "/about", "/practice-opportunity-review"]);

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();
  const contactHref = contactPagePaths.has(location) ? "#contact" : "/#contact";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0A1547] border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex shrink-0 items-center">
            <img
              src={`${import.meta.env.BASE_URL}logo-color-no-bg.webp`}
              alt="alphaSource Consulting"
              width="600"
              height="116"
              decoding="async"
              className="h-auto w-[170px] object-contain sm:w-[190px] lg:w-[220px]"
            />
          </Link>

          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className={`px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  location === link.href
                    ? "text-[#A380F6]"
                    : "text-white/75 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <details className="group relative">
              <summary className="cursor-pointer list-none rounded-lg px-3 py-2 text-sm font-semibold text-white/75 transition-colors hover:text-white">
                Resources
              </summary>
              <div className="absolute right-0 top-full z-10 mt-2 w-64 rounded-lg border border-[#0A1547]/10 bg-white p-2 shadow-xl">
                {resourceLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block rounded-md px-3 py-2.5 text-sm font-semibold text-[#0A1547]/70 transition-colors hover:bg-[#F8F9FD] hover:text-[#7C5CF2]"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </details>
          </div>

          <a
            href={contactHref}
            className="hidden lg:inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-[#0A1547] bg-white rounded-full hover:bg-[#A380F6] hover:text-white transition-all duration-200 active:scale-95"
          >
            Get in Touch
          </a>

          <button
            className="lg:hidden p-2 rounded-lg text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
              {mobileOpen ? (
                <path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="M6 6l12 12M6 18L18 6" />
              ) : (
                <path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden bg-[#0d1a5e] border-t border-white/10 px-6 py-4 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="block px-3 py-2.5 text-sm font-semibold text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <p className="px-3 pb-1 pt-3 text-xs font-bold uppercase text-white/40">Resources</p>
          {resourceLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block px-3 py-2.5 text-sm font-semibold text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-3">
            <a
              href={contactHref}
              className="block w-full text-center px-5 py-2.5 text-sm font-bold text-[#0A1547] bg-white rounded-full hover:bg-[#A380F6] hover:text-white transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              Get in Touch
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
