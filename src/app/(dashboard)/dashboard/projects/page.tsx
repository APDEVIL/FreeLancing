"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, FolderKanban, Calendar, DollarSign } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { api } from "@/trpc/react";
import { PROJECT_STATUS_OPTIONS, PROJECT_CATEGORY_OPTIONS, type ProjectStatus } from "@/lib/constants";

import { PageHeader }   from "@/components/layout/page-header";
import { DataTable }    from "@/components/shared/data-table";
import { FilterTabs }   from "@/components/shared/filter-tabs";
import { SearchInput }  from "@/components/shared/search-input";
import { StatusBadge }  from "@/components/shared/status-badge";
import { AvatarRow }    from "@/components/shared/avatar";
import { RoleGate }     from "@/components/shared/role-gate";
import { Button }       from "@/components/ui/button";
import { Badge }        from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type StatusFilter = "all" | ProjectStatus;

interface ProjectRow {
  id:           string;
  title:        string;
  category:     string;
  status:       ProjectStatus;
  priority:     string;
  budget:       string;
  deadline:     Date;
  clientName:   string;
  clientImage:  string | null;
  managerName:  string | null;
  taskCount:    number;
}

// ─────────────────────────────────────────────
// Priority badge
// ─────────────────────────────────────────────

const PRIORITY_STYLE: Record<string, string> = {
  high:   "bg-[hsl(var(--status-overdue-bg))]  text-[hsl(var(--status-overdue-fg))]",
  medium: "bg-[hsl(var(--status-pending-bg))]  text-[hsl(var(--status-pending-fg))]",
  low:    "bg-[hsl(var(--status-ongoing-bg))]  text-[hsl(var(--status-ongoing-fg))]",
};

// ─────────────────────────────────────────────
// Columns
// ─────────────────────────────────────────────

const columns: ColumnDef<ProjectRow, unknown>[] = [
  {
    accessorKey: "title",
    header: "Project",
    cell: ({ row }) => (
      <Link
        href={`/dashboard/projects/${row.original.id}`}
        className="font-semibold text-sm hover:underline"
        style={{ color: "hsl(var(--primary))" }}
      >
        {row.original.title}
      </Link>
    ),
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => (
      <span className="text-xs capitalize" style={{ color: "hsl(var(--muted-foreground))" }}>
        {row.original.category}
      </span>
    ),
  },
  {
    accessorKey: "clientName",
    header: "Client",
    cell: ({ row }) => (
      <AvatarRow name={row.original.clientName} image={row.original.clientImage} size="xs" />
    ),
  },
  {
    accessorKey: "budget",
    header: "Budget",
    cell: ({ row }) => (
      <span className="amount-positive">{formatCurrency(row.original.budget)}</span>
    ),
  },
  {
    accessorKey: "deadline",
    header: "Deadline",
    cell: ({ row }) => (
      <span className="text-xs flex items-center gap-1" style={{ color: "hsl(var(--muted-foreground))" }}>
        <Calendar className="w-3 h-3 shrink-0" />
        {formatDate(row.original.deadline)}
      </span>
    ),
  },
  {
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => (
      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${PRIORITY_STYLE[row.original.priority] ?? ""}`}>
        {row.original.priority}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <StatusBadge type="project" status={row.original.status} />
    ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
        <Link href={`/dashboard/projects/${row.original.id}`}>View</Link>
      </Button>
    ),
  },
];

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default function ProjectsPage() {
  const [statusFilter,   setStatusFilter]   = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [search,         setSearch]         = useState("");
  const [page,           setPage]           = useState(0);
  const pageSize = 20;

  const query = api.project.list.useQuery({
    status:   statusFilter === "all" ? undefined : statusFilter,
    category: categoryFilter === "all" ? undefined : (categoryFilter as "web" | "design" | "app" | "marketing" | "other"),
    limit:    pageSize,
    offset:   page * pageSize,
  });

  const rows: ProjectRow[] = useMemo(() => {
    const data = query.data ?? [];
    const q    = search.toLowerCase();
    return data
      .filter((p) => !q || p.title.toLowerCase().includes(q) || p.client.name.toLowerCase().includes(q))
      .map((p) => ({
        id:          p.id,
        title:       p.title,
        category:    p.category,
        status:      p.status as ProjectStatus,
        priority:    p.priority,
        budget:      p.budget,
        deadline:    new Date(p.deadline),
        clientName:  p.client.name,
        clientImage: p.client.image ?? null,
        managerName: p.manager?.name ?? null,
        taskCount:   0, // Tasks are fetched on the detail page
      }));
  }, [query.data, search]);

  // Status tab counts
  const allData    = query.data ?? [];
  const statusTabs = [
    { value: "all",       label: "All",       count: allData.length },
    { value: "ongoing",   label: "Ongoing",   count: allData.filter((p) => p.status === "ongoing").length },
    { value: "pending",   label: "Pending",   count: allData.filter((p) => p.status === "pending").length },
    { value: "completed", label: "Completed", count: allData.filter((p) => p.status === "completed").length },
    { value: "cancelled", label: "Cancelled", count: allData.filter((p) => p.status === "cancelled").length },
  ];

  return (
    <div className="space-y-6 stagger-children">
      <PageHeader
        title="Projects"
        subtitle="Manage and track all your projects"
        actions={
          <RoleGate roles={["client", "admin"]}>
            <Button asChild size="sm" className="gap-2">
              <Link href="/dashboard/projects/new">
                <Plus className="w-4 h-4" />
                New Project
              </Link>
            </Button>
          </RoleGate>
        }
      />

      {/* Filters row */}
      <div className="flex items-center gap-3 flex-wrap">
        <FilterTabs
          tabs={statusTabs}
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v as StatusFilter); setPage(0); }}
        />
        <div className="flex items-center gap-2 ml-auto">
          <Select
            value={categoryFilter}
            onValueChange={(v) => { setCategoryFilter(v); setPage(0); }}
          >
            <SelectTrigger className="h-9 w-36 text-xs">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {PROJECT_CATEGORY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(0); }}
            placeholder="Search projects…"
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
          onPageSizeChange={() => {}}
          emptyTitle="No projects found"
          emptyDesc="Create your first project to get started."
        />
      </div>
    </div>
  );
}