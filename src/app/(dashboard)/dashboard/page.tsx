"use client";

import { useMemo, useState } from "react";
import {
  FileText,
  DollarSign,
  XCircle,
  BarChart2,
  Plus,
  Filter,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";

import { api } from "@/trpc/react";
import { useSession } from "@/hooks/use-session";
import { useRole } from "@/hooks/use-role";
import {
  formatCurrency,
  formatDate,
  formatRelative,
} from "@/lib/utils";
import { CHART_COLORS } from "@/lib/constants";

import { PageHeader }   from "@/components/layout/page-header";
import { StatCard }     from "@/components/dashboard/stat-card";
import { IncomeChart, type IncomeChartItem } from "@/components/dashboard/income-chart";
import { DonutChart, buildDonutData }        from "@/components/dashboard/donut-chart";
import { TopClients, type TopClient }        from "@/components/dashboard/top-clients";
import { DataTable }    from "@/components/shared/data-table";
import { FilterTabs }   from "@/components/shared/filter-tabs";
import { StatusBadge }  from "@/components/shared/status-badge";
import { AvatarRow }    from "@/components/shared/avatar";
import { RoleGate }     from "@/components/shared/role-gate";
import { Button }       from "@/components/ui/button";
import { Skeleton }     from "@/components/ui/skeleton";
import type { PaymentStatus } from "@/lib/constants";

// ─────────────────────────────────────────────
// Payment row shape for the table
// ─────────────────────────────────────────────

interface PaymentRow {
  id:         string;
  invoiceNo:  string;
  clientName: string;
  clientEmail:string;
  clientImage:string | null;
  amount:     string;
  startDate:  Date;
  dueDate:    Date;
  status:     PaymentStatus;
}

// ─────────────────────────────────────────────
// Table column definitions
// ─────────────────────────────────────────────

const columns: ColumnDef<PaymentRow, unknown>[] = [
  {
    accessorKey: "invoiceNo",
    header: "Invoice ID",
    cell: ({ row }) => (
      <span className="font-mono text-xs font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>
        {row.original.invoiceNo}
      </span>
    ),
  },
  {
    accessorKey: "clientName",
    header: "Client",
    cell: ({ row }) => (
      <AvatarRow
        name={row.original.clientName}
        image={row.original.clientImage}
        subtitle={row.original.clientEmail}
        size="xs"
      />
    ),
  },
  {
    accessorKey: "clientEmail",
    header: "Email",
    cell: ({ row }) => (
      <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
        {row.original.clientEmail}
      </span>
    ),
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => (
      <span className="amount-positive">
        {formatCurrency(row.original.amount)}
      </span>
    ),
  },
  {
    accessorKey: "startDate",
    header: "Start Date",
    cell: ({ row }) => (
      <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
        {formatDate(row.original.startDate)}
      </span>
    ),
  },
  {
    accessorKey: "dueDate",
    header: "Due Date",
    cell: ({ row }) => (
      <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
        {formatDate(row.original.dueDate)}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <StatusBadge type="payment" status={row.original.status} />
    ),
  },
];

// ─────────────────────────────────────────────
// Filter tabs config
// ─────────────────────────────────────────────

type TabValue = "all" | "completed" | "pending" | "failed";

const TAB_CONFIG: { value: TabValue; label: string }[] = [
  { value: "all",       label: "All Invoice" },
  { value: "completed", label: "Paid"        },
  { value: "pending",   label: "Pending"     },
  { value: "failed",    label: "Overdue"     },
];

// ─────────────────────────────────────────────
// Stat skeleton
// ─────────────────────────────────────────────

function StatSkeleton() {
  return (
    <div className="fppts-card flex items-center gap-4 p-4">
      <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-24 rounded" />
        <Skeleton className="h-6 w-20 rounded" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default function DashboardPage() {
  const { user }               = useSession();
  const { isStaff, isClient }  = useRole();
  const [activeTab, setActiveTab] = useState<TabValue>("all");

  // ── Data fetching ────────────────────────────

  // Payments list
  const paymentsQuery = api.payment.list.useQuery({
    status: activeTab === "all" ? undefined : activeTab,
    limit:  20,
    offset: 0,
  });

  // Projects for PM/admin stats
  const projectsQuery = api.project.list.useQuery({
    limit: 100,
    offset: 0,
  });

  // ── Derived stats ────────────────────────────

  const payments = paymentsQuery.data ?? [];
  const projects = projectsQuery.data ?? [];

  const allPayments = api.payment.list.useQuery({ limit: 200, offset: 0 }).data ?? [];

  const stats = useMemo(() => {
    const totalInvoices = allPayments.length;
    const revenue       = allPayments.filter((p) => p.status === "completed").reduce((s, p) => s + parseFloat(p.amount), 0);
    const rejected      = allPayments.filter((p) => p.status === "failed").length;
    const avgPayment    = totalInvoices > 0 ? revenue / Math.max(allPayments.filter((p) => p.status === "completed").length, 1) : 0;
    return { totalInvoices, revenue, rejected, avgPayment };
  }, [allPayments]);

  // ── Chart data ───────────────────────────────

  const incomeChartData: IncomeChartItem[] = useMemo(() => {
    const byProject: Record<string, number> = {};
    allPayments
      .filter((p) => p.status === "completed")
      .forEach((p) => {
        const key = p.project?.title ?? "Unknown";
        byProject[key] = (byProject[key] ?? 0) + parseFloat(p.amount);
      });
    return Object.entries(byProject)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }));
  }, [allPayments]);

  const donutData = useMemo(() => buildDonutData(
    {
      count:  allPayments.filter((p) => p.status === "completed").length,
      amount: allPayments.filter((p) => p.status === "completed").reduce((s, p) => s + parseFloat(p.amount), 0),
    },
    {
      count:  allPayments.filter((p) => p.status === "pending").length,
      amount: allPayments.filter((p) => p.status === "pending").reduce((s, p) => s + parseFloat(p.amount), 0),
    },
    {
      count:  allPayments.filter((p) => p.status === "failed").length,
      amount: allPayments.filter((p) => p.status === "failed").reduce((s, p) => s + parseFloat(p.amount), 0),
    },
  ), [allPayments]);

  // ── Top clients ──────────────────────────────

  const topClients: TopClient[] = useMemo(() => {
    const map: Record<string, { name: string; image: string | null; total: number }> = {};
    allPayments
      .filter((p) => p.status === "completed")
      .forEach((p) => {
        const id = p.payer.id;
        if (!map[id]) map[id] = { name: p.payer.name, image: p.payer.image ?? null, total: 0 };
        map[id]!.total += parseFloat(p.amount);
      });
    return Object.entries(map)
      .sort(([, a], [, b]) => b.total - a.total)
      .slice(0, 4)
      .map(([id, v]) => ({ id, ...v }));
  }, [allPayments]);

  // ── Table rows ───────────────────────────────

  const tableRows: PaymentRow[] = useMemo(() =>
    payments.map((p) => ({
      id:          p.id,
      invoiceNo:   p.invoice?.invoiceNumber ?? `INV-${p.id.slice(0, 6).toUpperCase()}`,
      clientName:  p.payer.name,
      clientEmail: p.payer.email,
      clientImage: p.payer.image ?? null,
      amount:      p.amount,
      startDate:   new Date(p.createdAt),
      dueDate:     p.invoice?.dueDate ? new Date(p.invoice.dueDate) : new Date(p.updatedAt),
      status:      p.status as PaymentStatus,
    })),
  [payments]);

  // ── Tab counts ───────────────────────────────

  const tabsWithCount = TAB_CONFIG.map((t) => ({
    ...t,
    count: t.value === "all"
      ? allPayments.length
      : allPayments.filter((p) => p.status === t.value).length,
  }));

  const isLoading = paymentsQuery.isLoading;

  // ─────────────────────────────────────────────
  return (
    <div className="space-y-6 stagger-children">

      {/* ── Page header ───────────────────────── */}
      <PageHeader
        title="Overview"
        subtitle="Comprehensive Invoice Overview"
        actions={
          <RoleGate roles={["client"]}>
            <Button asChild size="sm" className="gap-2">
              <Link href="/dashboard/projects/new">
                <Plus className="w-4 h-4" />
                New Project
              </Link>
            </Button>
          </RoleGate>
        }
      />

      {/* ── Filter toggle row ─────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <FilterTabs
          tabs={[
            { value: "all",      label: "All"      },
            { value: "completed",label: "Paid"     },
            { value: "pending",  label: "Unpaid"   },
            { value: "failed",   label: "Overdue"  },
          ]}
          value={activeTab}
          onChange={(v) => setActiveTab(v as TabValue)}
        />
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2 text-xs h-8">
            <Filter className="w-3 h-3" />
            Filter
          </Button>
        </div>
      </div>

      {/* ── Stat cards ────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Total Invoices"
              value={stats.totalInvoices}
              change={12}
              icon={FileText}
              iconColor="violet"
            />
            <StatCard
              label="Revenue"
              value={formatCurrency(stats.revenue)}
              change={14}
              icon={DollarSign}
              iconColor="teal"
            />
            <StatCard
              label="Rejected"
              value={stats.rejected}
              change={-12}
              icon={XCircle}
              iconColor="pink"
            />
            <StatCard
              label="Avg Payment"
              value={formatCurrency(stats.avgPayment)}
              change={8}
              icon={BarChart2}
              iconColor="amber"
            />
          </>
        )}
      </div>

      {/* ── Middle row: Chart + Donut ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Income Statistics */}
        <div className="fppts-card p-5 lg:col-span-1">
          <h2
            className="text-sm font-bold mb-4"
            style={{ color: "hsl(var(--foreground))" }}
          >
            Income Statistics
          </h2>
          <IncomeChart
            data={incomeChartData}
            isLoading={paymentsQuery.isLoading}
          />
        </div>

        {/* Invoice Percentage */}
        <div className="fppts-card p-5 lg:col-span-1 flex flex-col">
          <h2
            className="text-sm font-bold mb-4"
            style={{ color: "hsl(var(--foreground))" }}
          >
            Invoice Percentage
          </h2>
          <div className="flex-1 flex items-center justify-center">
            <DonutChart
              data={donutData}
              isLoading={paymentsQuery.isLoading}
            />
          </div>
        </div>

        {/* Top Clients */}
        <div className="fppts-card p-5 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-sm font-bold"
              style={{ color: "hsl(var(--foreground))" }}
            >
              Top Clients
            </h2>
            <Link
              href="/dashboard/users"
              className="flex items-center gap-1 text-xs font-medium transition-colors hover:opacity-70"
              style={{ color: "hsl(var(--primary))" }}
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <TopClients
            clients={topClients}
            isLoading={paymentsQuery.isLoading}
          />
        </div>
      </div>

      {/* ── Invoice table ─────────────────────── */}
      <div className="fppts-card overflow-hidden">
        {/* Table header */}
        <div
          className="flex items-center justify-between gap-4 px-5 py-4"
          style={{ borderBottom: "1px solid hsl(var(--border))" }}
        >
          <h2
            className="text-sm font-bold"
            style={{ color: "hsl(var(--foreground))" }}
          >
            Invoice
          </h2>
          <div className="flex items-center gap-2">
            <FilterTabs
              tabs={tabsWithCount}
              value={activeTab}
              onChange={(v) => setActiveTab(v as TabValue)}
            />
            <Button variant="ghost" size="icon" className="w-8 h-8">
              <Filter className="w-3.5 h-3.5" style={{ color: "hsl(var(--muted-foreground))" }} />
            </Button>
          </div>
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={tableRows}
          isLoading={isLoading}
          emptyTitle="No invoices found"
          emptyDesc="Payments will appear here once created."
          showFooter={tableRows.length > 0}
        />
      </div>
    </div>
  );
}