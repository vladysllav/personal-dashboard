import { signOut } from "@/auth";
import { Icon } from "./Icon";

/**
 * A server component on purpose: `signOut` runs on the server, and a plain form
 * means signing out still works with JavaScript unavailable.
 */
export function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
      }}
    >
      <button
        type="submit"
        className="inline-flex items-center justify-center gap-1.5 rounded-[10px] border border-line bg-surface px-3.5 py-2 text-[13.5px] font-medium text-ink-2 hover:border-line-strong hover:text-ink"
      >
        <Icon name="signOut" size={15} />
        Sign out
      </button>
    </form>
  );
}
