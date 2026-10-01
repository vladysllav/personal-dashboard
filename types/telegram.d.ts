/**
 * The slice of the Telegram Mini App API this product actually uses.
 *
 * Hand-written rather than pulled from a package: the official types track
 * every Bot API version and most of their surface is chat, payments and
 * invoices, none of which a personal dashboard has any business calling.
 */
export type TelegramWebApp = {
  /** The signed payload. Empty string when the page is open in a browser. */
  initData: string;
  initDataUnsafe?: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      photo_url?: string;
    };
  };
  version: string;
  platform: string;
  colorScheme: "light" | "dark";
  themeParams: Record<string, string>;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;

  ready(): void;
  expand(): void;
  close(): void;
  setHeaderColor(color: string): void;
  setBackgroundColor(color: string): void;
  /** 7.7+. Stops a downward scroll from dragging the app shut. */
  disableVerticalSwipes?(): void;
  /** 8.0+. Asks Telegram to let the page paint under the status bar. */
  requestFullscreen?(): void;

  BackButton: {
    isVisible: boolean;
    show(): void;
    hide(): void;
    onClick(cb: () => void): void;
    offClick(cb: () => void): void;
  };

  HapticFeedback?: {
    impactOccurred(style: "light" | "medium" | "heavy" | "rigid" | "soft"): void;
    notificationOccurred(type: "error" | "success" | "warning"): void;
    selectionChanged(): void;
  };
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export {};
