"use client";

import type { ReactNode } from "react";
import { Icon } from "./Icon";
import styles from "./TickChip.module.css";

export function TickChip({
  done,
  size = "md",
  onClick,
  children,
  srSuffix,
}: {
  done: boolean;
  size?: "sm" | "md";
  onClick: () => void;
  children: ReactNode;
  /** Extra context for assistive tech, e.g. the date being toggled. */
  srSuffix?: string;
}) {
  return (
    <button
      type="button"
      className={`${styles.chip} ${styles[size]}`}
      data-done={done}
      aria-pressed={done}
      onClick={onClick}
    >
      <span className={styles.dot}>
        {done && <Icon name="check" size={size === "sm" ? 10 : 15} />}
      </span>
      <span className={styles.label}>{children}</span>
      {srSuffix && <span className="visually-hidden">{srSuffix}</span>}
    </button>
  );
}
