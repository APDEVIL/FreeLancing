import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";

// ─────────────────────────────────────────────
// Tailwind class merger
// ─────────────────────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─────────────────────────────────────────────
// Currency formatting
// ─────────────────────────────────────────────

export function formatCurrency(
  amount: number | string,
  currency = "USD",
): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("en-US", {
    style:    "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

// ─────────────────────────────────────────────
// Date formatting
// ─────────────────────────────────────────────

/** Aug 19, 2026 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return format(d, "MMM d, yyyy");
}

/** 2:34 PM */
export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return format(d, "h:mm a");
}

/** Today · 2:34 PM  /  Yesterday  /  Aug 19 */
export function formatRelative(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  if (isToday(d))     return `Today · ${formatTime(d)}`;
  if (isYesterday(d)) return "Yesterday";
  return formatDate(d);
}

/** 3 hours ago */
export function formatTimeAgo(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return formatDistanceToNow(d, { addSuffix: true });
}

// ─────────────────────────────────────────────
// String helpers
// ─────────────────────────────────────────────

/** Get initials from a display name: "Dalton Estrada" → "DE" */
export function getInitials(name: string | null | undefined, max = 2): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, max)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** Capitalise first letter of each word */
export function toTitleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** snake_case / kebab-case → Title Case */
export function labelFromKey(key: string): string {
  return toTitleCase(key.replace(/[_-]/g, " "));
}

// ─────────────────────────────────────────────
// Number helpers
// ─────────────────────────────────────────────

/** 12000 → "12k" */
export function formatCompact(n: number): string {
  return new Intl.NumberFormat("en-US", {
    notation:           "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// ─────────────────────────────────────────────
// Misc
// ─────────────────────────────────────────────

/** Download a base64-encoded PDF string as a file in the browser */
export function downloadBase64Pdf(base64: string, filename: string): void {
  const byteCharacters = atob(base64);
  const byteNumbers    = Array.from(byteCharacters, (c) => c.charCodeAt(0));
  const blob           = new Blob([new Uint8Array(byteNumbers)], { type: "application/pdf" });
  const url            = URL.createObjectURL(blob);
  const a              = document.createElement("a");
  a.href              = url;
  a.download          = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Returns a colour for an avatar fallback based on name (deterministic) */
const AVATAR_COLORS = [
  "bg-violet-100 text-violet-700",
  "bg-teal-100 text-teal-700",
  "bg-pink-100 text-pink-700",
  "bg-amber-100 text-amber-700",
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
];

export function getAvatarColor(name: string | null | undefined): string {
  if (!name) return AVATAR_COLORS[0]!;
  const idx =
    name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) %
    AVATAR_COLORS.length;
  return AVATAR_COLORS[idx]!;
}