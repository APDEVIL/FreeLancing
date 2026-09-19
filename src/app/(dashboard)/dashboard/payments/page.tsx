"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";

import { api }                from "@/trpc/react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { type PaymentStatus } from "@/lib/constants";

import { PageHeader }    from "@/components/layout/page-header";
import { DataTable }     from "@/components/shared/data-table";
import { FilterTabs }    from "@/components/shared/filter-tabs";
import { SearchInput }   from "@/components/shared/search-input";
import { StatusBadge }   from "@/components/shared/status-badge";
import { AvatarRow }     from "@/components/shared/avatar";
import { PdfDownloadBtn } from "@/components/shared/pdf-download-btn";
import { Button }        from "@/components/ui/button";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type TabValue = "all" | PaymentStatus;

interface PaymentRow {
  id:         string;
  invoiceNo:  string;
  payerName:  string;
  payerImage: string | null;
  payeeName:  string;
  payeeImage: string | null;
  project:    string;
  projectId:  string;
  amount:     string;
  dueDate:    Date | null;
  createdAt:  Date;
  status:     PaymentStatus;
}

// ─────────────────────────────────────────────
// Columns
// ─────────────────────────────────────────────

const buildColumns = (
  downloadMutation: ReturnType<typeof api.payment.downloadInvoice.useMutation>,
): ColumnDef<PaymentRow, unknown>[] => [
  {
    accessorKey: "invoiceNo",
    header: "Invoice ID",
    cell: ({ row }) => (
      <Link
        href={`/dashboard/payments/${row.original.id}`}
        className="font-mono text-xs font-semibold hover:underline"
        style={{ color: "hsl(var(--primary))" }}
      >
        {row.original.invoiceNo}
      </Link>
    ),
  },
  {
    accessorKey: "payerName",
    header: "Client",
    cell: ({ row }) => (
      <AvatarRow name={row.original.payerName} image={row.original.payerImage} size="xs" />
    ),
  },
  {
    accessorKey: "payeeName",
    header: "Freelancer",
    cell: ({ row }) => (
      <AvatarRow name={row.original.payeeName} image={row.original.payeeImage} size="xs" />
    ),
  },
  {
    accessorKey: "project",
    header: "Project",
    cell: ({ row }) => (
      <Link
        href={`/dashboard/projects/${row.original.projectId}`}
        className="text-xs truncate max-w-[120px] block hover:underline"
        style={{ color: "hsl(var(--muted-foreground))" }}
      >
        {row.original.project}
      </Link>
    ),
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => (
      <span className="amount-positive">{formatCurrency(row.original.amount)}</span>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => (
      <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
        {formatDate(row.original.createdAt)}
      </span>
    ),
  },
  {
    accessorKey: "dueDate",
    header: "Due Date",
    cell: ({ row }) => (
      <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
        {row.original.dueDate ? formatDate(row.original.dueDate) : "—"}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge type="payment" status={row.original.status} />,
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <div className="flex items-center gap-1">
        <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
          <Link href={`/dashboard/payments/${row.original.id}`}>View</Link>
        </Button>
        <PdfDownloadBtn
          fetcher={() =>
            downloadMutation.mutateAsync({ paymentId: row.original.id })
          }
          label=""
          size="icon"
          variant="ghost"
        />
      </div>
    ),
  },
];

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default function PaymentsPage() {
  const [tab,    setTab]    = useState<TabValue>("all");
  const [search, setSearch] = useState("");
  const [page,   setPage]   = useState(0);
  const pageSize = 20;

  const query = api.payment.list.useQuery({
    status: tab === "all" ? undefined : tab,
    limit:  pageSize,
    offset: page * pageSize,
  });

  const downloadMutation = api.payment.downloadInvoice.useMutation();

  // Download history report
  const historyMutation = api.payment.downloadHistory.useMutation();

  const rows: PaymentRow[] = useMemo(() => {
    const data = query.data ?? [];
    const q    = search.toLowerCase();
    return data
      .filter(
        (p) =>
          !q ||
          p.payer.name.toLowerCase().includes(q) ||
          p.payee.name.toLowerCase().includes(q) ||
          p.project.title.toLowerCase().includes(q) ||
          (p.invoice?.invoiceNumber ?? "").toLowerCase().includes(q),
      )
      .map((p) => ({
        id:         p.id,
        invoiceNo:  p.invoice?.invoiceNumber ?? `INV-${p.id.slice(0, 6).toUpperCase()}`,
        payerName:  p.payer.name,
        payerImage: p.payer.image ?? null,
        payeeName:  p.payee.name,
        payeeImage: p.payee.image ?? null,
        project:    p.project.title,
        projectId:  p.project.id,
        amount:     p.amount,
        dueDate:    p.invoice?.dueDate ? new Date(p.invoice.dueDate) : null,
        createdAt:  new Date(p.createdAt),
        status:     p.status as PaymentStatus,
      }));
  }, [query.data, search]);

  const allData = query.data ?? [];
  const tabs = [
    { value: "all",        label: "All Invoice", count: allData.length },
    { value: "completed",  label: "Paid",        count: allData.filter((p) => p.status === "completed").length  },
    { value: "pending",    label: "Pending",     count: allData.filter((p) => p.status === "pending").length    },
    { value: "failed",     label: "Overdue",     count: allData.filter((p) => p.status === "failed").length     },
    { value: "processing", label: "Processing",  count: allData.filter((p) => p.status === "processing").length },
  ];

  const columns = buildColumns(downloadMutation);

  return (
    <div className="space-y-6 stagger-children">
      <PageHeader
        title="Payments"
        subtitle="Track invoices and payment history"
        actions={
          <PdfDownloadBtn
            fetcher={() => historyMutation.mutateAsync({ status: tab === "all" ? undefined : tab as PaymentStatus })}
            label="Export Report"
            variant="outline"
          />
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <FilterTabs
          tabs={tabs}
          value={tab}
          onChange={(v) => { setTab(v as TabValue); setPage(0); }}
        />
        <div className="ml-auto">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(0); }}
            placeholder="Search invoices…"
          />
        </div>
      </div>

      {/* Table */}
      <div className="fppts-card overflow-hidden">
        <DataTable
          columns={columns}
          data={rows}
          isLoading={query.isLoading}
          pageIndex={page}
          pageSize={pageSize}
          totalCount={rows.length}
          onPageChange={setPage}
          emptyTitle="No payments found"
          emptyDesc="Payments will appear here once created."
        />
      </div>
    </div>
  );
}