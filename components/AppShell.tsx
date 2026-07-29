"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import styles from "./AppShell.module.css";

const NAV: Array<{ href: string; label: string; icon: IconName }> = [
  { href: "/", label: "Today", icon: "today" },
  { href: "/goals", label: "Goals", icon: "target" },
  { href: "/habits", label: "Habits", icon: "grid" },
];

export function AppShell({
  children,
  account,
}: {
  children: ReactNode;
  /** Rendered at the foot of the rail. A slot because signing out is a server
   *  action, and this component is client-side. */
  account?: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className={styles.shell}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <nav className={styles.rail} aria-label="Sections">
        <span className={styles.mark} aria-hidden="true">
          ✳
        </span>
        {NAV.map((item) => {
          const current = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={styles.item}
              aria-current={current ? "page" : undefined}
            >
              <Icon name={item.icon} className={styles.icon} />
              {item.label}
            </Link>
          );
        })}

        {account ? <div className={styles.railEnd}>{account}</div> : null}
      </nav>

      <main id="main" className={styles.main}>
        <div className={styles.inner}>{children}</div>
      </main>
    </div>
  );
}
