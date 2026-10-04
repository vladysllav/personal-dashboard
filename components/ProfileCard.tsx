"use client";

import { useState } from "react";
import { Icon } from "./Icon";

/**
 * Who is signed in, as a row you can open.
 *
 * Deliberately a shell: it shows the name and the picture, and the panel behind
 * it says so rather than pretending to be a settings screen that does nothing.
 * A control that looks finished and does nothing is worse than one that is
 * honest about being next.
 */
export function ProfileCard({
  name,
  image,
  email,
}: {
  name: string | null | undefined;
  image: string | null | undefined;
  email?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const label = name?.trim() || email || "Your account";
  const initial = label.charAt(0).toUpperCase();

  return (
    <section aria-labelledby="profile-heading">
      <h2 id="profile-heading" className="visually-hidden">
        Account
      </h2>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-3 text-left shadow-card hover:border-line-strong sm:p-3.5"
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            width={44}
            height={44}
            className="size-[44px] shrink-0 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="inline-flex size-[44px] shrink-0 items-center justify-center rounded-full border border-accent-700 bg-accent-600 text-[17px] font-semibold text-ink"
          >
            {initial}
          </span>
        )}

        <span className="min-w-0 flex-1">
          <span className="block truncate text-[17px] font-semibold tracking-[-0.01em] text-ink">
            {label}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="rounded-[var(--radius-pill)] border border-accent-700 bg-accent-600 px-2 py-0.5 text-[11px] font-medium text-ink">
              Tracking
            </span>
            <span className="truncate text-[11.5px] text-ink-3">
              goals and habits
            </span>
          </span>
        </span>

        <Icon
          name={open ? "chevronDown" : "chevronRight"}
          size={18}
          className="shrink-0 text-ink-3"
        />
      </button>

      {open && (
        <div className="mt-2 rounded-[var(--radius-card)] border border-dashed border-line-strong p-4 text-[13px] leading-relaxed text-ink-3">
          Nothing here yet. This is where account settings will live.
        </div>
      )}
    </section>
  );
}
