import { signOut } from "@/auth";
import { Icon } from "./Icon";
import styles from "./SignOutButton.module.css";

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
      <button type="submit" className={styles.button}>
        <Icon name="signOut" className={styles.icon} />
        Sign out
      </button>
    </form>
  );
}
