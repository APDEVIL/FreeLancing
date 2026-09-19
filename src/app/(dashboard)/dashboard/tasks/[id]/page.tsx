"use client";

import { use, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle, XCircle, Send, Loader2 } from "lucide-react";

import { api }           from "@/trpc/react";
import { useRole }       from "@/hooks/use-role";
import { useSession }    from "@/hooks/use-session";
import { formatDate }    from "@/lib/utils";

import { PageHeader }    from "@/components/layout/page-header";
import { StatusBadge }   from "@/components/shared/status-badge";
import { AvatarRow }     from "@/components/shared/avatar";
import { RoleGate }      from "@/components/shared/role-gate";
import { Button }        from "@/components/ui/button";
import { Textarea }      from "@/components/ui/textarea";
import { Skeleton }      from "@/components/ui/skeleton";
import { Separator }     from "@/components/ui/separator";
import type { TaskStatus } from "@/lib/constants";

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }           = use(params);
  const { user }         = useSession();
  const { isProjectManager } = useRole();
  const utils            = api.useUtils();

  const [submitNotes, setSubmitNotes]     = useState("");
  const [reviewNotes, setReviewNotes]     = useState("");

  const query = api.task.byId.useQuery({ id });
  const task  = query.data;

  const submitMutation = api.task.submit.useMutation({
    onSuccess: () => {
      toast.success("Work submitted successfully.");
      setSubmitNotes("");
      void utils.task.byId.invalidate({ id });
    },
    onError: (e) => toast.error(e.message),
  });

  const reviewMutation = api.task.review.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.approve ? "Task approved." : "Task rejected.");
      setReviewNotes("");
      void utils.task.byId.invalidate({ id });
    },
    onError: (e) => toast.error(e.message),
  });

  const updateStatusMutation = api.task.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated.");
      void utils.task.byId.invalidate({ id });
    },
    onError: (e) => toast.error(e.message),
  });

  if (query.isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-56 rounded" />
        <div className="fppts-card p-6 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-4 w-full rounded" />)}
        </div>
      </div>
    );
  }

  if (!task) return (
    <p className="text-center py-20" style={{ color: "hsl(var(--muted-foreground))" }}>Task not found.</p>
  );

  const isAssignee      = task.assignee.id === user?.id;
  const latestSubmission = task.submissions?.[task.submissions.length - 1];
  const canSubmit       = isAssignee && (task.status === "pending" || task.status === "in_progress" || task.status === "rejected");
  const canReview       = isProjectManager && task.status === "submitted";

  return (
    <div className="max-w-3xl mx-auto space-y-6 stagger-children">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button asChild variant="ghost" size="icon" className="shrink-0 mt-0.5">
          <Link href="/dashboard/tasks"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <PageHeader
          title={task.title}
          subtitle={`Project: ${task.project.title}`}
        />
      </div>

      {/* Info card */}
      <div className="fppts-card p-6 space-y-5">
        <div className="flex items-center gap-3 flex-wrap">
          <StatusBadge type="task" status={task.status as TaskStatus} size="md" dot />
          <span
            className="text-xs font-medium capitalize px-2.5 py-1 rounded-full"
            style={{ background: "hsl(var(--secondary))", color: "hsl(var(--muted-foreground))" }}
          >
            {task.priority} priority
          </span>
        </div>

        {task.description && (
          <p className="text-sm leading-relaxed" style={{ color: "hsl(var(--muted-foreground))" }}>
            {task.description}
          </p>
        )}

        <Separator />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 text-sm">
          <div>
            <p className="text-xs mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Assignee</p>
            <AvatarRow name={task.assignee.name} image={task.assignee.image ?? null} size="xs" />
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Assigned by</p>
            <AvatarRow name={task.creator.name} image={task.creator.image ?? null} size="xs" />
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Deadline</p>
            <p className="font-semibold text-sm" style={{ color: "hsl(var(--foreground))" }}>{formatDate(task.deadline)}</p>
          </div>
        </div>
      </div>

      {/* Mark In Progress — freelancer only */}
      {isAssignee && task.status === "pending" && (
        <div className="fppts-card p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>Ready to start?</p>
            <p className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>Mark this task as in progress.</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => updateStatusMutation.mutate({ id, status: "in_progress" })}
            disabled={updateStatusMutation.isPending}
            className="gap-2 shrink-0"
          >
            {updateStatusMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Start Task
          </Button>
        </div>
      )}

      {/* Submission history */}
      {(task.submissions?.length ?? 0) > 0 && (
        <div className="fppts-card p-6">
          <h2 className="text-sm font-bold mb-4" style={{ color: "hsl(var(--foreground))" }}>
            Submission History
          </h2>
          <div className="space-y-3">
            {task.submissions?.map((s, i) => (
              <div
                key={s.id}
                className="rounded-lg p-4 space-y-2"
                style={{ background: "hsl(var(--secondary))" }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold" style={{ color: "hsl(var(--muted-foreground))" }}>
                    Submission #{i + 1} · {formatDate(s.createdAt)}
                  </p>
                </div>
                {s.notes && (
                  <p className="text-sm" style={{ color: "hsl(var(--foreground))" }}>{s.notes}</p>
                )}
                {s.reviewNotes && (
                  <div
                    className="rounded-md px-3 py-2 text-xs"
                    style={{
                      background: "hsl(var(--status-pending-bg))",
                      color:      "hsl(var(--status-pending-fg))",
                    }}
                  >
                    <span className="font-semibold">Review note: </span>{s.reviewNotes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submit work — freelancer */}
      {canSubmit && (
        <div className="fppts-card p-6 space-y-4">
          <h2 className="text-sm font-bold" style={{ color: "hsl(var(--foreground))" }}>Submit Work</h2>
          <Textarea
            placeholder="Describe what you completed or add any notes for the reviewer…"
            rows={4}
            className="resize-none"
            value={submitNotes}
            onChange={(e) => setSubmitNotes(e.target.value)}
          />
          <Button
            onClick={() => submitMutation.mutate({ taskId: id, notes: submitNotes || undefined })}
            disabled={submitMutation.isPending}
            className="gap-2"
          >
            {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Submit for Review
          </Button>
        </div>
      )}

      {/* Review — PM */}
      {canReview && latestSubmission && (
        <div className="fppts-card p-6 space-y-4">
          <h2 className="text-sm font-bold" style={{ color: "hsl(var(--foreground))" }}>Review Submission</h2>
          <div
            className="rounded-lg p-4 text-sm"
            style={{ background: "hsl(var(--secondary))" }}
          >
            <p className="font-medium mb-1" style={{ color: "hsl(var(--foreground))" }}>Freelancer notes:</p>
            <p style={{ color: "hsl(var(--muted-foreground))" }}>
              {latestSubmission.notes ?? "No notes provided."}
            </p>
          </div>
          <Textarea
            placeholder="Add review feedback (optional)…"
            rows={3}
            className="resize-none"
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
          />
          <div className="flex items-center gap-3">
            <Button
              onClick={() => reviewMutation.mutate({
                submissionId: latestSubmission.id,
                taskId: id,
                approve: true,
                reviewNotes: reviewNotes || undefined,
              })}
              disabled={reviewMutation.isPending}
              className="gap-2"
            >
              {reviewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Approve
            </Button>
            <Button
              variant="outline"
              onClick={() => reviewMutation.mutate({
                submissionId: latestSubmission.id,
                taskId: id,
                approve: false,
                reviewNotes: reviewNotes || undefined,
              })}
              disabled={reviewMutation.isPending}
              className="gap-2"
              style={{ color: "hsl(var(--status-overdue-fg))", borderColor: "hsl(var(--status-overdue-fg))" }}
            >
              <XCircle className="w-4 h-4" />
              Reject
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}