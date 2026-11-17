import { useEffect, useMemo, useRef, useState } from 'react'
import Plotly from 'plotly.js-basic-dist-min'
import { compileFn, findRoots, findIntersections, derivativeAt, integrate, type Fx } from '../engine/analysis'
import { formatValue } from '../engine/calc'
import type { Prefs } from '../engine/storage'

interface Fn { id: number; expr: string; color: string; visible: boolean }
const COLORS = ['#35d0ff', '#8b7bff', '#ffb454', '#4ade80', '#ff6b8b', '#e2e8f0']
interface Found { roots: { id: number; x: number }[]; inter: { a: number; b: number; x: number; y: number }[] }

export default function Explore({ prefs }: { prefs: Prefs }) {
  const [fns, setFns] = useState<Fn[]>([
    { id: 1, expr: 'x^2', color: COLORS[0], visible: true },
    { id: 2, expr: 'sin(x)', color: COLORS[1], visible: true },
    { id: 3, expr: '2x + 5', color: COLORS[2], visible: true },
  ])
  const [pts, setPts] = useState('')
  const [grid, setGrid] = useState(true)
  const [deriv, setDeriv] = useState(false)
  const [mark, setMark] = useState(true)
  const [range, setRange] = useState({ x0: -10, x1: 10, y0: -10, y1: 10 })
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [found, setFound] = useState<Found>({ roots: [], inter: [] })
  const [evalX, setEvalX] = useState('2')
  const [ia, setIa] = useState('0'), [ib, setIb] = useState('1')
  const el = useRef<HTMLDivElement>(null)
  const view = useRef(range)
  const [tick, setTick] = useState(0)

  const compiled = useMemo(() => {
    const list: { f: Fn; fx: Fx }[] = [], errs: Record<number, string> = {}
    for (const f of fns) {
      if (!f.visible || !f.expr.trim()) continue
      try { list.push({ f, fx: compileFn(f.expr, prefs.angle) }) } catch (e) { errs[f.id] = (e as Error).message }
    }
    return { list, errs }
  }, [fns, prefs.angle])

  useEffect(() => {
    const div = el.current!
    const light = prefs.theme === 'light'
    const fg = light ? '#1e293b' : '#cbd5e1', gc = light ? '#d7deea' : '#1b2644'
    const { x0, x1 } = view.current
    const nn: Record<number, string> = { ...compiled.errs }
    const traces: any[] = []
    const N = 700
    const xs = Array.from({ length: N + 1 }, (_, i) => x0 + ((x1 - x0) * i) / N)
    for (const { f, fx } of compiled.list) {
      const ys = xs.map((x) => { const y = fx(x); return Number.isFinite(y) ? y : null })
      const bad = ys.filter((y) => y === null).length
      if (bad === ys.length) nn[f.id] = 'Undefined for every x in view'
      else if (bad > 0) nn[f.id] = 'Undefined for some x in view (domain gaps)'
      traces.push({ x: xs, y: ys, type: 'scatter', mode: 'lines', name: `f${f.id}: ${f.expr}`, line: { color: f.color, width: 2.4 }, connectgaps: false })
      if (deriv) traces.push({ x: xs, y: xs.map((x) => { const d = derivativeAt(fx, x); return Number.isFinite(d) ? d : null }), type: 'scatter', mode: 'lines', name: `f${f.id}′`, line: { color: f.color, width: 1.6, dash: 'dot' }, connectgaps: false })
    }
    const nf: Found = { roots: [], inter: [] }
    if (mark) {
      for (const { f, fx } of compiled.list) findRoots(fx, x0, x1).forEach((x) => nf.roots.push({ id: f.id, x }))
      for (let i = 0; i < compiled.list.length; i++) for (let j = i + 1; j < compiled.list.length; j++)
        findIntersections(compiled.list[i].fx, compiled.list[j].fx, x0, x1).forEach((p) => nf.inter.push({ a: compiled.list[i].f.id, b: compiled.list[j].f.id, ...p }))
      if (nf.roots.length) traces.push({ x: nf.roots.map((r) => r.x), y: nf.roots.map(() => 0), mode: 'markers', type: 'scatter', name: 'Roots', marker: { symbol: 'diamond', size: 10, color: '#4ade80', line: { color: '#052e16', width: 1 } } })
      if (nf.inter.length) traces.push({ x: nf.inter.map((p) => p.x), y: nf.inter.map((p) => p.y), mode: 'markers', type: 'scatter', name: 'Intersections', marker: { symbol: 'x', size: 10, color: '#ff6b8b', line: { width: 2, color: '#ff6b8b' } } })
    }
    setFound(nf)
    const p = pts.trim().split(/\n|;/).map((l) => l.trim().split(/[\s,]+/).map(Number)).filter((a) => a.length === 2 && a.every(Number.isFinite))
    if (p.length) traces.push({ x: p.map((a) => a[0]), y: p.map((a) => a[1]), mode: 'markers', type: 'scatter', name: 'Points', marker: { size: 9, color: '#ffffff', line: { color: '#35d0ff', width: 2 } } })
    setNotes(nn)
    const axis = { gridcolor: gc, zerolinecolor: fg, showgrid: grid, color: fg }
    Plotly.react(div, traces, {
      paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { color: fg }, margin: { l: 44, r: 16, t: 10, b: 36 },
      xaxis: { ...axis, range: [range.x0, range.x1] }, yaxis: { ...axis, range: [range.y0, range.y1] }, legend: { orientation: 'h', y: -0.15 }, hovermode: 'closest',
    }, { responsive: true, displaylogo: false, scrollZoom: true })
    const d: any = div
    d.removeAllListeners?.('plotly_relayout')
    d.on('plotly_relayout', (e: any) => {
      if (e['xaxis.range[0]'] !== undefined) { view.current = { x0: e['xaxis.range[0]'], x1: e['xaxis.range[1]'], y0: e['yaxis.range[0]'] ?? view.current.y0, y1: e['yaxis.range[1]'] ?? view.current.y1 }; setTick((t) => t + 1) }
    })
  }, [compiled, pts, grid, deriv, mark, range, prefs.theme, tick])

  const upd = (id: number, p: Partial<Fn>) => setFns((a) => a.map((f) => (f.id === id ? { ...f, ...p } : f)))
  const applyRange = (r: typeof range) => { view.current = r; setRange(r) }
  const fmt = (v: number) => (Number.isFinite(v) ? formatValue(v, Math.min(prefs.precision, 8)) : '—')
  const xv = Number(evalX), a = Number(ia), b = Number(ib)

  return (
    <div className="explore">
      <section className="panel fnlist">
        <h2>Functions</h2>
        {fns.map((f) => (
          <div key={f.id} className="fn">
            <input type="checkbox" checked={f.visible} onChange={(e) => upd(f.id, { visible: e.target.checked })} aria-label="Show function" />
            <input type="color" value={f.color} onChange={(e) => upd(f.id, { color: e.target.value })} aria-label="Colour" />
            <span className="dim">f{f.id}(x) =</span>
            <input value={f.expr} onChange={(e) => upd(f.id, { expr: e.target.value })} spellCheck={false} aria-label={`Function ${f.id}`} />
            <button onClick={() => setFns((s) => s.filter((x) => x.id !== f.id))} aria-label="Remove">✕</button>
            {notes[f.id] && <div className="note">{notes[f.id]}</div>}
          </div>
        ))}
        <button onClick={() => setFns((s) => [...s, { id: Math.max(0, ...s.map((x) => x.id)) + 1, expr: '', color: COLORS[s.length % COLORS.length], visible: true }])}>Add function</button>

        <h2>Analyse</h2>
        <label className="chk"><input type="checkbox" checked={mark} onChange={(e) => setMark(e.target.checked)} /> Mark roots and intersections</label>
        <label className="chk"><input type="checkbox" checked={deriv} onChange={(e) => setDeriv(e.target.checked)} /> Draw derivatives (dotted)</label>
        {mark && (found.roots.length + found.inter.length > 0
          ? <ul className="found">
              {found.roots.map((r, i) => <li key={`r${i}`}>f{r.id} = 0 at x = {fmt(r.x)}</li>)}
              {found.inter.map((p, i) => <li key={`i${i}`}>f{p.a} meets f{p.b} at ({fmt(p.x)}, {fmt(p.y)})</li>)}
            </ul>
          : <p className="dim">No roots or intersections in the current view.</p>)}
        <div className="axes">
          <label>Evaluate at x<input value={evalX} onChange={(e) => setEvalX(e.target.value)} inputMode="decimal" /></label>
          <span />
          <label>Integrate from<input value={ia} onChange={(e) => setIa(e.target.value)} inputMode="decimal" /></label>
          <label>to<input value={ib} onChange={(e) => setIb(e.target.value)} inputMode="decimal" /></label>
        </div>
        {compiled.list.length > 0 && (
          <table><thead><tr><td /><td>f(x)</td><td>f′(x)</td><td>∫</td></tr></thead><tbody>
            {compiled.list.map(({ f, fx }) => <tr key={f.id}><td>f{f.id}</td><td>{fmt(fx(xv))}</td><td>{fmt(derivativeAt(fx, xv))}</td><td>{Number.isFinite(a) && Number.isFinite(b) ? fmt(integrate(fx, a, b)) : '—'}</td></tr>)}
          </tbody></table>
        )}

        <h2>Points</h2>
        <textarea rows={3} value={pts} onChange={(e) => setPts(e.target.value)} placeholder={'One point per line: 2, 4'} />
        <h2>Axes</h2>
        <div className="axes">
          {(['x0', 'x1', 'y0', 'y1'] as const).map((k) => <label key={k}>{k.toUpperCase().replace('0', ' min').replace('1', ' max')}<input type="number" value={range[k]} onChange={(e) => applyRange({ ...range, [k]: Number(e.target.value) })} /></label>)}
        </div>
        <label className="chk"><input type="checkbox" checked={grid} onChange={(e) => setGrid(e.target.checked)} /> Show grid</label>
        <button onClick={() => Plotly.downloadImage(el.current!, { format: 'png', filename: 'calyx-graph', width: 1400, height: 800 })}>Export PNG</button>
      </section>
      <section className="panel plot"><div ref={el} className="plotbox" /><p className="dim">Drag to pan, scroll or box-select to zoom. Roots and intersections update with the view.</p></section>
    </div>
  )
}
