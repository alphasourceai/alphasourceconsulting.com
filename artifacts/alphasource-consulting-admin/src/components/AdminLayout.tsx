import type { ReactNode } from "react";
import SidebarNav from "@/components/SidebarNav";
import { useAuth } from "@/auth/AuthProvider";

type AdminLayoutProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export default function AdminLayout({ title, description, children }: AdminLayoutProps) {
  const { adminUser, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-[#F8F9FD] text-[#0A1547]">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 border-r border-[#0A1547]/10 bg-white px-5 py-6 lg:flex lg:flex-col">
        <LinkLogo />
        <div className="mt-8">
          <SidebarNav />
        </div>
        <div className="mt-auto rounded-2xl border border-[#0A1547]/10 bg-[#F8F9FD] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0A1547]/45">Signed in</p>
          <p className="mt-2 truncate text-sm font-bold text-[#0A1547]">{adminUser?.email}</p>
          <button
            type="button"
            onClick={() => void signOut()}
            className="admin-focus mt-4 w-full rounded-xl border border-[#0A1547]/10 bg-white px-3 py-2 text-sm font-bold text-[#0A1547] transition hover:border-[#A380F6]/50 hover:text-[#1A2460]"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-[#0A1547]/10 bg-[#F8F9FD]/92 px-5 py-4 backdrop-blur md:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#A380F6]">
                alphaSource Admin
              </p>
              <h1 className="mt-1 text-2xl font-black text-[#0A1547] md:text-3xl">{title}</h1>
              <p className="mt-1 max-w-2xl text-sm font-medium text-[#0A1547]/60">{description}</p>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#0A1547]/10 bg-white px-4 py-3 lg:min-w-72">
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#0A1547]/45">Admin</p>
                <p className="truncate text-sm font-bold text-[#0A1547]">{adminUser?.email}</p>
              </div>
              <button
                type="button"
                onClick={() => void signOut()}
                className="admin-focus rounded-xl bg-[#0A1547] px-3 py-2 text-xs font-extrabold text-white transition hover:bg-[#1A2460] lg:hidden"
              >
                Sign out
              </button>
            </div>
          </div>
          <div className="mx-auto mt-4 max-w-7xl lg:hidden">
            <SidebarNav />
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-5 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function LinkLogo() {
  return (
    <a href="/clients" className="admin-focus flex items-center rounded-xl">
      <img
        src={`${import.meta.env.BASE_URL}logo-dark-text.png`}
        alt="alphaSource Consulting"
        className="h-auto w-56 max-w-full object-contain"
      />
    </a>
  );
}
