export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max)
}

export function float32FromUint16(high: number, low: number): number {
  const buffer = new ArrayBuffer(4)
  const view = new DataView(buffer)
  view.setUint16(0, high, false)
  view.setUint16(2, low, false)
  return view.getFloat32(0, false)
}

export function degToRad(deg: number): number {
  return deg * Math.PI / 180
}
