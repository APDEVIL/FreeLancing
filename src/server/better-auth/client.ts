import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [
    adminClient(), // ← mirrors the server plugin, types session.user.role on the client
  ],
});

export type Session = typeof authClient.$Infer.Session;