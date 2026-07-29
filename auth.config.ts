import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";

/**
 * The edge-safe half of the auth setup. Middleware runs on the edge runtime and
 * cannot open a database connection, so everything that touches Drizzle lives in
 * `auth.ts` instead and this file stays importable from both.
 */
export const authConfig = {
  providers: [GitHub],
  pages: { signIn: "/login" },
  // Auth.js infers this on Vercel but throws UntrustedHost anywhere else, which
  // breaks `next start` and any non-Vercel host. Safe here: GitHub only ever
  // redirects to the callback URL registered on the OAuth app, and `signIn`
  // still gates on the allowlist.
  trustHost: true,
  callbacks: {
    authorized({ auth }) {
      return Boolean(auth?.user);
    },
  },
} satisfies NextAuthConfig;
