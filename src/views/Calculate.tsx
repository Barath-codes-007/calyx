import { useCallback, useEffect, useState } from 'react'
import { calculate } from '../engine/calc'
import type { Prefs } from '../engine/storage'

const KEYS: [string, string][] = [
  ['sin(', 'sin'], ['cos(', 'cos'], ['tan(', 'tan'], ['log10(', 'log'], ['log(', 'ln'], ['(', '('], [')', ')'],
  ['asin(', 'sin⁻¹'], ['acos(', 'cos⁻¹'], ['atan(', 'tan⁻¹'], ['sqrt(', '√'], ['^', 'xʸ'], ['!', 'n!'], ['%', '%'],
  ['sinh(', 'sinh'], ['cosh(', 'cosh'], ['tanh(', 'tanh'], ['pi', 'π'], ['e', 'e'], ['E', 'EE'], ['abs(', '|x|'],
]
const PAD = ['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', '0', '.', 'Ans', '+']

export default function Calculate({ prefs }: { prefs: Prefs }) {
  const [expr, setExpr] = useState('')
  const [out, setOut] = useState('')
  const [err, setErr] = useState('')
  const [mem, setMem] = useState(0)
  const [sci, setSci] = useState(() => window.innerWidth > 860)
  const [ans, setAns] = useState('0')
  const [hist, setHist] = useState<{ e: string; r: string }[]>(() => { try { return JSON.parse(localStorage.getItem('calyx.history') ?? '[]') } catch { return [] } })
  useEffect(() => { try { localStorage.setItem('calyx.history', JSON.stringify(hist.slice(0, 50))) } catch { /* ignore */ } }, [hist])

  const add = (t: string) => { setErr(''); setExpr((x) => x + (t === 'Ans' ? `(${ans})` : t)) }
  const run = useCallback(() => {
    if (!expr.trim()) return
    try { const r = calculate(expr, prefs.angle, prefs.precision); setOut(r); setAns(r); setErr(''); setHist((h) => [{ e: expr, r }, ...h].slice(0, 50)) }
    catch (e) { setErr((e as Error).message); setOut('') }
  }, [expr, prefs.angle, prefs.precision])

  useEffect(() => {
    const h = (ev: KeyboardEvent) => {
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return
      const t = ev.target
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) return
      if (ev.key === 'Enter' || ev.key === '=' || ev.code === 'NumpadEnter') { ev.preventDefault(); run() }
      else if (ev.key === 'Backspace') setExpr((x) => x.slice(0, -1))
      else if (ev.key === 'Escape') { setExpr(''); setOut(''); setErr('') }
      else if (/^[0-9+\-*/().^!%a-z,]$/i.test(ev.key)) { if (ev.key === ',') return; ev.preventDefault(); setErr(''); setExpr((x) => x + ev.key) }
    }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [run])

  const memOp = (op: 'MC' | 'MR' | 'M+' | 'M-') => {
    const cur = Number(out || ans) || 0
    if (op === 'MC') setMem(0); else if (op === 'MR') add(String(mem)); else setMem((m) => m + (op === 'M+' ? cur : -cur))
  }

  return (
    <div className="calc">
      <section className="panel">
        <div className="display" aria-live="polite">
          <div className="expr">{expr || <span className="dim">Type or tap an expression</span>}</div>
          <div className={err ? 'result bad' : 'result'}>{err || out || '0'}</div>
        </div>
        <div className="row mem">
          {(['MC', 'MR', 'M+', 'M-'] as const).map((m) => <button key={m} onClick={() => memOp(m)}>{m}</button>)}
          <span className="dim">M = {mem}</span>
          <button onClick={() => setSci((v) => !v)} aria-pressed={sci}>Scientific</button>
          <button onClick={() => out && navigator.clipboard?.writeText(out)} disabled={!out}>Copy result</button>
        </div>
        {sci && <div className="keys sci">{KEYS.map(([v, l]) => <button key={l} onClick={() => add(v)}>{l}</button>)}</div>}
        <div className="keys pad">
          {PAD.map((k) => <button key={k} className={'+-*/'.includes(k) ? 'op' : ''} onClick={() => add(k)}>{k === '*' ? '×' : k === '/' ? '÷' : k}</button>)}
          <button className="clr" onClick={() => { setExpr(''); setOut(''); setErr('') }}>AC</button>
          <button onClick={() => setExpr((x) => x.slice(0, -1))}>⌫</button>
          <button className="eq" onClick={run}>=</button>
        </div>
      </section>
      <section className="panel hist">
        <div className="row"><h2>History</h2><button onClick={() => setHist([])} disabled={!hist.length}>Clear</button></div>
        {hist.length === 0 ? <p className="dim">Results you calculate appear here. Select one to reuse it.</p> :
          <ul>{hist.map((h, i) => <li key={i}><button onClick={() => setExpr(h.e)}><span>{h.e}</span><b>= {h.r}</b></button></li>)}</ul>}
      </section>
    </div>
  )
}
