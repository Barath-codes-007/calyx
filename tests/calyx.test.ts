import { describe, it, expect, beforeEach } from 'vitest'
import { calculate, evaluate, formatValue } from '../src/engine/calc'
import { evaluateWorkbench, changedIds, type Line } from '../src/engine/workbench'
import * as S from '../src/engine/stats'
import * as M from '../src/engine/matrix'
import { loadPrefs, savePrefs, DEFAULT_PREFS } from '../src/engine/storage'

const L = (...t: string[]): Line[] => t.map((text, i) => ({ id: String(i), text }))

describe('arithmetic & parsing', () => {
  it('respects precedence and brackets', () => { expect(calculate('2+3*4')).toBe('14'); expect(calculate('(2+3)*4')).toBe('20') })
  it('handles factorial, powers, roots', () => { expect(calculate('5!')).toBe('120'); expect(calculate('2^10')).toBe('1024'); expect(calculate('sqrt(144)')).toBe('12') })
  it('treats % as percentage', () => { expect(calculate('50%*200')).toBe('100') })
  it('rejects malformed and unsafe input', () => {
    expect(() => calculate('2+*')).toThrow(); expect(() => calculate('import({a:1})')).toThrow(); expect(() => evaluate('evaluate("1")')).toThrow()
  })
  it('uses scientific notation for extremes', () => { expect(calculate('1e15')).toMatch(/e\+?15/) })
})
describe('trigonometry & logarithms', () => {
  it('degree mode', () => { expect(Number(calculate('sin(30)', 'deg'))).toBeCloseTo(0.5, 9); expect(Number(calculate('acos(0.5)', 'deg'))).toBeCloseTo(60, 9) })
  it('radian mode', () => { expect(Number(calculate('sin(pi/2)', 'rad'))).toBeCloseTo(1, 9) })
  it('hyperbolic', () => { expect(Number(calculate('sinh(0)'))).toBe(0) })
  it('logs', () => { expect(calculate('log10(1000)')).toBe('3'); expect(calculate('log(e)')).toBe('1') })
})
describe('precision', () => {
  it('limits significant digits', () => { expect(calculate('1/3', 'deg', 4)).toBe('0.3333'); expect(formatValue(Math.PI, 6)).toBe('3.14159') })
})
describe('matrix', () => {
  const A = [[1, 2], [3, 4]]
  it('add/sub/multiply', () => { expect(M.add(A, A)).toEqual([[2, 4], [6, 8]]); expect(M.subtract(A, A)).toEqual([[0, 0], [0, 0]]); expect(M.multiply(A, [[0, 1], [1, 0]])).toEqual([[2, 1], [4, 3]]) })
  it('det, inverse, transpose, identity', () => {
    expect(M.determinant(A)).toBeCloseTo(-2); expect(M.inverse(A)[0][0]).toBeCloseTo(-2); expect(M.transpose(A)).toEqual([[1, 3], [2, 4]]); expect(M.identity(2)).toEqual([[1, 0], [0, 1]])
  })
  it('errors on bad shapes and singular matrices', () => {
    expect(() => M.add(A, [[1]])).toThrow(); expect(() => M.inverse([[1, 2], [2, 4]])).toThrow(/singular/); expect(() => M.parseMatrix('1 2\n3')).toThrow()
  })
})
describe('statistics', () => {
  const x = [2, 4, 4, 4, 5, 5, 7, 9]
  it('summary', () => { expect(S.mean(x)).toBe(5); expect(S.median(x)).toBe(4.5); expect(S.mode(x)).toEqual([4]); expect(S.variance(x, false)).toBe(4); expect(S.stdev(x, false)).toBe(2) })
  it('quartiles', () => { expect(S.quartiles([1, 2, 3, 4, 5])).toEqual({ q1: 2, q2: 3, q3: 4 }) })
  it('regression & correlation', () => { const r = S.regression([1, 2, 3], [2, 4, 6]); expect(r.slope).toBeCloseTo(2); expect(r.intercept).toBeCloseTo(0); expect(r.r).toBeCloseTo(1) })
  it('validates input', () => { expect(() => S.parseNumbers('1 x')).toThrow(); expect(() => S.regression([1, 2], [1])).toThrow() })
})
describe('workbench dependencies', () => {
  it('evaluates in dependency order, even when defined later', () => {
    const r = evaluateWorkbench(L('D = C + 100', 'C = A * B', 'A = 25', 'B = 40'))
    expect(r.map((x) => x.value)).toEqual(['1100', '1000', '25', '40'])
  })
  it('recalculates dependents automatically', () => {
    const a = evaluateWorkbench(L('A = 25', 'B = 40', 'C = A * B', 'D = C + 100'))
    const b = evaluateWorkbench(L('A = 30', 'B = 40', 'C = A * B', 'D = C + 100'))
    expect(b[3].value).toBe('1300')
    expect([...changedIds(a, b)].sort()).toEqual(['0', '2', '3'])
  })
  it('detects circular dependencies', () => {
    const r = evaluateWorkbench(L('A = B + 1', 'B = A + 1', 'C = 5', 'D = A + C'))
    expect(r[0].error).toMatch(/Circular/); expect(r[1].error).toMatch(/Circular/); expect(r[2].value).toBe('5'); expect(r[3].error).toMatch(/invalid/)
    expect(evaluateWorkbench(L('X = X + 1'))[0].error).toMatch(/Circular/)
  })
  it('reports invalid and undefined input, duplicates', () => {
    const r = evaluateWorkbench(L('A = 2 +', 'B = Z * 2', 'C = 1', 'C = 2'))
    expect(r[0].error).toBeTruthy(); expect(r[1].error).toMatch(/Undefined variable Z/); expect(r[3].error).toMatch(/already defined/)
  })
  it('supports functions and constants alongside variables', () => { expect(evaluateWorkbench(L('r = 2', 'area = pi * r^2'))[1].value).toBe('12.56637061') })
})
describe('persistence', () => {
  beforeEach(() => localStorage.clear())
  it('round-trips preferences', () => { savePrefs({ ...DEFAULT_PREFS, theme: 'light', precision: 6 }); expect(loadPrefs()).toMatchObject({ theme: 'light', precision: 6 }) })
  it('falls back to defaults on corrupt data', () => { localStorage.setItem('calyx.prefs', '{bad'); expect(loadPrefs()).toEqual(DEFAULT_PREFS) })
})

import { convert, siPrefix, engineering, constantValue, CONSTANTS } from '../src/engine/engineering'
describe('engineering', () => {
  it('converts units', () => { expect(convert(1, 'km', 'm')).toBeCloseTo(1000); expect(convert(100, 'degC', 'degF')).toBeCloseTo(212); expect(convert(1, 'inch', 'mm')).toBeCloseTo(25.4) })
  it('SI prefixes', () => { expect(siPrefix(4700)).toMatchObject({ prefix: 'k', mantissa: 4.7 }); expect(siPrefix(0.002).prefix).toBe('m') })
  it('engineering notation', () => { expect(engineering(12345)).toMatch(/^12\.345\d*e\+3$/) })
  it('every constant resolves', () => { for (const c of CONSTANTS) expect(Number.isFinite(constantValue(c.key, c.unit))).toBe(true); expect(constantValue('speedOfLight', 'm/s')).toBe(299792458) })
})

import { compileFn, findRoots, findIntersections, derivativeAt, integrate } from '../src/engine/analysis'
import { BUILTIN, computeFormula, variablesOf, makeCustom } from '../src/engine/formulas'
describe('graph analysis', () => {
  it('finds roots', () => { const r = findRoots(compileFn('x^2 - 4'), -10, 10); expect(r.length).toBe(2); expect(r[0]).toBeCloseTo(-2, 6); expect(r[1]).toBeCloseTo(2, 6) })
  it('ignores poles', () => { expect(findRoots(compileFn('1/x'), -5, 5)).toEqual([]) })
  it('finds intersections', () => { const p = findIntersections(compileFn('x^2'), compileFn('2x + 3'), -10, 10); expect(p.map((q) => q.x).sort((a, b) => a - b).map((x) => Math.round(x))).toEqual([-1, 3]) })
  it('differentiates and integrates', () => { expect(derivativeAt(compileFn('x^3'), 2)).toBeCloseTo(12, 4); expect(integrate(compileFn('x^2'), 0, 3)).toBeCloseTo(9, 6) })
  it('turns domain errors into gaps', () => { expect(Number.isNaN(compileFn('log(x)', 'rad')(-1)) || compileFn('log(x)', 'rad')(-1) !== compileFn('log(x)', 'rad')(-1)).toBe(true) })
})
describe('formula library', () => {
  it('every built-in formula computes with its defaults', () => {
    for (const f of BUILTIN) { const v = Object.fromEntries(f.vars.map((x) => [x.name, String(x.def)])); expect(() => computeFormula(f.expr, v), f.id).not.toThrow(); expect(f.vars.map((x) => x.name).sort(), f.id).toEqual(variablesOf(f.expr).sort()) }
  })
  it('computes known values', () => { expect(computeFormula('I*R', { I: '2', R: '5' })).toBe('10'); expect(computeFormula('pi*r^2', { r: '1' }, 'deg', 5)).toBe('3.1416') })
  it('detects variables and rejects missing input', () => { expect(variablesOf('m*g*h + sin(x) + pi').sort()).toEqual(['g', 'h', 'm', 'x']); expect(() => computeFormula('a+b', { a: '1' })).toThrow(/Enter a number for b/) })
  it('builds custom formulas', () => { const f = makeCustom('Potential energy', 'Mechanics', 'm*g*h', 'Energy (J)'); expect(f.vars.length).toBe(3); expect(() => makeCustom('', 'x', 'a', '')).toThrow() })
})
