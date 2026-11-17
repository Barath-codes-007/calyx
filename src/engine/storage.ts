export interface Prefs { theme: 'dark' | 'light'; angle: 'deg' | 'rad'; precision: number; keypad: 'glass' | 'solid' | 'outline' | 'tactile' }
export const DEFAULT_PREFS: Prefs = { theme: 'dark', angle: 'deg', precision: 10, keypad: 'glass' }
const PREFS_KEY = 'calyx.prefs'

export function loadPrefs(): Prefs {
  try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') } } catch { return DEFAULT_PREFS }
}
export function savePrefs(p: Prefs): void { try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)) } catch { /* storage unavailable */ } }

export interface Snapshot { at: number; label: string; lines: { id: string; text: string }[] }
export interface Workspace { id: string; name: string; lines: { id: string; text: string }[]; snapshots: Snapshot[]; updated: number }

const DB = 'calyx', STORE = 'workspaces'
const open = (): Promise<IDBDatabase> => new Promise((res, rej) => {
  const r = indexedDB.open(DB, 1)
  r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' })
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error)
})
const tx = async <T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
  const db = await open()
  return new Promise((res, rej) => { const r = fn(db.transaction(STORE, mode).objectStore(STORE)); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) })
}
export const saveWorkspace = (w: Workspace) => tx('readwrite', (s) => s.put({ ...w, updated: Date.now() }))
export const loadWorkspaces = () => tx<Workspace[]>('readonly', (s) => s.getAll())
export const deleteWorkspace = (id: string) => tx('readwrite', (s) => s.delete(id))
