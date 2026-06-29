export function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getActTaskCoords(act) {
  for (const team of act?.teams || []) {
    const task = (team.tasks || []).find(
      (t) => t?.lat != null && t?.lng != null,
    );
    if (task) return { lat: task.lat, lng: task.lng };
  }
  return null;
}
