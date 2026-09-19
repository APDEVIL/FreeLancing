"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Zap } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { NAV_SECTIONS } from "@/lib/constants";
import { useRole } from "@/hooks/use-role";
import { useSession } from "@/hooks/use-session";
import { authClient } from "@/server/better-auth/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials, getAvatarColor } from "@/lib/utils";

export function Sidebar() {
  const pathname  = usePathname();
  const router    = useRouter();
  const { canAccess } = useRole();
  const { user }  = useSession();

  const handleLogout = async () => {
    await authClient.signOut();
    toast.success("Signed out successfully.");
    router.push("/login");
  };

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 flex flex-col"
      style={{
        width:      "var(--sidebar-width)",
        background: "hsl(var(--sidebar-bg))",
        borderRight:"1px solid hsl(var(--sidebar-border))",
        boxShadow:  "var(--shadow-sidebar)",
      }}
    >
      {/* ── Logo ──────────────────────────────────── */}
      <div
        className="flex items-center gap-2.5 px-5 shrink-0"
        style={{ height: "var(--topbar-height)", borderBottom: "1px solid hsl(var(--sidebar-border))" }}
      >
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg"
          style={{ background: "hsl(var(--primary))" }}
        >
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span
          className="text-base font-bold tracking-tight"
          style={{ color: "hsl(var(--foreground))" }}
        >
          FPPTS
        </span>
      </div>

      {/* ── Nav ───────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-3 px-3">
        {NAV_SECTIONS.map((section) => {
          // Filter items by role
          const visibleItems = section.items.filter((item) =>
            canAccess(item.roles),
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.section}>
              <p className="nav-section-label">{section.section}</p>
              <ul className="space-y-0.5">
                {visibleItems.map((item) => {
                  const isActive =
                    item.href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname.startsWith(item.href);

                  return (
                    <li key={item.href + item.label}>
                      <Link
                        href={item.href}
                        className="nav-item"
                        data-active={isActive ? "true" : "false"}
                      >
                        <item.icon />
                        <span className="flex-1 truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* ── User footer ───────────────────────────── */}
      <div
        className="shrink-0 px-3 py-3 space-y-1"
        style={{ borderTop: "1px solid hsl(var(--sidebar-border))" }}
      >
        {/* User info */}
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <Avatar className="w-8 h-8 shrink-0">
            <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? ""} />
            <AvatarFallback
              className={cn("text-xs font-semibold", getAvatarColor(user?.name))}
            >
              {getInitials(user?.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: "hsl(var(--foreground))" }}>
              {user?.name ?? "—"}
            </p>
            <p className="text-xs truncate" style={{ color: "hsl(var(--muted-foreground))" }}>
              {user?.email ?? "—"}
            </p>
          </div>
        </div>

        {/* Log out */}
        <button
          onClick={handleLogout}
          className="nav-item w-full text-left"
          style={{ color: "hsl(var(--status-overdue-fg))" }}
        >
          <LogOut className="w-4 h-4" style={{ color: "hsl(var(--status-overdue-fg))" }} />
          Log Out
        </button>
      </div>
    </aside>
  );
}