"use client";

import { useEffect, useState } from "react";
import { todayKey } from "./dates";

/**
 * "Today" is client-local by definition, so it resolves after mount rather
 * than during SSR — that's what keeps hydration honest. The interval keeps a
 * tab left open overnight from silently showing yesterday.
 */
export function useToday(): string | null {
  const [today, setToday] = useState<string | null>(null);

  useEffect(() => {
    setToday(todayKey());
    const id = window.setInterval(() => setToday(todayKey()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  return today;
}
