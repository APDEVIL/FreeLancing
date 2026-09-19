"use client";

import { useRole } from "@/hooks/use-role";
import type { UserRole } from "@/lib/constants";

interface RoleGateProps {
  /** Roles that are allowed to see the children */
  roles:      UserRole[];
  children:   React.ReactNode;
  /** What to render when access is denied — default nothing */
  fallback?:  React.ReactNode;
}

/**
 * Renders `children` only when the current user's role is in `roles`.
 * Use for hiding UI elements the user can't act on — the API still
 * enforces the real guard server-side.
 *
 * Example:
 *   <RoleGate roles={["admin"]}>
 *     <DeleteUserButton />
 *   </RoleGate>
 */
export function RoleGate({ roles, children, fallback = null }: RoleGateProps) {
  const { canAccess } = useRole();
  return canAccess(roles) ? <>{children}</> : <>{fallback}</>;
}