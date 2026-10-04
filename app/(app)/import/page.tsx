"use client";

import { useEffect, useState } from "react";
import { STORAGE_KEY } from "@/lib/constants";
import { importGoal } from "@/lib/server/import";
import type { Goal } from "@/lib/types";
import { PageHeader } from "@/components/AppShell";
import { Alert, Button, Card, CardHead, Empty } from "@/components/ui";

type Status =
  | { kind: "reading" }
  | { kind: "none" }
  | { kind: "ready"; goals: Goal[] }
  | { kind: "saving"; goals: Goal[]; goalId: string }
  | { kind: "failed"; goals: Goal[]; message: string }
  | { kind: "done"; name: string };

export default function ImportPage() {
  const [status, setStatus] = useState<Status>({ kind: "reading" });

  useEffect(() => {
    setStatus(readLegacyGoals());
  }, []);

  async function choose(goal: Goal, goals: Goal[]) {
    setStatus({ kind: "saving", goals, goalId: goal.id });
    try {
      const result = await importGoal(goal);
      if (!result.ok) {
        setStatus({ kind: "failed", goals, message: result.message });
        return;
      }
      setStatus({ kind: "done", name: goal.name });
    } catch {
      setStatus({
        kind: "failed",
        goals,
        message: "Couldn't reach the server. Try again.",
      });
    }
  }

  return (
    <>
      <PageHeader title="Import a goal" />

      <Card className="overflow-hidden">
        <CardHead
          title="Left over from before accounts"
          hint="This browser still has data from before the dashboard had accounts. Pick the one goal worth keeping — habits and everything else stay behind."
        />

        {status.kind === "reading" && <Empty>Checking…</Empty>}

        {status.kind === "none" && (
          <Empty>Nothing to import — this browser has no saved goals.</Empty>
        )}

        {status.kind === "done" && (
          <div className="p-4 sm:p-5">
            <p className="text-[13px] text-ink-2">
              Imported <strong className="font-medium text-ink">{status.name}</strong>.
            </p>
            {/* A full load, not a client route change: the dashboard's data is
                fetched by a server layout that already rendered without it. */}
            <a
              className="mt-3 inline-flex items-center justify-center rounded-[10px] border border-accent-700 bg-accent-600 px-3.5 py-2 text-[13.5px] font-medium text-ink hover:bg-accent-pressed"
              href="/"
            >
              Go to the dashboard
            </a>
          </div>
        )}

        {(status.kind === "ready" ||
          status.kind === "saving" ||
          status.kind === "failed") && (
          <>
            {status.kind === "failed" && (
              <div className="border-b border-line bg-surface-2 p-4 sm:p-5">
                <Alert>{status.message}</Alert>
              </div>
            )}
            <ul className="divide-y divide-dashed divide-line">
              {status.goals.map((goal) => (
                <li
                  key={goal.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-5"
                >
                  <span className="text-[13.5px] font-medium text-ink">
                    {goal.name}
                  </span>
                  <span className="text-[12.5px] text-ink-3 tnum">
                    {goal.entries.length}{" "}
                    {goal.entries.length === 1 ? "entry" : "entries"}
                    {goal.milestones.length > 0 &&
                      ` · ${goal.milestones.length} milestones`}
                  </span>
                  <Button
                    className="ml-auto"
                    disabled={status.kind === "saving"}
                    loading={status.kind === "saving" && status.goalId === goal.id}
                    onClick={() => void choose(goal, status.goals)}
                  >
                    {status.kind === "saving" && status.goalId === goal.id
                      ? "Importing…"
                      : "Import this one"}
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </>
  );
}

/**
 * Reads the pre-account localStorage blob. Everything here is untrusted: it was
 * written by an older version of the app, so each goal is checked for the
 * fields this screen displays rather than assumed to be well-formed.
 */
function readLegacyGoals(): Status {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return { kind: "none" };
  }
  if (!raw) return { kind: "none" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { kind: "none" };
  }

  if (!parsed || typeof parsed !== "object") return { kind: "none" };
  const candidate = (parsed as { goals?: unknown }).goals;
  if (!Array.isArray(candidate)) return { kind: "none" };

  const goals = candidate.filter(isDisplayableGoal);
  return goals.length ? { kind: "ready", goals } : { kind: "none" };
}

function isDisplayableGoal(value: unknown): value is Goal {
  if (!value || typeof value !== "object") return false;
  const goal = value as Partial<Goal>;
  return (
    typeof goal.id === "string" &&
    typeof goal.name === "string" &&
    Array.isArray(goal.entries) &&
    Array.isArray(goal.milestones)
  );
}
