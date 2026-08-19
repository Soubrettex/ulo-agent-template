import { defineTool } from "eve/tools";
import { z } from "zod";
import { homeLocation, mapsFetch, mapsKey } from "../lib/googleMaps";

const BASE = "https://weather.googleapis.com/v1";

interface Temp {
  degrees?: number;
  unit?: string;
}
interface Condition {
  description?: { text?: string };
  type?: string;
}
interface HalfDay {
  weatherCondition?: Condition;
  uvIndex?: number;
  relativeHumidity?: number;
  precipitation?: { probability?: { percent?: number; type?: string } };
  wind?: { speed?: { value?: number; unit?: string } };
}
interface ForecastDay {
  displayDate?: { year: number; month: number; day: number };
  daytimeForecast?: HalfDay;
  nighttimeForecast?: HalfDay;
  maxTemperature?: Temp;
  minTemperature?: Temp;
  sunEvents?: { sunriseTime?: string; sunsetTime?: string };
}
interface CurrentConditions {
  weatherCondition?: Condition;
  temperature?: Temp;
  feelsLikeTemperature?: Temp;
  relativeHumidity?: number;
  uvIndex?: number;
  precipitation?: { probability?: { percent?: number; type?: string } };
  wind?: { speed?: { value?: number; unit?: string } };
}

const round = (n?: number) => (typeof n === "number" ? Math.round(n) : null);
const isoDate = (d?: { year: number; month: number; day: number }) =>
  d ? `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}` : null;

export default defineTool({
  description:
    "Get the weather for home (San Jose) — current conditions, or a day-by-day forecast. " +
    "Use for 'do the kids need jackets', 'is it going to rain on saturday', 'how hot tomorrow', " +
    "and for checking whether outdoor plans (parkour, the park, a birthday party) will hold up. " +
    "Includes UV index, which matters for midday outdoor time with the kids. " +
    "Temperatures are Fahrenheit. Call with days=0 for right now; days=N for the next N days.",
  inputSchema: z.object({
    days: z
      .number()
      .int()
      .min(0)
      .max(7)
      .describe("0 = current conditions right now. 1-7 = that many days of forecast.")
      .optional(),
  }),
  async execute({ days }) {
    const { latitude, longitude } = homeLocation();
    const common = `key=${mapsKey()}&location.latitude=${latitude}&location.longitude=${longitude}&unitsSystem=IMPERIAL`;

    if (!days) {
      const data = await mapsFetch<CurrentConditions>(`${BASE}/currentConditions:lookup?${common}`);
      return {
        when: "now",
        conditions: data.weatherCondition?.description?.text ?? null,
        temperatureF: round(data.temperature?.degrees),
        feelsLikeF: round(data.feelsLikeTemperature?.degrees),
        humidityPercent: data.relativeHumidity ?? null,
        uvIndex: data.uvIndex ?? null,
        chanceOfPrecipPercent: data.precipitation?.probability?.percent ?? null,
        windMph: round(data.wind?.speed?.value),
      };
    }

    const data = await mapsFetch<{ forecastDays?: ForecastDay[] }>(
      `${BASE}/forecast/days:lookup?${common}&days=${days}&pageSize=${days}`,
    );

    return {
      when: `next ${days} day(s)`,
      days: (data.forecastDays ?? []).map((d) => ({
        date: isoDate(d.displayDate),
        highF: round(d.maxTemperature?.degrees),
        lowF: round(d.minTemperature?.degrees),
        daytime: d.daytimeForecast?.weatherCondition?.description?.text ?? null,
        chanceOfPrecipPercent: d.daytimeForecast?.precipitation?.probability?.percent ?? null,
        uvIndex: d.daytimeForecast?.uvIndex ?? null,
        sunsetTime: d.sunEvents?.sunsetTime ?? null,
      })),
    };
  },
});
