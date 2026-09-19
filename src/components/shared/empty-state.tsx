import { cn } from "@/lib/utils";
import { type LucideIcon, Inbox } from "lucide-react";

interface EmptyStateProps {
  title:        string;
  description?: string;
  icon?:        LucideIcon;
  action?:      React.ReactNode;
  className?:   string;
}

export function EmptyState({
  title,
  description,
  icon:   Icon    = Inbox,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-12 px-6 text-center",
        className,
      )}
    >
      {/* Icon ring */}
      <div
        className="flex items-center justify-center w-14 h-14 rounded-2xl"
        style={{
          background: "hsl(var(--accent))",
          border:     "1px dashed hsl(var(--primary) / 0.25)",
        }}
      >
        <Icon
          className="w-6 h-6"
          style={{ color: "hsl(var(--primary))" }}
        />
      </div>

      <div className="space-y-1 max-w-xs">
        <p
          className="text-sm font-semibold"
          style={{ color: "hsl(var(--foreground))" }}
        >
          {title}
        </p>
        {description && (
          <p
            className="text-xs leading-relaxed"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            {description}
          </p>
        )}
      </div>

      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}