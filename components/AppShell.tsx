"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Icon, type IconName } from "./Icon";

/**
 * The frame: a left column of sections, and to the right the page title with
 * its own controls above the content itself.
 *
 * The column holds sections only. Controls that belong to one screen live in
 * that screen's header, and to the right of them sits what belongs to no page
 * at all — the account. Three groups, each in its own place.
 *
 * On a narrow screen the column does not shrink, it moves into a drawer on a
 * native <dialog>: breaking the width of the data to keep navigation you touch
 * once a session is a bad trade.
 */

/**
 * Sections, in groups. The grouping is not decoration: "Tracking" is what you
 * open daily and "Data" is what you touch once, and a flat list of four gives
 * them the same weight. The labels also give the column something to say when
 * the product grows past four screens.
 */
const NAV: Array<{
  group: string;
  items: Array<{ href: string; label: string; icon: IconName }>;
}> = [
  {
    group: "Tracking",
    items: [
      { href: "/", label: "Today", icon: "today" },
      { href: "/goals", label: "Goals", icon: "target" },
      { href: "/habits", label: "Habits", icon: "grid" },
    ],
  },
  {
    group: "Data",
    items: [{ href: "/import", label: "Import", icon: "arrowDown" }],
  },
];

type Chrome = { account: ReactNode; openNav: () => void };

const ChromeContext = createContext<Chrome>({
  account: null,
  openNav: () => {},
});

function itemClass(active: boolean) {
  return (
    "flex items-center gap-2.5 rounded-[var(--radius-control)] px-3 py-2 text-[13.5px] " +
    (active
      ? "bg-accent-50 font-medium text-accent-700"
      : "text-ink-2 hover:bg-surface-2 hover:text-ink")
  );
}

function Logo() {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className="inline-flex size-[30px] items-center justify-center rounded-[var(--radius-input)] bg-accent-600 text-white"
      >
        <Icon name="target" size={17} />
      </span>
      <span className="text-[13.5px] font-semibold tracking-[-0.01em] text-ink">
        Personal Dashboard
      </span>
    </span>
  );
}

function SidebarBody({
  account,
  onNavigate,
}: {
  account: ReactNode;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      <div className="px-5 py-5">
        <Link
          href="/"
          onClick={onNavigate}
          aria-label="Personal Dashboard, today"
          className="inline-block"
        >
          <Logo />
        </Link>
      </div>

      <nav aria-label="Sections" className="flex-1 space-y-5 overflow-y-auto px-2.5 pb-4">
        {NAV.map(({ group, items }) => (
          <div key={group}>
            <div className="px-3 pb-1.5 text-[11.5px] font-medium uppercase tracking-[0.06em] text-ink-3">
              {group}
            </div>
            <ul className="space-y-0.5">
              {items.map(({ href, label, icon }) => {
                const active =
                  href === "/" ? pathname === "/" : pathname.startsWith(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={itemClass(active)}
                    >
                      <Icon
                        name={icon}
                        size={17}
                        className={active ? "text-accent-600" : "text-ink-3"}
                      />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* The account sits in the drawer on narrow screens, where the header
          has no room for it. */}
      <div className="border-t border-line px-3 py-3 lg:hidden">{account}</div>

      <p className="border-t border-line px-5 py-3.5 text-[11.5px] leading-relaxed text-ink-3">
        Entered by hand.
        <br />
        Saved to your account as you go.
      </p>
    </>
  );
}

export function AppShell({
  children,
  account,
}: {
  children: ReactNode;
  /** Rendered in the header and in the drawer. A slot, because signing out is
   *  a server action and this component is client-side. */
  account?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  // A native <dialog>: Esc, the focus trap and the top layer come free and
  // correct.
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    // min-h-dvh rather than min-h-full: a percentage of a body with height
    // auto is auto, and on a short page the nav column would stop mid-screen.
    <ChromeContext.Provider value={{ account, openNav: () => setOpen(true) }}>
      <div className="flex min-h-dvh">
        <a className="skip-link" href="#main">
          Skip to content
        </a>

        <aside className="hidden w-[248px] shrink-0 flex-col border-r border-line bg-surface lg:flex">
          <SidebarBody account={account} />
        </aside>

        <dialog
          ref={dialog}
          onClose={() => setOpen(false)}
          onClick={(e) => {
            // A click on the backdrop: the <dialog> itself fills the screen,
            // the panel lives inside it.
            if (e.target === dialog.current) setOpen(false);
          }}
          aria-label="Sections"
          className="m-0 h-full max-h-none w-[280px] max-w-[85vw] bg-surface backdrop:bg-ink/35 lg:hidden"
        >
          <div className="flex h-full flex-col">
            <SidebarBody account={account} onNavigate={() => setOpen(false)} />
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="absolute right-3 top-4 rounded-[var(--radius-badge)] p-1.5 text-ink-3 hover:bg-surface-3 hover:text-ink"
          >
            <Icon name="close" size={18} />
          </button>
        </dialog>

        <div className="flex min-w-0 flex-1 flex-col">
          <main id="main" className="flex-1 px-4 pb-10 sm:px-6">
            {children}
          </main>
        </div>
      </div>
    </ChromeContext.Provider>
  );
}

/**
 * The page header. Rendered by the page rather than by the shell, so the title
 * and its controls arrive in the first paint instead of being registered by an
 * effect one frame later.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  back,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** A way out of a detail screen, above the title. */
  back?: { href: string; label: string };
}) {
  const { account, openNav } = useContext(ChromeContext);

  return (
    <>
      {back && (
        <Link
          href={back.href}
          className="mt-4 inline-flex items-center gap-1.5 text-[13px] text-ink-2 hover:text-ink"
        >
          <Icon name="arrowLeft" size={15} />
          {back.label}
        </Link>
      )}
      <header className="flex flex-wrap items-center gap-x-4 gap-y-3 py-4 lg:py-5">
        <button
          type="button"
          onClick={openNav}
          aria-label="Open sections"
          className="-ml-1 shrink-0 rounded-[var(--radius-control)] border border-line bg-surface p-2 text-ink-2 hover:text-ink lg:hidden"
        >
          <span aria-hidden className="block h-[2px] w-4 rounded-full bg-current" />
          <span aria-hidden className="mt-[4px] block h-[2px] w-4 rounded-full bg-current" />
          <span aria-hidden className="mt-[4px] block h-[2px] w-4 rounded-full bg-current" />
        </button>

        <div className="min-w-0">
          <h1 className="truncate text-[26px] font-semibold tracking-[-0.02em] text-ink">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 truncate text-[13px] text-ink-3">{subtitle}</p>
          )}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {actions}
          {/* The account is separated from the page's own controls: it is not
              about the data on screen, it is about who is looking. */}
          {account && (
            <>
              <span aria-hidden className="hidden h-6 w-px bg-line sm:block" />
              <span className="hidden lg:inline-flex">{account}</span>
            </>
          )}
        </div>
      </header>
    </>
  );
}
