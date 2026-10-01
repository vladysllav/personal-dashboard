import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  themeColor: "#f4f6f5",
  colorScheme: "light",
};

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
    >
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
