import type { Metadata } from "next";
import { Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "FPPTS — Sign In",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh flex flex-col items-center justify-center px-4 py-12 overflow-hidden">
      {/* ── Background ──────────────────────────── */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 50% -10%,
              hsl(var(--primary) / 0.18) 0%,
              transparent 70%),
            hsl(var(--background))
          `,
        }}
      />

      {/* Decorative blobs */}
      <div
        className="absolute -top-32 -right-32 w-96 h-96 rounded-full -z-10 blur-3xl"
        style={{ background: "hsl(var(--primary) / 0.08)" }}
      />
      <div
        className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full -z-10 blur-3xl"
        style={{ background: "hsl(262 83% 70% / 0.07)" }}
      />

      {/* ── Logo mark ───────────────────────────── */}
      <div className="flex items-center gap-2.5 mb-8">
        <div
          className="flex items-center justify-center w-9 h-9 rounded-xl"
          style={{ background: "hsl(var(--primary))" }}
        >
          <Zap className="w-4.5 h-4.5 text-white" />
        </div>
        <span className="text-xl font-bold tracking-tight" style={{ color: "hsl(var(--foreground))" }}>
          FPPTS
        </span>
      </div>

      {/* ── Auth card ───────────────────────────── */}
      <div
        className="w-full max-w-md rounded-2xl p-8 page-enter"
        style={{
          background:  "hsl(var(--card))",
          border:      "1px solid hsl(var(--border))",
          boxShadow:   "var(--shadow-lg)",
        }}
      >
        {children}
      </div>

      {/* ── Footer ──────────────────────────────── */}
      <p className="mt-8 text-xs text-center" style={{ color: "hsl(var(--muted-foreground))" }}>
        © {new Date().getFullYear()} FPPTS. Freelancer Project & Payment Tracking System.
      </p>
    </div>
  );
}