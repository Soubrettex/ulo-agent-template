import { defineTool } from "eve/tools";
import { z } from "zod";
import { homeAddress, mapsFetch, mapsKey } from "../lib/googleMaps";

const URL = "https://routes.googleapis.com/directions/v2:computeRoutes";

interface RoutesResponse {
  routes?: Array<{
    duration?: string; // e.g. "1523s" — with live traffic
    staticDuration?: string; // without traffic
    distanceMeters?: number;
  }>;
}

const seconds = (d?: string) => (d ? Number(d.replace(/s$/, "")) : null);
const minutes = (s: number | null) => (s === null ? null : Math.round(s / 60));

/**
 * One traffic-aware route lookup. Uses the TRAFFIC_AWARE routing preference,
 * which bills as the Routes Pro SKU (5,000 free calls/month).
 */
async function route(origin: string, destination: string, departureTime: Date) {
  // The API rejects a departure time in the past; clamp with a small buffer.
  const depart = departureTime.getTime() < Date.now() + 30_000
    ? new Date(Date.now() + 60_000)
    : departureTime;

  const data = await mapsFetch<RoutesResponse>(URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-Goog-Api-Key": mapsKey(),
      // The Routes API requires an explicit field mask.
      "X-Goog-FieldMask": "routes.duration,routes.staticDuration,routes.distanceMeters",
    },
    body: JSON.stringify({
      origin: { address: origin },
      destination: { address: destination },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
      departureTime: depart.toISOString(),
      computeAlternativeRoutes: false,
      units: "IMPERIAL",
    }),
  });

  const r = data.routes?.[0];
  if (!r) throw new Error(`No driving route found from "${origin}" to "${destination}".`);
  return {
    withTrafficSec: seconds(r.duration),
    withoutTrafficSec: seconds(r.staticDuration),
    miles: r.distanceMeters ? Math.round((r.distanceMeters / 1609.34) * 10) / 10 : null,
    departedAt: depart,
  };
}

export default defineTool({
  description:
    "Driving time with live traffic, from home unless another origin is given. Two uses: " +
    "(a) 'how long to get to X' — leave off arriveBy; (b) 'when do we need to leave to make " +
    "X by 4:30' — pass arriveBy, and you get a leave-by time. Most useful for trips that " +
    "aren't routine: the grandparents, the vet, an appointment off the calendar. " +
    "For the daily school run they already know the routine — don't second-guess it unless they ask.",
  inputSchema: z.object({
    destination: z
      .string()
      .min(3)
      .describe("Where they're going — an address, or a place name specific enough to find, e.g. 'Main Street Vet, Springfield IL'."),
    origin: z.string().describe("Starting point. Defaults to home.").optional(),
    arriveBy: z
      .string()
      .describe(
        "Optional target arrival as local ISO time, e.g. '2026-08-20T16:30:00'. " +
          "When set, the answer is what time to leave. Get the real date from current_time first.",
      )
      .optional(),
  }),
  async execute({ destination, origin, arriveBy }) {
    const from = origin ?? homeAddress();

    if (!arriveBy) {
      const now = await route(from, destination, new Date());
      return {
        from,
        to: destination,
        driveMinutes: minutes(now.withTrafficSec),
        withoutTrafficMinutes: minutes(now.withoutTrafficSec),
        miles: now.miles,
        arriveIfLeavingNow: new Date(
          Date.now() + (now.withTrafficSec ?? 0) * 1000,
        ).toISOString(),
      };
    }

    // "Leave by" needs two passes: traffic at 5pm differs from traffic now, so we
    // estimate the trip, step back from the arrival time, then re-check traffic at
    // that departure and use the corrected figure.
    const target = new Date(arriveBy);
    if (Number.isNaN(target.getTime())) {
      throw new Error(`Could not read arriveBy "${arriveBy}" as a date.`);
    }

    const first = await route(from, destination, target);
    const guessedDeparture = new Date(target.getTime() - (first.withTrafficSec ?? 0) * 1000);
    const second = await route(from, destination, guessedDeparture);
    const driveSec = second.withTrafficSec ?? first.withTrafficSec ?? 0;

    return {
      from,
      to: destination,
      arriveBy: target.toISOString(),
      leaveBy: new Date(target.getTime() - driveSec * 1000).toISOString(),
      driveMinutes: minutes(driveSec),
      withoutTrafficMinutes: minutes(second.withoutTrafficSec),
      miles: second.miles,
    };
  },
});
