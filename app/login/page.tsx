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
            await signIn("github", { redirectTo: "/" });
          }}
        >
          <button type="submit" className={styles.button}>
            <svg
              className={styles.mark}
              viewBox="0 0 16 16"
              aria-hidden="true"
              focusable="false"
            >
              <path
                fill="currentColor"
                d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38l-.01-1.34c-2.23.48-2.7-1.07-2.7-1.07-.36-.93-.89-1.18-.89-1.18-.73-.5.06-.49.06-.49.8.06 1.23.83 1.23.83.72 1.23 1.88.87 2.34.67.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48l-.01 2.2c0 .21.15.46.55.38A8 8 0 0 0 8 0Z"
              />
            </svg>
            Continue with GitHub
          </button>
        </form>

        <p className={styles.note}>
          Only the account on the allowlist can get in.
        </p>
      </div>
    </main>
  );
}
