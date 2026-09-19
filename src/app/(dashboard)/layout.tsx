import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { getSession } from "@/server/better-auth/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar }  from "@/components/layout/topbar";

export const metadata: Metadata = {
  title: {
    template: "%s — FPPTS",
    default:  "Dashboard — FPPTS",
  },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ── Auth guard — server-side ───────────────────
  const session = await getSession();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-dvh" style={{ background: "hsl(var(--background))" }}>
      {/* Fixed sidebar */}
      <Sidebar />

      {/* Fixed topbar — positioned relative to sidebar via CSS var */}
      <Topbar />

      {/* Scrollable main content */}
      <main
        className="min-h-dvh"
        style={{
          marginLeft: "var(--sidebar-width)",
          paddingTop: "var(--topbar-height)",
        }}
      >
        <div className="p-6 page-enter">
          {children}
        </div>
      </main>
    </div>
  );
}