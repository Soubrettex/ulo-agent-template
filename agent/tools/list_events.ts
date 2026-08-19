import { defineTool } from "eve/tools";
import { z } from "zod";
import { calendarFetch, calendarId, DEFAULT_TIME_ZONE } from "../lib/googleCalendar";

interface GCalListResponse {
  items?: Array<{
    id: string;
    summary?: string;
    location?: string;
    start?: { dateTime?: string; date?: string };
    end?: { dateTime?: string; date?: string };
    attendees?: Array<{ email?: string; responseStatus?: string }>;
  }>;
}

export default defineTool({
  description:
    "List upcoming family calendar events. Use for questions like 'what's on today', " +
    "'what does this week look like', 'when is the dentist', or 'are we free Saturday afternoon'. " +
    "Get the real current time from the current_time tool first when the user says relative things like 'today' or 'this weekend'. " +
    "If `events` is empty but `nextBeyondWindow` has items, the calendar was read fine — there's just nothing in that window; " +
    "say so AND mention what's next (e.g. \"nothing this week, but dom's appt is next wed\").",
  inputSchema: z.object({
    timeMin: z
      .string()
      .describe("ISO 8601 lower bound, inclusive (e.g. '2026-08-16T00:00:00-07:00'). Defaults to now.")
      .optional(),
    timeMax: z
      .string()
      .describe("ISO 8601 upper bound, exclusive. Defaults to 7 days after timeMin.")
      .optional(),
    query: z.string().describe("Free-text search across event title/description/location.").optional(),
    maxResults: z.number().int().min(1).max(50).describe("Max events to return (default 20).").optional(),
  }),
  async execute({ timeMin, timeMax, query, maxResults }) {
    const now = new Date();
    const min = timeMin ?? now.toISOString();
    const max =
      timeMax ?? new Date(new Date(min).getTime() + 7 * 24 * 3600 * 1000).toISOString();

    const fetchWindow = async (from: string, to: string | null, limit: number) => {
      const params = new URLSearchParams({
        timeMin: from,
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: String(limit),
        timeZone: DEFAULT_TIME_ZONE,
      });
      if (to) params.set("timeMax", to);
      if (query) params.set("q", query);

      const data = await calendarFetch<GCalListResponse>(
        `/calendars/${encodeURIComponent(calendarId())}/events?${params.toString()}`,
      );
      return (data.items ?? []).map((e) => ({
        id: e.id,
        title: e.summary ?? "(no title)",
        start: e.start?.dateTime ?? e.start?.date ?? null,
        end: e.end?.dateTime ?? e.end?.date ?? null,
        allDay: Boolean(e.start?.date && !e.start?.dateTime),
        location: e.location ?? null,
        attendees: (e.attendees ?? []).map((a) => a.email).filter(Boolean),
      }));
    };

    const events = await fetchWindow(min, max, maxResults ?? 20);

    // An empty default window is ambiguous — "nothing scheduled" reads the same as
    // "wrong calendar". When the caller didn't pin an explicit upper bound, peek
    // further ahead so we can say what IS next instead of just "nothing".
    let nextBeyondWindow: typeof events = [];
    if (events.length === 0 && !timeMax) {
      nextBeyondWindow = await fetchWindow(max, null, 3);
    }

    return {
      count: events.length,
      timeZone: DEFAULT_TIME_ZONE,
      searchedFrom: min,
      searchedThrough: max,
      events,
      // Only populated when the requested window was empty.
      nextBeyondWindow,
    };
  },
});
