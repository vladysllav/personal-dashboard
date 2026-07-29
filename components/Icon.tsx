/**
 * One hand-rolled icon set: 20×20, 1.5 stroke, round caps and joins.
 * A single coherent set beats mixing libraries, and nothing here needs more.
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
  | "chevronRight"
  | "arrowLeft"
  | "bars"
  | "ring"
  | "flame"
  | "trophy"
  | "signOut";

const PATHS: Record<IconName, React.ReactNode> = {
  today: (
    <>
      <rect x="3" y="4" width="14" height="13" rx="2.5" />
      <path d="M3 8.5h14M7 2.5v3M13 2.5v3" />
    </>
  ),
  target: (
    <>
      <circle cx="10" cy="10" r="7" />
      <circle cx="10" cy="10" r="3" />
    </>
  ),
  grid: (
    <>
      <rect x="2.75" y="2.75" width="5.5" height="5.5" rx="1.5" />
      <rect x="11.75" y="2.75" width="5.5" height="5.5" rx="1.5" />
      <rect x="2.75" y="11.75" width="5.5" height="5.5" rx="1.5" />
      <rect x="11.75" y="11.75" width="5.5" height="5.5" rx="1.5" />
    </>
  ),
  plus: <path d="M10 4.25v11.5M4.25 10h11.5" />,
  undo: <path d="M4 8.5h8a4 4 0 0 1 0 8H8.5M4 8.5 7.25 5.25M4 8.5l3.25 3.25" />,
  check: <path d="m4.5 10.5 3.75 3.75L15.5 6" />,
  close: <path d="m5 5 10 10M15 5 5 15" />,
  edit: (
    <path d="M12.5 3.5 16.5 7.5 7 17H3v-4l9.5-9.5ZM11 5l4 4" />
  ),
  chevronRight: <path d="m7.5 4.5 5.5 5.5-5.5 5.5" />,
  arrowLeft: <path d="M15.5 10h-11M9 4.5 3.5 10l5.5 5.5" />,
  bars: (
    <>
      <path d="M3 5.5h14M3 10h14M3 14.5h9" />
    </>
  ),
  ring: (
    <>
      <circle cx="10" cy="10" r="6.5" />
      <path d="M10 3.5a6.5 6.5 0 0 1 5.6 9.8" strokeWidth={2.4} />
    </>
  ),
  flame: (
    <path
      fill="currentColor"
      stroke="none"
      d="M10 2c1 3-1 5 .8 6.3-1 .2-2-.6-2-1.9C6.4 7.6 5.2 9.4 5.2 11.6a4.8 4.8 0 0 0 9.6 0c0-2.3-1.4-3.7-2.5-5-1.2-1.4-1.5-2.9-.4-4.6-1.7.6-3 2-3.2 3.8C8.7 4.4 9.2 3 10 2Z"
    />
  ),
  trophy: (
    <>
      <path d="M6 3.5h8v3.5a4 4 0 0 1-8 0V3.5Z" />
      <path d="M6 4.5H3.5v1a2.5 2.5 0 0 0 2.5 2.5M14 4.5h2.5v1a2.5 2.5 0 0 1-2.5 2.5" />
      <path d="M10 11v2.5M7 17h6M8 17c0-1.5.7-2.5 2-2.5s2 1 2 2.5" />
    </>
  ),
  signOut: (
    <>
      <path d="M12 6.25V4.75a1.25 1.25 0 0 0-1.25-1.25h-5.5A1.25 1.25 0 0 0 4 4.75v10.5a1.25 1.25 0 0 0 1.25 1.25h5.5A1.25 1.25 0 0 0 12 15.25v-1.5" />
      <path d="M8.75 10h7.75M14 7.5 16.5 10 14 12.5" />
    </>
  ),
};

export function Icon({
  name,
  size = 20,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
