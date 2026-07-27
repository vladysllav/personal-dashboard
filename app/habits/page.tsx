import type { Metadata } from "next";
import { SurfacePage } from "@/components/SurfacePage";

export const metadata: Metadata = { title: "Habits · Personal Dashboard" };

export default function HabitsPage() {
  return <SurfacePage surface="habits" />;
}
