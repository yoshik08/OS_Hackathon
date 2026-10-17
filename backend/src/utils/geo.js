/**
 * Haversine distance in kilometres between two lat/lng points.
 * Powers the donor "nearby requests" page with real distances.
 */
export function haversineKm(lat1, lon1, lat2, lon2) {
  if (
    lat1 == null || lon1 == null ||
    lat2 == null || lon2 == null
  ) return null;
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)) * 10) / 10;
}

// Approx. centre of Hyderabad — used as a fallback donor location
// when we only know the donor's city.
export const HYDERABAD_CENTER = { lat: 17.385, lng: 78.4867 };
