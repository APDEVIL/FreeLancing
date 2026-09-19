"use client";

import { Bell, Mail, Search, ChevronDown, UserCircle, Settings, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { useSession } from "@/hooks/use-session";
import { authClient } from "@/server/better-auth/client";
import { getInitials, getAvatarColor } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABELS } from "@/lib/constants";
import type { UserRole } from "@/lib/constants";

// ── Icon button shared style ─────────────────

function IconBtn({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      className={cn(
        "relative flex items-center justify-center w-9 h-9 rounded-lg transition-colors duration-150",
        "hover:bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]",
        className,
      )}
    >
      {children}
    </button>
  );
}

// ── Notification dot ─────────────────────────

function Dot() {
  return (
    <span
      className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full border-2 border-white"
      style={{ background: "hsl(var(--status-overdue-fg))" }}
    />
  );
}

// ── Topbar ───────────────────────────────────

export function Topbar() {
  const router  = useRouter();
  const { user } = useSession();

  const handleLogout = async () => {
    await authClient.signOut();
    toast.success("Signed out successfully.");
    router.push("/login");
  };

  return (
    <header
      className="fixed top-0 right-0 z-30 flex items-center gap-4 px-6"
      style={{
        left:         "var(--sidebar-width)",
        height:       "var(--topbar-height)",
        background:   "hsl(var(--topbar-bg))",
        borderBottom: "1px solid hsl(var(--topbar-border))",
      }}
    >
      {/* ── Search ──────────────────────────────── */}
      <div className="relative flex-1 max-w-sm">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: "hsl(var(--muted-foreground))" }}
        />
        <Input
          placeholder="Search…"
          className="pl-9 h-9 text-sm bg-[hsl(var(--secondary))] border-transparent focus-visible:bg-white focus-visible:border-[hsl(var(--border))]"
        />
      </div>

      <div className="flex items-center gap-1 ml-auto">
        {/* ── Notifications ───────────────────── */}
        <IconBtn>
          <Bell className="w-[18px] h-[18px]" />
          <Dot />
        </IconBtn>

        {/* ── Messages ────────────────────────── */}
        <IconBtn>
          <Mail className="w-[18px] h-[18px]" />
          <Dot />
        </IconBtn>

        {/* ── User dropdown ───────────────────── */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex items-center gap-2.5 pl-2 pr-2.5 py-1.5 rounded-lg ml-1",
                "transition-colors duration-150 hover:bg-[hsl(var(--secondary))] outline-none",
              )}
            >
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? ""} />
                <AvatarFallback
                  className={cn("text-xs font-semibold", getAvatarColor(user?.name))}
                >
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
              <div className="text-left hidden sm:block">
                <p
                  className="text-sm font-semibold leading-none mb-0.5"
                  style={{ color: "hsl(var(--foreground))" }}
                >
                  {user?.name ?? "—"}
                </p>
                <p className="text-[11px] leading-none" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {user?.email ?? "—"}
                </p>
              </div>
              <ChevronDown
                className="w-3.5 h-3.5 hidden sm:block shrink-0"
                style={{ color: "hsl(var(--muted-foreground))" }}
              />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="font-normal">
              <p className="font-semibold text-sm">{user?.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {ROLE_LABELS[(user?.role as UserRole) ?? "freelancer"]}
              </p>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => router.push("/dashboard/profile")}>
              <UserCircle className="w-4 h-4 mr-2" />
              My Profile
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={handleLogout}
              className="text-[hsl(var(--status-overdue-fg))] focus:text-[hsl(var(--status-overdue-fg))]"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}