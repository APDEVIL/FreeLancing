import { redirect } from "next/navigation";
import { getSession } from "@/server/better-auth/server";

/**
 * Root "/" route — redirect based on auth state.
 * No UI rendered here; both destinations have their own layouts.
 */
export default async function RootPage() {
  const session = await getSession();
  if (session?.user) redirect("/dashboard");
  redirect("/login");
}