"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icon } from "./Icon";

/**
 * A window for a task that is not the page you are on.
 *
 * Creating a habit used to unfold above the list, which pushed the list down
 * the screen and left you editing one thing while looking at twenty others.
 * A form with five fields and a grid of icons is a task in its own right: it
 * gets the screen, and when it closes the page is exactly where you left it.
 *
 * Full-height sheet on a phone, centred panel from `sm` up. The close control
 * sits on the left of the bar with the title centred beside it, which is where
 * a thumb already is on a phone and where every native sheet puts it.
 */
export function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Pinned to the bottom, out of the scroll — the commit is always reachable. */
  footer?: ReactNode;
}) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // The body must not scroll behind the sheet: on iOS that is how you end up
    // scrolling the page under your own form.
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = panel.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-ink/35 animate-fade-in sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={
          "flex w-full flex-col overflow-hidden bg-surface shadow-pop " +
          "sm:max-h-[min(720px,92vh)] sm:max-w-[520px] sm:rounded-[var(--radius-card)] sm:border sm:border-line"
        }
      >
        <header
          className="flex shrink-0 items-center gap-2 border-b border-line px-3 py-3"
          style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top, 0px))" }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full bg-surface-3 p-2 text-ink-2 hover:bg-line hover:text-ink"
          >
            <Icon name="close" size={16} />
          </button>
          <h2
            id={titleId}
            className="flex-1 pr-11 text-center text-[15px] font-semibold tracking-[-0.01em] text-ink"
          >
            {title}
          </h2>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">{children}</div>

        {footer && (
          <div
            className="shrink-0 border-t border-line bg-surface px-4 py-3 sm:px-5"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
