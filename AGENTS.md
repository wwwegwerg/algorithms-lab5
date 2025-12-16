# AGENTS

## Commands

- Install: `npm ci` (preferred) or `npm install`
- Dev server: `npm run dev`
- Build (typecheck + bundle): `npm run build` (runs `tsc -b && vite build`)
- Lint: `npm run lint` (runs `eslint .`)
- Lint single file: `npx eslint src/path/to/file.tsx`
- Format: `npx prettier -w .` (check: `npx prettier --check .`)
- Tests: none configured in this repo yet (no `test` script)

## Code Style

- TypeScript + React (ESM); keep types strict; avoid `any`.
- Prefer `@/` alias for `src/*`; avoid deep relative imports.
- Let Prettier sort imports (see `prettier.config.js`); use `import type` for type-only imports.
- Formatting: 2 spaces, 80 cols, double quotes, semicolons, trailing commas.
- Tailwind: compose className with `cn()` from `src/lib/utils.ts`.
- Prefer single function bodies unless logic is reusable/composable.
- Avoid unnecessary destructuring; avoid `else` and avoid `try/catch` where possible.
- Prefer `const` over `let`; prefer single-word variable names when clarity allows.
- No Cursor/Copilot rules found in `.cursor/rules/`, `.cursorrules`, or `.github/copilot-instructions.md`.
