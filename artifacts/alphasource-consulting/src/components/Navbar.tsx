import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Dental Consulting", href: "/dental-consulting" },
  { label: "Dental Operations Analyzer", href: "/analyzer" },
  { label: "About Us", href: "/about" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/97 backdrop-blur-md shadow-sm border-b border-gray-100"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 py-4">
          <Link href="/" className="flex items-center gap-0">
            <img
              src={`${import.meta.env.BASE_URL}logo-dark-text.png`}
              alt="AlphaSource Consulting"
              className={`h-8 w-auto transition-all duration-300 ${scrolled ? "brightness-100" : "brightness-200"}`}
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
                    : scrolled
                    ? "text-[#0A1547] hover:text-[#A380F6]"
                    : "text-white/90 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <Link
            href="/dental-consulting#contact"
            className={`hidden md:inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-full transition-all duration-200 active:scale-95 ${
              scrolled
                ? "bg-[#0A1547] text-white hover:bg-[#A380F6]"
                : "bg-white/15 text-white border border-white/30 hover:bg-white/25"
            }`}
          >
            Book a Consultation
          </Link>

          <button
            className={`md:hidden p-2 rounded-lg transition-colors ${scrolled ? "text-[#0A1547]" : "text-white"}`}
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
        <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4 space-y-1 shadow-lg">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="block px-3 py-2.5 text-sm font-semibold text-[#0A1547] hover:text-[#A380F6] hover:bg-purple-50 rounded-lg transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-3">
            <Link
              href="/dental-consulting#contact"
              className="block w-full text-center px-5 py-2.5 text-sm font-bold text-white bg-[#0A1547] rounded-full hover:bg-[#A380F6] transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              Book a Consultation
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
