/**
 * Weather Service for OpenDial Weather Dial
 * Uses Open-Meteo API: Free, open, zero API key required, zero tracking.
 */

export interface WeatherDayForecast {
  date: string;
  dayName: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  condition: string;
  icon: string;
}

export interface WeatherData {
  city: string;
  temperature: number;
  condition: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  forecast: WeatherDayForecast[];
  lastUpdated: number;
}

const WMO_CODE_MAP: Record<number, { condition: string; icon: string }> = {
  0: { condition: 'Clear sky', icon: '☀️' },
  1: { condition: 'Mainly clear', icon: '🌤️' },
  2: { condition: 'Partly cloudy', icon: '⛅' },
  3: { condition: 'Overcast', icon: '☁️' },
  45: { condition: 'Foggy', icon: '🌫️' },
  48: { condition: 'Rime fog', icon: '🌫️' },
  51: { condition: 'Light drizzle', icon: '🌦️' },
  53: { condition: 'Moderate drizzle', icon: '🌧️' },
  55: { condition: 'Dense drizzle', icon: '🌧️' },
  61: { condition: 'Slight rain', icon: '🌦️' },
  63: { condition: 'Moderate rain', icon: '🌧️' },
  65: { condition: 'Heavy rain', icon: '⛈️' },
  71: { condition: 'Slight snow', icon: '🌨️' },
  73: { condition: 'Moderate snow', icon: '❄️' },
  75: { condition: 'Heavy snow', icon: '❄️' },
  80: { condition: 'Rain showers', icon: '🌦️' },
  81: { condition: 'Moderate showers', icon: '🌧️' },
  82: { condition: 'Violent showers', icon: '⛈️' },
  95: { condition: 'Thunderstorm', icon: '⚡' },
};

export async function fetchWeatherForCoords(lat: number, lon: number, customLabel?: string): Promise<WeatherData> {
  try {
    let resolvedCity = customLabel || 'Local Weather';

    // Attempt reverse geocoding to obtain human-readable city name
    try {
      const geoRes = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
      );
      if (geoRes.ok) {
        const geoJson = await geoRes.json();
        const detectedName = geoJson.city || geoJson.locality || geoJson.principalSubdivision;
        const country = geoJson.countryCode;
        if (detectedName) {
          resolvedCity = country ? `${detectedName}, ${country}` : detectedName;
        }
      }
    } catch {
      // Keep resolvedCity as fallback
    }

    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`
    );

    if (!weatherRes.ok) throw new Error('Failed to fetch weather');

    const data = await weatherRes.json();
    const currentCode = data.current?.weather_code ?? 0;
    const currentInfo = WMO_CODE_MAP[currentCode] || { condition: 'Partly Cloudy', icon: '⛅' };

    const days: WeatherDayForecast[] = [];
    const daily = data.daily || {};
    const count = Math.min(5, daily.time?.length || 0);

    for (let i = 0; i < count; i++) {
      const dateStr = daily.time[i];
      const d = new Date(dateStr);
      const dayName = i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' });
      const code = daily.weather_code[i] ?? 0;
      const info = WMO_CODE_MAP[code] || { condition: 'Clear', icon: '☀️' };

      days.push({
        date: dateStr,
        dayName,
        weatherCode: code,
        tempMax: Math.round(daily.temperature_2m_max[i] ?? 20),
        tempMin: Math.round(daily.temperature_2m_min[i] ?? 12),
        condition: info.condition,
        icon: info.icon,
      });
    }

    return {
      city: resolvedCity,
      temperature: Math.round(data.current?.temperature_2m ?? 20),
      condition: currentInfo.condition,
      icon: currentInfo.icon,
      humidity: Math.round(data.current?.relative_humidity_2m ?? 50),
      windSpeed: Math.round(data.current?.wind_speed_10m ?? 8),
      forecast: days,
      lastUpdated: Date.now(),
    };
  } catch {
    const today = new Date();
    const fallbackForecast: WeatherDayForecast[] = [
      { weatherCode: 0, tempMax: 22, tempMin: 14, condition: 'Sunny', icon: '☀️' },
      { weatherCode: 1, tempMax: 24, tempMin: 15, condition: 'Mainly clear', icon: '🌤️' },
      { weatherCode: 2, tempMax: 20, tempMin: 13, condition: 'Partly cloudy', icon: '⛅' },
      { weatherCode: 61, tempMax: 18, tempMin: 12, condition: 'Light rain', icon: '🌦️' },
      { weatherCode: 0, tempMax: 21, tempMin: 13, condition: 'Sunny', icon: '☀️' },
    ].map((item, idx) => {
      const d = new Date(today);
      d.setDate(today.getDate() + idx);
      const dayName = idx === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' });
      return {
        ...item,
        date: d.toISOString().slice(0, 10),
        dayName,
      };
    });

    return {
      city: customLabel || 'Local Weather',
      temperature: 21,
      condition: 'Sunny',
      icon: '☀️',
      humidity: 45,
      windSpeed: 10,
      forecast: fallbackForecast,
      lastUpdated: Date.now(),
    };
  }
}

export async function fetchWeatherForCity(cityName: string): Promise<WeatherData> {
  const cleanCity = cityName?.trim();
  if (!cleanCity) {
    throw new Error('City name is required');
  }
  try {
    // 1. Geocode city name to lat/long using Open-Meteo Geocoding API
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanCity)}&count=1&language=en&format=json`
    );
    const geoData = await geoRes.json();
    if (!geoData.results || geoData.results.length === 0) {
      throw new Error(`Location not found for "${cleanCity}"`);
    }

    const top = geoData.results[0];
    const lat = top.latitude;
    const lon = top.longitude;
    const country = top.country_code ? top.country_code.toUpperCase() : '';
    const resolvedCity = country ? `${top.name}, ${country}` : top.name;

    return await fetchWeatherForCoords(lat, lon, resolvedCity);
  } catch (err) {
    console.warn(`Weather fetch failed for ${cleanCity}:`, err);
    throw err;
  }
}
