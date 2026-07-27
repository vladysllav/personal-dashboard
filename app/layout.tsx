import type { Metadata, Viewport } from "next";
import { Source_Sans_3 } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { StoreProvider } from "@/lib/store";
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={sans.variable}>
      <body>
        <StoreProvider>
          <AppShell>{children}</AppShell>
        </StoreProvider>
      </body>
    </html>
  );
}
