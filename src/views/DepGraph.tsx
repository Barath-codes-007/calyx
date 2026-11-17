import type { LineResult } from '../engine/workbench'

const W = 130, H = 42, GX = 180, GY = 62

export default function DepGraph({ results, flash }: { results: LineResult[]; flash: Set<string> }) {
  const nodes = results.filter((r) => r.name && !r.empty)
  const byName = new Map<string, LineResult>()
  nodes.forEach((r) => { if (!byName.has(r.name!)) byName.set(r.name!, r) })
  if (!nodes.some((r) => r.deps.some((d) => d !== r.name))) return <p className="dim">Reference one variable from another, like <code>C = A * B</code>, and the links are drawn here.</p>

  const level = new Map<string, number>(), visiting = new Set<string>()
  const lv = (n: string): number => {
    if (level.has(n)) return level.get(n)!
    if (visiting.has(n)) return 0
    visiting.add(n)
    let l = 0
    for (const d of byName.get(n)!.deps) if (byName.has(d) && d !== n) l = Math.max(l, lv(d) + 1)
    visiting.delete(n); level.set(n, l); return l
  }
  byName.forEach((_, n) => lv(n))
  const cols = new Map<number, string[]>()
  byName.forEach((_, n) => { const l = level.get(n)!; cols.set(l, [...(cols.get(l) ?? []), n]) })
  const pos = new Map<string, { x: number; y: number }>()
  cols.forEach((names, l) => names.forEach((n, i) => pos.set(n, { x: 16 + l * GX, y: 16 + i * GY })))
  const maxL = Math.max(...cols.keys()), maxR = Math.max(...[...cols.values()].map((c) => c.length))
  const edges: { from: string; to: string }[] = []
  byName.forEach((r, n) => r.deps.forEach((d) => { if (byName.has(d) && d !== n) edges.push({ from: d, to: n }) }))

  return (
    <div className="depgraph">
      <svg viewBox={`0 0 ${16 * 2 + maxL * GX + W} ${16 * 2 + (maxR - 1) * GY + H}`} role="img" aria-label="Dependency graph" style={{ minWidth: 16 * 2 + maxL * GX + W }}>
        <defs><marker id="arr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--dim)" /></marker></defs>
        {edges.map((e, i) => {
          const a = pos.get(e.from)!, b = pos.get(e.to)!
          const x1 = a.x + W, y1 = a.y + H / 2, x2 = b.x, y2 = b.y + H / 2, mx = (x1 + x2) / 2
          const hot = flash.has(byName.get(e.to)!.id)
          return <path key={i} d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2 - 2},${y2}`} fill="none" stroke={hot ? 'var(--cyan)' : 'var(--dim)'} strokeWidth={hot ? 2 : 1.2} markerEnd="url(#arr)" />
        })}
        {[...byName.entries()].map(([n, r]) => {
          const p = pos.get(n)!, hot = flash.has(r.id)
          return (
            <g key={n} transform={`translate(${p.x},${p.y})`}>
              <rect width={W} height={H} rx={4} fill="var(--surf)" stroke={r.error ? 'var(--bad)' : hot ? 'var(--cyan)' : 'var(--line)'} strokeWidth={hot || r.error ? 2 : 1} />
              <text x={10} y={18} fill="var(--text)" fontSize="13" fontWeight="600">{n}</text>
              <text x={10} y={34} fill={r.error ? 'var(--bad)' : 'var(--cyan)'} fontSize="12" fontFamily="ui-monospace,monospace">{(r.error ? 'error' : r.value ?? '').slice(0, 15)}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
