/**
 * One hand-rolled set: a 24×24 grid, a single contour, stroke 1.75,
 * `currentColor`, round caps. Unicode symbols and emoji are never used as
 * icons — they are different sizes in different families and sit at different
 * heights on the line.
 */
export type IconName =
  | "today"
  | "target"
  | "grid"
  | "plus"
  | "undo"
  | "check"
  | "close"
  | "edit"
  | "chevronLeft"
  | "chevronRight"
  | "chevronDown"
  | "arrowLeft"
  | "arrowUp"
  | "arrowDown"
  | "arrowRight"
  | "bars"
  | "ring"
  | "flame"
  | "trophy"
  | "signOut"
  | "spinner";

const PATHS: Record<IconName, React.ReactNode> = {
  today: (
    <>
      <rect x="3.6" y="4.8" width="16.8" height="15.6" rx="3" />
      <path d="M3.6 10.2h16.8M8.4 3v3.6M15.6 3v3.6" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <circle cx="12" cy="12" r="3.6" />
    </>
  ),
  grid: (
    <>
      <rect x="3.3" y="3.3" width="6.6" height="6.6" rx="1.8" />
      <rect x="14.1" y="3.3" width="6.6" height="6.6" rx="1.8" />
      <rect x="3.3" y="14.1" width="6.6" height="6.6" rx="1.8" />
      <rect x="14.1" y="14.1" width="6.6" height="6.6" rx="1.8" />
    </>
  ),
  plus: <path d="M12 5.1v13.8M5.1 12h13.8" />,
  undo: <path d="M4.8 10.2h9.6a4.8 4.8 0 0 1 0 9.6H10.2M4.8 10.2 8.7 6.3M4.8 10.2l3.9 3.9" />,
  check: <path d="m5.4 12.6 4.5 4.5L18.6 7.2" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  edit: <path d="M15 4.2 19.8 9 8.4 20.4H3.6v-4.8L15 4.2ZM13.2 6l4.8 4.8" />,
  chevronLeft: <path d="M15 5.4 8.4 12l6.6 6.6" />,
  chevronRight: <path d="m9 5.4 6.6 6.6L9 18.6" />,
  chevronDown: <path d="m5.4 9 6.6 6.6L18.6 9" />,
  arrowLeft: <path d="M18.6 12H5.4M10.8 5.4 4.2 12l6.6 6.6" />,
  arrowUp: <path d="M12 19V5.4M5.6 11.8 12 5.4l6.4 6.4" />,
  arrowDown: <path d="M12 5v13.6M5.6 12.2 12 18.6l6.4-6.4" />,
  arrowRight: <path d="M5 12h13.6M12.2 5.6 18.6 12l-6.4 6.4" />,
  bars: <path d="M4 7h16M4 12h16M4 17h10" />,
  ring: (
    <>
      <circle cx="12" cy="12" r="7.8" />
      <path d="M12 4.2a7.8 7.8 0 0 1 6.72 11.76" strokeWidth={2.8} />
    </>
  ),
  flame: (
    <path
      fill="currentColor"
      stroke="none"
      d="M12 2.4c1.2 3.6-1.2 6 .96 7.56-1.2.24-2.4-.72-2.4-2.28C8.28 9.12 6.84 11.28 6.84 13.92a5.76 5.76 0 0 0 11.52 0c0-2.76-1.68-4.44-3-6-1.44-1.68-1.8-3.48-.48-5.52-2.04.72-3.6 2.4-3.84 4.56C10.44 5.28 11.04 3.6 12 2.4Z"
    />
  ),
  trophy: (
    <>
      <path d="M7.2 4.2h9.6v4.2a4.8 4.8 0 0 1-9.6 0V4.2Z" />
      <path d="M7.2 5.4H4.2v1.2a3 3 0 0 0 3 3M16.8 5.4h3v1.2a3 3 0 0 1-3 3" />
      <path d="M12 13.2v3M8.4 20.4h7.2M9.6 20.4c0-1.8.84-3 2.4-3s2.4 1.2 2.4 3" />
    </>
  ),
  signOut: (
    <>
      <path d="M14.4 7.5V5.7a1.5 1.5 0 0 0-1.5-1.5H6.3a1.5 1.5 0 0 0-1.5 1.5v12.6a1.5 1.5 0 0 0 1.5 1.5h6.6a1.5 1.5 0 0 0 1.5-1.5v-1.8" />
      <path d="M10.5 12h9.3M17.4 9 19.8 12l-2.4 3" />
    </>
  ),
  spinner: (
    <>
      <circle cx="12" cy="12" r="8.4" opacity={0.25} />
      <path d="M20.4 12a8.4 8.4 0 0 0-8.4-8.4" />
    </>
  ),
};

export function Icon({
  name,
  size = 18,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={
        name === "spinner" ? `animate-spin ${className ?? ""}` : className
      }
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
