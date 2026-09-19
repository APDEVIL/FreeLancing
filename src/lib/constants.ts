import {
  LayoutDashboard,
  BarChart2,
  FolderKanban,
  CheckSquare,
  CreditCard,
  RedoIcon,
  FileText,
  MessageSquare,
  Users,
  UserCircle,
  Settings,
  HelpCircle,
  Info,
  LogOut,
  type LucideIcon,
} from "lucide-react";

// ─────────────────────────────────────────────
// Role types (mirror backend)
// ─────────────────────────────────────────────

export type UserRole = "admin" | "project_manager" | "client" | "freelancer";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin:           "Admin",
  project_manager: "Project Manager",
  client:          "Client",
  freelancer:      "Freelancer",
};

export const ROLE_OPTIONS = (
  Object.entries(ROLE_LABELS) as [UserRole, string][]
).map(([value, label]) => ({ value, label }));

// ─────────────────────────────────────────────
// Navigation
// ─────────────────────────────────────────────

export type NavItem = {
  label:     string;
  href:      string;
  icon:      LucideIcon;
  /** Roles that can see this item. Empty = all authenticated roles. */
  roles?:    UserRole[];
  /** Badge count key — resolved at runtime */
  badgeKey?: string;
};

export type NavSection = {
  section: string;
  items:   NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    section: "Main Menu",
    items: [
      {
        label: "Overview",
        href:  "/dashboard",
        icon:  LayoutDashboard,
      },
      {
        label: "Analytics",
        href:  "/dashboard/analytics",
        icon:  BarChart2,
        roles: ["admin", "project_manager"],
      },
      {
        label: "Projects",
        href:  "/dashboard/projects",
        icon:  FolderKanban,
      },
      {
        label: "Tasks",
        href:  "/dashboard/tasks",
        icon:  CheckSquare,
      },
      {
        label: "Freelancers",
        href:  "/dashboard/freelancers",
        icon:  Users,
        roles: ["admin", "project_manager", "client"],
      },
    ],
  },
  {
    section: "Transaction",
    items: [
      {
        label: "Payments",
        href:  "/dashboard/payments",
        icon:  CreditCard,
      },
      {
        label: "Invoices",
        href:  "/dashboard/payments",   // payments page has invoice tab
        icon:  FileText,
      },
      {
        label: "Messages",
        href:  "/dashboard/messages",
        icon:  MessageSquare,
        badgeKey: "unreadMessages",
      },
    ],
  },
  {
    section: "Management",
    items: [
      {
        label: "Users",
        href:  "/dashboard/users",
        icon:  Users,
        roles: ["admin"],
      },
      {
        label: "Profile",
        href:  "/dashboard/profile",
        icon:  UserCircle,
      },
    ],
  },
  {
    section: "Other",
    items: [
      {
        label: "Settings",
        href:  "/dashboard/settings",
        icon:  Settings,
        roles: ["admin"],
      },
      {
        label: "Support",
        href:  "/dashboard/support",
        icon:  HelpCircle,
      },
    ],
  },
];

// ─────────────────────────────────────────────
// Status configuration
// ─────────────────────────────────────────────

export type ProjectStatus  = "pending" | "ongoing" | "completed" | "cancelled";
export type TaskStatus     = "pending" | "in_progress" | "submitted" | "approved" | "rejected";
export type PaymentStatus  = "pending" | "processing" | "completed" | "failed" | "refunded";

type StatusConfig = {
  label:     string;
  /** Tailwind classes only — references CSS vars defined in globals.css */
  className: string;
};

export const PROJECT_STATUS_CONFIG: Record<ProjectStatus, StatusConfig> = {
  pending:   { label: "Pending",   className: "bg-[hsl(var(--status-pending-bg))]  text-[hsl(var(--status-pending-fg))]"  },
  ongoing:   { label: "Ongoing",   className: "bg-[hsl(var(--status-ongoing-bg))]  text-[hsl(var(--status-ongoing-fg))]"  },
  completed: { label: "Completed", className: "bg-[hsl(var(--status-paid-bg))]     text-[hsl(var(--status-paid-fg))]"     },
  cancelled: { label: "Cancelled", className: "bg-[hsl(var(--status-cancelled-bg))] text-[hsl(var(--status-cancelled-fg))]" },
};

export const TASK_STATUS_CONFIG: Record<TaskStatus, StatusConfig> = {
  pending:     { label: "Pending",     className: "bg-[hsl(var(--status-pending-bg))]   text-[hsl(var(--status-pending-fg))]"   },
  in_progress: { label: "In Progress", className: "bg-[hsl(var(--status-ongoing-bg))]   text-[hsl(var(--status-ongoing-fg))]"   },
  submitted:   { label: "Submitted",   className: "bg-[hsl(var(--status-submitted-bg))] text-[hsl(var(--status-submitted-fg))]" },
  approved:    { label: "Approved",    className: "bg-[hsl(var(--status-paid-bg))]      text-[hsl(var(--status-paid-fg))]"      },
  rejected:    { label: "Rejected",    className: "bg-[hsl(var(--status-overdue-bg))]   text-[hsl(var(--status-overdue-fg))]"   },
};

export const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, StatusConfig> = {
  pending:    { label: "Pending",    className: "bg-[hsl(var(--status-pending-bg))]  text-[hsl(var(--status-pending-fg))]"  },
  processing: { label: "Processing", className: "bg-[hsl(var(--status-ongoing-bg))]  text-[hsl(var(--status-ongoing-fg))]"  },
  completed:  { label: "Paid",       className: "bg-[hsl(var(--status-paid-bg))]     text-[hsl(var(--status-paid-fg))]"     },
  failed:     { label: "Failed",     className: "bg-[hsl(var(--status-overdue-bg))]  text-[hsl(var(--status-overdue-fg))]"  },
  refunded:   { label: "Refunded",   className: "bg-[hsl(var(--status-cancelled-bg))] text-[hsl(var(--status-cancelled-fg))]" },
};

// ─────────────────────────────────────────────
// Select options (for dropdowns / filters)
// ─────────────────────────────────────────────

export const PROJECT_CATEGORY_OPTIONS = [
  { value: "web",       label: "Web Development" },
  { value: "design",    label: "Design"          },
  { value: "app",       label: "App Development" },
  { value: "marketing", label: "Marketing"       },
  { value: "other",     label: "Other"           },
];

export const PRIORITY_OPTIONS = [
  { value: "low",    label: "Low"    },
  { value: "medium", label: "Medium" },
  { value: "high",   label: "High"   },
];

export const PROJECT_STATUS_OPTIONS = [
  { value: "pending",   label: "Pending"   },
  { value: "ongoing",   label: "Ongoing"   },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export const TASK_STATUS_OPTIONS = [
  { value: "pending",     label: "Pending"     },
  { value: "in_progress", label: "In Progress" },
  { value: "submitted",   label: "Submitted"   },
  { value: "approved",    label: "Approved"    },
  { value: "rejected",    label: "Rejected"    },
];

export const PAYMENT_STATUS_OPTIONS = [
  { value: "pending",    label: "Pending"    },
  { value: "processing", label: "Processing" },
  { value: "completed",  label: "Paid"       },
  { value: "failed",     label: "Failed"     },
  { value: "refunded",   label: "Refunded"   },
];

// ─────────────────────────────────────────────
// Chart colours (hex — used directly in recharts)
// ─────────────────────────────────────────────

export const CHART_COLORS = {
  purple: "#7C3AED",
  violet: "#8B5CF6",
  teal:   "#14B8A6",
  pink:   "#EC4899",
  amber:  "#F59E0B",
  blue:   "#3B82F6",
  muted:  "#E4E7ED",
} as const;

// Donut chart segments for payment overview
export const PAYMENT_DONUT_COLORS = {
  completed:  CHART_COLORS.purple,
  pending:    CHART_COLORS.teal,
  overdue:    CHART_COLORS.pink,
} as const;

// ─────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────

export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];