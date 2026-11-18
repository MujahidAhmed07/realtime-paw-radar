/**
 * Location service — privacy-conscious.
 * Location is read only on explicit user action (button press), never tracked
 * continuously. Persistence happens only when the user opts in to nearby alerts.
 */

export interface Coords { latitude: number; longitude: number; accuracy?: number }

export function getPosition(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('Geolocation is not supported by this browser'))
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => reject(new Error(
        err.code === err.PERMISSION_DENIED ? 'Location permission denied. You can enter coordinates manually.'
        : err.code === err.TIMEOUT ? 'Getting your location timed out. Please try again.'
        : 'Unable to determine your location.'
      )),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  })
}

/** Reverse geocode via OSM Nominatim (public, keyless, usage-policy friendly). */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`)
    if (!res.ok) return null
    const data = await res.json()
    return data.display_name ?? null
  } catch { return null }
}

export const FALLBACK_CENTER = { lat: 41.0082, lng: 28.9784 } // Istanbul — default map center
