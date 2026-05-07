import { useEffect, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/auth/AuthProvider";

export default function LoginPage() {
  const [, navigate] = useLocation();
  const { error, signIn, signOut, status } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (status === "authenticated") {
      navigate("/clients");
    }
  }, [navigate, status]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError("");

    const nextEmail = email.trim();
    if (!nextEmail || !password) {
      setFormError("Enter your admin email and password.");
      return;
    }

    await signIn(nextEmail, password);
  };

  const lockedOut = status === "forbidden";
  const configError = status === "config-error";
  const loading = status === "loading";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8F9FD] px-5 py-10 text-[#0A1547]">
      <section className="admin-card grid w-full max-w-5xl overflow-hidden lg:grid-cols-[1fr_1.05fr]">
        <div className="bg-[#0A1547] p-8 text-white md:p-10">
          <img
            src={`${import.meta.env.BASE_URL}logo-color-no-bg.png`}
            alt="alphaSource Consulting"
            className="h-auto w-64 max-w-full object-contain"
          />
          <div className="mt-16">
            <p className="text-sm font-extrabold uppercase tracking-[0.24em] text-[#02D99D]">
              Admin Dashboard
            </p>
            <h1 className="mt-4 text-4xl font-black leading-tight">
              Operations, billing, and analysis workflows.
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-white/72">
              This React dashboard is being built in parallel with the existing Streamlit admin fallback.
            </p>
          </div>
        </div>

        <div className="p-8 md:p-10">
          <h2 className="text-3xl font-black text-[#0A1547]">Sign in</h2>
          <p className="mt-2 text-sm font-medium text-[#0A1547]/60">
            Use your Supabase admin account. Server-side role validation is required after sign in.
          </p>

          {lockedOut ? (
            <div className="mt-8 rounded-2xl border border-[#A380F6]/30 bg-[#A380F6]/10 p-5">
              <h3 className="text-lg font-black text-[#0A1547]">Access denied</h3>
              <p className="mt-2 text-sm leading-6 text-[#0A1547]/65">
                {error || "Your signed-in account is not authorized for this admin dashboard."}
              </p>
              <button
                type="button"
                onClick={() => void signOut()}
                className="admin-focus mt-4 rounded-xl bg-[#0A1547] px-4 py-2 text-sm font-extrabold text-white"
              >
                Sign out
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <label className="block">
                <span className="text-sm font-extrabold text-[#0A1547]">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  className="admin-focus mt-2 w-full rounded-xl border border-[#0A1547]/10 bg-white px-4 py-3 text-sm font-semibold text-[#0A1547] shadow-sm"
                  disabled={loading || configError}
                />
              </label>

              <label className="block">
                <span className="text-sm font-extrabold text-[#0A1547]">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  className="admin-focus mt-2 w-full rounded-xl border border-[#0A1547]/10 bg-white px-4 py-3 text-sm font-semibold text-[#0A1547] shadow-sm"
                  disabled={loading || configError}
                />
              </label>

              {(formError || error) && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {formError || error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || configError}
                className="admin-focus w-full rounded-xl bg-[#A380F6] px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-[#A380F6]/20 transition hover:bg-[#906cf2] disabled:opacity-60"
              >
                {loading ? "Checking access..." : "Sign in"}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
