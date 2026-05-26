import { useState } from "react";
import { Link, useLocation } from "wouter";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Dental Consulting", href: "/dental-consulting" },
  { label: "Dental Operations Analyzer", href: "/analyzer" },
  { label: "About Us", href: "/about" },
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
              src={`${import.meta.env.BASE_URL}logo-color-no-bg.png`}
              alt="alphaSource Consulting"
              className="h-auto w-[170px] object-contain sm:w-[190px] lg:w-[220px]"
            />
          </Link>

          <div className="hidden md:flex items-center gap-1">
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
          </div>

          <a
            href={contactHref}
            className="hidden md:inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-[#0A1547] bg-white rounded-full hover:bg-[#A380F6] hover:text-white transition-all duration-200 active:scale-95"
          >
            Get in Touch
          </a>

          <button
            className="md:hidden p-2 rounded-lg text-white"
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
        <div className="md:hidden bg-[#0d1a5e] border-t border-white/10 px-6 py-4 space-y-1">
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
