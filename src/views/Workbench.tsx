import { useEffect, useMemo, useRef, useState } from 'react'
import { evaluateWorkbench, changedIds, exportText, type Line, type LineResult } from '../engine/workbench'
import { saveWorkspace, loadWorkspaces, deleteWorkspace, type Workspace } from '../engine/storage'
import type { Prefs } from '../engine/storage'
import DepGraph from './DepGraph'
import WhatIf from './WhatIf'

const uid = () => Math.random().toString(36).slice(2, 9)
const seed = (): Line[] => ['A = 25', 'B = 40', 'C = A * B', 'D = C + 100'].map((text) => ({ id: uid(), text }))
const newWs = (name = 'Untitled workspace'): Workspace => ({ id: uid(), name, lines: seed(), snapshots: [], updated: Date.now() })

export default function Workbench({ prefs }: { prefs: Prefs }) {
  const [ws, setWs] = useState<Workspace[]>([])
  const [cur, setCur] = useState<Workspace | null>(null)
  const [ready, setReady] = useState(false)
  const [flash, setFlash] = useState<Set<string>>(new Set())
  const past = useRef<Line[][]>([]); const future = useRef<Line[][]>([])
  const prev = useRef<LineResult[]>([])

  useEffect(() => {
    loadWorkspaces().then((all) => {
      const list = all.length ? all.sort((a, b) => b.updated - a.updated) : [newWs('My first workspace')]
      setWs(list); setCur(list[0]); setReady(true)
    }).catch(() => { const w = newWs(); setWs([w]); setCur(w); setReady(true) })
  }, [])

  const lines = cur?.lines ?? []
  const results = useMemo(() => evaluateWorkbench(lines, prefs.angle, prefs.precision), [lines, prefs.angle, prefs.precision])
  useEffect(() => {
    const ch = changedIds(prev.current, results); prev.current = results
    if (ch.size) { setFlash(ch); const t = setTimeout(() => setFlash(new Set()), 1400); return () => clearTimeout(t) }
  }, [results])
  useEffect(() => { if (cur && ready) { const t = setTimeout(() => { saveWorkspace(cur).catch(() => {}); setWs((a) => a.map((w) => (w.id === cur.id ? cur : w))) }, 300); return () => clearTimeout(t) } }, [cur, ready])

  const setLines = (next: Line[], record = true) => {
    if (!cur) return
    if (record) { past.current.push(cur.lines); future.current = [] }
    setCur({ ...cur, lines: next })
  }
  const undo = () => { const p = past.current.pop(); if (p && cur) { future.current.push(cur.lines); setCur({ ...cur, lines: p }) } }
  const redo = () => { const f = future.current.pop(); if (f && cur) { past.current.push(cur.lines); setCur({ ...cur, lines: f }) } }
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (!(e.ctrlKey || e.metaKey)) return; if (e.key === 'z') { e.preventDefault(); undo() } else if (e.key === 'y') { e.preventDefault(); redo() } }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  })

  const edit = (i: number, text: string) => setLines(lines.map((l, k) => (k === i ? { ...l, text } : l)), false)
  const move = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= lines.length) return; const a = [...lines]; [a[i], a[j]] = [a[j], a[i]]; setLines(a) }
  const switchTo = (id: string) => { const w = ws.find((x) => x.id === id); if (w) { past.current = []; future.current = []; prev.current = []; setCur(w) } }

  if (!cur) return <div className="panel">Loading workspace…</div>
  const download = () => { const b = new Blob([exportText(cur.name, lines, results)], { type: 'text/plain' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `${cur.name.replace(/\W+/g, '-')}.txt`; a.click() }

  return (
    <div className="bench">
      <section className="panel">
        <div className="row wrap">
          <select value={cur.id} onChange={(e) => switchTo(e.target.value)} aria-label="Workspace">{ws.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
          <input className="grow" value={cur.name} onChange={(e) => setCur({ ...cur, name: e.target.value })} aria-label="Workspace name" />
          <button onClick={() => { const w = newWs(); setWs((a) => [w, ...a]); setCur(w); saveWorkspace(w).catch(() => {}) }}>New</button>
          <button disabled={ws.length < 2} onClick={() => { deleteWorkspace(cur.id).catch(() => {}); const rest = ws.filter((w) => w.id !== cur.id); setWs(rest); setCur(rest[0]) }}>Delete</button>
        </div>
        <div className="row wrap">
          <button onClick={undo} disabled={!past.current.length}>Undo</button><button onClick={redo} disabled={!future.current.length}>Redo</button>
          <button onClick={() => setCur({ ...cur, snapshots: [{ at: Date.now(), label: `Snapshot ${cur.snapshots.length + 1}`, lines }, ...cur.snapshots] })}>Save snapshot</button>
          <button onClick={download}>Export</button>
        </div>
        <ol className="lines">
          {lines.map((l, i) => {
            const r = results[i]
            return (
              <li key={l.id} className={`${r.error ? 'err' : ''} ${flash.has(l.id) ? 'flash' : ''}`}>
                <input value={l.text} onChange={(e) => edit(i, e.target.value)} spellCheck={false} placeholder="name = expression" aria-label={`Line ${i + 1}`} />
                <div className="out">{r.error ? <span className="bad">{r.error}</span> : r.empty ? '' : <b>{r.name ? `${r.name} = ` : '= '}{r.value}</b>}{r.deps.length > 0 && <small className="deps">← {r.deps.join(', ')}</small>}</div>
                <div className="tools"><button onClick={() => move(i, -1)} aria-label="Move up">↑</button><button onClick={() => move(i, 1)} aria-label="Move down">↓</button><button onClick={() => setLines(lines.filter((_, k) => k !== i))} aria-label="Delete line">✕</button></div>
              </li>
            )
          })}
        </ol>
        {lines.length === 0 && <p className="dim">This workspace is empty. Add a line such as <code>radius = 4</code>, then build on it.</p>}
        <button onClick={() => setLines([...lines, { id: uid(), text: '' }])}>Add line</button>
        <h2>Dependency graph</h2>
        <DepGraph results={results} flash={flash} />
        <h2>What-if explorer</h2>
        <WhatIf lines={lines} results={results} angle={prefs.angle} precision={prefs.precision} />
      </section>
      <section className="panel">
        <h2>Snapshots</h2>
        {cur.snapshots.length === 0 ? <p className="dim">Save a snapshot to return to this exact state later.</p> :
          <ul className="snaps">{cur.snapshots.map((s) => <li key={s.at}><span>{s.label}<small className="dim"> {new Date(s.at).toLocaleTimeString()}</small></span><button onClick={() => setLines(s.lines)}>Restore</button></li>)}</ul>}
                <p className="dim">Editing a line recalculates everything that depends on it. Changed outputs flash briefly.</p>
      </section>
    </div>
  )
}
