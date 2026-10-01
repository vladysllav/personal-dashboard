import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { Icon } from "@/components/Icon";
import { TelegramSignIn } from "@/components/TelegramSignIn";

export const metadata: Metadata = {
  title: "Sign in · Personal Dashboard",
};

/**
 * One card on the canvas, nothing else. The Google mark keeps its own four
 * colours — it is the one place on this screen where colour does not mean the
 * state of a plan.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/");

  const { error } = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas p-6">
      <div className="w-full max-w-[380px] rounded-[14px] border border-line bg-surface p-6 shadow-card">
        {/* Renders nothing outside Telegram. Inside it, this screen signs in
            on its own and never gets looked at. */}
        <TelegramSignIn />

        <span
          aria-hidden="true"
          className="inline-flex size-[34px] items-center justify-center rounded-[10px] bg-accent-600 text-white"
        >
          <Icon name="target" size={20} />
        </span>

        <h1 className="mt-4 text-[17px] font-semibold tracking-[-0.01em] text-ink">
          Personal Dashboard
        </h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">
          Goals and habits, kept by hand — now on every device you use.
        </p>

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-[8px] bg-neg-50 px-3 py-2 text-[13px] text-neg-700"
          >
            That account isn&rsquo;t allowed to sign in here.
          </p>
        ) : null}

        <form
          className="mt-5"
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2.5 rounded-[10px] border border-line bg-surface px-3.5 py-2.5 text-[13.5px] font-medium text-ink hover:border-line-strong hover:bg-surface-2"
          >
            {/* Google's mark ships as it is — never repainted into the
                product's own palette. */}
            <svg
              className="size-[18px] shrink-0"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path
                fill="#4285F4"
                d="M23.52 12.27c0-.82-.07-1.6-.21-2.36H12v4.47h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.73Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.09A12 12 0 0 0 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.29 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.28a12 12 0 0 0 0 10.76l4.01-3.09Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.62l4.01 3.09C6.23 6.87 8.88 4.75 12 4.75Z"
              />
            </svg>
            Continue with Google
          </button>
        </form>

        <p className="mt-4 text-[11.5px] leading-relaxed text-ink-3">
          Only the account on the allowlist can get in.
        </p>
      </div>
    </main>
  );
}
