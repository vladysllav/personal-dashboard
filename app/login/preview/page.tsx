import { notFound } from "next/navigation";
import { PreviewBody } from "./PreviewBody";

/**
 * A screenshot harness: every surface rendered against sample data, with no
 * database and no sign-in, so a design pass can be reviewed at any width.
 *
 * It sits under /login because that path is outside the auth middleware — and
 * for exactly that reason it must never answer in production, where an
 * unauthenticated route is a route anyone on the internet can open.
 */
export default function Preview() {
  if (process.env.NODE_ENV === "production") notFound();
  return <PreviewBody />;
}
