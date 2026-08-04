import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import styles from "./login.module.css";

export const metadata: Metadata = {
  title: "Sign in · Personal Dashboard",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/");

  const { error } = await searchParams;

  return (
    <main className={styles.screen}>
      <div className={styles.card}>
        <h1 className={styles.title}>Personal Dashboard</h1>
        <p className={styles.blurb}>
          Goals and habits, kept by hand — now on every device you use.
        </p>

        {error ? (
          <p className={styles.error} role="alert">
            That account isn&rsquo;t allowed to sign in here.
          </p>
        ) : null}

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button type="submit" className={styles.button}>
            {/* Google's mark, monochrome: the four-colour version puts a yellow
                segment on a yellow button, where it simply disappears. */}
            <svg
              className={styles.mark}
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path
                fill="currentColor"
                d="M12 11v2.4h5.6c-.2 1.4-1.6 4.2-5.6 4.2-3.4 0-6.1-2.8-6.1-6.2S8.6 5.2 12 5.2c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 2.5 14.6 1.5 12 1.5 6.7 1.5 2.4 5.8 2.4 12s4.3 10.5 9.6 10.5c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12Z"
              />
            </svg>
            Continue with Google
          </button>
        </form>

        <p className={styles.note}>
          Only the account on the allowlist can get in.
        </p>
      </div>
    </main>
  );
}
