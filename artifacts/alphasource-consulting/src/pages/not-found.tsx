import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FD]">
      <div className="text-center px-6">
        <div className="text-8xl font-black text-[#0A1547]/10 mb-6">404</div>
        <h1 className="text-2xl font-black text-[#0A1547] mb-3">Page Not Found</h1>
        <p className="text-[#0A1547]/55 mb-8">The page you're looking for doesn't exist.</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-white rounded-full"
          style={{ background: "linear-gradient(135deg, #A380F6 0%, #8b63f0 100%)" }}
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
