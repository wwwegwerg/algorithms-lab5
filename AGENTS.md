# AGENTS

## Commands

- Install: `npm ci` (or `npm install`)
- Dev: `npm run dev`
- Typecheck: `npx tsc -b`
- Build: `npm run build` (`tsc -b && vite build`)
- Lint: `npm run lint` (single file: `npx eslint src/.../file.tsx`)
- Format: `npx prettier -w .` (check: `npx prettier --check .`)
- Test: not configured (no `test` script / runner); single-test: n/a

## Code style

- TS strict: avoid `any`; validate `unknown` with type guards (see `src/core/io/graphFile.ts`).
- Imports: use `@/` alias; use `import type`; let Prettier sort imports (`prettier.config.js`).
- Formatting: Prettier defaults (80 cols, semicolons, trailing commas, LF); don’t fight it.
- React: function components + hooks; keep render logic simple; avoid IIFEs in JSX; use `cond && (...)`.
- Tailwind: compose class names with `cn()` from `src/lib/utils.ts`.
- Error handling: prefer `{ ok: true/false, ... }` results or store `lastError`; avoid thrown errors for UI flow.
- Rules: no Cursor/Copilot instructions found in `.cursor/rules/`, `.cursorrules`, `.github/copilot-instructions.md`.
