import type { Metadata } from "next";
import { SurfacePage } from "@/components/SurfacePage";

export const metadata: Metadata = { title: "Goals · Personal Dashboard" };

export default function GoalsPage() {
  return <SurfacePage surface="goals" />;
}
