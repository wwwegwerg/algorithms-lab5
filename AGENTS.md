# AGENTS

## Commands

- Install: `npm ci`
- Dev: `npm run dev`
- Lint: `npm run lint -- --ignore-pattern "src/components/ui/**"` (avoid touching `src/components/ui/**`)
- Lint one file: `npx eslint "src/path/to/file.tsx" --max-warnings=0 --ignore-pattern "src/components/ui/**"`
- Format check/fix: `npx prettier --check .` / `npx prettier -w .`
- Typecheck: `npx tsc -b`
- Build: `npm run build` (runs `tsc -b && vite build`)
- Tests: not configured (no `test` script / runner); single-test: n/a

## Code style

- TypeScript strict: avoid `any`; validate `unknown` with type guards (see `src/core/io/*`).
- Imports: prefer `@/` alias; use `import type`; keep imports sorted (Prettier + sort-imports).
- React: function components + hooks; keep render logic simple; use `useCallback` for handlers passed down.
- State: use zustand stores in `src/stores/*`; keep data vs UI state separated.
- Tailwind: compose class names with `cn()` from `src/lib/utils.ts`.
- Prefer `const`; avoid `let` unless truly needed.
- Error handling: prefer `{ ok: boolean, ... }` results or store `lastError`; avoid exceptions for UI flow.
- UI kit: do not modify `src/components/ui/**` unless explicitly requested.
- Cursor/Copilot rules: none found in `.cursor/rules/`, `.cursorrules`, `.github/copilot-instructions.md`.
