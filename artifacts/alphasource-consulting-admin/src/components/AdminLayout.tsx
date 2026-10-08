import { useState, type ReactNode } from "react";
import { Link } from "wouter";
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import SidebarNav from "@/components/SidebarNav";
import { useAuth } from "@/auth/AuthProvider";

type AdminLayoutProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export default function AdminLayout({ title, description, children }: AdminLayoutProps) {
  const { adminUser, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8F9FD] text-[#0A1547]">
      {mobileOpen && <button type="button" className="fixed inset-0 z-30 bg-[#0A1547]/50 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-[#0A1547] px-3 py-5 text-white transition-[width,transform] duration-200 ${collapsed ? "lg:w-[76px]" : "lg:w-60"} ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className={`flex h-12 items-center justify-between px-2 ${collapsed ? "lg:justify-center" : ""}`}>
          <Link href="/overview" onClick={() => setMobileOpen(false)} className="admin-focus flex min-w-0 items-center gap-3 rounded-md" aria-label="alphaSource Consulting Overview">
            <img src={`${import.meta.env.BASE_URL}alpha-symbol.png`} alt="" className="h-8 w-8 shrink-0 object-contain" />
            <span className={`${collapsed ? "lg:hidden" : ""} truncate text-sm font-bold`}>alphaSource <span className="font-normal text-white/65">Admin</span></span>
          </Link>
          <button type="button" onClick={() => setMobileOpen(false)} className="admin-focus rounded-md p-2 text-white/70 hover:bg-white/10 lg:hidden" aria-label="Close navigation"><X size={19} /></button>
        </div>
        <div className="mt-6 min-h-0 flex-1 overflow-y-auto"><SidebarNav collapsed={collapsed && !mobileOpen} onNavigate={() => setMobileOpen(false)} /></div>
        <div className="mt-4 border-t border-white/15 pt-3">
          {!collapsed && <p className="truncate px-3 pb-2 text-xs text-white/50">{adminUser?.email}</p>}
          <button type="button" onClick={() => void signOut()} title={collapsed ? "Sign out" : undefined} aria-label="Sign out" className={`admin-focus flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm text-white/70 hover:bg-white/10 hover:text-white ${collapsed ? "lg:justify-center" : ""}`}><LogOut size={19} /><span className={collapsed ? "lg:hidden" : ""}>Sign out</span></button>
          <button type="button" onClick={() => setCollapsed((value) => !value)} title={collapsed ? "Expand navigation" : "Collapse navigation"} aria-label={collapsed ? "Expand navigation" : "Collapse navigation"} className="admin-focus mt-1 hidden min-h-11 w-full items-center justify-center rounded-md text-white/60 hover:bg-white/10 hover:text-white lg:flex">{collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}</button>
        </div>
      </aside>

      <div className={`transition-[padding] duration-200 ${collapsed ? "lg:pl-[76px]" : "lg:pl-60"}`}>
        <header className="sticky top-0 z-20 border-b border-[#0A1547]/10 bg-white/95 px-4 py-4 backdrop-blur md:px-8">
          <div className="mx-auto flex max-w-7xl items-center gap-4">
            <button type="button" onClick={() => setMobileOpen(true)} className="admin-focus rounded-md border border-[#0A1547]/10 p-2 text-[#0A1547] lg:hidden" aria-label="Open navigation"><Menu size={20} /></button>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold text-[#0A1547] md:text-2xl">{title}</h1>
              <p className="mt-0.5 hidden truncate text-sm text-[#0A1547]/55 sm:block">{description}</p>
            </div>
            <span className="hidden max-w-48 truncate text-xs text-[#0A1547]/55 md:block" title={adminUser?.email}>{adminUser?.email}</span>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
