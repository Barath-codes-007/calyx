import { useMemo, useState } from 'react'
import { BUILTIN, computeFormula, makeCustom, loadFavs, saveFavs, loadCustom, saveCustom, type Formula } from '../engine/formulas'
import type { Prefs } from '../engine/storage'

export default function Formulas({ prefs }: { prefs: Prefs }) {
  const [custom, setCustom] = useState<Formula[]>(loadCustom)
  const [favs, setFavs] = useState<string[]>(loadFavs)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('All')
  const [selId, setSelId] = useState('ohm-v')
  const [vals, setVals] = useState<Record<string, Record<string, string>>>({})
  const [form, setForm] = useState({ name: '', category: 'Custom', expr: '', out: '' })
  const [formErr, setFormErr] = useState('')

  const all = useMemo(() => [...BUILTIN, ...custom], [custom])
  const cats = useMemo(() => ['All', 'Favourites', ...Array.from(new Set(all.map((f) => f.category)))], [all])
  const list = all.filter((f) => (cat === 'All' || (cat === 'Favourites' ? favs.includes(f.id) : f.category === cat)) && `${f.name} ${f.expr} ${f.category}`.toLowerCase().includes(q.toLowerCase()))
  const sel = all.find((f) => f.id === selId) ?? all[0]
  const cur = vals[sel.id] ?? Object.fromEntries(sel.vars.map((v) => [v.name, String(v.def)]))
  let result = '', err = ''
  try { result = computeFormula(sel.expr, cur, prefs.angle, prefs.precision) } catch (e) { err = (e as Error).message }

  const toggleFav = (id: string) => { const n = favs.includes(id) ? favs.filter((x) => x !== id) : [...favs, id]; setFavs(n); saveFavs(n) }
  const addCustom = () => {
    try {
      const f = makeCustom(form.name, form.category, form.expr, form.out)
      const n = [...custom, f]; setCustom(n); saveCustom(n); setSelId(f.id); setForm({ name: '', category: 'Custom', expr: '', out: '' }); setFormErr('')
    } catch (e) { setFormErr((e as Error).message) }
  }
  const removeCustom = (id: string) => { const n = custom.filter((f) => f.id !== id); setCustom(n); saveCustom(n); setFavs((a) => { const m = a.filter((x) => x !== id); saveFavs(m); return m }); setSelId('ohm-v') }

  return (
    <div className="fgrid">
      <section className="panel">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search formulas" aria-label="Search formulas" />
        <div className="chips">{cats.map((c) => <button key={c} className={cat === c ? 'on' : ''} onClick={() => setCat(c)}>{c}</button>)}</div>
        <ul className="flist">
          {list.map((f) => (
            <li key={f.id} className={f.id === sel.id ? 'on' : ''}>
              <button className="fpick" onClick={() => setSelId(f.id)}><span>{f.name}</span><small className="dim">{f.category}</small></button>
              <button className="star" onClick={() => toggleFav(f.id)} aria-label={favs.includes(f.id) ? 'Remove favourite' : 'Add favourite'} aria-pressed={favs.includes(f.id)}>{favs.includes(f.id) ? '★' : '☆'}</button>
            </li>
          ))}
        </ul>
        {list.length === 0 && <p className="dim">{cat === 'Favourites' ? 'Star a formula to keep it here.' : 'No formula matches your search.'}</p>}
      </section>
      <section className="panel">
        <h2>{sel.name}</h2>
        <code className="expr-code">{sel.expr}</code>
        <div className="finputs">
          {sel.vars.map((v) => (
            <label key={v.name}>{v.label} <span className="dim">({v.name})</span>
              <input inputMode="decimal" value={cur[v.name] ?? ''} onChange={(e) => setVals({ ...vals, [sel.id]: { ...cur, [v.name]: e.target.value } })} />
            </label>
          ))}
        </div>
        {err ? <p className="bad">{err}</p> : <p className="result">{sel.out}: {result}</p>}
        <div className="row">
          <button onClick={() => navigator.clipboard?.writeText(result)} disabled={!!err}>Copy result</button>
          <button onClick={() => navigator.clipboard?.writeText(sel.expr)}>Copy expression</button>
          {sel.custom && <button onClick={() => removeCustom(sel.id)}>Delete formula</button>}
        </div>
        <h2>Add your own formula</h2>
        <div className="finputs">
          <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>Category<input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></label>
          <label>Expression, such as m*g*h<input value={form.expr} onChange={(e) => setForm({ ...form, expr: e.target.value })} spellCheck={false} /></label>
          <label>Result label<input value={form.out} onChange={(e) => setForm({ ...form, out: e.target.value })} /></label>
        </div>
        {formErr && <p className="bad">{formErr}</p>}
        <button onClick={addCustom}>Save formula</button>
        <p className="dim">Every name in the expression becomes an input. Custom formulas and favourites stay on this device.</p>
      </section>
    </div>
  )
}
