import { Link } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type PaymentResultPageProps = {
  eyebrow: string;
  heading: string;
  body: string;
};

function PaymentResultPage({ eyebrow, heading, body }: PaymentResultPageProps) {
  return (
    <div className="min-h-screen bg-[#F8F9FD] font-sans">
      <Navbar />

      <main className="pt-16">
        <section className="relative overflow-hidden gradient-hero-dark py-24">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 30% 45%, rgba(2,171,224,0.16) 0%, transparent 55%), radial-gradient(ellipse at 72% 30%, rgba(163,128,246,0.22) 0%, transparent 50%)",
            }}
          />
          <div className="relative max-w-3xl mx-auto px-6 lg:px-8 text-center">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 bg-white/5 text-xs font-bold text-white/80 uppercase tracking-wider mb-6">
              {eyebrow}
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight">
              {heading}
            </h1>
            <p className="text-lg sm:text-xl text-white/70 leading-relaxed max-w-2xl mx-auto">
              {body}
            </p>
          </div>
        </section>

        <section className="py-16 bg-[#F8F9FD]">
          <div className="max-w-3xl mx-auto px-6 lg:px-8">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 sm:p-10 text-center">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-[#0A1547] text-white text-sm font-bold hover:bg-[#1A2460] transition-colors"
                >
                  Return home
                </Link>
                <Link
                  href="/#contact"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-[#0A1547]/15 text-[#0A1547] text-sm font-bold hover:border-[#A380F6] hover:text-[#A380F6] transition-colors"
                >
                  Get in touch
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export function PaymentSuccessPage() {
  return (
    <PaymentResultPage
      eyebrow="Payment"
      heading="Payment received"
      body="Our team has received your payment and will review the report or service request. We will follow up shortly with next steps."
    />
  );
}

export function PaymentCancelPage() {
  return (
    <PaymentResultPage
      eyebrow="Payment"
      heading="Payment not completed"
      body="Your payment was not completed. You can return to your consultation or request a new payment link from the alphaSource Consulting team."
    />
  );
}
