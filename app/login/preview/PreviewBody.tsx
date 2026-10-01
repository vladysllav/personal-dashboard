"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Dashboard } from "@/components/Dashboard";
import { SurfacePage } from "@/components/SurfacePage";
import { GoalDetail } from "@/components/GoalDetail";
import { StoreProvider, buildSample } from "@/lib/store";

function Body() {
  const params = useSearchParams();
  const view = params.get("view") ?? "dashboard";
  const goalIndex = Number(params.get("goal") ?? 0);
  const state = buildSample();
  return (
    <StoreProvider initialState={state}>
      <AppShell account={null}>
        {view === "goals" ? (
          <SurfacePage surface="goals" />
        ) : view === "habits" ? (
          <SurfacePage surface="habits" />
        ) : view === "detail" ? (
          <GoalDetail goalId={state.goals[goalIndex]!.id} />
        ) : (
          <Dashboard />
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
