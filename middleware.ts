import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // Everything is private except the sign-in page and the auth endpoints
  // themselves — excluding those avoids a redirect loop.
  matcher: [
    "/((?!api/auth|login|_next/static|_next/image|favicon.ico|icon.svg).*)",
  ],
};
