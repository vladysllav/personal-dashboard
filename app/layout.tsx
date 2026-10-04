import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
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
 * Marks the document before React hydrates, so `tg:` utilities are already
 * correct in the first paint. `initData` is only non-empty when Telegram
 * itself opened the page, which makes it the one honest test — a user agent
 * string is not, and neither is a query parameter anybody can append.
 */
const MARK_TELEGRAM = `try{if(window.Telegram&&window.Telegram.WebApp&&window.Telegram.WebApp.initData){document.documentElement.setAttribute("data-tg","1")}}catch(e){}`;

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
        {/* beforeInteractive so the SDK and the mark below both run ahead of
            hydration; in the App Router these belong in the root layout. */}
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        <Script id="tg-mark" strategy="beforeInteractive">
          {MARK_TELEGRAM}
        </Script>
      </head>
      <body className="min-h-full font-sans">
        <TelegramProvider>{children}</TelegramProvider>
      </body>
    </html>
  );
}
