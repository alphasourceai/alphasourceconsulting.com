import { useEffect, useRef, useState, type FormEvent } from "react";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { useLocation } from "wouter";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/env";

export default function ResetPasswordPage() {
  const [, navigate] = useLocation();
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const recoveryClient = useRef<SupabaseClient | null>(null);
  const recoveryLink = useRef(
    new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery" ||
    new URLSearchParams(window.location.search).get("type") === "recovery",
  );

  useEffect(() => {
    let mounted = true;
    const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: {
        detectSessionInUrl: true,
        persistSession: false,
        autoRefreshToken: false,
        storageKey: "alphasource-consulting-admin:password-recovery",
      },
    });
    recoveryClient.current = supabase;
    const { data: listener } = supabase.auth.onAuthStateChange((authEvent, nextSession) => {
      if (mounted) {
        if (authEvent === "PASSWORD_RECOVERY") recoveryLink.current = true;
        setSession(nextSession);
        setChecking(false);
      }
    });

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted) return;
      if (sessionError) throw sessionError;
      setSession(recoveryLink.current ? data.session : null);
      setChecking(false);
    }).catch(() => {
      if (mounted) {
        setError("This reset link could not be opened. Request a new link.");
        setChecking(false);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
      recoveryClient.current = null;
    };
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }
    if (!recoveryLink.current || !session?.access_token || !recoveryClient.current) {
      setError("This reset link has expired. Request a new link.");
      return;
    }

    setSaving(true);
    const supabase = recoveryClient.current;
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
    } catch {
      setSaving(false);
      setError("Password could not be updated. Request a new reset link and try again.");
      return;
    }

    setComplete(true);
    setPassword("");
    setConfirmation("");
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
    } catch {
      setError("Password updated, but sign-out did not finish. Close this tab before signing in again.");
    }
    setSaving(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8F9FD] px-5 py-10 text-[#0A1547]">
      <section className="admin-card w-full max-w-xl p-8 md:p-10">
        <img
          src={`${import.meta.env.BASE_URL}logo-color-no-bg.png`}
          alt="alphaSource Consulting"
          className="h-auto w-56 max-w-full object-contain"
        />
        <h1 className="mt-10 text-3xl font-black">Set a new password</h1>
        {complete ? (
          <div className="mt-6">
            <p role="status" className="rounded-xl border border-[#02D99D]/25 bg-[#02D99D]/10 p-4 text-sm">
              Your password was updated. Sign in with your new password.
            </p>
            {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="admin-focus mt-6 rounded-xl bg-[#A380F6] px-5 py-3 text-sm font-extrabold text-white"
            >
              Sign in
            </button>
          </div>
        ) : checking ? (
          <p role="status" className="mt-6 text-sm text-[#0A1547]/65">Checking reset link...</p>
        ) : !recoveryLink.current || !session?.access_token ? (
          <div className="mt-6">
            <p role="alert" className="text-sm text-red-700">
              {error || "This reset link is invalid or expired."}
            </p>
            <button
              type="button"
              onClick={() => navigate("/forgot-password")}
              className="admin-focus mt-5 text-sm font-semibold underline decoration-[#A380F6] underline-offset-4"
            >
              Request a new link
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <label className="block text-sm font-semibold">
              New password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                required
                disabled={saving}
                className="admin-focus mt-2 w-full rounded-xl border border-[#0A1547]/10 bg-white px-4 py-3 text-sm text-[#0A1547]"
              />
            </label>
            <label className="block text-sm font-semibold">
              Confirm new password
              <input
                type="password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="new-password"
                required
                disabled={saving}
                className="admin-focus mt-2 w-full rounded-xl border border-[#0A1547]/10 bg-white px-4 py-3 text-sm text-[#0A1547]"
              />
            </label>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <button
              type="submit"
              disabled={saving}
              className="admin-focus w-full rounded-xl bg-[#A380F6] px-5 py-3 text-sm font-extrabold text-white disabled:opacity-60"
            >
              {saving ? "Updating..." : "Update password"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
