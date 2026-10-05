import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TelegramProvider } from "@/components/Telegram";
import "./globals.css";

/*
 * One family across the whole product, in four roles. A product UI does not
 * need a display/text pair: there are more kinds of element here than on a
 * brand page, and the extra contrast only reads as noise.
 */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Today · Personal Dashboard",
  description: "Goals and habits, kept by hand.",
};

export const viewport: Viewport = {
  // The canvas colour, so the browser chrome does not sit a shade off the page.
  themeColor: "#f7f7f5",
  colorScheme: "light",
  // Telegram hands the page the full sheet; the insets keep content clear of
  // the notch and the home indicator.
  viewportFit: "cover",
};

/**
 * Marks the document before anything paints, so `tg:` utilities are already
 * correct in the first frame. `initData` is only non-empty when Telegram
 * itself opened the page, which makes it the one honest test — a user agent
 * string is not, and neither is a query parameter anybody can append.
 *
 * It also calls `ready()` right here rather than after hydration. Telegram
 * keeps its own placeholder over the page until that call, so leaving it for
 * React meant the loading screen below was streamed, painted, and never seen:
 * what showed instead was Telegram's spinner, for as long as the whole app
 * took to load.
 */
const BOOT_TELEGRAM = `try{var a=window.Telegram&&window.Telegram.WebApp;if(a&&a.initData){document.documentElement.setAttribute("data-tg","1");try{a.setHeaderColor("#f7f7f5");a.setBackgroundColor("#f7f7f5")}catch(e){}a.ready();a.expand()}}catch(e){}`;

/*
 * Deliberately thin. The store and the app chrome belong to signed-in routes
 * only, so they live in `(app)/layout.tsx` — the sign-in screen renders inside
 * this shell without a nav rail or a dashboard to hydrate.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // The script below stamps data-tg on this element before hydration, so
      // the server HTML and the client DOM differ here by design. Scoped to
      // <html>'s own attributes; nothing inside it is exempted.
      suppressHydrationWarning
    >
      <head>
        {/* Plain, parser-blocking tags rather than next/script: those run from
            the Next runtime, after the bundle has loaded, which is exactly the
            wait the early ready() exists to cut. */}
        <script src="https://telegram.org/js/telegram-web-app.js" />
        <script dangerouslySetInnerHTML={{ __html: BOOT_TELEGRAM }} />
      </head>
      <body className="min-h-full font-sans">
        <TelegramProvider>{children}</TelegramProvider>
      </body>
    </html>
  );
}
