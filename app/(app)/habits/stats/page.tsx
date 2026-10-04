import type { Metadata } from "next";
import { HabitStats } from "@/components/HabitStats";

export const metadata: Metadata = { title: "Habit statistics · Personal Dashboard" };

export default function HabitStatsPage() {
  return <HabitStats />;
}
