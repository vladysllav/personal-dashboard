import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * The edge-safe half of the auth setup. Middleware runs on the edge runtime and
 * cannot open a database connection, so everything that touches Drizzle lives in
 * `auth.ts` instead and this file stays importable from both.
 */
export const authConfig = {
  providers: [Google],
  pages: { signIn: "/login" },
  // Auth.js infers this on Vercel but throws UntrustedHost anywhere else, which
  // breaks `next start` and any non-Vercel host. Safe here: Google only ever
  // redirects to a redirect URI registered on the OAuth client, and `signIn`
  // still gates on the allowlist.
  trustHost: true,
  callbacks: {
    authorized({ auth }) {
      return Boolean(auth?.user);
    },
  },
} satisfies NextAuthConfig;
