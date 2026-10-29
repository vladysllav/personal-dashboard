import { auth } from "@/auth";
import { loadState } from "@/lib/server/state";

/**
 * The signed-in user's whole dashboard, as JSON.
 *
 * The app shell no longer waits on this to render: the page is sent at once
 * with the loading screen over it, and a script in its first bytes starts this
 * request while the bundle is still downloading. Whichever finishes last, the
 * two are already in flight together.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const state = await loadState(user.id);
  return Response.json(
    {
      state,
      account: { name: user.name ?? null, image: user.image ?? null, email: user.email ?? null },
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
