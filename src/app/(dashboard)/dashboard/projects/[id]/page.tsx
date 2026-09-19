"use client";

import { use, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Calendar, DollarSign, Users, CheckSquare,
  Edit, Trash2, UserPlus, Plus, ArrowLeft,
} from "lucide-react";

import { api }           from "@/trpc/react";
import { useRole }       from "@/hooks/use-role";
import { formatDate, formatCurrency, cn } from "@/lib/utils";

import { PageHeader }    from "@/components/layout/page-header";
import { StatusBadge }   from "@/components/shared/status-badge";
import { AvatarRow }     from "@/components/shared/avatar";
import { RoleGate }      from "@/components/shared/role-gate";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PdfDownloadBtn } from "@/components/shared/pdf-download-btn";
import { TaskForm }      from "@/components/form/task-form";
import { PaymentForm }   from "@/components/form/payment-form";
import { Button }        from "@/components/ui/button";
import { Skeleton }      from "@/components/ui/skeleton";
import { Separator }     from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import type { ProjectStatus, TaskStatus } from "@/lib/constants";

// ─────────────────────────────────────────────
// Stat pill used in the detail header
// ─────────────────────────────────────────────

function DetailStat({
  icon: Icon, label, value,
}: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
        style={{ background: "hsl(var(--accent))" }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color: "hsl(var(--primary))" }} />
      </div>
      <div>
        <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>{label}</p>
        <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>{value}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }        = use(params);
  const { isStaff, isClient, isProjectManager } = useRole();
  const utils         = api.useUtils();

  const [deleteOpen,  setDeleteOpen]  = useState(false);
  const [taskOpen,    setTaskOpen]    = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const query = api.project.byId.useQuery({ id });
  const project = query.data;

  // ── Mutations ────────────────────────────────
  const respondMutation = api.project.respondToOffer.useMutation({
    onSuccess: () => {
      toast.success("Response recorded.");
      void utils.project.byId.invalidate({ id });
    },
    onError: (e) => toast.error(e.message),
  });

  const removeMemberMutation = api.project.removeMember.useMutation({
    onSuccess: () => {
      toast.success("Member removed.");
      void utils.project.byId.invalidate({ id });
    },
    onError: (e) => toast.error(e.message),
  });

  // ── PDF ──────────────────────────────────────
  const downloadSummaryMutation = api.project.downloadSummary.useMutation();

  // ── Loading ──────────────────────────────────
  if (query.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64 rounded" />
        <div className="fppts-card p-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-4 w-full rounded" />)}
        </div>
      </div>
    );
  }

  if (!project) return (
    <div className="text-center py-20" style={{ color: "hsl(var(--muted-foreground))" }}>
      Project not found.
    </div>
  );

  const acceptedMembers = project.members.filter((m) => m.acceptedAt);
  const pendingMembers  = project.members.filter((m) => !m.acceptedAt);
  const recipients      = acceptedMembers.map((m) => ({
    id:    m.user.id,
    name:  m.user.name,
    email: m.user.email,
  }));
  const taskMembers = acceptedMembers.map((m) => ({
    id:    m.user.id,
    name:  m.user.name,
    image: m.user.image ?? null,
  }));

  return (
    <div className="space-y-6 stagger-children">
      {/* ── Header ──────────────────────────────── */}
      <div className="flex items-start gap-3">
        <Button asChild variant="ghost" size="icon" className="shrink-0 mt-0.5">
          <Link href="/dashboard/projects"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <PageHeader
          title={project.title}
          subtitle={`${project.category} · Created ${formatDate(project.createdAt)}`}
          actions={
            <div className="flex items-center gap-2">
              <RoleGate roles={["admin", "project_manager"]}>
                <PdfDownloadBtn
                  fetcher={() => downloadSummaryMutation.mutateAsync({ projectId: id })}
                  label="Summary PDF"
                  variant="outline"
                />
              </RoleGate>
              <RoleGate roles={["admin", "client"]}>
                <Button asChild variant="outline" size="sm" className="gap-2">
                  <Link href={`/dashboard/projects/${id}/edit`}>
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </Link>
                </Button>
              </RoleGate>
            </div>
          }
        />
      </div>

      {/* ── Info card ───────────────────────────── */}
      <div className="fppts-card p-6 space-y-5">
        {/* Status + Priority */}
        <div className="flex items-center gap-3 flex-wrap">
          <StatusBadge type="project" status={project.status as ProjectStatus} size="md" dot />
          <span
            className="text-xs font-medium capitalize px-2.5 py-1 rounded-full"
            style={{
              background: "hsl(var(--secondary))",
              color:      "hsl(var(--muted-foreground))",
            }}
          >
            {project.priority} priority
          </span>
        </div>

        {/* Description */}
        <p className="text-sm leading-relaxed" style={{ color: "hsl(var(--muted-foreground))" }}>
          {project.description}
        </p>

        <Separator />

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          <DetailStat icon={DollarSign} label="Budget"   value={formatCurrency(project.budget)} />
          <DetailStat icon={Calendar}   label="Deadline" value={formatDate(project.deadline)}  />
          <DetailStat icon={Users}      label="Members"  value={String(acceptedMembers.length)} />
          <DetailStat icon={CheckSquare} label="Tasks"   value={String(project.tasks?.length ?? 0)} />
        </div>

        <Separator />

        {/* Client + Manager */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: "hsl(var(--muted-foreground))" }}>Client</p>
            <AvatarRow name={project.client.name} image={project.client.image ?? null} subtitle={project.client.email} />
          </div>
          {project.manager && (
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: "hsl(var(--muted-foreground))" }}>Project Manager</p>
              <AvatarRow name={project.manager.name} image={project.manager.image ?? null} subtitle={project.manager.email} />
            </div>
          )}
        </div>
      </div>

      {/* ── Members ─────────────────────────────── */}
      <div className="fppts-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold" style={{ color: "hsl(var(--foreground))" }}>
            Team Members
            {pendingMembers.length > 0 && (
              <span
                className="ml-2 text-xs px-1.5 py-0.5 rounded-full"
                style={{ background: "hsl(var(--status-pending-bg))", color: "hsl(var(--status-pending-fg))" }}
              >
                {pendingMembers.length} pending
              </span>
            )}
          </h2>
          <RoleGate roles={["admin", "client"]}>
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link href="/dashboard/freelancers">
                <UserPlus className="w-3.5 h-3.5" /> Invite
              </Link>
            </Button>
          </RoleGate>
        </div>

        {project.members.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: "hsl(var(--muted-foreground))" }}>
            No team members yet.
          </p>
        ) : (
          <div className="divide-y divide-[hsl(var(--border)/0.6)]">
            {project.members.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-3">
                <AvatarRow
                  name={m.user.name}
                  image={m.user.image ?? null}
                  subtitle={m.acceptedAt ? "Active member" : "Invite pending"}
                  size="sm"
                />
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-[11px] font-semibold px-2 py-0.5 rounded-full",
                      m.acceptedAt
                        ? "bg-[hsl(var(--status-paid-bg))] text-[hsl(var(--status-paid-fg))]"
                        : "bg-[hsl(var(--status-pending-bg))] text-[hsl(var(--status-pending-fg))]",
                    )}
                  >
                    {m.acceptedAt ? "Active" : "Pending"}
                  </span>
                  <RoleGate roles={["admin", "project_manager"]}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 text-[hsl(var(--status-overdue-fg))] hover:bg-[hsl(var(--status-overdue-bg))]"
                      onClick={() => removeMemberMutation.mutate({ memberId: m.id })}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </RoleGate>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Tasks ───────────────────────────────── */}
      <div className="fppts-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold" style={{ color: "hsl(var(--foreground))" }}>Tasks</h2>
          <RoleGate roles={["admin", "project_manager"]}>
            <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-2">
                  <Plus className="w-3.5 h-3.5" /> Assign Task
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Assign Task</DialogTitle>
                </DialogHeader>
                <TaskForm
                  projectId={id}
                  members={taskMembers}
                  onSuccess={() => { setTaskOpen(false); void utils.project.byId.invalidate({ id }); }}
                  onCancel={() => setTaskOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </RoleGate>
        </div>

        {(project.tasks?.length ?? 0) === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: "hsl(var(--muted-foreground))" }}>
            No tasks assigned yet.
          </p>
        ) : (
          <div className="divide-y divide-[hsl(var(--border)/0.6)]">
            {project.tasks?.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  <Link
                    href={`/dashboard/tasks/${t.id}`}
                    className="text-sm font-medium hover:underline truncate block"
                    style={{ color: "hsl(var(--foreground))" }}
                  >
                    {t.title}
                  </Link>
                  <p className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                    Due {formatDate(t.deadline)}
                  </p>
                </div>
                <StatusBadge type="task" status={t.status as TaskStatus} size="sm" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Payments ────────────────────────────── */}
      <div className="fppts-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold" style={{ color: "hsl(var(--foreground))" }}>Payments</h2>
          <RoleGate roles={["admin", "client"]}>
            <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-2">
                  <Plus className="w-3.5 h-3.5" /> New Payment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create Payment</DialogTitle>
                </DialogHeader>
                <PaymentForm
                  projectId={id}
                  recipients={recipients}
                  onSuccess={() => { setPaymentOpen(false); void utils.project.byId.invalidate({ id }); }}
                  onCancel={() => setPaymentOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </RoleGate>
        </div>

        {(project.payments?.length ?? 0) === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: "hsl(var(--muted-foreground))" }}>
            No payments yet.
          </p>
        ) : (
          <div className="divide-y divide-[hsl(var(--border)/0.6)]">
            {project.payments?.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-semibold amount-positive">{formatCurrency(p.amount)}</p>
                  <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                    {formatDate(p.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge type="payment" status={p.status as import("@/lib/constants").PaymentStatus} size="sm" />
                  <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                    <Link href={`/dashboard/payments/${p.id}`}>View</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}