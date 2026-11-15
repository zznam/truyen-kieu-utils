# Xưởng Lẩy Kiều — 14 composition features

Open `/lay-kieu/workshop` from **Mở xưởng Lẩy Kiều** on the existing Lẩy Kiều page. The workshop builds new arrangements from original source lines; it does not rewrite Nguyễn Du's text or present rearrangements as original passages.

1. **Source-line finder:** choose a six-word line using accent-insensitive search or an exact imported-edition source ID.
2. **Constrained source pools:** work with a selected topic or bookmarked passages. Either line of a saved couplet includes that passage's available source lines.
3. **Rhyme exploration:** browse matching eight-word lines and inspect the last word of the six-word line beside the sixth word of its partner.
4. **Manual composition:** choose the exact two original lines for each new stanza.
5. **Reproducible generation:** specify a seed and stanza count to recreate an arrangement within the same source pool. Avoid repeated source lines or explicitly allow reuse.
6. **Stanza locks:** preserve chosen stanzas while regenerating the surrounding poem. Reducing the length cannot silently discard a locked stanza.
7. **Targeted revision:** regenerate one unlocked stanza without replacing the rest.
8. **Arrangement controls:** move stanzas up or down, or remove an unwanted stanza.
9. **Undo and redo:** step through a bounded editing history while developing an arrangement.
10. **Personal presentation:** give the composition a title and add a private reflection.
11. **Saved draft library:** explicitly save, reopen, duplicate or delete a composition. Revision checks prevent stale saves and deletion confirmations from silently overwriting changes from another tab.
12. **Poem preview:** read the assembled composition in a clean presentation while retaining access to each source line.
13. **Attributed sharing and export:** copy or download text/Markdown, or share a link containing only validated source pairs. Private title/reflection text is excluded from the share URL.
14. **Previewed backup import:** export saved drafts as JSON, validate an incoming file, preview additions and merge new IDs while retaining local drafts on conflicts.

## Data and poetic constraints

- The original imported edition remains unchanged. Only lines with exactly six or eight word tokens can form a workshop pair. Combined or irregular entries remain available in the reader and are not split or renumbered.
- Written rhyme matching reuses `rhymeKey` from the existing Lẩy Kiều service. It strips tone marks while preserving Vietnamese vowel quality, matching the six-line ending to the eight-line's sixth word. It does not certify full tonal rules, cross-stanza rhyme continuity, meaning or literary quality.
- Search may ignore accents; topic and rhyme matching retain the distinctions required by their separate rules.
- Generation with the same seed, options, source bookmarks and locked stanzas is deterministic. A changed source pool can produce a different poem. Insufficient source pools fail visibly without replacing the current draft with a partial result.
- Locked stanzas preserve their source pairs even if filters change. Newly generated stanzas follow the current filters.
- The independent `kieu-workshop-v1` store contains up to 20 saved drafts with up to 16 stanzas each. Drafts store IDs and metadata, not copies of the original poem. Titles are limited to 80 characters and reflections to 2,000.
- Unsaved editing remains in memory. Explicitly save before leaving, or export a copy. When browser storage is blocked, saved drafts remain usable in memory for that page session and a notice explains the limit.
- Backups are limited to 250,000 bytes and validated before use. Unknown versions, invalid source pairs, duplicate IDs, invalid revisions or oversized fields are rejected. An import that exceeds the draft limit makes no partial changes.
- Sequential writes reread current browser storage. Simultaneous cross-tab writes remain best effort. Stale explicit saves and deletion confirmations require the user to review the newer draft.
- Exported text/Markdown and backups can contain private reflections. Share links contain only poem source pairs. Nothing is sent to an AI service and no account sync is introduced.
- Workshop editing awards no XP. The original Lẩy Kiều generator and its existing adventure reward rules are unchanged.

## Code and verification

`lib/poetry-workshop.ts` owns deterministic generation, source/rhyme validation, saved-draft transitions, revision checks, export and share encoding. `components/poetry-workshop/` owns the editing interface and browser actions, using the existing validated local-store hook. Route metadata and styles live under `app/lay-kieu/workshop/`.

Run `pnpm check`, `pnpm test:ui`, `pnpm test:api` and `pnpm build`. Domain regressions cover real source integrity, deterministic generation, filter and lock boundaries, revision conflicts and malformed backups. Browser workflows cover composition, recovery, keyboard-friendly controls, persistence, private sharing boundaries and narrow/light/dark layouts.
