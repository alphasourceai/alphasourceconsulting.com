import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { useLocation } from "wouter";
import { AdminApiError, getAdminMe } from "@/lib/adminApi";
import { getSupabaseClient } from "@/lib/supabase";

export default function AcceptInvitePage() {
  const [, navigate] = useLocation();
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [savingPassword, setSavingPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let mounted = true;
    const supabase = getSupabaseClient();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) {
        return;
      }
      setSession(nextSession);
      setCheckingSession(false);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) {
        return;
      }
      setSession(data.session);
      setCheckingSession(false);
    }).catch(() => {
      if (!mounted) {
        return;
      }
      setError("Invite session could not be loaded. Request a new invite if this link has expired.");
      setCheckingSession(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!password) {
      setError("Enter a new password.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const supabase = getSupabaseClient();
    const activeSession = session ?? (await supabase.auth.getSession()).data.session;
    if (!activeSession?.access_token) {
      setError("Invite session is missing or expired. Request a new invite from an administrator.");
      return;
    }

    setSavingPassword(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        throw updateError;
      }

      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token || activeSession.access_token;
      await getAdminMe(accessToken);
      setSuccess("Password set. Redirecting to the admin dashboard...");
      navigate("/clients");
    } catch (setupError) {
      if (setupError instanceof AdminApiError && setupError.status === 403) {
        await supabase.auth.signOut();
        setSession(null);
        setError("Password was set, but this account is not authorized for the admin dashboard. Contact an administrator.");
      } else {
        setError("Password could not be set. Request a new invite if this link has expired.");
      }
    } finally {
      setSavingPassword(false);
    }
  };

  const inviteUnavailable = !checkingSession && !session?.access_token;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8F9FD] px-5 py-10 text-[#0A1547]">
      <section className="admin-card w-full max-w-xl p-8 md:p-10">
        <img
          src={`${import.meta.env.BASE_URL}logo-color-no-bg.png`}
          alt="alphaSource Consulting"
          className="h-auto w-56 max-w-full object-contain"
        />
        <p className="mt-10 text-xs font-extrabold uppercase tracking-[0.2em] text-[#A380F6]">
          Admin Invite
        </p>
        <h1 className="mt-3 text-3xl font-black text-[#0A1547]">Set your admin password</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-[#0A1547]/62">
          Use the invite link from your email, then create a password for your Supabase admin account.
        </p>

        {checkingSession && (
          <div className="mt-6 rounded-2xl border border-[#A380F6]/25 bg-[#A380F6]/10 p-4 text-sm font-bold text-[#0A1547]">
            Loading invite session...
          </div>
        )}

        {inviteUnavailable && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            Invite session is missing or expired. Request a new invite from an administrator.
          </div>
        )}

        {!checkingSession && session?.access_token && (
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <label className="block">
              <span className="text-sm font-extrabold text-[#0A1547]">New password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                className="admin-focus mt-2 w-full rounded-xl border border-[#0A1547]/10 bg-white px-4 py-3 text-sm font-semibold text-[#0A1547] shadow-sm"
                disabled={savingPassword}
              />
            </label>

            <label className="block">
              <span className="text-sm font-extrabold text-[#0A1547]">Confirm password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                className="admin-focus mt-2 w-full rounded-xl border border-[#0A1547]/10 bg-white px-4 py-3 text-sm font-semibold text-[#0A1547] shadow-sm"
                disabled={savingPassword}
              />
            </label>

            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </p>
            )}

            {success && (
              <p className="rounded-xl border border-[#02D99D]/25 bg-[#02D99D]/10 px-4 py-3 text-sm font-bold text-[#0A1547]">
                {success}
              </p>
            )}

            <button
              type="submit"
              disabled={savingPassword}
              className="admin-focus w-full rounded-xl bg-[#A380F6] px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-[#A380F6]/20 transition hover:bg-[#906cf2] disabled:opacity-60"
            >
              {savingPassword ? "Setting password..." : "Set password"}
            </button>
          </form>
        )}

        <a
          href={`${import.meta.env.BASE_URL}login`}
          className="admin-focus mt-6 inline-flex rounded-xl px-1 py-1 text-sm font-extrabold text-[#0A1547] underline decoration-[#A380F6]/60 underline-offset-4"
        >
          Back to sign in
        </a>
      </section>
    </main>
  );
}
