# Kiều — Một di sản, vạn cảm hứng

A Vietnamese reading and discovery app for Nguyễn Du’s Truyện Kiều, built with Next.js, React and TypeScript.

## Run locally

Requires Node.js 22 and pnpm 10. The package manager is pinned to 10.28.2 for Corepack.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open http://localhost:3000. A different port can be selected with `pnpm dev --port 3012`.

## Features

- Responsive literary design with light and dark themes, keyboard navigation, and reduced-motion support.
- Self-hosted Noto Serif and Noto Sans with Vietnamese glyph coverage and real italics; no external font service is needed at runtime or build time.
- Paginated reader with accent-insensitive Vietnamese search, exact line lookup, four text sizes, and a remembered reading position.
- Browser-local passage bookmarks, searchable collections, text export, copy and direct source links.
- A daily passage based on the reader’s local calendar date.
- Topic discovery with Vietnamese words matched without conflating tones.
- Bói Kiều: random original couplets, optional reflection prompt, and the last five draws in the current session.
- Lẩy Kiều: generated 6/8-syllable pairs with source links. Matching uses the last syllable of the six-syllable line and the sixth syllable of the eight-syllable line, preserving vowel quality when stripping tone marks.
- Chơi cùng Kiều (`/play`): missing-word, next-verse and verse-order games, plus a deterministic daily mixed challenge. Five-question sessions include hints, answer review, source links and bookmarks. Local XP, levels, best scores, completion streaks and four badges reward progress. Daily rewards are granted once per local date; replays are for practice.
- Daily missions on `/play`: complete a session, answer ten questions correctly, and finish two distinct practice modes to claim a 20 XP bonus once per local day.
- Mistake notebook (`/play/review`): revisit up to five missed or skipped questions from completed games. Answer correctly without a hint to remove a question. Review awards no XP and does not affect streaks or missions.
- Journey journal (`/play/journey`): a seven-day activity view, review shortcut and the last 20 recorded sessions with scores and replay links.
- Vườn tri âm (`/play/adventure`): daily/weekly quests, six campaign chapters, achievements, collections, earned cosmetics, goals, activity reports and backup/restore. See [the 60-addition feature inventory](GAMIFICATION.md).
- Poetry arcade (`/play/arcade`): ten new learning games, an optional no-hint contract, focus view, combos and reward-free targeted retries.
- Reading quests (`/full`) and spaced practice (`/play/mastery`): explicitly confirm pages read, complete pause-aware focus sessions, and revisit learned lines across different days to build mastery.
- Optional server-side Gemini interpretation with validated inputs, timeouts and useful unavailable/error states.

## Data and privacy

The original `app/data/truyen-kieu.ts` is preserved. It contains 3,257 entries, including a combined line and numbering inconsistencies. Display normalization only fixes spacing around punctuation. The app labels references as lines in this imported edition, not canonical verse numbers. Consult a verified scholarly edition for formal citations.

Rhyme suggestions compare written rhyme endings. They do not claim to fully validate Vietnamese poetic tone rules or the meaning of a generated pairing.

Bookmarks, reading position and font size use the versioned `kieu-library-v1` browser storage key. They are not uploaded or synced to an account. If browser storage is unavailable, reading still works and changes remain in memory for the session. Export collections before clearing browser data.

Game progress uses the separate `kieu-games-v1` browser storage key. Only completed sessions count; unfinished games restart on leaving the page. A correct answer earns 10 XP (5 with a hint); the first daily completion earns another 10 XP. A streak counts consecutive local dates with a completed session and remains active through the following day. Progress stays in memory if storage is unavailable. The same storage key also holds up to 100 review questions (mode and source ID only), the last 90 active dates of mission counters, and 20 recent results. Older XP, badges and streaks are preserved; detailed history and missions start with new completions. The mission bonus must be claimed that day and is separate from game scores. These are personal practice scores, not a verified or synced leaderboard.

The optional reflection question stays in memory. A passage and its accompanying question are sent to Google Gemini only after the user chooses the AI interpretation button. No API keys or prompts are logged, and no AI key is bundled into client code.

The adventure uses its own `kieu-adventure-v1` storage key and XP rules, documented in [GAMIFICATION.md](GAMIFICATION.md). New classic-game completions and successful reviews also contribute to adventure goals; old classic scores are preserved separately. Adventure export, import and reset affect only adventure data, not bookmarks or classic scores.

## Optional AI configuration

Set the following **server-only** values in `.env.local` or your hosting environment:

```dotenv
GEMINI_API_KEY=your-api-key
GEMINI_MODEL=your-supported-model-id
```

Choose a currently available text-generation model for your Google project. Both values are required. No AI configuration is needed for reading, search, saving, discovery, or Lẩy Kiều generation. Without it, the AI endpoint returns a descriptive HTTP 503; it does not pretend an error is a successful interpretation.

The previous configuration exposed `GEMINI_API_KEY` through Next.js `env` and logged request URLs. If that version was deployed with a real key, rotate that key and review its usage before re-enabling AI.

## Validation

```sh
pnpm check      # TypeScript, ESLint, and core regression tests
pnpm test:api   # HTTP route and validation tests; starts/reuses a local dev server
pnpm test:ui    # Chromium typography, responsive layout and interaction stress tests
pnpm build     # Production compilation with type and lint checks enabled
pnpm start     # Serve a completed production build
```

API tests use port 3012 by default. For an existing server, set `TEST_BASE_URL`. Tests assume AI is unconfigured; set `TEST_AI_CONFIGURED=1` to skip that specific test against a configured server. Do not run API tests against production.

UI tests also use port 3012. Install their browser once with `pnpm exec playwright install chromium`. The suite covers 320–1280px layouts, the largest reading size, long queries, Vietnamese search, keyboard focus, bookmarks and reading preferences after reload, repeated draws, and maximum-size generated poems. Typography checks inspect the actual rendered fonts for all Vietnamese vowel/tone combinations in both NFC and NFD Unicode forms. Font files and OFL licenses are bundled in `public/fonts`; custom subsets retain combining marks that the standard web subsets omit. See `public/fonts/README.md` for source checksums and regeneration instructions.

Core tests cover Vietnamese search, source numbering, couplet integrity, daily selection, topics, rhyme matching, corrupt local-data validation and export attribution. HTTP tests cover all primary routes, valid and invalid generation counts, invalid AI requests, missing AI configuration and 404 recovery.
