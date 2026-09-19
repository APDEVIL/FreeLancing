import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { cn, formatCurrency } from "@/lib/utils";
import { AvatarRow } from "@/components/shared/avatar";
import { Skeleton } from "@/components/ui/skeleton";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface TopClient {
  id:       string;
  name:     string;
  image?:   string | null;
  company?: string | null;
  total:    number;
}

interface TopClientsProps {
  clients:    TopClient[];
  isLoading?: boolean;
  className?: string;
}

// ─────────────────────────────────────────────
// Skeleton row
// ─────────────────────────────────────────────

function ClientRowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3">
      <Skeleton className="w-9 h-9 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-28 rounded" />
        <Skeleton className="h-2.5 w-20 rounded" />
      </div>
      <Skeleton className="h-3.5 w-16 rounded" />
    </div>
  );
}

// ─────────────────────────────────────────────
// Single row
// ─────────────────────────────────────────────

function ClientRow({ client }: { client: TopClient }) {
  return (
    <Link
      href={`/dashboard/users/${client.id}`}
      className={cn(
        "group flex items-center gap-3 py-3 px-1 rounded-lg",
        "transition-colors duration-150 hover:bg-[hsl(var(--secondary))]",
      )}
    >
      <AvatarRow
        name={client.name}
        image={client.image}
        subtitle={client.company ?? undefined}
        size="sm"
        className="flex-1 min-w-0"
      />

      <div className="flex items-center gap-1.5 shrink-0">
        <span
          className="text-sm font-bold"
          style={{ color: "hsl(var(--foreground))" }}
        >
          {formatCurrency(client.total)}
        </span>
        <ChevronRight
          className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: "hsl(var(--muted-foreground))" }}
        />
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function TopClients({ clients, isLoading = false, className }: TopClientsProps) {
  return (
    <div className={cn("divide-y divide-[hsl(var(--border)/0.6)]", className)}>
      {isLoading
        ? Array.from({ length: 4 }).map((_, i) => <ClientRowSkeleton key={i} />)
        : clients.length === 0
          ? (
            <p
              className="text-sm text-center py-8"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              No clients yet.
            </p>
          )
          : clients.map((client) => (
            <ClientRow key={client.id} client={client} />
          ))}
    </div>
  );
}