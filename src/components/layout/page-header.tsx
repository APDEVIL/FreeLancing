import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title:     string;
  subtitle?: string;
  /** Right-side slot — pass buttons, filters, etc. */
  actions?:  React.ReactNode;
  className?: string;
}

/**
 * Consistent page header used at the top of every (dashboard) page.
 * Renders the title, optional subtitle, and a right-aligned actions slot.
 *
 * Example:
 *   <PageHeader
 *     title="Projects"
 *     subtitle="Manage and track all your projects"
 *     actions={<Button>New Project</Button>}
 *   />
 */
export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4 mb-6", className)}>
      <div className="min-w-0">
        <h1
          className="text-2xl font-bold tracking-tight truncate"
          style={{ color: "hsl(var(--foreground))" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className="text-sm mt-0.5 truncate"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}