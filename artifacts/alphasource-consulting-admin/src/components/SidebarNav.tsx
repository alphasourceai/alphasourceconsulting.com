import { Link, useLocation } from "wouter";
import { Activity, BookOpen, ChartNoAxesCombined, CreditCard, FileCheck2, FileText, FolderOpen, LayoutDashboard, LockKeyhole, ScanSearch, Users } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import type { AdminPermissions } from "@/lib/types";

const navItems = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard, canShow: () => true },
  { href: "/clients", label: "Clients", icon: Users, canShow: (permissions: AdminPermissions) => permissions.canReadClients },
  { href: "/agreements", label: "Agreements", icon: FileCheck2, canShow: (permissions: AdminPermissions) => permissions.canReadAgreements || permissions.canWriteAgreements },
  { href: "/analysis", label: "Document Analysis", icon: ScanSearch, canShow: (permissions: AdminPermissions) => permissions.canReadAnalysis || permissions.canWriteAnalysis },
  { href: "/secure-uploads", label: "Secure Uploads", icon: FolderOpen, canShow: (permissions: AdminPermissions) => permissions.canReadSecureUploads },
  { href: "/pdf-generator", label: "PDF Reports", icon: FileText, canShow: (permissions: AdminPermissions) => permissions.canReadPdf },
  { href: "/billing", label: "Billing", icon: CreditCard, canShow: (permissions: AdminPermissions) => permissions.canReadBilling },
  { href: "/admin-management", label: "Admin Access", icon: LockKeyhole, canShow: (permissions: AdminPermissions) => permissions.canReadAdminManagement },
  { href: "/audit", label: "Audit Trail", icon: Activity, canShow: (permissions: AdminPermissions) => permissions.canReadAudit },
  { href: "/site-analytics", label: "Site Analytics", icon: ChartNoAxesCombined, canShow: (permissions: AdminPermissions) => permissions.canReadSiteAnalytics },
  { href: "/help", label: "Help & FAQ", icon: BookOpen, canShow: () => true },
];

export default function SidebarNav({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const [location] = useLocation();
  const { permissions } = useAuth();
  const visibleItems = navItems.filter((item) => item.canShow(permissions));

  return (
    <nav className="flex flex-col gap-1" aria-label="Admin navigation">
      {visibleItems.map((item) => {
        const active = location === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            aria-label={collapsed ? item.label : undefined}
            aria-current={active ? "page" : undefined}
            className={`admin-focus flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition ${collapsed ? "justify-center" : ""} ${
              active
                ? "bg-[#A380F6] text-white"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Icon size={19} strokeWidth={2} className="shrink-0" aria-hidden="true" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
