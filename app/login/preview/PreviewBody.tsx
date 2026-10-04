"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Dashboard } from "@/components/Dashboard";
import { SurfacePage } from "@/components/SurfacePage";
import { GoalDetail } from "@/components/GoalDetail";
import { HabitStats } from "@/components/HabitStats";
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
  return (
    <StoreProvider initialState={state}>
      <AppShell account={null}>
        {view === "goals" ? (
          <SurfacePage surface="goals" />
        ) : view === "habits" ? (
          <SurfacePage surface="habits" />
        ) : view === "stats" ? (
          <HabitStats />
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
