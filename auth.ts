import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { db } from "@/lib/db";
import { accounts, sessions, users, verificationTokens } from "@/lib/db/schema";
import { isAllowedTelegramId, verifyInitData } from "@/lib/telegram";

/**
 * Who is allowed in, by Google account email. This is a personal dashboard on a
 * public URL: without a gate, anyone who found it could read and rewrite your
 * goals.
 */
const allowedEmails = (process.env.ALLOWED_GOOGLE_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

/**
 * The account a Telegram sign-in resolves to.
 *
 * Telegram and Google are two doors into one dashboard, not two accounts: the
 * Mini App has to land on the same goals the browser shows. Rather than storing
 * a second identity, a Telegram session is attached to the row that already
 * belongs to the allowlisted Google address, so both doors open onto the same
 * data and deleting the link is a matter of clearing one variable.
 */
const telegramLinkEmail = (
  process.env.TELEGRAM_LINK_EMAIL ?? allowedEmails[0] ?? ""
).toLowerCase();

/**
 * Sign in from inside Telegram.
 *
 * `authorize` is the whole gate: it runs on the server, the signature proves
 * the payload came from Telegram with our bot token, and the id allowlist
 * decides whether that person is you. A null return is a refusal — Auth.js
 * reports all of them identically, which is what we want.
 */
const telegram = Credentials({
  id: "telegram",
  name: "Telegram",
  credentials: { initData: { label: "initData", type: "text" } },
  async authorize(credentials) {
    const initData = credentials?.initData;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (typeof initData !== "string" || !botToken) return null;

    const tgUser = verifyInitData(initData, botToken);
    if (!tgUser) return null;
    if (!isAllowedTelegramId(tgUser.id)) return null;
    if (!telegramLinkEmail) return null;

    // The row must already exist: it is created the first time you sign in
    // with Google. Creating one here would silently fork your data into a
    // second account that looks empty.
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.email, telegramLinkEmail))
      .limit(1);
    if (!row) return null;

    return { id: row.id, email: row.email, name: row.name, image: row.image };
  },
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [...authConfig.providers, telegram],
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

    signIn({ account, profile }) {
      // The Telegram provider has already proved who this is, against a
      // signature and its own allowlist. Running the Google checks on it would
      // reject it for having no OAuth profile.
      if (account?.provider === "telegram") return true;

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
