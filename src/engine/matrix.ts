import { create, all } from 'mathjs'
const math = create(all)
export type Matrix = number[][]

export function parseMatrix(s: string): Matrix {
  const rows = s.trim().split(/\n+/).map((r) => r.trim().split(/[\s,;]+/).filter(Boolean).map((t) => { const n = Number(t); if (!Number.isFinite(n)) throw new Error(`"${t}" is not a number`); return n }))
  if (!rows.length || !rows[0].length) throw new Error('Enter a matrix: one row per line')
  if (rows.some((r) => r.length !== rows[0].length)) throw new Error('All rows must have the same number of columns')
  return rows
}
const dims = (a: Matrix) => `${a.length}×${a[0].length}`
const toArr = (m: unknown): Matrix => (math.matrix(m as never) as any).toArray()

export function add(a: Matrix, b: Matrix): Matrix {
  if (dims(a) !== dims(b)) throw new Error(`Size mismatch: ${dims(a)} and ${dims(b)}`)
  return toArr(math.add(a, b))
}
export function subtract(a: Matrix, b: Matrix): Matrix {
  if (dims(a) !== dims(b)) throw new Error(`Size mismatch: ${dims(a)} and ${dims(b)}`)
  return toArr(math.subtract(a, b))
}
export function multiply(a: Matrix, b: Matrix): Matrix {
  if (a[0].length !== b.length) throw new Error(`Cannot multiply ${dims(a)} by ${dims(b)}`)
  return toArr(math.multiply(a, b))
}
const square = (a: Matrix) => { if (a.length !== a[0].length) throw new Error('Matrix must be square') }
export function determinant(a: Matrix): number { square(a); return math.det(a) }
export function inverse(a: Matrix): Matrix {
  square(a)
  if (Math.abs(math.det(a)) < 1e-12) throw new Error('Matrix is singular (determinant is 0)')
  return toArr(math.inv(a))
}
export const transpose = (a: Matrix): Matrix => toArr(math.transpose(a))
export const identity = (n: number): Matrix => toArr(math.identity(n))
