import type { Metadata } from "next";
import { HabitDetail } from "@/components/HabitDetail";

export const metadata: Metadata = { title: "Habit · Personal Dashboard" };

export default async function HabitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <HabitDetail habitId={id} />;
}
