import { Link, useLocation } from "wouter";
import { useAuth } from "@/auth/AuthProvider";
import type { AdminPermissions } from "@/lib/types";

const navItems = [
  { href: "/overview", label: "Overview", canShow: () => true },
  { href: "/clients", label: "Clients", canShow: (permissions: AdminPermissions) => permissions.canReadClients },
  { href: "/agreements", label: "Agreements", canShow: (permissions: AdminPermissions) => permissions.canReadAgreements || permissions.canWriteAgreements },
  { href: "/analysis", label: "Document Analysis", canShow: (permissions: AdminPermissions) => permissions.canReadAnalysis || permissions.canWriteAnalysis },
  { href: "/secure-uploads", label: "Secure Uploads", canShow: (permissions: AdminPermissions) => permissions.canReadSecureUploads },
  { href: "/pdf-generator", label: "PDF Reports", canShow: (permissions: AdminPermissions) => permissions.canReadPdf },
  { href: "/billing", label: "Billing", canShow: (permissions: AdminPermissions) => permissions.canReadBilling },
  { href: "/admin-management", label: "Admin Access", canShow: (permissions: AdminPermissions) => permissions.canReadAdminManagement },
  { href: "/audit", label: "Audit Trail", canShow: (permissions: AdminPermissions) => permissions.canReadAudit },
  { href: "/help", label: "Help & FAQ", canShow: () => true },
];

export default function SidebarNav() {
  const [location] = useLocation();
  const { permissions } = useAuth();
  const visibleItems = navItems.filter((item) => item.canShow(permissions));

  return (
    <nav className="flex flex-col gap-2" aria-label="Admin navigation">
      {visibleItems.map((item) => {
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
