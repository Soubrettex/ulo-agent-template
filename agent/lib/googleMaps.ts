/**
 * Google Maps Platform (Weather + Air Quality) for Ulo.
 *
 * These use a plain **API key**, not the OAuth refresh token that Calendar and
 * Gmail share — different credential, different env var.
 *
 * Free tier at this family's volume is effectively unlimited: Weather and Air
 * Quality are both Essentials SKUs with 10,000 free calls/month, and Ulo will
 * make on the order of a hundred. Weather is $0.15/1k beyond that, Air Quality
 * $5/1k — set quota caps in the Cloud console so a bug can't run up a bill.
 *
 * Env:
 *   GOOGLE_MAPS_API_KEY   (required)
 *   HOME_LAT / HOME_LNG   (optional; defaults to San Jose)
 */

// TODO: Replace with your city's coordinates.
const DEFAULT_LAT = 37.3382;
const DEFAULT_LNG = -121.8863;

export function mapsKey(): string {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    throw new Error(
      "Weather/air quality are not configured. Set GOOGLE_MAPS_API_KEY (Google Cloud console → Credentials).",
    );
  }
  return key;
}

/** Street address form, for routing (lat/lng would route to the block, not the door). */
export function homeAddress(): string {
  return process.env.HOME_ADDRESS || "123 Main St, Your City, ST";
}

export function homeLocation(): { latitude: number; longitude: number } {
  const lat = Number(process.env.HOME_LAT);
  const lng = Number(process.env.HOME_LNG);
  return {
    latitude: Number.isFinite(lat) ? lat : DEFAULT_LAT,
    longitude: Number.isFinite(lng) ? lng : DEFAULT_LNG,
  };
}

/** Shared error handling — a bad/unrestricted key is the usual failure here. */
export async function mapsFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 403) {
      throw new Error(
        `Google Maps API denied the request (403). The API key is probably not enabled for ` +
          `this API, or its restrictions exclude it. Detail: ${body.slice(0, 300)}`,
      );
    }
    throw new Error(`Google Maps API failed (${res.status}): ${body.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}
