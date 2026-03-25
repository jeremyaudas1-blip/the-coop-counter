import { useState, useEffect, useRef } from "react";
import { apiRequest } from "@/lib/queryClient";

interface WeatherData {
  temp: number;
  locationName: string;
  lat: number;
}

interface SavedLocation {
  zip: string;
  lat: number;
  lon: number;
  name: string;
}

function getSeason(lat: number): { emoji: string; name: string } {
  const month = new Date().getMonth();
  const isNorthern = lat >= 0;
  if (month >= 2 && month <= 4) return isNorthern ? { emoji: "🌷", name: "Spring" } : { emoji: "🍂", name: "Fall" };
  if (month >= 5 && month <= 7) return isNorthern ? { emoji: "☀️", name: "Summer" } : { emoji: "❄️", name: "Winter" };
  if (month >= 8 && month <= 10) return isNorthern ? { emoji: "🍂", name: "Fall" } : { emoji: "🌷", name: "Spring" };
  return isNorthern ? { emoji: "❄️", name: "Winter" } : { emoji: "☀️", name: "Summer" };
}

function getTempEmoji(tempF: number): string {
  if (tempF <= 32) return "🥶";
  if (tempF <= 50) return "🌬️";
  if (tempF <= 68) return "😊";
  if (tempF <= 85) return "🌤️";
  return "🔥";
}

export function WeatherBadge() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [season, setSeason] = useState<{ emoji: string; name: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [zipInput, setZipInput] = useState("");
  const [hasSavedLocation, setHasSavedLocation] = useState<boolean | null>(null);
  const [zipError, setZipError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadSavedLocation(); }, []);

  async function loadSavedLocation() {
    try {
      const res = await apiRequest("GET", "/api/settings/location");
      if (res.ok) {
        const data = await res.json();
        if (data && data.zip) {
          setHasSavedLocation(true);
          fetchWeather(data.lat, data.lon, data.name);
          return;
        }
      }
    } catch { /* no saved location */ }
    setHasSavedLocation(false);
  }

  async function lookupZip(zip: string) {
    setZipError("");
    setLoading(true);
    try {
      const nomRes = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${zip}&country=US&format=json&limit=1`);
      const nomData = await nomRes.json();
      if (nomData.length > 0) {
        const loc = nomData[0];
        await saveAndFetch(zip, parseFloat(loc.lat), parseFloat(loc.lon), loc.display_name?.split(",")[0] || zip);
        return;
      }
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${zip}&count=1&language=en&format=json`);
      const geoData = await geoRes.json();
      if (geoData.results?.length > 0) {
        const r = geoData.results[0];
        await saveAndFetch(zip, r.latitude, r.longitude, r.name || zip);
        return;
      }
      setZipError("Couldn't find that zip code");
      setLoading(false);
    } catch { setZipError("Something went wrong"); setLoading(false); }
  }

  async function saveAndFetch(zip: string, lat: number, lon: number, name: string) {
    try { await apiRequest("POST", "/api/settings/location", { zip, lat, lon, name }); } catch {}
    setHasSavedLocation(true);
    await fetchWeather(lat, lon, name);
    setShowInput(false);
    setZipInput("");
  }

  async function fetchWeather(lat: number, lon: number, cityName: string) {
    setLoading(true);
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m&temperature_unit=fahrenheit&timezone=auto`);
      const data = await res.json();
      setWeather({ temp: Math.round(data.current.temperature_2m), locationName: cityName, lat });
      setSeason(getSeason(lat));
    } catch {}
    finally { setLoading(false); }
  }

  function handleSubmitZip(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = zipInput.trim();
    if (!cleaned) return;
    lookupZip(cleaned);
  }

  useEffect(() => { if (showInput && inputRef.current) inputRef.current.focus(); }, [showInput]);

  if (hasSavedLocation === null) return null;

  if (!hasSavedLocation && !showInput && !loading) {
    return (
      <button onClick={() => setShowInput(true)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors" data-testid="weather-set-location">
        📍 Set your location
      </button>
    );
  }

  if (showInput) {
    return (
      <form onSubmit={handleSubmitZip} className="flex items-center gap-1.5" data-testid="weather-zip-form">
        <span className="text-xs">📍</span>
        <input ref={inputRef} type="text" inputMode="numeric" pattern="[0-9]*" maxLength={5} placeholder="Zip code" value={zipInput}
          onChange={(e) => setZipInput(e.target.value.replace(/\D/g, "").slice(0, 5))}
          className="w-16 text-xs bg-muted border border-border rounded px-1.5 py-0.5 text-center tabular-nums" data-testid="input-zip" />
        <button type="submit" disabled={zipInput.length < 5 || loading} className="text-xs text-primary font-medium disabled:opacity-40" data-testid="button-zip-submit">
          {loading ? "..." : "Go"}
        </button>
        <button type="button" onClick={() => { setShowInput(false); setZipError(""); }} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
        {zipError && <span className="text-xs text-destructive">{zipError}</span>}
      </form>
    );
  }

  if (loading) return <div className="flex items-center gap-1.5 text-xs text-muted-foreground animate-pulse"><span>🌡️</span><span>...</span></div>;
  if (!weather || !season) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground" data-testid="weather-badge">
      <span className="flex items-center gap-1">{getTempEmoji(weather.temp)} {weather.temp}°F</span>
      <span className="opacity-40">|</span>
      <span className="flex items-center gap-1">{season.emoji} {season.name}</span>
      {weather.locationName && (
        <>
          <span className="opacity-40">|</span>
          <button onClick={() => setShowInput(true)} className="flex items-center gap-1 hover:text-foreground transition-colors" title="Change location" data-testid="weather-change-location">
            📍 {weather.locationName}
          </button>
        </>
      )}
    </div>
  );
}
