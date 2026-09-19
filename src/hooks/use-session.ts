"use client";

import { authClient } from "@/server/better-auth/client";
import type { UserRole } from "@/lib/constants";

/**
 * Thin wrapper around better-auth's useSession so every component
 * imports from one place. If better-auth ever changes its API we
 * only touch this file.
 */
export function useSession() {
  const { data: session, isPending, error, refetch } = authClient.useSession();

  return {
    session,
    user:       session?.user ?? null,
    role:       (session?.user?.role ?? null) as UserRole | null,
    isPending,
    error,
    refetch,
    isLoggedIn: !!session?.user,
  };
}