import { useEffect, useState } from 'react'
import { loadPrefs, savePrefs, type Prefs } from './engine/storage'
import Calculate from './views/Calculate'
import Explore from './views/Explore'
import Workbench from './views/Workbench'
import Labs from './views/Labs'
import Formulas from './views/Formulas'

const TABS = [
  { id: 'calculate', label: 'Calculate', key: '1' },
  { id: 'explore', label: 'Explore', key: '2' },
  { id: 'workbench', label: 'Workbench', key: '3' },
  { id: 'formulas', label: 'Formulas', key: '4' },
  { id: 'labs', label: 'Labs', key: '5' },
] as const
type Tab = (typeof TABS)[number]['id']

export default function App() {
  const [tab, setTab] = useState<Tab>('calculate')
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs)
  const [help, setHelp] = useState(false)

  useEffect(() => { document.documentElement.dataset.theme = prefs.theme; document.documentElement.dataset.keys = prefs.keypad; savePrefs(prefs) }, [prefs])
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.altKey) { const t = TABS.find((x) => x.key === e.key); if (t) { e.preventDefault(); setTab(t.id) } }
      if (e.key === '?' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) setHelp((v) => !v)
    }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [])
  const set = (p: Partial<Prefs>) => setPrefs((o) => ({ ...o, ...p }))

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand"><svg width="26" height="26" viewBox="0 0 32 32"><path d="M22 10a8 8 0 1 0 0 12" fill="none" stroke="var(--cyan)" strokeWidth="3" strokeLinecap="round" /></svg><div><b>CALYX</b><small>Beyond calculation.</small></div></div>
        <nav aria-label="Workspaces">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'nav on' : 'nav'} onClick={() => setTab(t.id)} aria-current={tab === t.id}>{t.label}<kbd>Alt+{t.key}</kbd></button>
          ))}
        </nav>
        <div className="side-foot">Developed by Barath</div>
      </aside>
      <div className="main">
        <header className="top">
          <h1>{TABS.find((t) => t.id === tab)!.label}</h1>
          <div className="settings">
            <label>Angle <select value={prefs.angle} onChange={(e) => set({ angle: e.target.value as Prefs['angle'] })}><option value="deg">Degrees</option><option value="rad">Radians</option></select></label>
            <label>Keypad <select value={prefs.keypad} onChange={(e) => set({ keypad: e.target.value as Prefs['keypad'] })}><option value="glass">Glass</option><option value="solid">Solid</option><option value="outline">Outline</option><option value="tactile">Tactile</option></select></label>
            <label>Precision <input type="number" min={1} max={15} value={prefs.precision} onChange={(e) => set({ precision: Math.min(15, Math.max(1, Number(e.target.value) || 10)) })} /></label>
            <button onClick={() => set({ theme: prefs.theme === 'dark' ? 'light' : 'dark' })}>{prefs.theme === 'dark' ? 'Light theme' : 'Dark theme'}</button>
            <button onClick={() => setHelp(true)}>Shortcuts</button>
          </div>
        </header>
        <main className="stage">
          {tab === 'calculate' && <Calculate prefs={prefs} />}
          {tab === 'explore' && <Explore prefs={prefs} />}
          {tab === 'workbench' && <Workbench prefs={prefs} />}
          {tab === 'formulas' && <Formulas prefs={prefs} />}
          {tab === 'labs' && <Labs prefs={prefs} />}
        </main>
      </div>
      {help && (
        <div className="modal" role="dialog" aria-label="Keyboard shortcuts" onClick={() => setHelp(false)}>
          <div className="panel" onClick={(e) => e.stopPropagation()}>
            <h2>Keyboard shortcuts</h2>
            <table><tbody>
              <tr><td>Alt+1 … Alt+5</td><td>Switch workspace</td></tr>
              <tr><td>Enter / =</td><td>Calculate (Calculate)</td></tr>
              <tr><td>Backspace / Esc</td><td>Delete / clear (Calculate)</td></tr>
              <tr><td>Ctrl+Z / Ctrl+Y</td><td>Undo / redo (Workbench)</td></tr>
              <tr><td>?</td><td>Toggle this panel</td></tr>
            </tbody></table>
            <button onClick={() => setHelp(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
