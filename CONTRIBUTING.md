# Contributing

Use Node.js 22 and the pinned pnpm version. Install with `pnpm install --frozen-lockfile`.
Read [README.md](README.md) for setup, data limitations and privacy behavior.
[AGENTS.md](AGENTS.md) provides concise repository guidance for coding agents and humans.

## Find the owning code

Routes in `app/` compose features; domain modules in `lib/` own scoring, validation and
state transitions. Providers bridge those pure functions to React and browser storage.
Page-specific styles remain beside their routes. Shared UI primitives live in `components/ui/`.

| Concern                                                     | Starting points                                                                               |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Imported text, passages, search and topics                  | `lib/kieu.ts`; preserve `app/data/truyen-kieu.ts`                                             |
| Bookmarks, reader preferences and persistence               | `components/library-provider.tsx`                                                             |
| Classic games, scores, missions and mistake review          | `lib/games.ts`, `lib/game-progress.ts`, `lib/game-journey.ts`, `components/game-provider.tsx` |
| Adventure events, rewards, milestones and backup validation | `lib/gamification.ts`, `components/gamification-provider.tsx`                                 |
| Adventure tab navigation                                    | `app/play/adventure/page.tsx`                                                                 |
| Individual adventure panels and presentation helpers        | `components/adventure/`; `use-profile.ts` retains profile drafts between tabs                 |
| Arcade questions and completed sessions                     | `lib/arcade.ts`, `components/arcade-session.tsx`                                              |
| Flashcards, expeditions and arena rules                     | `lib/studio.ts`, `lib/expeditions.ts`, `lib/arena.ts`                                         |
| Validated browser stores for those learning areas           | `hooks/use-local-store.ts`                                                                    |
| Lẩy Kiều generation and optional Gemini requests            | `app/services/`, `app/api/`                                                                   |

## Make changes easy to follow

Keep domain logic independent of React and browser globals. Pass time, seeds and state into
calculations so their behavior can be reproduced. Use named constants for domain limits and
clear branches for distinct rules. Extract components around a coherent responsibility;
derive panel-only values inside that panel and keep drafts that survive tab changes in the route.

Reuse `normalize` from `lib/kieu.ts` for accent-insensitive search. Rhyme matching intentionally
preserves vowel quality and has its own normalization in `app/services/lay_kieu.ts`.
Source links and exports must retain attribution to the imported edition.

Treat storage and imported JSON as untrusted inputs. Each store has a versioned key and parser.
Preserve existing save compatibility and memory-only behavior when storage fails. Adventure,
classic games, bookmarks and the three learning stores have separate backup/reset boundaries;
see the feature inventories before changing their behavior.

## Format and validate

`pnpm format` applies the single `.prettierrc` configuration. `.prettierignore` excludes generated
output, imported verse data and font assets. `pnpm format:check` verifies formatting without writes.

```sh
pnpm check       # Formatting, TypeScript, zero-warning ESLint and domain tests
pnpm test:api    # HTTP routes and request validation
pnpm test:ui     # Chromium interactions, persistence and responsive layouts
pnpm build      # Production compilation
```

For a focused browser check, use `pnpm test:ui tests/adventure.spec.ts`. Both browser and API
suites start or reuse a local server on port 3012. Run them sequentially when they share that
server. Install Chromium once with `pnpm exec playwright install chromium`.

Test domain invariants such as reward idempotency, scheduling boundaries, deterministic
questions and corrupt-save handling. Use browser tests for navigation, keyboard focus and
data surviving a reload. A refactor should preserve these observable behaviors.

Include the change's purpose, relevant validation and any remaining limitation in review notes.
Keep feature inventory documentation aligned when behavior changes; readability changes alone
should preserve product copy and reward rules.
