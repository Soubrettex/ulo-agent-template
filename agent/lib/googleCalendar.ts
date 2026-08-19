/**
 * Minimal Google Calendar REST client for eve tools.
 *
 * Auth lives in ./googleAuth (shared with Gmail). Env vars:
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
 * Optional:
 *   GOOGLE_CALENDAR_ID  — defaults to "primary". In production this is the shared
 *                         "Family" calendar, so events land where liz and dylan see them.
 */

import { googleFetch } from "./googleAuth";

const API_BASE = "https://www.googleapis.com/calendar/v3";

/** The family's timezone. Times without an explicit zone are interpreted here. */
export const DEFAULT_TIME_ZONE = "America/Los_Angeles";

export function calendarId(): string {
  return process.env.GOOGLE_CALENDAR_ID || "primary";
}

/** Authenticated call against the Calendar v3 API. Returns parsed JSON. */
export async function calendarFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  return googleFetch<T>(API_BASE, path, init);
}

/**
 * Add one hour to a naive local ISO datetime ("2026-08-20T15:00:00"), doing the
 * arithmetic on the wall-clock components so it stays independent of the server
 * timezone. Used to default an event's end when only a start is given.
 */
export function addOneHourLocal(localIso: string): string {
  const m = localIso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return localIso;
  const [, y, mo, d, h, mi, s] = m;
  const dt = new Date(Date.UTC(+y, +mo - 1, +d, +h + 1, +mi, s ? +s : 0));
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${dt.getUTCFullYear()}-${p(dt.getUTCMonth() + 1)}-${p(dt.getUTCDate())}` +
    `T${p(dt.getUTCHours())}:${p(dt.getUTCMinutes())}:${p(dt.getUTCSeconds())}`
  );
}

export interface CalendarEventInput {
  summary: string;
  start: string;
  end?: string;
  allDay?: boolean;
  location?: string;
  description?: string;
  attendees?: string[];
  timeZone?: string;
}
