import type { Metadata, Viewport } from "next";
import { Source_Sans_3 } from "next/font/google";
import "./globals.css";

/*
 * One humanist family for the entire UI. Humanist rather than geometric: the
 * warmth lives in the letterforms. Variable, so weight 400–600 costs one file.
 */
const sans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Today · Personal Dashboard",
  description: "Goals and habits, kept by hand.",
};

export const viewport: Viewport = {
  themeColor: "#141610",
  colorScheme: "dark",
};

/*
 * Deliberately thin. The store and the app chrome belong to signed-in routes
 * only, so they live in `(app)/layout.tsx` — the sign-in screen renders inside
 * this shell without a nav bar or a dashboard to hydrate.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={sans.variable}>
      <body>{children}</body>
    </html>
  );
}
