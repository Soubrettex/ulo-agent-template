import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  addOneHourLocal,
  calendarFetch,
  calendarId,
  DEFAULT_TIME_ZONE,
  type CalendarEventInput,
} from "../lib/googleCalendar";

interface GCalEvent {
  id: string;
  summary?: string;
  htmlLink?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

export default defineTool({
  description:
    "Create a family calendar event on Ulo's own calendar. IMPORTANT: confirm the specifics (title, date, time) " +
    "with the user in the chat BEFORE calling this. Times without a zone are treated as America/Los_Angeles. " +
    "Attendees get a real emailed invite — only add attendees when the user explicitly asks to invite people; " +
    "never invite anyone they didn't name.",
  inputSchema: z.object({
    summary: z.string().min(1).describe("Event title, e.g. 'Kid dentist' or 'Family dinner'."),
    start: z
      .string()
      .describe(
        "Start. Timed: local ISO like '2026-08-20T15:00:00'. All-day: date 'YYYY-MM-DD'.",
      ),
    end: z
      .string()
      .describe("End. Timed: local ISO. All-day: the exclusive end date. Defaults to +1h (timed) or same day.")
      .optional(),
    allDay: z.boolean().describe("True for an all-day event.").optional(),
    location: z.string().optional(),
    description: z.string().optional(),
    attendees: z
      .array(z.string().email())
      .describe("Emails to invite. Sends real calendar invites — use only when the user asked to invite people.")
      .optional(),
    timeZone: z.string().describe("IANA timezone. Defaults to America/Los_Angeles.").optional(),
  }),
  async execute(input: CalendarEventInput) {
    const { summary, start, allDay, location, description, attendees } = input;
    const tz = input.timeZone ?? DEFAULT_TIME_ZONE;

    const body: Record<string, unknown> = { summary, location, description };
    if (allDay) {
      body.start = { date: start };
      body.end = { date: input.end ?? start };
    } else {
      body.start = { dateTime: start, timeZone: tz };
      body.end = { dateTime: input.end ?? addOneHourLocal(start), timeZone: tz };
    }
    if (attendees?.length) {
      body.attendees = attendees.map((email) => ({ email }));
    }

    const query = attendees?.length ? "?sendUpdates=all" : "";
    const created = await calendarFetch<GCalEvent>(
      `/calendars/${encodeURIComponent(calendarId())}/events${query}`,
      { method: "POST", body: JSON.stringify(body) },
    );

    return {
      id: created.id,
      title: created.summary,
      start: created.start?.dateTime ?? created.start?.date ?? null,
      end: created.end?.dateTime ?? created.end?.date ?? null,
      link: created.htmlLink,
      invitedAttendees: attendees ?? [],
    };
  },
});
