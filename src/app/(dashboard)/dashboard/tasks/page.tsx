"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Calendar } from "lucide-react";

import { api }          from "@/trpc/react";
import { useRole }      from "@/hooks/use-role";
import { formatDate }   from "@/lib/utils";
import { TASK_STATUS_OPTIONS, type TaskStatus } from "@/lib/constants";

import { PageHeader }   from "@/components/layout/page-header";
import { DataTable }    from "@/components/shared/data-table";
import { FilterTabs }   from "@/components/shared/filter-tabs";
import { SearchInput }  from "@/components/shared/search-input";
import { StatusBadge }  from "@/components/shared/status-badge";
import { AvatarRow }    from "@/components/shared/avatar";
import { Button }       from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type StatusFilter = "all" | TaskStatus;

interface TaskRow {
  id:           string;
  title:        string;
  projectTitle: string;
  projectId:    string;
  assigneeName: string;
  assigneeImg:  string | null;
  priority:     string;
  status:       TaskStatus;
  deadline:     Date;
}

const PRIORITY_STYLE: Record<string, string> = {
  high:   "bg-[hsl(var(--status-overdue-bg))]  text-[hsl(var(--status-overdue-fg))]",
  medium: "bg-[hsl(var(--status-pending-bg))]  text-[hsl(var(--status-pending-fg))]",
  low:    "bg-[hsl(var(--status-ongoing-bg))]  text-[hsl(var(--status-ongoing-fg))]",
};

// ─────────────────────────────────────────────
// Columns
// ─────────────────────────────────────────────

const columns: ColumnDef<TaskRow, unknown>[] = [
  {
    accessorKey: "title",
    header: "Task",
    cell: ({ row }) => (
      <Link
        href={`/dashboard/tasks/${row.original.id}`}
        className="font-semibold text-sm hover:underline"
        style={{ color: "hsl(var(--primary))" }}
      >
        {row.original.title}
      </Link>
    ),
  },
  {
    accessorKey: "projectTitle",
    header: "Project",
    cell: ({ row }) => (
      <Link
        href={`/dashboard/projects/${row.original.projectId}`}
        className="text-xs hover:underline truncate max-w-[140px] block"
        style={{ color: "hsl(var(--muted-foreground))" }}
      >
        {row.original.projectTitle}
      </Link>
    ),
  },
  {
    accessorKey: "assigneeName",
    header: "Assignee",
    cell: ({ row }) => (
      <AvatarRow name={row.original.assigneeName} image={row.original.assigneeImg} size="xs" />
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
    cell: ({ row }) => <StatusBadge type="task" status={row.original.status} />,
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
        <Link href={`/dashboard/tasks/${row.original.id}`}>View</Link>
      </Button>
    ),
  },
];

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default function TasksPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [search, setSearch]             = useState("");
  const [page, setPage]                 = useState(0);
  const pageSize = 20;

  const query = api.task.list.useQuery({
    status:   statusFilter === "all" ? undefined : statusFilter,
    priority: priorityFilter === "all" ? undefined : (priorityFilter as "low" | "medium" | "high"),
    limit:    pageSize,
    offset:   page * pageSize,
  });

  const rows: TaskRow[] = useMemo(() => {
    const data = query.data ?? [];
    const q    = search.toLowerCase();
    return data
      .filter((t) => !q || t.title.toLowerCase().includes(q))
      .map((t) => ({
        id:           t.id,
        title:        t.title,
        projectTitle: t.project.title,
        projectId:    t.project.id,
        assigneeName: t.assignee.name,
        assigneeImg:  t.assignee.image ?? null,
        priority:     t.priority,
        status:       t.status as TaskStatus,
        deadline:     new Date(t.deadline),
      }));
  }, [query.data, search]);

  const allData    = query.data ?? [];
  const statusTabs = [
    { value: "all",         label: "All",         count: allData.length },
    { value: "pending",     label: "Pending",     count: allData.filter((t) => t.status === "pending").length },
    { value: "in_progress", label: "In Progress", count: allData.filter((t) => t.status === "in_progress").length },
    { value: "submitted",   label: "Submitted",   count: allData.filter((t) => t.status === "submitted").length },
    { value: "approved",    label: "Approved",    count: allData.filter((t) => t.status === "approved").length },
  ];

  return (
    <div className="space-y-6 stagger-children">
      <PageHeader title="Tasks" subtitle="Track and manage all assigned tasks" />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <FilterTabs
          tabs={statusTabs}
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v as StatusFilter); setPage(0); }}
        />
        <div className="flex items-center gap-2 ml-auto">
          <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setPage(0); }}>
            <SelectTrigger className="h-9 w-32 text-xs">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Search tasks…" />
        </div>
      </div>

      <div className="fppts-card overflow-hidden">
        <DataTable
          columns={columns}
          data={rows}
          isLoading={query.isLoading}
          pageIndex={page}
          pageSize={pageSize}
          totalCount={rows.length}
          onPageChange={setPage}
          emptyTitle="No tasks found"
          emptyDesc="Tasks assigned to you will appear here."
        />
      </div>
    </div>
  );
}