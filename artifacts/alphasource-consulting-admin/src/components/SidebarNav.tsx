import { Link, useLocation } from "wouter";

const navItems = [
  { href: "/clients", label: "Client Submissions" },
  { href: "/analysis", label: "Document Analysis" },
  { href: "/secure-uploads", label: "Secure Uploads" },
  { href: "/pdf-generator", label: "PDF Generator" },
  { href: "/billing", label: "Billing" },
  { href: "/admin-management", label: "Admin Management" },
];

export default function SidebarNav() {
  const [location] = useLocation();

  return (
    <nav className="flex flex-col gap-2" aria-label="Admin navigation">
      {navItems.map((item) => {
        const active = location === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`admin-focus flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition ${
              active
                ? "bg-[#A380F6] text-white shadow-sm"
                : "text-[#0A1547]/70 hover:bg-[#F8F9FD] hover:text-[#0A1547]"
            }`}
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                active ? "bg-white" : "bg-[#02ABE0]"
              }`}
              aria-hidden="true"
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
