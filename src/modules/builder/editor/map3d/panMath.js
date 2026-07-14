// Pure conversion functions for Map3D thumbnail drag-to-pan.
// See docs/superpowers/specs/2026-07-13-map3d-drag-pan-design.md

export function pixelsToLngLat(dx, dy, centerLat, zoom) {
  if (dx === 0 && dy === 0) return { dLng: 0, dLat: 0 }
  const latRad = centerLat * Math.PI / 180
  const mpp = 156543.03392 * Math.cos(latRad) / Math.pow(2, zoom)
  const dxMeters = dx * mpp
  const dyMeters = dy * mpp
  const dLng = -dxMeters / (111320 * Math.cos(latRad))
  const dLat = dyMeters / 110540
  return { dLng, dLat }
}
