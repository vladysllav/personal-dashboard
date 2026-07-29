import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { db } from "@/lib/db";
import { accounts, sessions, users, verificationTokens } from "@/lib/db/schema";

/**
 * Who is allowed in, by GitHub login. This is a personal dashboard on a public
 * URL: without a gate, anyone who found it could read and rewrite your goals.
 */
const allowedLogins = (process.env.ALLOWED_GITHUB_LOGINS ?? "")
  .split(",")
  .map((login) => login.trim().toLowerCase())
  .filter(Boolean);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  // JWT rather than database sessions so middleware can authorize on the edge
  // without a round trip to Neon on every request.
  session: { strategy: "jwt" },
  callbacks: {
    ...authConfig.callbacks,

    signIn({ profile }) {
      // Fail closed. An unset or empty allowlist locks everyone out, including
      // you — far better than a deploy that silently admits the whole internet.
      if (allowedLogins.length === 0) return false;
      const login = profile?.login;
      if (typeof login !== "string") return false;
      return allowedLogins.includes(login.toLowerCase());
    },

    jwt({ token, user }) {
      if (user?.id) token.userId = user.id;
      return token;
    },

    session({ session, token }) {
      if (typeof token.userId === "string") session.user.id = token.userId;
      return session;
    },
  },
});
