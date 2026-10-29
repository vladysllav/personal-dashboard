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
 * Telegram, without holding up the first paint.
 *
 * The SDK used to be a parser-blocking <script> in <head>, which meant nothing
 * at all painted until telegram.org answered — in a browser too, where it does
 * nothing. Now it loads async, and the page paints at once.
 *
 * `data-tg` is still stamped before anything paints: Telegram puts its launch
 * payload in the URL fragment, so `tgWebAppData` there says where we are in
 * time for the first frame. Once the SDK lands, `initData` — the one honest
 * test — confirms it or takes the attribute back off, and `ready()` drops
 * Telegram's own placeholder. `window.__tg` resolves then, for the components
 * that need the SDK.
 */
const BOOT_TELEGRAM = `(function(){var d=document.documentElement;try{if((location.hash||"").indexOf("tgWebAppData")>-1)d.setAttribute("data-tg","1")}catch(e){}window.__tg=new Promise(function(done){var s=document.createElement("script");s.src="https://telegram.org/js/telegram-web-app.js";s.async=true;s.onload=function(){try{var a=window.Telegram&&window.Telegram.WebApp;if(a&&a.initData){d.setAttribute("data-tg","1");try{a.setHeaderColor("#f7f7f5");a.setBackgroundColor("#f7f7f5")}catch(e){}a.ready();a.expand()}else{d.removeAttribute("data-tg")}}catch(e){}done()};s.onerror=function(){d.removeAttribute("data-tg");done()};document.head.appendChild(s)})})();`;

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
        {/* Inline rather than next/script, which runs only after the bundle
            has loaded. It starts the SDK download without blocking paint. */}
        <script dangerouslySetInnerHTML={{ __html: BOOT_TELEGRAM }} />
      </head>
      <body className="min-h-full font-sans">
        <TelegramProvider>{children}</TelegramProvider>
      </body>
    </html>
  );
}
