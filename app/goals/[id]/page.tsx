import type { Metadata } from "next";
import { GoalDetail } from "@/components/GoalDetail";

export const metadata: Metadata = { title: "Goal · Personal Dashboard" };

export default async function GoalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <GoalDetail goalId={id} />;
}
