import { useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { getSupabaseClient } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError("Enter your admin email address.");
      return;
    }

    setSending(true);
    try {
      const redirectTo = new URL(
        `${import.meta.env.BASE_URL}reset-password`,
        window.location.origin,
      ).toString();
      const { error: resetError } = await getSupabaseClient().auth.resetPasswordForEmail(
        normalizedEmail,
        { redirectTo },
      );
      if (resetError) {
        throw resetError;
      }
      setSent(true);
    } catch {
      setError("Unable to send a reset link right now. Please try again shortly.");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8F9FD] px-5 py-10 text-[#0A1547]">
      <section className="admin-card w-full max-w-xl p-8 md:p-10">
        <img
          src={`${import.meta.env.BASE_URL}logo-color-no-bg.png`}
          alt="alphaSource Consulting"
          className="h-auto w-56 max-w-full object-contain"
        />
        <h1 className="mt-10 text-3xl font-black">Reset your password</h1>
        <p className="mt-3 text-sm leading-6 text-[#0A1547]/65">
          Enter your admin email to receive a password reset link.
        </p>

        {sent ? (
          <p role="status" className="mt-6 rounded-xl border border-[#02D99D]/25 bg-[#02D99D]/10 p-4 text-sm text-[#0A1547]">
            If an account exists for that email, a reset link has been sent. Check your inbox and spam folder.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <label className="block text-sm font-semibold">
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                disabled={sending}
                className="admin-focus mt-2 w-full rounded-xl border border-[#0A1547]/10 bg-white px-4 py-3 text-sm text-[#0A1547]"
              />
            </label>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <button
              type="submit"
              disabled={sending}
              className="admin-focus w-full rounded-xl bg-[#A380F6] px-5 py-3 text-sm font-extrabold text-white disabled:opacity-60"
            >
              {sending ? "Sending..." : "Send reset link"}
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={() => navigate("/login")}
          className="admin-focus mt-6 text-sm font-semibold text-[#0A1547] underline decoration-[#A380F6] underline-offset-4"
        >
          Back to sign in
        </button>
      </section>
    </main>
  );
}
