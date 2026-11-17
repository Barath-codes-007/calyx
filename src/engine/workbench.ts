import { getMath, assertSafe, preprocess, formatValue, type AngleMode } from './calc'

export interface Line { id: string; text: string }
export interface LineResult { id: string; name?: string; value?: string; error?: string; deps: string[]; empty?: boolean }
interface Parsed { name?: string; expr: string; deps: string[]; error?: string; empty?: boolean }

const ASSIGN = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(?!=)\s*(.*)$/

export function parseLine(text: string, angle: AngleMode = 'deg'): Parsed {
  const t = text.trim()
  if (!t) return { expr: '', deps: [], empty: true }
  const m = ASSIGN.exec(t)
  const name = m?.[1]
  const expr = m ? m[2] : t
  if (!expr.trim()) return { name, expr, deps: [], error: 'Missing expression' }
  try {
    const node = getMath(angle).parse(preprocess(expr))
    assertSafe(node)
    const deps = new Set<string>()
    node.traverse((n: any, path: string, parent: any) => {
      if (n.isSymbolNode && !(parent?.isFunctionNode && path === 'fn')) deps.add(n.name)
    })
    return { name, expr, deps: [...deps] }
  } catch (e) {
    return { name, expr, deps: [], error: (e as Error).message }
  }
}

/** Indexes of lines that sit on a dependency cycle. */
export function findCycles(parsed: Parsed[]): Set<number> {
  const defs = new Map<string, number>()
  parsed.forEach((p, i) => { if (p.name && !defs.has(p.name)) defs.set(p.name, i) })
  const state: number[] = parsed.map(() => 0)
  const stack: number[] = []
  const cyc = new Set<number>()
  const visit = (i: number) => {
    state[i] = 1; stack.push(i)
    for (const d of parsed[i].deps) {
      const j = defs.get(d)
      if (j === undefined) continue
      if (state[j] === 1) stack.slice(stack.indexOf(j)).forEach((k) => cyc.add(k))
      else if (state[j] === 0) visit(j)
    }
    stack.pop(); state[i] = 2
  }
  parsed.forEach((_, i) => { if (state[i] === 0) visit(i) })
  return cyc
}

export function evaluateWorkbench(lines: Line[], angle: AngleMode = 'deg', precision = 10): LineResult[] {
  const m = getMath(angle)
  const parsed = lines.map((l) => parseLine(l.text, angle))
  const defs = new Map<string, number>()
  parsed.forEach((p, i) => { if (p.name && !defs.has(p.name)) defs.set(p.name, i) })
  const cyc = findCycles(parsed)
  const results: LineResult[] = lines.map((l, i) => ({ id: l.id, name: parsed[i].name, deps: parsed[i].deps.filter((d) => defs.has(d)), empty: parsed[i].empty }))
  const raw: unknown[] = []
  const done: boolean[] = lines.map(() => false)

  const run = (i: number): void => {
    if (done[i]) return
    done[i] = true
    const p = parsed[i], r = results[i]
    if (p.empty) return
    if (p.error) { r.error = p.error; return }
    if (p.name && defs.get(p.name) !== i) { r.error = `"${p.name}" is already defined on line ${defs.get(p.name)! + 1}`; return }
    if (cyc.has(i)) { r.error = `Circular dependency involving ${p.name ?? 'this line'}`; return }
    const scope: Record<string, unknown> = {}
    for (const d of p.deps) {
      const j = defs.get(d)
      if (j === undefined) continue
      run(j)
      if (results[j].error) { r.error = `Depends on invalid line "${d}"`; return }
      scope[d] = raw[j]
    }
    try {
      const v = m.parse(preprocess(p.expr)).evaluate(scope)
      if (typeof v === 'function' || v === undefined) throw new Error('Not a value')
      raw[i] = v
      r.value = formatValue(v, precision)
    } catch (e) {
      const msg = (e as Error).message
      const u = /Undefined symbol (\w+)/.exec(msg)
      r.error = u ? `Undefined variable ${u[1]}` : msg
    }
  }
  lines.forEach((_, i) => run(i))
  return results
}

/** IDs of lines whose output differs between two evaluations. */
export function changedIds(prev: LineResult[], next: LineResult[]): Set<string> {
  const before = new Map(prev.map((r) => [r.id, r.value ?? r.error ?? '']))
  const out = new Set<string>()
  for (const r of next) if (before.has(r.id) && before.get(r.id) !== (r.value ?? r.error ?? '')) out.add(r.id)
  return out
}

export function exportText(name: string, lines: Line[], results: LineResult[]): string {
  const body = lines.map((l, i) => (l.text.trim() ? `${l.text.trim()}   # ${results[i].error ? `error: ${results[i].error}` : `= ${results[i].value}`}` : ''))
  return `# ${name}\n# Exported from CALYX — Developed by Barath\n\n${body.join('\n')}\n`
}
