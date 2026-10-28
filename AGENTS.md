# Repository guide

This guide applies throughout this repository. Start with [README.md](README.md)
for product behavior and [CONTRIBUTING.md](CONTRIBUTING.md) for code ownership and validation.

## Work locally

- Use Node.js 22 and the pnpm version pinned in `package.json`.
- Read `git status` before editing; preserve unrelated changes and untracked work.
- Keep changes focused. Do not change dependencies, hosting or CI merely to refactor code.
- Do not edit `.next/`, `graft/`, `next-env.d.ts` or `*.tsbuildinfo`; they are generated.
- Preserve `app/data/truyen-kieu.ts` verbatim. Its IDs refer to the imported edition,
  whose irregular numbering is intentional. Use `lib/kieu.ts` for display and lookup.

## Place code by responsibility

- `app/`: routes, route composition and colocated page styles.
- `components/`: interactive features and providers; adventure tabs live in `components/adventure/`.
- `components/ui/`: existing shared UI primitives; reuse before adding another abstraction.
- `hooks/`: browser lifecycle and reusable state behavior.
- `lib/`: deterministic domain functions, state types and persistence validation.
- `app/services/`: poetry generation and server-only AI integration.
- `tests/`: `*.test.ts` for domain rules, `*.api.ts` for HTTP, `*.spec.ts` for Chromium flows.

## Preserve behavior

- Keep Vietnamese UI text and attribution intact. Reuse existing text normalization;
  accent-insensitive search and tone-sensitive rhyme matching have different purposes.
- Keep browser storage versioned and validated. Unavailable storage must allow in-memory use.
- Do not rename storage keys or alter reward rules without a deliberate migration.
- Keep calculations and transitions in pure functions; perform browser effects in hooks or handlers.
- Keep tab draft/filter state in the route when it must survive unmounting a panel.
- Keep AI credentials server-only. Do not log keys, prompts or private reflection text.
- Prefer named functions, explicit domain types and readable branches over compressed expressions.
  Explain domain constraints and non-obvious decisions instead of restating code.

## Verify

- Run `pnpm check` for formatting, types, warning-free lint and domain regression tests.
- Run `pnpm test:ui` for changed interactions and `pnpm test:api` for route changes.
- Run `pnpm build` after route, component-boundary or configuration changes.
- Browser suites use local port 3012. Use `TEST_BASE_URL` only for a known local test server.
  Never run mutation-oriented tests against production.
- Add regression coverage for meaningful behavior changes; formatting alone needs no new tests.
