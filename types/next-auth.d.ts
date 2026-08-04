import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }

  /**
   * Google's id token carries `email_verified`; the base Profile type omits it.
   */
  interface Profile {
    email_verified?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
  }
}
