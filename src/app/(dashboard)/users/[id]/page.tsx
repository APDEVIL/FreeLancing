"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { api }         from "@/trpc/react";
import { formatDate, getInitials, getAvatarColor, cn } from "@/lib/utils";
import { ROLE_LABELS, ROLE_OPTIONS, type UserRole } from "@/lib/constants";

import { PageHeader }    from "@/components/layout/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { RoleGate }      from "@/components/shared/role-gate";
import { Button }        from "@/components/ui/button";
import { Separator }     from "@/components/ui/separator";
import { Skeleton }      from "@/components/ui/skeleton";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";

// ─────────────────────────────────────────────
// Info row
// ─────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      className="flex items-center justify-between py-3"
      style={{ borderBottom: "1px solid hsl(var(--border)/0.6)" }}
    >
      <span className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
        {label}
      </span>
      <span className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
        {value}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id }   = use(params);
  const router   = useRouter();
  const utils    = api.useUtils();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const query = api.user.byId.useQuery({ id });
  const u     = query.data;

  const setRoleMutation = api.user.setRole.useMutation({
    onSuccess: () => {
      toast.success("Role updated successfully.");
      void utils.user.byId.invalidate({ id });
    },
    onError: (e) => toast.error(e.message),
  });

  const removeMutation = api.user.remove.useMutation({
    onSuccess: () => {
      toast.success("User removed.");
      router.push("/dashboard/users");
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Loading ──────────────────────────────────
  if (query.isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48 rounded" />
        <div className="fppts-card p-6 space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="w-16 h-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32 rounded" />
              <Skeleton className="h-4 w-24 rounded" />
            </div>
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-full rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!u) {
    return (
      <p className="text-center py-20" style={{ color: "hsl(var(--muted-foreground))" }}>
        User not found.
      </p>
    );
  }

  const profile = u.profile;
  const role    = u.role as UserRole;

  return (
    <div className="max-w-2xl mx-auto space-y-6 stagger-children">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="shrink-0">
          <Link href="/dashboard/users">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <PageHeader title="User Detail" subtitle="View and manage user account" />
      </div>

      {/* Profile card */}
      <div className="fppts-card overflow-hidden">
        {/* Banner */}
        <div
          className="h-20"
          style={{
            background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(262 83% 70%) 100%)",
          }}
        />

        <div className="px-6 pb-6">
          {/* Avatar */}
          <div className="-mt-8 mb-4 flex items-end justify-between">
            <Avatar className="w-16 h-16 ring-4 ring-white shadow-md">
              <AvatarImage src={u.image ?? undefined} alt={u.name} />
              <AvatarFallback
                className={cn("text-lg font-bold", getAvatarColor(u.name))}
              >
                {getInitials(u.name)}
              </AvatarFallback>
            </Avatar>
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{
                background: "hsl(var(--accent))",
                color:      "hsl(var(--primary))",
              }}
            >
              {ROLE_LABELS[role]}
            </span>
          </div>

          <h2 className="text-lg font-bold" style={{ color: "hsl(var(--foreground))" }}>
            {u.name}
          </h2>
          <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
            {u.email}
          </p>

          {profile?.bio && (
            <p className="text-sm mt-3 leading-relaxed" style={{ color: "hsl(var(--muted-foreground))" }}>
              {profile.bio}
            </p>
          )}

          <Separator className="my-5" />

          {/* Info rows */}
          <div>
            <InfoRow label="Joined"        value={formatDate(u.createdAt)}               />
            <InfoRow label="Email Verified" value={u.emailVerified ? "Yes" : "No"}        />
            <InfoRow label="Total Projects" value={profile?.totalProjects ?? 0}            />
            <InfoRow label="Rating"        value={profile?.rating ? `${parseFloat(profile.rating).toFixed(1)} ★` : "—"} />
            {profile?.location    && <InfoRow label="Location"    value={profile.location}    />}
            {profile?.phone       && <InfoRow label="Phone"       value={profile.phone}       />}
            {profile?.companyName && <InfoRow label="Company"     value={profile.companyName} />}
            {profile?.hourlyRate  && <InfoRow label="Hourly Rate" value={`$${parseFloat(profile.hourlyRate).toFixed(0)}/hr`} />}
          </div>

          {/* Skills */}
          {(profile?.skills?.length ?? 0) > 0 && (
            <>
              <Separator className="my-5" />
              <div>
                <p className="text-xs font-semibold mb-3" style={{ color: "hsl(var(--muted-foreground))" }}>
                  SKILLS
                </p>
                <div className="flex flex-wrap gap-2">
                  {profile!.skills!.map((s) => (
                    <span
                      key={s}
                      className="text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{ background: "hsl(var(--accent))", color: "hsl(var(--primary))" }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Admin actions */}
      <RoleGate roles={["admin"]}>
        <div className="fppts-card p-6 space-y-5">
          <h2 className="text-sm font-bold" style={{ color: "hsl(var(--foreground))" }}>
            Admin Actions
          </h2>

          {/* Change role */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>
                Change Role
              </p>
              <p className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                Current: {ROLE_LABELS[role]}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Select
                defaultValue={role}
                onValueChange={(v) => setSelectedRole(v as UserRole)}
              >
                <SelectTrigger className="h-9 w-40 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={() => {
                  if (!selectedRole || selectedRole === role) return;
                  setRoleMutation.mutate({ userId: id, role: selectedRole });
                }}
                disabled={!selectedRole || selectedRole === role || setRoleMutation.isPending}
              >
                Save
              </Button>
            </div>
          </div>

          <Separator />

          {/* Delete */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium" style={{ color: "hsl(var(--status-overdue-fg))" }}>
                Remove User
              </p>
              <p className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                Permanently delete this account and all its data.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteOpen(true)}
              className="shrink-0 border-[hsl(var(--status-overdue-fg))] text-[hsl(var(--status-overdue-fg))] hover:bg-[hsl(var(--status-overdue-bg))]"
            >
              Remove
            </Button>
          </div>
        </div>
      </RoleGate>

      {/* Confirm delete */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Remove User"
        description={`Remove ${u.name}? This is permanent and cannot be undone.`}
        confirmLabel="Yes, Remove"
        onConfirm={() => removeMutation.mutate({ userId: id })}
        isLoading={removeMutation.isPending}
      />
    </div>
  );
}