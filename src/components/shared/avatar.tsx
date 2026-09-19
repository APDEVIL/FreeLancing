import { cn, getInitials, getAvatarColor } from "@/lib/utils";
import {
  Avatar as ShadAvatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE_CLASSES: Record<AvatarSize, string> = {
  xs: "w-6 h-6",
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-12 h-12",
  xl: "w-16 h-16",
};

const FONT_CLASSES: Record<AvatarSize, string> = {
  xs: "text-[9px]",
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-lg",
};

interface UserAvatarProps {
  name?:      string | null;
  image?:     string | null;
  size?:      AvatarSize;
  /** Show a small green online indicator dot */
  online?:    boolean;
  className?: string;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function UserAvatar({
  name,
  image,
  size      = "md",
  online    = false,
  className,
}: UserAvatarProps) {
  return (
    <div className="relative inline-flex shrink-0">
      <ShadAvatar className={cn(SIZE_CLASSES[size], className)}>
        <AvatarImage src={image ?? undefined} alt={name ?? "User"} />
        <AvatarFallback
          className={cn(
            "font-semibold",
            FONT_CLASSES[size],
            getAvatarColor(name),
          )}
        >
          {getInitials(name)}
        </AvatarFallback>
      </ShadAvatar>

      {online && (
        <span
          className="absolute bottom-0 right-0 block w-2.5 h-2.5 rounded-full ring-2 ring-white"
          style={{ background: "hsl(142 72% 45%)" }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Avatar + name + subtitle row
// ─────────────────────────────────────────────

interface AvatarRowProps {
  name?:      string | null;
  image?:     string | null;
  subtitle?:  string | null;
  size?:      AvatarSize;
  online?:    boolean;
  className?: string;
}

export function AvatarRow({
  name,
  image,
  subtitle,
  size      = "sm",
  online    = false,
  className,
}: AvatarRowProps) {
  return (
    <div className={cn("flex items-center gap-2.5 min-w-0", className)}>
      <UserAvatar name={name} image={image} size={size} online={online} />
      <div className="min-w-0">
        <p
          className="text-sm font-semibold truncate leading-tight"
          style={{ color: "hsl(var(--foreground))" }}
        >
          {name ?? "—"}
        </p>
        {subtitle && (
          <p
            className="text-xs truncate leading-tight mt-0.5"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}