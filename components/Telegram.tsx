"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Icon, type IconName } from "./Icon";
import type { TelegramWebApp } from "@/types/telegram";

/**
 * Running inside Telegram.
 *
 * The same build serves the browser and the Mini App — one URL, one deploy, one
 * set of screens. What changes is the chrome around them: Telegram already
 * draws a title bar with a back arrow and sits at the bottom of a thumb's
 * reach, so the sidebar and the hamburger give way to a bottom bar.
 */
const TelegramContext = createContext(false);

export function useInTelegram(): boolean {
  return useContext(TelegramContext);
}

export function webApp(): TelegramWebApp | undefined {
  if (typeof window === "undefined") return undefined;
  return window.Telegram?.WebApp;
}

/** `initData` is only non-empty when Telegram itself opened the page. */
export function telegramInitData(): string {
  return webApp()?.initData ?? "";
}

export function TelegramProvider({ children }: { children: ReactNode }) {
  // Starts false so the server render and the first client render agree; the
  // layout script has already set data-tg on <html>, so the bottom bar is in
  // place before this resolves and nothing visibly moves.
  const [inTelegram, setInTelegram] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const app = webApp();
    if (!app || !app.initData) return;
    setInTelegram(true);

    app.ready();
    app.expand();
    // Without this a downward flick inside a scrolled list drags the whole
    // Mini App closed, which is a brutal way to lose a half-typed entry.
    app.disableVerticalSwipes?.();

    // The product has one palette and it is light. Painting Telegram's own
    // bars to match is better than letting a dark client frame a light app.
    try {
      app.setHeaderColor("#eef1ef");
      app.setBackgroundColor("#eef1ef");
    } catch {
      // Older clients reject colours they do not know. Not worth failing over.
    }
  }, []);

  /**
   * Telegram's own back arrow, wired to the router. A detail screen is the
   * only place with somewhere to go back to; everywhere else the arrow would
   * be a button that exits the app, which is what the close button is for.
   */
  useEffect(() => {
    const app = webApp();
    if (!app || !inTelegram) return;

    const isDetail = /^\/goals\/[^/]+$/.test(pathname);
    const back = () => router.back();

    if (isDetail) {
      app.BackButton.onClick(back);
      app.BackButton.show();
    } else {
      app.BackButton.hide();
    }

    return () => {
      app.BackButton.offClick(back);
    };
  }, [inTelegram, pathname, router]);

  return (
    <TelegramContext.Provider value={inTelegram}>
      {children}
    </TelegramContext.Provider>
  );
}

const TABS: Array<{ href: string; label: string; icon: IconName }> = [
  { href: "/", label: "Today", icon: "today" },
  { href: "/goals", label: "Goals", icon: "target" },
  { href: "/habits", label: "Habits", icon: "grid" },
  { href: "/import", label: "Import", icon: "arrowDown" },
];

/**
 * The bottom bar. Four destinations, thumb-height, each a 56px target — the
 * sidebar's job done in the shape a phone expects.
 *
 * It is rendered from CSS state (`html[data-tg]`) rather than from React
 * state, so it is correct in the very first paint instead of appearing after
 * hydration decides where it is running.
 */
export function TelegramTabs() {
  const pathname = usePathname();

  return (
    <nav
      id="tg-tabs"
      aria-label="Sections"
      className="fixed inset-x-0 bottom-0 z-40 hidden border-t border-line bg-surface tg:block"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="flex">
        {TABS.map(({ href, label, icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex h-[56px] flex-col items-center justify-center gap-1 text-[11px] ${
                  active ? "font-medium text-accent-700" : "text-ink-3"
                }`}
              >
                <Icon
                  name={icon}
                  size={20}
                  className={active ? "text-accent-600" : "text-ink-3"}
                />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
