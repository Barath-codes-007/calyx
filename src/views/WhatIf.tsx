import { useState } from 'react'
import { evaluateWorkbench, type Line, type LineResult } from '../engine/workbench'
import { formatValue, type AngleMode } from '../engine/calc'

const LIT = /^\s*([A-Za-z_]\w*)\s*=\s*(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)\s*$/i

export default function WhatIf({ lines, results, angle, precision }: { lines: Line[]; results: LineResult[]; angle: AngleMode; precision: number }) {
  const vars = lines.flatMap((l) => { const m = LIT.exec(l.text); return m ? [{ name: m[1], value: Number(m[2]) }] : [] })
  const [sel, setSel] = useState('')
  const [t, setT] = useState(0)
  const v = vars.find((x) => x.name === sel) ?? vars[0]
  if (!v) return <p className="dim">Add a numeric variable such as <code>A = 25</code> to try what-if changes.</p>
  const span = Math.abs(v.value) || 10
  const val = v.value + t * span
  const alt = evaluateWorkbench(lines.map((l) => { const m = LIT.exec(l.text); return m && m[1] === v.name ? { ...l, text: `${v.name} = ${val}` } : l }), angle, precision)
  return (
    <div className="whatif">
      <div className="row wrap">
        <select value={v.name} onChange={(e) => { setSel(e.target.value); setT(0) }} aria-label="Variable to vary">{[...new Set(vars.map((x) => x.name))].map((n) => <option key={n}>{n}</option>)}</select>
        <input type="range" min={-1} max={1} step={0.01} value={t} onChange={(e) => setT(Number(e.target.value))} className="grow" aria-label="What-if value" />
        <b className="mono">{v.name} = {formatValue(val, precision)}</b>
        <button onClick={() => setT(0)} disabled={t === 0}>Reset</button>
      </div>
      <table><tbody>
        {results.map((r, i) => r.name && !r.empty && (
          <tr key={r.id} className={alt[i].value !== r.value ? 'moved' : ''}>
            <td>{r.name}</td><td>{r.error ?? r.value}</td><td>{alt[i].error ?? alt[i].value}</td>
          </tr>
        ))}
      </tbody></table>
      <p className="dim">Your lines are unchanged. The right column shows the outcome at the slider value.</p>
    </div>
  )
}
