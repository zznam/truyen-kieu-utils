# Phòng đọc Kiều — 14 additions for close reading

Open `/reading-room`, use **Vào phòng đọc** in the full reader, or follow **Phòng đọc** from a passage card. The room complements the existing reader, flashcards and scored games.

1. **Custom excerpts:** choose up to 40 consecutive source entries and copy a link that restores the range and selected line.
2. **Surrounding context:** show two, four or eight source lines on each side without changing the selected excerpt.
3. **Focus view:** collapse selection, notebook and recall tools around the poem and listening controls.
4. **Guided reading:** move a visible cursor by clicking line numbers, using previous/next controls or pressing up/down while the poem has keyboard focus.
5. **Graduated memorization:** hide line endings, show word initials, or hide every word; reveal individual lines when needed.
6. **Written recall:** compare a typed attempt with the original. Feedback identifies missing, extra and changed words without shifting every later word out of alignment. Case and punctuation are ignored; Vietnamese tone and vowel distinctions matter.
7. **Vietnamese read-aloud:** choose an available Vietnamese device voice and speed, pause/resume or stop. The cursor follows each line. Changing excerpts, tabs, visibility or routes cancels playback and invalidates late callbacks.
8. **Passage comparison:** place two independently selected excerpts side by side with source links.
9. **Word concordance:** explore shared words, then search the full work using either tone-sensitive whole-word matching or accent-insensitive phrase matching. Results link to their original context.
10. **Resumable reading queue:** save named excerpts, reorder them, resume the selected line, mark them read and return them to the queue.
11. **Private reflections:** write or edit a reflection for each excerpt. A stale editor cannot silently overwrite a note changed in another tab; it offers to load the newer note.
12. **Notebook discovery:** filter by reading status or search titles, reflections and source ranges without accents.
13. **Attributed export:** copy an excerpt or download the complete notebook as readable text, retaining Nguyễn Du attribution and the imported-edition numbering disclaimer.
14. **Previewed backup recovery:** export JSON, validate a selected file before previewing it, then merge new excerpts while retaining existing notes, order and reading positions on conflicts. Canceling or rejecting an import leaves the current notebook intact.

## Correctness and privacy boundaries

- Source data is never modified. Excerpts use positions in `lib/kieu.ts`, so irregular numbering and combined lines do not create invented couplets.
- The independent `kieu-reading-room-v1` store contains at most 60 entries: source range, title, note, cursor and reading status. It does not store copies of the poem or change library, studio, game or adventure save formats.
- Parsers reject unsupported versions, invalid ranges/cursors, duplicate ranges, unknown statuses and oversized values. Import files are limited to 500,000 bytes. A merge exceeding 60 entries fails without partial writes.
- Sequential writes reread browser storage; simultaneous writes across tabs remain best effort. Clearing the store in another tab is respected. If storage is unavailable, the room works in memory and offers export.
- Reflections and exports are private unless you share them. There is no account sync. Device speech starts only after a click; a network-backed browser voice may send poem text to its speech service. Notes and recall drafts are never supplied to speech or AI.
- Read-aloud requires browser speech synthesis and an installed Vietnamese voice. It is synthetic speech, not a scholarly recitation. Unsupported devices retain all non-audio tools.
- Recall results and reading status are personal practice aids. They grant no XP, badges, reading quest credit or mastery claims.
- Removing a notebook entry requires confirmation and checks that the entry has not changed since the dialog opened. Other stores are unaffected.

## Ownership and verification

`lib/reading-room.ts` owns excerpt validation, recall alignment, vocabulary matching, notebook transitions and export text. `hooks/use-read-aloud.ts` owns speech lifecycle effects. `components/reading-room/` separates the reading workspace, comparison, recall and notebook interfaces; `/reading-room` supplies route metadata and styles.

Library validation and write boundaries live in `lib/library.ts`. The provider canonicalizes either line of a saved couplet and rejects invalid progress/font values before writing.

Run `pnpm check`, `pnpm test:ui`, `pnpm test:api` and `pnpm build`. The new domain suite covers source boundaries, Unicode, aligned recall, validated persistence and conflict-safe imports. The browser suite covers the complete reading/notebook workflows, keyboard controls, mobile/dark layouts, storage failure, cross-tab conflicts and speech cancellation. Speech lifecycle tests use a controlled browser API substitute; actual voice availability and audio quality depend on the device.
