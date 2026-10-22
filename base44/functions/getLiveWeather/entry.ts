/**
 * Current wind and temperature for the golfer's position, so the plays-like
 * numbers start from real conditions instead of last week's guess.
 * MET Norway answers first (no key); Open-Meteo is the back-up.
 */
const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const UA = { 'User-Agent': 'ApexGolfAI/1.0 (golf conditions lookup)' };

const compassFrom = (degrees) => COMPASS[Math.round((((degrees % 360) + 360) % 360) / 45) % 8];

async function fromMetNorway(lat, lng) {
  const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat.toFixed(4)}&lon=${lng.toFixed(4)}`;
  const response = await fetch(url, { headers: UA, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`MET Norway responded ${response.status}`);

  const details = (await response.json())?.properties?.timeseries?.[0]?.data?.instant?.details;
  if (!details) throw new Error('No current weather returned');

  return {
    temp: Math.round((Number(details.air_temperature) * 9) / 5 + 32),
    windSpeed: Math.round(Number(details.wind_speed) * 2.23694),
    windDir: compassFrom(Number(details.wind_from_direction)),
    observedAt: null,
  };
}

async function fromOpenMeteo(lat, lng) {
  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${lat}&longitude=${lng}` +
    '&current=temperature_2m,wind_speed_10m,wind_direction_10m' +
    '&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto';
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Open-Meteo responded ${response.status}`);

  const current = (await response.json())?.current;
  if (!current) throw new Error('No current weather returned');

  return {
    temp: Math.round(Number(current.temperature_2m)),
    windSpeed: Math.round(Number(current.wind_speed_10m)),
    windDir: compassFrom(Number(current.wind_direction_10m)),
    observedAt: current.time ?? null,
  };
}

export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const lat = Number(body?.lat);
    const lng = Number(body?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return Response.json({ error: 'Valid lat and lng are required' }, { status: 400 });
    }

    for (const provider of [fromMetNorway, fromOpenMeteo]) {
      try {
        return Response.json(await provider(lat, lng));
      } catch {
        /* try the next provider */
      }
    }
    return Response.json({ error: 'Weather is unavailable right now' }, { status: 502 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}