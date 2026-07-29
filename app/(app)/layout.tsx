import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/AppShell";
import { SignOutButton } from "@/components/SignOutButton";
import { loadState } from "@/lib/server/state";
import { StoreProvider } from "@/lib/store";

/**
 * Everything behind the sign-in wall. The dashboard is fetched here, on the
 * server, so the first paint already has real data — there is no empty flash
 * and no client-side loading state to design around.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const initialState = await loadState(session.user.id);

  return (
    <StoreProvider initialState={initialState}>
      <AppShell account={<SignOutButton />}>{children}</AppShell>
    </StoreProvider>
  );
}
