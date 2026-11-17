import { create, all } from 'mathjs'
const math = create(all)

export const UNITS: Record<string, string[]> = {
  Length: ['m', 'km', 'cm', 'mm', 'inch', 'ft', 'mile'],
  Mass: ['kg', 'g', 'lb', 'oz'],
  Time: ['s', 'min', 'hour', 'day'],
  Temperature: ['degC', 'degF', 'K'],
  Speed: ['m/s', 'km/h', 'mph'],
  Energy: ['J', 'kJ', 'cal', 'kWh'],
  Pressure: ['Pa', 'kPa', 'bar', 'psi', 'atm'],
}

export function convert(value: number, from: string, to: string): number {
  if (!Number.isFinite(value)) throw new Error('Enter a number')
  return math.unit(value, from).toNumber(to)
}

const PREFIXES: Record<number, string> = { 12: 'T', 9: 'G', 6: 'M', 3: 'k', 0: '', [-3]: 'm', [-6]: 'µ', [-9]: 'n', [-12]: 'p' }
export function siPrefix(v: number): { mantissa: number; prefix: string; exponent: number } {
  if (v === 0 || !Number.isFinite(v)) return { mantissa: v, prefix: '', exponent: 0 }
  const e = Math.max(-12, Math.min(12, Math.floor(Math.log10(Math.abs(v)) / 3) * 3))
  return { mantissa: v / 10 ** e, prefix: PREFIXES[e], exponent: e }
}
export const engineering = (v: number, precision = 6): string => math.format(v, { notation: 'engineering', precision })
export const scientific = (v: number, precision = 6): string => math.format(v, { notation: 'exponential', precision })

export const CONSTANTS: { name: string; key: string; unit: string }[] = [
  { name: 'Speed of light', key: 'speedOfLight', unit: 'm/s' },
  { name: 'Planck constant', key: 'planckConstant', unit: 'J s' },
  { name: 'Gravitational constant', key: 'gravitationConstant', unit: 'm^3 / (kg s^2)' },
  { name: 'Standard gravity', key: 'gravity', unit: 'm/s^2' },
  { name: 'Elementary charge', key: 'elementaryCharge', unit: 'C' },
  { name: 'Boltzmann constant', key: 'boltzmann', unit: 'J/K' },
  { name: 'Avogadro constant', key: 'avogadro', unit: 'mol^-1' },
  { name: 'Molar gas constant', key: 'gasConstant', unit: 'J/(K mol)' },
  { name: 'Electron mass', key: 'electronMass', unit: 'kg' },
  { name: 'Proton mass', key: 'protonMass', unit: 'kg' },
  { name: 'Vacuum permittivity', key: 'electricConstant', unit: 'F/m' },
  { name: 'Vacuum permeability', key: 'magneticConstant', unit: 'N/A^2' },
  { name: 'Stefan–Boltzmann constant', key: 'stefanBoltzmann', unit: 'W/(m^2 K^4)' },
]
export function constantValue(key: string, unit: string): number {
  const u = (math as any)[key]
  if (!u) throw new Error(`Unknown constant ${key}`)
  return typeof u === 'number' ? u : u.toNumber(unit)
}
