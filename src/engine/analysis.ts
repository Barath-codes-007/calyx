import { getMath, preprocess, type AngleMode } from './calc'

export type Fx = (x: number) => number

/** Compile f(x). Syntax errors throw; evaluation errors become NaN (domain gaps). */
export function compileFn(expr: string, angle: AngleMode = 'deg'): Fx {
  const code = getMath(angle).parse(preprocess(expr)).compile()
  return (x: number) => {
    try { const v = code.evaluate({ x }); return typeof v === 'number' && Number.isFinite(v) ? v : NaN } catch { return NaN }
  }
}

/** Roots by sign-change scan plus bisection. Poles (like tan or 1/x) are rejected. */
export function findRoots(f: Fx, a: number, b: number, n = 2000): number[] {
  const out: number[] = []
  let px = a, py = f(a)
  if (py === 0) out.push(a)
  for (let i = 1; i <= n; i++) {
    const x = a + ((b - a) * i) / n, y = f(x)
    if (Number.isFinite(py) && Number.isFinite(y)) {
      if (y === 0) out.push(x)
      else if (py * y < 0) {
        let lo = px, hi = x, flo = py
        for (let k = 0; k < 60; k++) { const mid = (lo + hi) / 2, fm = f(mid); if (flo * fm <= 0) hi = mid; else { lo = mid; flo = fm } }
        const r = (lo + hi) / 2
        if (Math.abs(f(r)) < 1e-6) out.push(r)
      }
    }
    px = x; py = y
  }
  return out.filter((r, i) => i === 0 || Math.abs(r - out[i - 1]) > 1e-7)
}

export function findIntersections(f: Fx, g: Fx, a: number, b: number): { x: number; y: number }[] {
  return findRoots((x) => f(x) - g(x), a, b).map((x) => ({ x, y: f(x) }))
}

export function derivativeAt(f: Fx, x: number): number {
  const h = 1e-5 * (1 + Math.abs(x))
  return (f(x + h) - f(x - h)) / (2 * h)
}

/** Definite integral by composite Simpson's rule. */
export function integrate(f: Fx, a: number, b: number, n = 2000): number {
  if (a === b) return 0
  const h = (b - a) / n
  let s = f(a) + f(b)
  for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2)
  return (s * h) / 3
}
