import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

/**
 * A local smoke test for the connection string. It reports the database error
 * verbatim, which is what makes it useful while wiring Neon up and what makes
 * it unacceptable in production: the text carries host and credential detail.
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not found", { status: 404 });
  }
  try {
    const rows = await db.select({ id: users.id }).from(users).limit(1);
    return Response.json({ ok: true, rows: rows.length });
  } catch (error) {
    return Response.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
