import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { auth } from "@/server/better-auth";
import { db }   from "@/server/db";
import type { UserRole } from "@/lib/constants";

// ─────────────────────────────────────────────
// 1. CONTEXT
// ─────────────────────────────────────────────

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await auth.api.getSession({ headers: opts.headers });

  // better-auth admin() plugin adds `role` to the user object.
  // We cast it here once so every router gets a typed role
  // without individual casts inside each procedure.
  const user = session?.user
    ? {
        ...session.user,
        // admin() plugin guarantees this field exists when the plugin is active.
        // Fallback to "freelancer" so unauthenticated callers never get admin access.
        role: (session.user.role ?? "freelancer") as UserRole,
      }
    : null;

  return {
    db,
    session: session ? { ...session, user } : null,
    ...opts,
  };
};

// Convenience type used in routers
export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

// ─────────────────────────────────────────────
// 2. INITIALIZATION
// ─────────────────────────────────────────────

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter    = t.router;

// ─────────────────────────────────────────────
// 3. MIDDLEWARE
// ─────────────────────────────────────────────

const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();
  console.log(`[TRPC] ${path} took ${Date.now() - start}ms`);
  return result;
});

// ─────────────────────────────────────────────
// 4. PROCEDURES
// ─────────────────────────────────────────────

/** Public — no auth required */
export const publicProcedure = t.procedure.use(timingMiddleware);

/**
 * Protected — requires a valid session.
 * `ctx.session.user.role` is typed as `UserRole` — no cast needed in routers.
 */
export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({
      ctx: {
        // session.user is non-nullable + role is typed UserRole from here down
        session: {
          ...ctx.session,
          user: ctx.session.user,
        },
      },
    });
  });