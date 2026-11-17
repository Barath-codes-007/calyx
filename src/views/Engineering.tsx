import { useState } from 'react'
import { UNITS, convert, siPrefix, engineering, scientific, CONSTANTS, constantValue } from '../engine/engineering'
import { formatValue } from '../engine/calc'

export default function Engineering({ p }: { p: number }) {
  const [cat, setCat] = useState('Length')
  const [from, setFrom] = useState('m'), [to, setTo] = useState('ft')
  const [val, setVal] = useState('1')
  const [q, setQ] = useState('')
  const pick = (c: string) => { setCat(c); setFrom(UNITS[c][0]); setTo(UNITS[c][1]) }
  let conv = '', err = ''
  let n = NaN
  try { n = Number(val); conv = formatValue(convert(n, from, to), p) } catch (e) { err = (e as Error).message }
  const si = Number.isFinite(n) ? siPrefix(n) : null
  const consts = CONSTANTS.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="labgrid">
      <div>
        <h2>Unit conversion</h2>
        <label>Category<select value={cat} onChange={(e) => pick(e.target.value)}>{Object.keys(UNITS).map((c) => <option key={c}>{c}</option>)}</select></label>
        <label>Value<input value={val} onChange={(e) => setVal(e.target.value)} inputMode="decimal" /></label>
        <div className="row"><select value={from} onChange={(e) => setFrom(e.target.value)}>{UNITS[cat].map((u) => <option key={u}>{u}</option>)}</select><span>→</span><select value={to} onChange={(e) => setTo(e.target.value)}>{UNITS[cat].map((u) => <option key={u}>{u}</option>)}</select></div>
        {err ? <p className="bad">{err}</p> : <p className="result">{conv} {to}</p>}
        <h2>Notation and SI prefix</h2>
        {si && <table><tbody>
          <tr><td>Scientific</td><td>{scientific(n, p)}</td></tr>
          <tr><td>Engineering</td><td>{engineering(n, p)}</td></tr>
          <tr><td>SI prefix</td><td>{formatValue(si.mantissa, p)} {si.prefix || '(none)'}{si.exponent ? ` (10^${si.exponent})` : ''}</td></tr>
        </tbody></table>}
      </div>
      <div>
        <h2>Physical constants</h2>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search constants" aria-label="Search constants" />
        <table><tbody>{consts.map((c) => <tr key={c.key}><td>{c.name}</td><td>{scientific(constantValue(c.key, c.unit), 6)} {c.unit}</td></tr>)}</tbody></table>
        {consts.length === 0 && <p className="dim">No constant matches that name.</p>}
      </div>
    </div>
  )
}
