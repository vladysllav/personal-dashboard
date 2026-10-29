import type { Metadata } from "next";
import { ChallengesPage } from "@/components/ChallengesPage";

export const metadata: Metadata = { title: "Challenges · Personal Dashboard" };

export default function Challenges() {
  return <ChallengesPage />;
}
