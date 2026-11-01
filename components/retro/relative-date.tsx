"use client";

import { formatDistanceToNow } from "date-fns";
import { useSyncExternalStore } from "react";

const CALENDAR_DATE = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const subscribeNever = () => () => {};

/**
 * `iso` as a UTC calendar date on the server and during hydration, then as
 * "6 days ago" in the browser.
 */
export function RelativeDate({ iso }: { iso: string }) {
  const date = new Date(iso);
  return useSyncExternalStore(
    subscribeNever,
    () => formatDistanceToNow(date, { addSuffix: true }),
    () => CALENDAR_DATE.format(date),
  );
}
