import { defineTool } from "eve/tools";
import { z } from "zod";
import { homeLocation, mapsFetch, mapsKey } from "../lib/googleMaps";

const URL = "https://airquality.googleapis.com/v1/currentConditions:lookup";

interface AqiIndex {
  code?: string;
  displayName?: string;
  aqi?: number;
  category?: string;
  dominantPollutant?: string;
}
interface AqiResponse {
  dateTime?: string;
  indexes?: AqiIndex[];
  healthRecommendations?: Record<string, string>;
}

export default defineTool({
  description:
    "Get current air quality (AQI) for home (San Jose). Use when someone asks whether it's okay " +
    "to be outside, during wildfire smoke, or before outdoor plans with the kids — parkour, the " +
    "park, a long walk. Returns the US EPA AQI plus a category and the dominant pollutant. " +
    "Worth checking unprompted during smoke season (roughly august-october) when outdoor plans come up.",
  inputSchema: z.object({}),
  async execute() {
    const location = homeLocation();
    const data = await mapsFetch<AqiResponse>(`${URL}?key=${mapsKey()}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        location,
        // LOCAL_AQI gives the US EPA number people actually recognize; the
        // universal AQI alone would be a scale nobody here has intuition for.
        extraComputations: ["LOCAL_AQI", "HEALTH_RECOMMENDATIONS", "DOMINANT_POLLUTANT_CONCENTRATION"],
        languageCode: "en",
      }),
    });

    const indexes = data.indexes ?? [];
    // Prefer the US EPA index; fall back to whatever came back.
    const local = indexes.find((i) => i.code && i.code !== "uaqi") ?? indexes[0];

    return {
      measuredAt: data.dateTime ?? null,
      aqi: local?.aqi ?? null,
      scale: local?.displayName ?? null,
      category: local?.category ?? null,
      dominantPollutant: local?.dominantPollutant ?? null,
      // Generic guidance is the useful line; the rest is population-specific.
      guidance: data.healthRecommendations?.generalPopulation ?? null,
      childrenGuidance: data.healthRecommendations?.children ?? null,
    };
  },
});
