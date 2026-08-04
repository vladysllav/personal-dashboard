import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { db } from "@/lib/db";
import { accounts, sessions, users, verificationTokens } from "@/lib/db/schema";

/**
 * Who is allowed in, by Google account email. This is a personal dashboard on a
 * public URL: without a gate, anyone who found it could read and rewrite your
 * goals.
 */
const allowedEmails = (process.env.ALLOWED_GOOGLE_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
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
      if (allowedEmails.length === 0) return false;
      // An unverified address proves nothing about who owns it, and the
      // allowlist is only as good as the identity behind the address.
      if (profile?.email_verified !== true) return false;
      const email = profile?.email;
      if (typeof email !== "string") return false;
      return allowedEmails.includes(email.toLowerCase());
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
