"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { api }           from "@/trpc/react";
import { useSession }    from "@/hooks/use-session";
import { useRole }       from "@/hooks/use-role";
import { formatCurrency, formatDate } from "@/lib/utils";

import { PageHeader }    from "@/components/layout/page-header";
import { StatusBadge }   from "@/components/shared/status-badge";
import { AvatarRow }     from "@/components/shared/avatar";
import { PdfDownloadBtn } from "@/components/shared/pdf-download-btn";
import { RoleGate }      from "@/components/shared/role-gate";
import { Button }        from "@/components/ui/button";
import { Separator }     from "@/components/ui/separator";
import { Skeleton }      from "@/components/ui/skeleton";
import type { PaymentStatus } from "@/lib/constants";

// ─────────────────────────────────────────────
// Info row helper
// ─────────────────────────────────────────────

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <span
        className="text-sm shrink-0"
        style={{ color: "hsl(var(--muted-foreground))" }}
      >
        {label}
      </span>
      <span
        className="text-sm font-semibold text-right"
        style={{ color: "hsl(var(--foreground))" }}
      >
        {children}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default function PaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id }        = use(params);
  const { user }      = useSession();
  const { isStaff }   = useRole();
  const utils         = api.useUtils();

  const query   = api.payment.byId.useQuery({ id });
  const payment = query.data;

  const downloadMutation = api.payment.downloadInvoice.useMutation();

  const approveMutation = api.payment.approve.useMutation({
    onSuccess: () => {
      toast.success("Payment approved.");
      void utils.payment.byId.invalidate({ id });
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Loading ──────────────────────────────────
  if (query.isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48 rounded" />
        <div className="fppts-card p-6 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-full rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!payment) {
    return (
      <p className="text-center py-20" style={{ color: "hsl(var(--muted-foreground))" }}>
        Payment not found.
      </p>
    );
  }

  const isOwner     = payment.fromUserId === user?.id;
  const canApprove  = isOwner && payment.status === "pending";
  const tax         = parseFloat(payment.invoice?.taxPercent ?? "0");
  const amount      = parseFloat(payment.amount);
  const taxAmount   = amount * (tax / 100);
  const total       = amount + taxAmount;

  return (
    <div className="max-w-2xl mx-auto space-y-6 stagger-children">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button asChild variant="ghost" size="icon" className="shrink-0 mt-0.5">
          <Link href="/dashboard/payments">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <PageHeader
          title={payment.invoice?.invoiceNumber ?? "Payment Detail"}
          subtitle={`Project: ${payment.project.title}`}
          actions={
            <PdfDownloadBtn
              fetcher={() => downloadMutation.mutateAsync({ paymentId: id })}
              label="Download Invoice"
              variant="outline"
            />
          }
        />
      </div>

      {/* Invoice card */}
      <div className="fppts-card overflow-hidden">
        {/* Coloured top bar */}
        <div
          className="h-2"
          style={{ background: "hsl(var(--primary))" }}
        />

        <div className="p-6 space-y-5">
          {/* Status */}
          <div className="flex items-center justify-between">
            <StatusBadge type="payment" status={payment.status as PaymentStatus} size="md" dot />
            {canApprove && (
              <Button
                size="sm"
                className="gap-2"
                onClick={() => approveMutation.mutate({ id })}
                disabled={approveMutation.isPending}
              >
                {approveMutation.isPending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <CheckCircle className="w-4 h-4" />}
                Approve Payment
              </Button>
            )}
          </div>

          <Separator />

          {/* Parties */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p
                className="text-[10px] font-semibold uppercase tracking-wider mb-2"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                From (Client)
              </p>
              <AvatarRow
                name={payment.payer.name}
                image={payment.payer.image ?? null}
                subtitle={payment.payer.email}
              />
            </div>
            <div>
              <p
                className="text-[10px] font-semibold uppercase tracking-wider mb-2"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                To (Freelancer)
              </p>
              <AvatarRow
                name={payment.payee.name}
                image={payment.payee.image ?? null}
                subtitle={payment.payee.email}
              />
            </div>
          </div>

          <Separator />

          {/* Details */}
          <div className="divide-y divide-[hsl(var(--border)/0.6)]">
            <InfoRow label="Project">
              <Link
                href={`/dashboard/projects/${payment.project.id}`}
                className="hover:underline"
                style={{ color: "hsl(var(--primary))" }}
              >
                {payment.project.title}
              </Link>
            </InfoRow>
            <InfoRow label="Description">
              {payment.description ?? "—"}
            </InfoRow>
            <InfoRow label="Invoice Number">
              <span className="font-mono">{payment.invoice?.invoiceNumber ?? "—"}</span>
            </InfoRow>
            <InfoRow label="Date Created">
              {formatDate(payment.createdAt)}
            </InfoRow>
            <InfoRow label="Due Date">
              {payment.invoice?.dueDate ? formatDate(payment.invoice.dueDate) : "—"}
            </InfoRow>
            {payment.paidAt && (
              <InfoRow label="Paid On">{formatDate(payment.paidAt)}</InfoRow>
            )}
          </div>

          <Separator />

          {/* Totals */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span style={{ color: "hsl(var(--muted-foreground))" }}>Subtotal</span>
              <span style={{ color: "hsl(var(--foreground))" }}>{formatCurrency(amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: "hsl(var(--muted-foreground))" }}>Tax ({tax}%)</span>
              <span style={{ color: "hsl(var(--foreground))" }}>{formatCurrency(taxAmount)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-base font-bold pt-1">
              <span style={{ color: "hsl(var(--foreground))" }}>Total Due</span>
              <span style={{ color: "hsl(var(--primary))" }}>{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Notes */}
          {payment.invoice?.notes && (
            <>
              <Separator />
              <div>
                <p
                  className="text-xs font-semibold mb-1"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  Notes
                </p>
                <p className="text-sm" style={{ color: "hsl(var(--foreground))" }}>
                  {payment.invoice.notes}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}