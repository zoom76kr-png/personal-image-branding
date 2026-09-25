export type RGB = { r: number; g: number; b: number }
export type Lab = { l: number; a: number; b: number }

export function rgbToHex({ r, g, b }: RGB): string {
  return `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`.toUpperCase()
}

export function hexToRgb(hex: string): RGB {
  const value = hex.replace('#', '')
  return { r: parseInt(value.slice(0, 2), 16), g: parseInt(value.slice(2, 4), 16), b: parseInt(value.slice(4, 6), 16) }
}

export function rgbToLab({ r, g, b }: RGB): Lab {
  const linear = [r, g, b].map((v) => {
    const x = v / 255
    return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
  })
  const x = (linear[0] * 0.4124564 + linear[1] * 0.3575761 + linear[2] * 0.1804375) / 0.95047
  const y = linear[0] * 0.2126729 + linear[1] * 0.7151522 + linear[2] * 0.0721750
  const z = (linear[0] * 0.0193339 + linear[1] * 0.1191920 + linear[2] * 0.9503041) / 1.08883
  const f = (v: number) => v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116
  return { l: 116 * f(y) - 16, a: 500 * (f(x) - f(y)), b: 200 * (f(y) - f(z)) }
}

export function medianColor(colors: RGB[]): RGB | null {
  if (!colors.length) return null
  const middle = Math.floor(colors.length / 2)
  const component = (key: keyof RGB) => colors.map((color) => color[key]).sort((a, b) => a - b)[middle]
  return { r: component('r'), g: component('g'), b: component('b') }
}

export function relativeLuminance(hex: string): number {
  return rgbToLab(hexToRgb(hex)).l
}
