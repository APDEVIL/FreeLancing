"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { api }         from "@/trpc/react";
import { formatDate }  from "@/lib/utils";
import { ROLE_LABELS, ROLE_OPTIONS, type UserRole } from "@/lib/constants";

import { PageHeader }    from "@/components/layout/page-header";
import { DataTable }     from "@/components/shared/data-table";
import { FilterTabs }    from "@/components/shared/filter-tabs";
import { SearchInput }   from "@/components/shared/search-input";
import { AvatarRow }     from "@/components/shared/avatar";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button }        from "@/components/ui/button";
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

type RoleFilter = "all" | UserRole;

interface UserRow {
  id:        string;
  name:      string;
  email:     string;
  image:     string | null;
  role:      UserRole;
  projects:  number;
  rating:    string;
  joinedAt:  Date;
}

// ─────────────────────────────────────────────
// Role badge
// ─────────────────────────────────────────────

const ROLE_BADGE: Record<UserRole, string> = {
  admin:           "bg-[hsl(var(--status-submitted-bg))] text-[hsl(var(--status-submitted-fg))]",
  project_manager: "bg-[hsl(var(--status-ongoing-bg))]   text-[hsl(var(--status-ongoing-fg))]",
  client:          "bg-[hsl(var(--status-pending-bg))]   text-[hsl(var(--status-pending-fg))]",
  freelancer:      "bg-[hsl(var(--status-paid-bg))]      text-[hsl(var(--status-paid-fg))]",
};

// ─────────────────────────────────────────────
// Columns
// ─────────────────────────────────────────────

const buildColumns = (
  onRoleChange: (userId: string, role: UserRole) => void,
  onDelete:     (userId: string) => void,
): ColumnDef<UserRow, unknown>[] => [
  {
    accessorKey: "name",
    header: "User",
    cell: ({ row }) => (
      <Link href={`/dashboard/users/${row.original.id}`}>
        <AvatarRow
          name={row.original.name}
          image={row.original.image}
          subtitle={row.original.email}
          size="sm"
        />
      </Link>
    ),
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => (
      <span
        className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${ROLE_BADGE[row.original.role]}`}
      >
        {ROLE_LABELS[row.original.role]}
      </span>
    ),
  },
  {
    accessorKey: "projects",
    header: "Projects",
    cell: ({ row }) => (
      <span className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
        {row.original.projects}
      </span>
    ),
  },
  {
    accessorKey: "rating",
    header: "Rating",
    cell: ({ row }) => (
      <span className="text-sm" style={{ color: "hsl(var(--foreground))" }}>
        {row.original.rating !== "0.00" ? `${parseFloat(row.original.rating).toFixed(1)} ★` : "—"}
      </span>
    ),
  },
  {
    accessorKey: "joinedAt",
    header: "Joined",
    cell: ({ row }) => (
      <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
        {formatDate(row.original.joinedAt)}
      </span>
    ),
  },
  {
    id: "actions",
    header: "Change Role",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Select
          defaultValue={row.original.role}
          onValueChange={(v) => onRoleChange(row.original.id, v as UserRole)}
        >
          <SelectTrigger className="h-7 w-36 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-[hsl(var(--status-overdue-fg))] hover:bg-[hsl(var(--status-overdue-bg))]"
          onClick={() => onDelete(row.original.id)}
        >
          Remove
        </Button>
      </div>
    ),
  },
];

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default function UsersPage() {
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [search,     setSearch]     = useState("");
  const [page,       setPage]       = useState(0);
  const [deleteId,   setDeleteId]   = useState<string | null>(null);
  const pageSize = 20;

  const utils = api.useUtils();

  const query = api.user.list.useQuery({
    role:   roleFilter === "all" ? undefined : roleFilter,
    search: search || undefined,
    limit:  pageSize,
    offset: page * pageSize,
  });

  const setRoleMutation = api.user.setRole.useMutation({
    onSuccess: () => {
      toast.success("Role updated.");
      void utils.user.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const removeMutation = api.user.remove.useMutation({
    onSuccess: () => {
      toast.success("User removed.");
      setDeleteId(null);
      void utils.user.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const rows: UserRow[] = useMemo(
    () =>
      (query.data ?? []).map((u) => ({
        id:       u.id,
        name:     u.name,
        email:    u.email,
        image:    u.image ?? null,
        role:     u.role as UserRole,
        projects: u.profile?.totalProjects ?? 0,
        rating:   u.profile?.rating ?? "0.00",
        joinedAt: new Date(u.createdAt),
      })),
    [query.data],
  );

  const allData   = query.data ?? [];
  const roleTabs  = [
    { value: "all",             label: "All",            count: allData.length },
    { value: "freelancer",      label: "Freelancers",    count: allData.filter((u) => u.role === "freelancer").length },
    { value: "client",          label: "Clients",        count: allData.filter((u) => u.role === "client").length },
    { value: "project_manager", label: "Managers",       count: allData.filter((u) => u.role === "project_manager").length },
    { value: "admin",           label: "Admins",         count: allData.filter((u) => u.role === "admin").length },
  ];

  const columns = buildColumns(
    (userId, role) => setRoleMutation.mutate({ userId, role }),
    (userId) => setDeleteId(userId),
  );

  return (
    <div className="space-y-6 stagger-children">
      <PageHeader
        title="Users"
        subtitle="Manage all platform users"
      />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <FilterTabs
          tabs={roleTabs}
          value={roleFilter}
          onChange={(v) => { setRoleFilter(v as RoleFilter); setPage(0); }}
        />
        <div className="ml-auto">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(0); }}
            placeholder="Search users…"
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
          emptyTitle="No users found"
          emptyDesc="Users will appear here after registration."
        />
      </div>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Remove User"
        description="This will permanently delete the user and all their data. This action cannot be undone."
        confirmLabel="Remove User"
        onConfirm={() => deleteId && removeMutation.mutate({ userId: deleteId })}
        isLoading={removeMutation.isPending}
      />
    </div>
  );
}