import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Server-side env vars — never exposed to the browser
   */
  server: {
    DATABASE_URL:                  z.string().url(),
    BETTER_AUTH_SECRET:            z.string().min(1),
    BETTER_AUTH_URL:               z.string().url(),
    BETTER_AUTH_GITHUB_CLIENT_ID:  z.string().min(1),
    BETTER_AUTH_GITHUB_CLIENT_SECRET: z.string().min(1),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  },

  /**
   * Client-side env vars — must be prefixed with NEXT_PUBLIC_
   * Add any public vars here if needed in the future
   */
  client: {},

  /**
   * Destructure all vars here so Next.js can statically analyze them
   */
  runtimeEnv: {
    DATABASE_URL:                     process.env.DATABASE_URL,
    BETTER_AUTH_SECRET:               process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL:                  process.env.BETTER_AUTH_URL,
    BETTER_AUTH_GITHUB_CLIENT_ID:     process.env.BETTER_AUTH_GITHUB_CLIENT_ID,
    BETTER_AUTH_GITHUB_CLIENT_SECRET: process.env.BETTER_AUTH_GITHUB_CLIENT_SECRET,
    NODE_ENV:                         process.env.NODE_ENV,
  },

  /**
   * Skip env validation when building Docker images / CI
   * set SKIP_ENV_VALIDATION=1
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,

  /**
   * Treat empty strings as undefined
   */
  emptyStringAsUndefined: true,
});