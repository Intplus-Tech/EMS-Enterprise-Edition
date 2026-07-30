<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Engineering rules

All AI agents working in this repository MUST follow the rules below. They are not
suggestions — a change that violates them should be reworked before it is committed.

## 1. SOLID

- **S — Single Responsibility.** One file, one job.
  - A `*Tab.tsx` component renders a screen. It must NOT own modal markup, data
    fetching, or cross-screen state. Modals live in `src/components/modals/` (or
    `src/components/admin/modals/`), shared state lives in
    `src/app/(dashboard)/DashboardProvider.tsx`.
  - Business rules belong in `src/domains/<domain>/`, never inline in a component.
  - If a component exceeds ~400 lines, that is a signal it is doing more than one
    job — extract a sub-component or a presentational primitive.
- **O — Open/Closed.** Extend behaviour with new props/variants, not by adding
  another `if (role === "X")` branch deep inside shared markup. Prefer a
  `variant` / `columns` / `renderCell` prop, or a role → config map (see
  `src/app/(dashboard)/roleRoutes.ts` for the pattern).
- **L — Liskov Substitution.** Any component built on a shared primitive
  (`ModalShell`, `StatCard`, `Pagination`) must remain usable everywhere that
  primitive is accepted. Do not special-case a single caller inside the primitive.
- **I — Interface Segregation.** Keep prop interfaces minimal and specific. Do not
  pass the whole dashboard context into a leaf component — pass only the values it
  reads. Never widen a prop type to `any` just to make a call site compile.
- **D — Dependency Inversion.** Presentational components receive data and
  callbacks via props. They must not import `DashboardProvider`, call `fetch`
  directly, or reach into `window`. The page/provider layer wires the dependencies.

## 2. DRY

- Before writing markup, check `src/components/ui/` for an existing primitive.
  Currently available: `ModalShell`, `StatCard`, `Pagination`,
  `RequestReferenceCard`, `ElectronicSignatureField`, `EmptyState`, plus the
  formatting helpers in `src/components/ui/format.ts`.
- Repeating the same JSX block three times means it should be a component;
  repeating the same expression twice means it should be a `const` or a helper.
- Formatting helpers (currency, dates, status → badge class) live in
  `src/components/ui/format.ts`. Do not re-implement `₦${n.toLocaleString()}`.
- Role → route/permission mappings live in `src/app/(dashboard)/roleRoutes.ts`.
  Do not duplicate the role list inside a component.
- Enums (`src/enums/`) and validators (`src/validators/`) are the single source of
  truth for statuses, roles, and log types. Never hardcode a status string that
  already exists in an enum.

## 3. Guiding comments

Every non-trivial unit of code carries a short comment explaining **why**, not what.

- **File header:** 1–3 lines at the top of each new component/module stating its
  responsibility and who consumes it.
- **Section markers:** inside long JSX, mark each region, e.g.
  `{/* Awaiting-response banner — only rendered when an approver returned a request */}`.
- **Non-obvious logic:** any derived value, fallback, guard clause, or workaround
  gets a one-line reason, e.g.
  `// Fallback demo figures keep the dashboard legible before the first seed runs.`
- **Do not** comment self-evident code (`// set state`), and do not add JSDoc to
  code you did not change.

## 4. UI / design parity

- Designs live in `designs/<role>/*.png` and are the source of truth for layout,
  copy, columns, and the presence of controls. Check the design before adding or
  removing UI.
- **Theming:** the app supports light + dark via CSS custom properties defined in
  `src/app/globals.css`. Inline styles MUST use `rgb(var(--color-*))` tokens
  (`--color-text`, `--color-text-muted`, `--color-text-dim`, `--color-surface`,
  `--color-card`, `--color-card-border`, `--color-primary`, …). Never hardcode
  `#0f172a`, `#1e293b`, `#f8fafc`, `#94a3b8` — those break light mode. The brand
  accent (`#2563EB`) and semantic status colours are the only acceptable literals.
- Reuse the existing class names from `globals.css` (`glass-panel`, `glass-card`,
  `data-table`, `table-container`, `badge badge-*`, `form-input`, `form-select`,
  `btn btn-primary`, `btn btn-secondary`) instead of re-styling from scratch.
- Every list/table needs three states: loading, empty (`EmptyState`), and populated.
- Every paginated table shows `Showing X to Y of Z entries` via `Pagination`.

## 5. Safety

- Validate and sanitise all user input at the API boundary using
  `src/validators/validation.ts`. Never trust client-supplied role, department, or
  amount values — re-derive them from the authenticated session in
  `src/middlewares/auth.ts`.
- Never log or render secrets, tokens, or password field values.
