"use client";

import { useEffect, useState } from "react";
import { STORAGE_KEY } from "@/lib/constants";
import { importGoal } from "@/lib/server/import";
import type { Goal } from "@/lib/types";
import styles from "./import.module.css";

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
    <main className={styles.page}>
      <h1 className={styles.title}>Import a goal</h1>
      <p className={styles.blurb}>
        This browser still has data from before the dashboard had accounts. Pick
        the one goal worth keeping — habits and everything else stay behind.
      </p>

      {status.kind === "reading" && <p className={styles.note}>Checking…</p>}

      {status.kind === "none" && (
        <p className={styles.note}>
          Nothing to import — this browser has no saved goals.
        </p>
      )}

      {status.kind === "done" && (
        <div className={styles.done}>
          <p className={styles.doneLine}>
            Imported <strong>{status.name}</strong>.
          </p>
          {/* A full load, not a client route change: the dashboard's data is
              fetched by a server layout that already rendered without it. */}
          <a className={styles.button} href="/">
            Go to the dashboard
          </a>
        </div>
      )}

      {(status.kind === "ready" ||
        status.kind === "saving" ||
        status.kind === "failed") && (
        <>
          {status.kind === "failed" && (
            <p className={styles.error} role="alert">
              {status.message}
            </p>
          )}
          <ul className={styles.list}>
            {status.goals.map((goal) => (
              <li key={goal.id} className={styles.row}>
                <span className={styles.goalName}>{goal.name}</span>
                <span className={styles.meta}>
                  {goal.entries.length}{" "}
                  {goal.entries.length === 1 ? "entry" : "entries"}
                  {goal.milestones.length > 0 &&
                    ` · ${goal.milestones.length} milestones`}
                </span>
                <button
                  type="button"
                  className={styles.button}
                  disabled={status.kind === "saving"}
                  onClick={() => void choose(goal, status.goals)}
                >
                  {status.kind === "saving" && status.goalId === goal.id
                    ? "Importing…"
                    : "Import this one"}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
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
