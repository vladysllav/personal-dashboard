"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LoadingScreen } from "./LoadingScreen";
import { telegramInitData } from "./Telegram";

type Phase = "checking" | "signing-in" | "failed";

/**
 * Sign-in from inside Telegram, with no button to press.
 *
 * Telegram has already proved who the user is before the page loads; asking
 * them to tap "Continue with Google" after that would send them out to a
 * browser to re-establish something the host app already knows. So the page
 * takes the signed payload, posts it, and gets out of the way.
 *
 * When there is no payload — an ordinary browser — this renders nothing and
 * the Google button behind it is the whole screen, unchanged.
 */
export function TelegramSignIn() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("checking");

  useEffect(() => {
    const initData = telegramInitData();
    if (!initData) return;

    setPhase("signing-in");
    let cancelled = false;

    signIn("telegram", { initData, redirect: false })
      .then((result) => {
        if (cancelled) return;
        if (result?.ok && !result.error) {
          // replace, not push: the sign-in screen is not somewhere the back
          // arrow should be able to return to.
          router.replace("/");
          router.refresh();
        } else {
          setPhase("failed");
        }
      })
      .catch(() => {
        if (!cancelled) setPhase("failed");
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  // Server-rendered and shown by CSS alone inside Telegram, so the sign-in
  // card never paints there even for the frame before this effect runs.
  if (phase === "checking") {
    return <LoadingScreen label="Signing you in" className="hidden tg:flex" />;
  }

  if (phase === "failed") {
    return (
      <div
        role="alert"
        className="mb-4 rounded-[10px] bg-neg-50 px-3 py-2.5 text-[13px] leading-relaxed text-neg-700"
      >
        Telegram sign-in didn&rsquo;t go through. The server log says which
        check failed; signing in with Google below works either way.
      </div>
    );
  }

  // Covers the card rather than sitting next to it: for the half-second this
  // takes, a sign-in screen you are not meant to use is only a distraction.
  return <LoadingScreen label="Signing you in" />;
}
