"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Dashboard } from "@/components/Dashboard";
import { SurfacePage } from "@/components/SurfacePage";
import { GoalDetail } from "@/components/GoalDetail";
import { HabitDetail } from "@/components/HabitDetail";
import { HabitStats } from "@/components/HabitStats";
import { LoadingScreen } from "@/components/LoadingScreen";
import { NutritionPage } from "@/components/NutritionPage";
import { ChallengesPage } from "@/components/ChallengesPage";
import { ChallengeDetail } from "@/components/ChallengeDetail";
import { addDays, todayKey } from "@/lib/dates";
import { StoreProvider, buildSample } from "@/lib/store";

function Body() {
  const params = useSearchParams();
  const view = params.get("view") ?? "dashboard";
  const goalIndex = Number(params.get("goal") ?? 0);
  const state = buildSample();
  // The harness pins the first two goals and supplies a stand-in account, so
  // the rings and the profile row are reviewable without a signed-in session.
  const pins = Number(params.get("pins") ?? 2);
  state.prefs.pinnedGoalIds = state.goals.slice(0, pins).map((g) => g.id);
  {
    // Two running challenges and one finished, for the challenges views.
    const today = todayKey();
    state.challenges = [
      {
        id: "c1",
        name: "No hookah",
        icon: "💨",
        startDate: addDays(today, -45),
        endDate: addDays(today, 44),
        benefit: { unit: "usd", perTime: 20, timesPerMonth: 8 },
        relapses: [
          { id: "r1", date: addDays(today, -30), count: 1 },
          { id: "r2", date: addDays(today, -12), count: 2 },
        ],
        createdAt: today,
      },
      {
        id: "c2",
        name: "No social media",
        icon: "📱",
        startDate: addDays(today, -9),
        endDate: null,
        benefit: { unit: "hours", perTime: 1.5, timesPerMonth: 30 },
        relapses: [],
        createdAt: today,
      },
      {
        id: "c3",
        name: "No sugar",
        icon: "🍬",
        startDate: addDays(today, -60),
        endDate: addDays(today, -31),
        benefit: null,
        relapses: [{ id: "r3", date: addDays(today, -40), count: 1 }],
        createdAt: today,
      },
    ];
  }
  if (view === "nutrition") {
    // A plan, two weeks of eating and ten weeks of weigh-ins.
    const today = todayKey();
    state.nutrition = {
      plan: { calories: 2200, protein: 165, fat: 70, carbs: 240 },
      days: Array.from({ length: 14 }, (_, i) => ({
        date: addDays(today, -i),
        calories: [1820, 2520, 2100, 2350, 1980, 2240, 2050][i % 7]!,
        protein: [120, 153, 140, 160, 130, 150, 145][i % 7]!,
        fat: [60, 90, 66, 75, 58, 70, 64][i % 7]!,
        carbs: [190, 255, 220, 230, 210, 235, 200][i % 7]!,
      })).filter((_, i) => i !== 4),
      weights: Array.from({ length: 30 }, (_, i) => ({
        id: `w${i}`,
        date: addDays(today, -i * 2.4 | 0),
        at: new Date(Date.now() - i * 86_400_000).toISOString(),
        value: Math.round((82 + i * 0.12 + ((i * 7) % 5) * 0.1) * 10) / 10,
      })),
    };
  }
  return (
    <StoreProvider initialState={state}>
      <AppShell account={null}>
        {view === "goals" ? (
          <SurfacePage surface="goals" />
        ) : view === "habits" ? (
          <SurfacePage surface="habits" />
        ) : view === "stats" ? (
          <HabitStats />
        ) : view === "habit" ? (
          <HabitDetail habitId={state.habits[Number(params.get("habit") ?? 0)]!.id} />
        ) : view === "challenges" ? (
          <ChallengesPage />
        ) : view === "challenge" ? (
          <ChallengeDetail challengeId={params.get("id") ?? "c1"} />
        ) : view === "nutrition" ? (
          <NutritionPage />
        ) : view === "loading" ? (
          <LoadingScreen />
        ) : view === "detail" ? (
          <GoalDetail goalId={state.goals[goalIndex]!.id} />
        ) : (
          <Dashboard account={{ name: "Vladyslav Ushakov", image: null, email: "you@example.com" }} />
        )}
      </AppShell>
    </StoreProvider>
  );
}

export function PreviewBody() {
  return (
    <Suspense>
      <Body />
    </Suspense>
  );
}
