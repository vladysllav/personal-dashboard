import type { Metadata } from "next";
import { ChallengeDetail } from "@/components/ChallengeDetail";

export const metadata: Metadata = { title: "Challenge · Personal Dashboard" };

export default async function ChallengeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ChallengeDetail challengeId={id} />;
}
