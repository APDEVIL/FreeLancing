"use client";

import { useSession } from "./use-session";
import type { UserRole } from "@/lib/constants";

/**
 * Returns the current user's role plus convenient boolean helpers.
 * All helpers follow the same hierarchy as the backend permissions.ts
 * so UI and API guards stay in sync.
 */
export function useRole() {
  const { role } = useSession();

  const is = (r: UserRole) => role === r;

  return {
    role,

    /** Full system access */
    isAdmin:          is("admin"),

    /** Admin OR project manager */
    isStaff:          role === "admin" || role === "project_manager",

    /** Admin OR project manager (alias for clarity) */
    isProjectManager: role === "admin" || role === "project_manager",

    /** Admin OR client */
    isClient:         role === "admin" || role === "client",

    /** Admin OR freelancer */
    isFreelancer:     role === "admin" || role === "freelancer",

    /**
     * Check if the current user can access a nav item.
     * Pass the item's `roles` array (undefined = all roles allowed).
     */
    canAccess: (roles?: UserRole[]) => {
      if (!role) return false;
      if (!roles || roles.length === 0) return true;
      return roles.includes(role);
    },
  };
}