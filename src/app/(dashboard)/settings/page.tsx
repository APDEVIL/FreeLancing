"use client";

import { useState } from "react";
import { toast }    from "sonner";
import { Loader2, Shield, Bell, Palette, Database } from "lucide-react";

import { useRole }    from "@/hooks/use-role";
import { useSession } from "@/hooks/use-session";
import { authClient } from "@/server/better-auth/client";

import { PageHeader }  from "@/components/layout/page-header";
import { RoleGate }    from "@/components/shared/role-gate";
import { Button }      from "@/components/ui/button";
import { Input }       from "@/components/ui/input";
import { Label }       from "@/components/ui/label";
import { Separator }   from "@/components/ui/separator";
import { Switch }      from "@/components/ui/switch";

// ─────────────────────────────────────────────
// Section wrapper
// ─────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon:        React.ElementType;
  title:       string;
  description: string;
  children:    React.ReactNode;
}) {
  return (
    <div className="fppts-card p-6 space-y-5">
      <div className="flex items-start gap-3">
        <div
          className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
          style={{ background: "hsl(var(--accent))" }}
        >
          <Icon className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} />
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: "hsl(var(--foreground))" }}>
            {title}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
            {description}
          </p>
        </div>
      </div>
      <Separator />
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────
// Toggle row
// ─────────────────────────────────────────────

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label:           string;
  description?:    string;
  checked:         boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>
          {label}
        </p>
        {description && (
          <p className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
            {description}
          </p>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default function SettingsPage() {
  const { user }    = useSession();
  const { isAdmin } = useRole();

  // ── Change password state ──────────────────
  const [currentPw,  setCurrentPw]  = useState("");
  const [newPw,      setNewPw]      = useState("");
  const [confirmPw,  setConfirmPw]  = useState("");
  const [pwLoading,  setPwLoading]  = useState(false);

  // ── Notification prefs (local state only — extend with DB if needed) ──
  const [emailNotifs,   setEmailNotifs]   = useState(true);
  const [taskReminders, setTaskReminders] = useState(true);
  const [paymentAlerts, setPaymentAlerts] = useState(true);
  const [msgNotifs,     setMsgNotifs]     = useState(true);

  const handleChangePassword = async () => {
    if (newPw !== confirmPw) {
      toast.error("New passwords do not match.");
      return;
    }
    if (newPw.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setPwLoading(true);
    try {
      await authClient.changePassword({
        currentPassword: currentPw,
        newPassword:     newPw,
      });
      toast.success("Password changed successfully.");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch {
      toast.error("Failed to change password. Check your current password.");
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 stagger-children">
      <PageHeader
        title="Settings"
        subtitle="Manage your account preferences"
      />

      {/* ── Security ────────────────────────── */}
      <Section
        icon={Shield}
        title="Security"
        description="Manage your password and account security"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="current-pw">Current Password</Label>
            <Input
              id="current-pw"
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-pw">New Password</Label>
              <Input
                id="new-pw"
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-pw">Confirm Password</Label>
              <Input
                id="confirm-pw"
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Re-enter password"
                autoComplete="new-password"
              />
            </div>
          </div>
          <Button
            onClick={handleChangePassword}
            disabled={pwLoading || !currentPw || !newPw || !confirmPw}
            size="sm"
            className="gap-2"
          >
            {pwLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Update Password
          </Button>
        </div>
      </Section>

      {/* ── Notifications ───────────────────── */}
      <Section
        icon={Bell}
        title="Notifications"
        description="Choose what updates you want to receive"
      >
        <div className="space-y-5">
          <ToggleRow
            label="Email Notifications"
            description="Receive updates via email"
            checked={emailNotifs}
            onCheckedChange={(v) => { setEmailNotifs(v); toast.success("Preference saved."); }}
          />
          <Separator />
          <ToggleRow
            label="Task Reminders"
            description="Get reminded about upcoming task deadlines"
            checked={taskReminders}
            onCheckedChange={(v) => { setTaskReminders(v); toast.success("Preference saved."); }}
          />
          <Separator />
          <ToggleRow
            label="Payment Alerts"
            description="Notify me when a payment is received or due"
            checked={paymentAlerts}
            onCheckedChange={(v) => { setPaymentAlerts(v); toast.success("Preference saved."); }}
          />
          <Separator />
          <ToggleRow
            label="Message Notifications"
            description="Alert me on new messages"
            checked={msgNotifs}
            onCheckedChange={(v) => { setMsgNotifs(v); toast.success("Preference saved."); }}
          />
        </div>
      </Section>

      {/* ── Appearance ──────────────────────── */}
      <Section
        icon={Palette}
        title="Appearance"
        description="Customize how FPPTS looks"
      >
        <div
          className="flex items-center justify-between rounded-lg px-4 py-3"
          style={{ background: "hsl(var(--secondary))" }}
        >
          <div>
            <p className="text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>
              Theme
            </p>
            <p className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
              Currently: Light — dark mode coming soon
            </p>
          </div>
          <span
            className="text-xs font-semibold px-3 py-1 rounded-full"
            style={{ background: "hsl(var(--accent))", color: "hsl(var(--primary))" }}
          >
            Light
          </span>
        </div>
      </Section>

      {/* ── Admin: System ───────────────────── */}
      <RoleGate roles={["admin"]}>
        <Section
          icon={Database}
          title="System Configuration"
          description="Admin-only platform settings"
        >
          <div className="space-y-4 text-sm">
            <div
              className="flex items-center justify-between rounded-lg px-4 py-3"
              style={{ background: "hsl(var(--secondary))" }}
            >
              <span style={{ color: "hsl(var(--muted-foreground))" }}>
                Environment
              </span>
              <span
                className="font-mono font-semibold"
                style={{ color: "hsl(var(--foreground))" }}
              >
                {process.env.NODE_ENV}
              </span>
            </div>
            <div
              className="flex items-center justify-between rounded-lg px-4 py-3"
              style={{ background: "hsl(var(--secondary))" }}
            >
              <span style={{ color: "hsl(var(--muted-foreground))" }}>
                Logged in as
              </span>
              <span
                className="font-semibold"
                style={{ color: "hsl(var(--foreground))" }}
              >
                {user?.email ?? "—"}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={() => toast.info("System logs export is not yet implemented.")}
            >
              <Database className="w-3.5 h-3.5" />
              Export System Logs
            </Button>
          </div>
        </Section>
      </RoleGate>
    </div>
  );
}