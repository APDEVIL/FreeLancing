"use client";

import {
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, ChevronUp, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "./empty-state";
import { PAGE_SIZE_OPTIONS } from "@/lib/constants";

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────

interface DataTableProps<TData> {
  columns:      ColumnDef<TData, unknown>[];
  data:         TData[];
  isLoading?:   boolean;
  /** Total row count for server-side pagination */
  totalCount?:  number;
  /** Current page index (0-based), for controlled mode */
  pageIndex?:   number;
  pageSize?:    number;
  onPageChange?:     (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  /** Show row count label in footer */
  showFooter?:  boolean;
  className?:   string;
  emptyTitle?:  string;
  emptyDesc?:   string;
}

// ─────────────────────────────────────────────
// Sort icon helper
// ─────────────────────────────────────────────

function SortIcon({ dir }: { dir: false | "asc" | "desc" }) {
  if (dir === "asc")  return <ChevronUp   className="w-3.5 h-3.5 ml-1 shrink-0" />;
  if (dir === "desc") return <ChevronDown className="w-3.5 h-3.5 ml-1 shrink-0" />;
  return (
    <ChevronsUpDown
      className="w-3.5 h-3.5 ml-1 shrink-0 opacity-0 group-hover:opacity-40 transition-opacity"
    />
  );
}

// ─────────────────────────────────────────────
// Skeleton rows
// ─────────────────────────────────────────────

function LoadingRows({ rows, cols }: { rows: number; cols: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, ri) => (
        <tr key={ri} className="border-b border-border/60">
          {Array.from({ length: cols }).map((_, ci) => (
            <td key={ci} className="px-4 py-3">
              <Skeleton className="h-4 w-full rounded" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

export function DataTable<TData>({
  columns,
  data,
  isLoading     = false,
  totalCount,
  pageIndex     = 0,
  pageSize      = 20,
  onPageChange,
  onPageSizeChange,
  showFooter    = true,
  className,
  emptyTitle    = "No results found",
  emptyDesc     = "Try adjusting your search or filters.",
}: DataTableProps<TData>) {
  const [sorting,         setSorting]         = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const isControlled = !!onPageChange;
  const total        = totalCount ?? data.length;
  const pageCount    = Math.ceil(total / pageSize);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      ...(isControlled
        ? { pagination: { pageIndex, pageSize } }
        : {}),
    },
    onSortingChange:         setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel:         getCoreRowModel(),
    getSortedRowModel:       getSortedRowModel(),
    // Only use built-in pagination when not controlled
    ...(isControlled
      ? { manualPagination: true, pageCount }
      : { getPaginationRowModel: getPaginationRowModel() }),
  });

  const currentPage  = isControlled ? pageIndex : table.getState().pagination.pageIndex;
  const canPrev      = currentPage > 0;
  const canNext      = currentPage < pageCount - 1;
  const handlePrev   = () => isControlled ? onPageChange?.(currentPage - 1) : table.previousPage();
  const handleNext   = () => isControlled ? onPageChange?.(currentPage + 1) : table.nextPage();

  const rows = table.getRowModel().rows;
  const showEmpty = !isLoading && rows.length === 0;

  return (
    <div className={cn("flex flex-col", className)}>
      {/* ── Table ─────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="fppts-table w-full border-collapse">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sortDir = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                      className={cn(canSort && "cursor-pointer select-none")}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      <span className="group inline-flex items-center">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && <SortIcon dir={sortDir} />}
                      </span>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              <LoadingRows rows={6} cols={columns.length} />
            ) : showEmpty ? (
              <tr>
                <td colSpan={columns.length} className="py-16">
                  <EmptyState title={emptyTitle} description={emptyDesc} />
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Footer / Pagination ───────────────── */}
      {showFooter && (
        <div
          className="flex items-center justify-between gap-4 px-4 py-3 border-t"
          style={{ borderColor: "hsl(var(--border))" }}
        >
          {/* Row count */}
          <p className="text-xs shrink-0" style={{ color: "hsl(var(--muted-foreground))" }}>
            {isLoading
              ? "Loading…"
              : `${total.toLocaleString()} row${total !== 1 ? "s" : ""}`}
          </p>

          <div className="flex items-center gap-3">
            {/* Page size */}
            {onPageSizeChange && (
              <div className="flex items-center gap-2">
                <span className="text-xs shrink-0" style={{ color: "hsl(var(--muted-foreground))" }}>
                  Rows per page
                </span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => onPageSizeChange(Number(v))}
                >
                  <SelectTrigger className="h-7 w-16 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((s) => (
                      <SelectItem key={s} value={String(s)} className="text-xs">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Prev / Next */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7"
                onClick={handlePrev}
                disabled={!canPrev || isLoading}
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs min-w-[80px] text-center" style={{ color: "hsl(var(--muted-foreground))" }}>
                Page {currentPage + 1} of {Math.max(pageCount, 1)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7"
                onClick={handleNext}
                disabled={!canNext || isLoading}
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}