import { AppShell } from "@/components/AppShell";
import { SignOutButton } from "@/components/SignOutButton";
import { StoreProvider } from "@/lib/store";

/**
 * Starts the dashboard request in the page's first bytes, ahead of React and
 * the bundle. The store picks the promise up once it mounts.
 */
const PREFETCH = `window.__dashboard=fetch("/api/state",{cache:"no-store"});`;

/**
 * Everything behind the sign-in wall. Middleware has already checked the
 * session, so this renders at once without touching the database: the shell
 * paints with the loading screen over it, and the data arrives on its own
 * request while the rest of the app loads.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: PREFETCH }} />
      <StoreProvider>
        <AppShell account={<SignOutButton />}>{children}</AppShell>
      </StoreProvider>
    </>
  );
}
