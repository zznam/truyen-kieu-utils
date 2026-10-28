# Gamification expansion: 54 additional features

This expansion builds on the existing [60-feature inventory](GAMIFICATION.md). The brainstorm focuses on three missing learning loops: choosing what to remember, pursuing a personal route, and testing close reading with reproducible challenges. The 54 additions below count distinct working behaviors; individual route templates, card ratings, difficulty settings and cosmetic variants are not counted separately.

## Personal flashcard studio — `/play/studio`

1. Create named personal decks.
2. Rename an existing deck.
3. Delete a deck through an explicit confirmation.
4. Add an original line by its imported-edition ID.
5. Import bookmarked lines into the selected deck in one action.
6. Remove an individual card.
7. Keep a private note on each card.
8. Add personal tags to cards.
9. Search decks and card content.
10. Favorite selected cards.
11. Limit practice to favorites.
12. Reveal a flashcard's answer after attempting recall.
13. Reverse the recall direction.
14. Practise with a cloze prompt.
15. Self-rate recall to schedule the next practice date.
16. Practise only due cards.
17. Set a daily study cap that limits the practice queue.
18. See a completed study summary broken down by rating.

Self-ratings are personal estimates. They do not award adventure XP or objectively measured accuracy. Notes and tags stay in browser storage.

## Personal expeditions — `/play/expeditions`

19. Choose a curated route with several learning stages.
20. Create a named custom route.
21. Choose the activity metric for each stage.
22. Set the target for each stage.
23. Set an optional personal deadline.
24. Start from a snapshot of current progress, so earlier activity does not finish new goals.
25. Resume one active expedition across visits.
26. Unlock stages in sequence using activity after the preceding checkpoint.
27. Claim a checkpoint only after its measured target is reached.
28. Receive a completion certificate for a finished expedition.
29. Pin a preferred route.
30. Archive a completed expedition.
31. Restart a completed route from a fresh activity baseline.
32. Edit a custom route before starting it.
33. Delete a custom route with confirmation.
34. See days remaining or an overdue status without losing the route.
35. Follow a recommendation to the activity needed by the current stage.
36. Inspect expedition history and checkpoint dates.

Expeditions measure adventure activity, including confirmed reading, correct game answers, successful review, focus minutes, topic discoveries and creative practice. Checkpoints add no extra XP; the original activities retain their existing rewards. Unique reading and topic goals require new lines or discoveries. Clearing or restoring adventure progress can change the available evidence.

## Challenge arena — `/play/arena`

37. Restore Vietnamese diacritics by identifying the original line.
38. Identify a word's position within a line.
39. Find a word shared by the two lines of a couplet.
40. Count a target word's occurrences in a source passage.
41. Identify an intact original couplet among altered pairings.
42. Restore the first and last words around a masked center.
43. Put two passages in the imported edition's order.
44. Find the line belonging in a four-line source window.
45. Build a playlist of selected mechanics.
46. Choose a run length of 3, 5 or 10 questions.
47. Restrict sources to an imported-edition line range.
48. Restrict sources to bookmarked passages.
49. Use the local day's reproducible arena seed.
50. Enter a custom seed to recreate a run with the same settings and source pool.
51. Estimate answer confidence and inspect calibration after the run.
52. Opt into a second attempt before the answer is revealed.
53. Compare a completed run with the personal best for its configuration.
54. Export an attributed plain-text run report.

Only first-attempt correct answers count toward scored accuracy and adventure rewards. Second attempts are for learning. No unfinished run is rewarded. A finished arena run uses the existing adventure session rules and daily cap. Questions stay within the selected source pool; unavailable mechanics are identified before starting rather than silently drawing from elsewhere. The original source text is never changed. Source numbering refers to the imported edition, not a scholarly canonical edition.

## Storage and recovery

The studio, expeditions and arena use separate versioned keys: `kieu-studio-v1`, `kieu-expeditions-v1` and `kieu-arena-v1`. Stores validate data before accepting it, retain in-memory changes if storage is blocked, and refresh updates from other tabs. Sequential writes reread the latest stored state; simultaneous cross-tab writes are best effort, not transactional. None of these stores uploads data or syncs to an account.

The existing adventure backup/reset controls still cover adventure data only. The three new stores are independent; export a completed arena report for a human-readable result. Clearing browser data removes these local stores.

## Verification

Run `pnpm check`, `pnpm test:api`, `pnpm test:ui` and `pnpm build`. Focused suites cover deck scheduling and queue limits, expedition baselines and sequential claims, arena source integrity and reproducibility, result persistence, and full browser workflows. Shared expansion checks cover navigation, malformed/unavailable browser storage, and 320/390/768/1280px layouts in both themes.
