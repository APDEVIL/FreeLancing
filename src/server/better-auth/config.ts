import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";

import { env } from "@/env";
import { db } from "@/server/db";

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,

  database: drizzleAdapter(db, {
    provider: "pg",
  }),

  emailAndPassword: {
    enabled: true,
  },

  socialProviders: {
    github: {
      clientId:     env.BETTER_AUTH_GITHUB_CLIENT_ID,
      clientSecret: env.BETTER_AUTH_GITHUB_CLIENT_SECRET,
      redirectURI:  `${env.BETTER_AUTH_URL}/api/auth/callback/github`,
    },
  },

  plugins: [
    admin({
      defaultRole: "freelancer",
      // ✅ ADDED: tell better-auth about your custom roles so types resolve correctly
      customRoles: ["freelancer", "client", "project_manager"],
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;