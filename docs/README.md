# CALYX — Beyond Calculation.

A deterministic mathematical workstation that runs entirely in your browser. No AI, no accounts, no API keys.

Developed by Barath.

## Workspaces

- **Calculate** — scientific keypad and keyboard entry: trig, inverse trig, hyperbolic, log/ln, powers, roots, factorial, π, e, percentages, scientific notation, degree/radian switching, memory (MC/MR/M+/M−), Ans, history, copy result, adjustable precision.
- **Explore** — plot multiple functions of x with colour and visibility controls, zoom and pan (curves resample as the view changes), grid toggle, axis bounds, plotted points, hover coordinates, domain-gap warnings, PNG export. Analysis: marks roots and intersections in view (updates as you pan and zoom), draws derivatives, and evaluates f(x), f′(x) and definite integrals.
- **Workbench** — multi-line, dependency-aware calculations (`C = A * B`). Editing a line recalculates dependents; changed lines flash; circular dependencies and invalid or undefined references are flagged per line. Add, edit, delete and reorder lines, undo/redo, snapshots, rename/create/delete workspaces (stored in IndexedDB), text export, a drawn dependency graph (changed nodes light up, errors turn red), and a what-if explorer that slides one variable and shows every dependent result without touching your lines.
- **Formulas** — 28 built-in formulas (electrical, mechanics, geometry, algebra, finance, statistics) with search, categories, favourites and live results. Add your own: every name in your expression becomes an input. Custom formulas and favourites persist on the device.
- **Labs** — statistics (mean, median, mode, variance, standard deviation, quartiles, correlation, regression, chart), matrices (add, subtract, multiply, determinant, inverse, transpose, identity), complex numbers (arithmetic, polar form, magnitude, argument, conjugate), engineering (unit conversion, SI prefixes, scientific and engineering notation, searchable physical constants).

## Architecture

```
src/engine/   pure TypeScript, no UI: calc (math.js wrapper), workbench (parser + dependency graph), stats, matrix, engineering, analysis, formulas, storage
src/views/    React views for each workspace (Calculate, Explore, Workbench, Formulas, Labs)
src/App.tsx   shell, navigation, preferences, shortcuts
tests/        Vitest suite for the engine
```

Expressions are parsed by math.js, never run as JavaScript. Calls such as `import`, `evaluate` and `parse`, and object or accessor syntax, are rejected before evaluation. Workbench lines are evaluated in topological order, and cycles are found by depth-first search.

## Keyboard shortcuts

| Keys | Action |
| --- | --- |
| Alt+1 … Alt+5 | Switch workspace |
| Enter or = | Calculate |
| Backspace / Esc | Delete / clear |
| Ctrl+Z / Ctrl+Y | Undo / redo (Workbench) |
| ? | Shortcut panel |

## Testing

`npm test` covers arithmetic, trigonometry, logarithms, parsing and safety checks, precision, matrices, statistics, dependency ordering, recalculation, circular detection and preference persistence.

## Known limitations

Framer Motion and Tailwind are not used; styling is plain CSS. Root finding looks for sign changes, so it can miss roots where a curve only touches zero (like x²). Screenshots are not generated; add yours to `screenshots/`.

## License

MIT. See `LICENSE`.

## Keypad themes and mobile

Choose Glass, Solid, Outline or Tactile keypads in the header. On phones the navigation moves to a bottom bar and the scientific keys fold away behind a Scientific toggle.
