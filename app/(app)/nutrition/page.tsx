import type { Metadata } from "next";
import { NutritionPage } from "@/components/NutritionPage";

export const metadata: Metadata = { title: "Nutrition · Personal Dashboard" };

export default function Nutrition() {
  return <NutritionPage />;
}
