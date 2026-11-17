export const parseNumbers = (s: string): number[] =>
  s.split(/[\s,;]+/).filter(Boolean).map((t) => { const n = Number(t); if (!Number.isFinite(n)) throw new Error(`"${t}" is not a number`); return n })

const need = (x: number[], n = 1) => { if (x.length < n) throw new Error(`Need at least ${n} value${n > 1 ? 's' : ''}`) }
export const mean = (x: number[]) => { need(x); return x.reduce((a, b) => a + b, 0) / x.length }
export const quantile = (x: number[], q: number) => {
  need(x); const s = [...x].sort((a, b) => a - b); const pos = (s.length - 1) * q; const lo = Math.floor(pos)
  return s[lo] + (s[Math.ceil(pos)] - s[lo]) * (pos - lo)
}
export const median = (x: number[]) => quantile(x, 0.5)
export const mode = (x: number[]): number[] => {
  need(x); const c = new Map<number, number>(); x.forEach((v) => c.set(v, (c.get(v) ?? 0) + 1))
  const top = Math.max(...c.values()); return top === 1 ? [] : [...c].filter(([, n]) => n === top).map(([v]) => v).sort((a, b) => a - b)
}
export const variance = (x: number[], sample = true) => { need(x, sample ? 2 : 1); const m = mean(x); return x.reduce((a, b) => a + (b - m) ** 2, 0) / (x.length - (sample ? 1 : 0)) }
export const stdev = (x: number[], sample = true) => Math.sqrt(variance(x, sample))
export const quartiles = (x: number[]) => ({ q1: quantile(x, 0.25), q2: quantile(x, 0.5), q3: quantile(x, 0.75) })

export function regression(x: number[], y: number[]) {
  if (x.length !== y.length) throw new Error('X and Y need the same number of values')
  need(x, 2)
  const mx = mean(x), my = mean(y)
  const sxy = x.reduce((a, v, i) => a + (v - mx) * (y[i] - my), 0)
  const sxx = x.reduce((a, v) => a + (v - mx) ** 2, 0)
  const syy = y.reduce((a, v) => a + (v - my) ** 2, 0)
  if (sxx === 0 || syy === 0) throw new Error('Values must vary to compute a regression')
  const slope = sxy / sxx
  return { slope, intercept: my - slope * mx, r: sxy / Math.sqrt(sxx * syy), r2: (sxy * sxy) / (sxx * syy) }
}
