import { evaluate, formatValue, getMath, assertSafe, preprocess, type AngleMode } from './calc'

export interface FormulaVar { name: string; label: string; def: number }
export interface Formula { id: string; name: string; category: string; expr: string; out: string; vars: FormulaVar[]; custom?: boolean }

type Row = [string, string, string, string, string, [string, string, number][]]
const rows: Row[] = [
  ['ohm-v', 'Ohm’s law (voltage)', 'Electrical', 'I*R', 'Voltage (V)', [['I', 'Current (A)', 2], ['R', 'Resistance (Ω)', 5]]],
  ['power-vi', 'Electrical power', 'Electrical', 'V*I', 'Power (W)', [['V', 'Voltage (V)', 230], ['I', 'Current (A)', 2]]],
  ['par-r', 'Two resistors in parallel', 'Electrical', 'R1*R2/(R1+R2)', 'Resistance (Ω)', [['R1', 'R1 (Ω)', 100], ['R2', 'R2 (Ω)', 220]]],
  ['rc-tau', 'RC time constant', 'Electrical', 'R*C', 'Time constant (s)', [['R', 'Resistance (Ω)', 10000], ['C', 'Capacitance (F)', 0.0001]]],
  ['xc', 'Capacitive reactance', 'Electrical', '1/(2*pi*f*C)', 'Reactance (Ω)', [['f', 'Frequency (Hz)', 50], ['C', 'Capacitance (F)', 0.00001]]],
  ['xl', 'Inductive reactance', 'Electrical', '2*pi*f*L', 'Reactance (Ω)', [['f', 'Frequency (Hz)', 50], ['L', 'Inductance (H)', 0.1]]],
  ['lc-res', 'LC resonant frequency', 'Electrical', '1/(2*pi*sqrt(L*C))', 'Frequency (Hz)', [['L', 'Inductance (H)', 0.001], ['C', 'Capacitance (F)', 0.000001]]],
  ['ke', 'Kinetic energy', 'Mechanics', '0.5*m*v^2', 'Energy (J)', [['m', 'Mass (kg)', 2], ['v', 'Speed (m/s)', 3]]],
  ['newton2', 'Newton’s second law', 'Mechanics', 'm*a', 'Force (N)', [['m', 'Mass (kg)', 10], ['a', 'Acceleration (m/s²)', 9.8]]],
  ['proj', 'Projectile range', 'Mechanics', 'v^2*sin(2*theta)/9.80665', 'Range (m)', [['v', 'Launch speed (m/s)', 20], ['theta', 'Launch angle (uses the angle mode)', 45]]],
  ['grav', 'Gravitational force', 'Mechanics', '6.674e-11*m1*m2/r^2', 'Force (N)', [['m1', 'Mass 1 (kg)', 5.972e24], ['m2', 'Mass 2 (kg)', 7.348e22], ['r', 'Distance (m)', 3.844e8]]],
  ['wave', 'Wave speed', 'Mechanics', 'f*lambda', 'Speed (m/s)', [['f', 'Frequency (Hz)', 440], ['lambda', 'Wavelength (m)', 0.78]]],
  ['gas-t', 'Ideal gas temperature', 'Mechanics', 'P*V/(n*8.314462618)', 'Temperature (K)', [['P', 'Pressure (Pa)', 101325], ['V', 'Volume (m³)', 0.0224], ['n', 'Amount (mol)', 1]]],
  ['circ-a', 'Circle area', 'Geometry', 'pi*r^2', 'Area', [['r', 'Radius', 5]]],
  ['circ-c', 'Circle circumference', 'Geometry', '2*pi*r', 'Circumference', [['r', 'Radius', 5]]],
  ['sph-v', 'Sphere volume', 'Geometry', '4/3*pi*r^3', 'Volume', [['r', 'Radius', 3]]],
  ['pyth', 'Pythagorean theorem', 'Geometry', 'sqrt(a^2+b^2)', 'Hypotenuse', [['a', 'Side a', 3], ['b', 'Side b', 4]]],
  ['heron', 'Triangle area (Heron)', 'Geometry', 'sqrt(((a+b+c)/2)*((a+b+c)/2-a)*((a+b+c)/2-b)*((a+b+c)/2-c))', 'Area', [['a', 'Side a', 3], ['b', 'Side b', 4], ['c', 'Side c', 5]]],
  ['disc', 'Quadratic discriminant', 'Algebra', 'b^2-4*a*c', 'Discriminant', [['a', 'a', 1], ['b', 'b', -3], ['c', 'c', 2]]],
  ['quad1', 'Quadratic root (+)', 'Algebra', '(-b+sqrt(b^2-4*a*c))/(2*a)', 'Root', [['a', 'a', 1], ['b', 'b', -3], ['c', 'c', 2]]],
  ['quad2', 'Quadratic root (−)', 'Algebra', '(-b-sqrt(b^2-4*a*c))/(2*a)', 'Root', [['a', 'a', 1], ['b', 'b', -3], ['c', 'c', 2]]],
  ['simple-i', 'Simple interest', 'Finance', 'P*r*t/100', 'Interest', [['P', 'Principal', 10000], ['r', 'Rate (% per year)', 7], ['t', 'Years', 3]]],
  ['compound', 'Compound interest (final amount)', 'Finance', 'P*(1+r/(100*n))^(n*t)', 'Amount', [['P', 'Principal', 10000], ['r', 'Rate (% per year)', 7], ['n', 'Compounds per year', 12], ['t', 'Years', 5]]],
  ['emi', 'Loan EMI (monthly payment)', 'Finance', 'P*(R/1200)*(1+R/1200)^N/((1+R/1200)^N-1)', 'Monthly payment', [['P', 'Loan amount', 500000], ['R', 'Annual rate (%)', 9], ['N', 'Months', 60]]],
  ['cagr', 'Compound annual growth rate', 'Finance', '((final/initial)^(1/years)-1)*100', 'CAGR (%)', [['initial', 'Start value', 1000], ['final', 'End value', 2000], ['years', 'Years', 5]]],
  ['zscore', 'Z-score', 'Statistics', '(x-mu)/sigma', 'z', [['x', 'Value', 75], ['mu', 'Mean', 70], ['sigma', 'Std deviation', 5]]],
  ['sem', 'Standard error of the mean', 'Statistics', 's/sqrt(n)', 'Standard error', [['s', 'Sample std deviation', 12], ['n', 'Sample size', 36]]],
]
export const BUILTIN: Formula[] = rows.map(([id, name, category, expr, out, v]) => ({ id, name, category, expr, out, vars: v.map(([name, label, def]) => ({ name, label, def })) }))

const NOT_VARS = new Set(['pi', 'e', 'tau', 'phi', 'i', 'Infinity', 'NaN', 'true', 'false'])
export function variablesOf(expr: string, angle: AngleMode = 'deg'): string[] {
  const node = getMath(angle).parse(preprocess(expr))
  assertSafe(node)
  const s = new Set<string>()
  node.traverse((n: any, path: string, parent: any) => { if (n.isSymbolNode && !(parent?.isFunctionNode && path === 'fn') && !NOT_VARS.has(n.name)) s.add(n.name) })
  return [...s]
}

export function computeFormula(expr: string, values: Record<string, string>, angle: AngleMode = 'deg', precision = 10): string {
  const scope: Record<string, number> = {}
  for (const name of variablesOf(expr, angle)) {
    const raw = (values[name] ?? '').trim()
    const n = Number(raw)
    if (raw === '' || !Number.isFinite(n)) throw new Error(`Enter a number for ${name}`)
    scope[name] = n
  }
  const v = evaluate(expr, angle, scope)
  if (typeof v === 'function' || v === undefined) throw new Error('Not a value')
  return formatValue(v, precision)
}

export function makeCustom(name: string, category: string, expr: string, out: string): Formula {
  if (!name.trim()) throw new Error('Give the formula a name')
  const vars = variablesOf(expr)
  return { id: `c-${Date.now().toString(36)}`, name: name.trim(), category: category.trim() || 'Custom', expr: expr.trim(), out: out.trim() || 'Result', vars: vars.map((v) => ({ name: v, label: v, def: 1 })), custom: true }
}

const read = <T,>(k: string, d: T): T => { try { return JSON.parse(localStorage.getItem(k) ?? '') as T } catch { return d } }
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* storage unavailable */ } }
export const loadFavs = (): string[] => read('calyx.favs', [])
export const saveFavs = (f: string[]) => write('calyx.favs', f)
export const loadCustom = (): Formula[] => read('calyx.customFormulas', [])
export const saveCustom = (f: Formula[]) => write('calyx.customFormulas', f)
