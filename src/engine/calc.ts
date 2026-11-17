import { create, all, type MathJsInstance } from 'mathjs'

export type AngleMode = 'deg' | 'rad'
const cache: Partial<Record<AngleMode, MathJsInstance>> = {}
const BLOCKED = new Set(['import', 'createUnit', 'evaluate', 'parse', 'simplify', 'derivative', 'resolve', 'reviver'])

export function getMath(angle: AngleMode): MathJsInstance {
  const hit = cache[angle]
  if (hit) return hit
  const m = create(all)
  if (angle === 'deg') {
    const r = (x: number) => (x * Math.PI) / 180
    const d = (x: number) => (x * 180) / Math.PI
    m.import(
      {
        sin: (x: number) => Math.sin(r(x)), cos: (x: number) => Math.cos(r(x)), tan: (x: number) => Math.tan(r(x)),
        asin: (x: number) => d(Math.asin(x)), acos: (x: number) => d(Math.acos(x)), atan: (x: number) => d(Math.atan(x)),
      },
      { override: true },
    )
  }
  cache[angle] = m
  return m
}

/** Reject syntax that could alter the evaluator or escape the sandbox. */
export function assertSafe(node: { traverse: (cb: (n: any) => void) => void }): void {
  node.traverse((n: any) => {
    if (n.isFunctionNode && BLOCKED.has(n.fn?.name)) throw new Error(`Function "${n.fn.name}" is not allowed`)
    if (n.isAccessorNode || n.isObjectNode || n.isFunctionAssignmentNode) throw new Error('Unsupported syntax')
  })
}

/** "50%" becomes "(50/100)" — math.js treats % as modulo, calculators do not. */
export function preprocess(expr: string): string {
  return expr.replace(/(\d+(?:\.\d+)?)\s*%/g, '($1/100)').replace(/×/g, '*').replace(/÷/g, '/').replace(/π/g, 'pi').replace(/√/g, 'sqrt')
}

export function formatValue(v: unknown, precision = 10): string {
  const m = getMath('rad')
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return String(v)
    const abs = Math.abs(v)
    if (abs !== 0 && (abs >= 1e12 || abs < 1e-9)) return m.format(v, { notation: 'exponential', precision })
    return String(Number(v.toPrecision(Math.min(Math.max(precision, 1), 15))))
  }
  return m.format(v as never, { precision })
}

export function evaluate(expr: string, angle: AngleMode = 'deg', scope: Record<string, unknown> = {}): unknown {
  const node = getMath(angle).parse(preprocess(expr))
  assertSafe(node)
  return node.evaluate(scope)
}

export function calculate(expr: string, angle: AngleMode = 'deg', precision = 10): string {
  const v = evaluate(expr, angle)
  if (typeof v === 'function' || v === undefined) throw new Error('Not a value')
  return formatValue(v, precision)
}
