import { useState } from 'react'
import Plotly from 'plotly.js-basic-dist-min'
import { useEffect, useRef } from 'react'
import { create, all } from 'mathjs'
import { formatValue } from '../engine/calc'
import * as S from '../engine/stats'
import * as M from '../engine/matrix'
import type { Prefs } from '../engine/storage'
import Engineering from './Engineering'

const math = create(all)
type Lab = 'stats' | 'matrix' | 'complex' | 'eng'
const fmt = (v: number, p: number) => formatValue(v, p)

function StatsLab({ p }: { p: number }) {
  const [xs, setXs] = useState('2 4 4 4 5 5 7 9')
  const [ys, setYs] = useState('1 3 3 5 6 6 8 10')
  const box = useRef<HTMLDivElement>(null)
  let rows: [string, string][] = [], reg: ReturnType<typeof S.regression> | null = null, err = ''
  let x: number[] = []
  try {
    x = S.parseNumbers(xs)
    const q = S.quartiles(x)
    rows = [['Count', String(x.length)], ['Mean', fmt(S.mean(x), p)], ['Median', fmt(S.median(x), p)], ['Mode', S.mode(x).join(', ') || 'none'],
      ['Variance (sample)', fmt(S.variance(x), p)], ['Std deviation (sample)', fmt(S.stdev(x), p)], ['Q1 / Q2 / Q3', `${fmt(q.q1, p)} / ${fmt(q.q2, p)} / ${fmt(q.q3, p)}`]]
    if (ys.trim()) reg = S.regression(x, S.parseNumbers(ys))
  } catch (e) { err = (e as Error).message }
  useEffect(() => {
    if (!box.current || err) return
    const y = ys.trim() ? (() => { try { return S.parseNumbers(ys) } catch { return [] } })() : []
    const traces: any[] = y.length === x.length && y.length ? [{ x, y, mode: 'markers', type: 'scatter', name: 'Data', marker: { color: '#35d0ff' } }] : [{ x, type: 'histogram', marker: { color: '#35d0ff' } }]
    if (reg && traces[0].mode) { const lo = Math.min(...x), hi = Math.max(...x); traces.push({ x: [lo, hi], y: [reg.slope * lo + reg.intercept, reg.slope * hi + reg.intercept], mode: 'lines', name: 'Fit', line: { color: '#8b7bff' } }) }
    Plotly.react(box.current, traces, { paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { color: '#94a3b8' }, margin: { l: 40, r: 10, t: 10, b: 30 }, xaxis: { gridcolor: '#1b2644' }, yaxis: { gridcolor: '#1b2644' } }, { displaylogo: false, responsive: true })
  })
  return (
    <div className="labgrid">
      <div><label>X values<textarea rows={3} value={xs} onChange={(e) => setXs(e.target.value)} /></label>
        <label>Y values (optional, for correlation and regression)<textarea rows={3} value={ys} onChange={(e) => setYs(e.target.value)} /></label>
        {err ? <p className="bad">{err}</p> : <table><tbody>{rows.map(([k, v]) => <tr key={k}><td>{k}</td><td>{v}</td></tr>)}
          {reg && <><tr><td>Correlation r</td><td>{fmt(reg.r, p)}</td></tr><tr><td>Regression</td><td>y = {fmt(reg.slope, p)}x + {fmt(reg.intercept, p)}</td></tr><tr><td>R²</td><td>{fmt(reg.r2, p)}</td></tr></>}</tbody></table>}</div>
      <div ref={box} className="plotbox small" />
    </div>
  )
}

function MatrixLab({ p }: { p: number }) {
  const [a, setA] = useState('1 2\n3 4')
  const [b, setB] = useState('0 1\n1 0')
  const [op, setOp] = useState('multiply')
  let out = '', err = ''
  const show = (m: M.Matrix) => m.map((r) => r.map((v) => fmt(v, p)).join('\t')).join('\n')
  try {
    const A = M.parseMatrix(a)
    if (op === 'add' || op === 'subtract' || op === 'multiply') { const B = M.parseMatrix(b); out = show(M[op as 'add'](A, B)) }
    else if (op === 'det') out = fmt(M.determinant(A), p)
    else if (op === 'inverse') out = show(M.inverse(A))
    else if (op === 'transpose') out = show(M.transpose(A))
    else out = show(M.identity(A.length))
  } catch (e) { err = (e as Error).message }
  return (
    <div className="labgrid">
      <div><label>Matrix A<textarea rows={4} value={a} onChange={(e) => setA(e.target.value)} /></label>
        <label>Matrix B<textarea rows={4} value={b} onChange={(e) => setB(e.target.value)} /></label>
        <label>Operation<select value={op} onChange={(e) => setOp(e.target.value)}>
          <option value="add">A + B</option><option value="subtract">A − B</option><option value="multiply">A × B</option><option value="det">det(A)</option>
          <option value="inverse">A⁻¹</option><option value="transpose">Aᵀ</option><option value="identity">Identity (size of A)</option></select></label></div>
      <div>{err ? <p className="bad">{err}</p> : <pre className="mono">{out}</pre>}</div>
    </div>
  )
}

function ComplexLab({ p }: { p: number }) {
  const [z, setZ] = useState('3 + 4i')
  const [w, setW] = useState('1 - 2i')
  let rows: [string, string][] = [], err = ''
  try {
    const Z: any = math.complex(z), W: any = math.complex(w)
    const f = (v: unknown) => math.format(v as never, { precision: p })
    rows = [['z + w', f(math.add(Z, W))], ['z − w', f(math.subtract(Z, W))], ['z × w', f(math.multiply(Z, W))], ['z ÷ w', f(math.divide(Z, W))],
      ['|z|', f(math.abs(Z))], ['arg(z) rad', f(math.arg(Z))], ['arg(z) deg', f((Number(math.arg(Z)) * 180) / Math.PI)], ['conjugate(z)', f(math.conj(Z))],
      ['Polar form of z', `${f(math.abs(Z))} ∠ ${f(math.arg(Z))} rad`]]
  } catch (e) { err = 'Enter numbers like 3 + 4i' + ((e as Error).message ? '' : '') }
  return (
    <div className="labgrid"><div><label>z<input value={z} onChange={(e) => setZ(e.target.value)} /></label><label>w<input value={w} onChange={(e) => setW(e.target.value)} /></label></div>
      <div>{err ? <p className="bad">{err}</p> : <table><tbody>{rows.map(([k, v]) => <tr key={k}><td>{k}</td><td>{v}</td></tr>)}</tbody></table>}</div></div>
  )
}

export default function Labs({ prefs }: { prefs: Prefs }) {
  const [lab, setLab] = useState<Lab>('stats')
  return (
    <section className="panel">
      <div className="tabs" role="tablist">{([['stats', 'Statistics'], ['matrix', 'Matrices'], ['complex', 'Complex numbers'], ['eng', 'Engineering']] as [Lab, string][]).map(([id, l]) => <button key={id} role="tab" aria-selected={lab === id} className={lab === id ? 'on' : ''} onClick={() => setLab(id)}>{l}</button>)}</div>
      {lab === 'stats' && <StatsLab p={prefs.precision} />}
      {lab === 'matrix' && <MatrixLab p={prefs.precision} />}
      {lab === 'eng' && <Engineering p={prefs.precision} />}
      {lab === 'complex' && <ComplexLab p={prefs.precision} />}
    </section>
  )
}
