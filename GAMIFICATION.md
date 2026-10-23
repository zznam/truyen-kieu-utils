# Gamification: brainstorm implemented

The design uses learning, discovery, personal goals and earned cosmetics. These **60 functional additions** include ten new games plus practice, progression and profile tools. Individual badge thresholds and cosmetic variants are not counted separately. Existing classic games and saved scores remain intact.

## New games — `/play/arcade`

1. **Word assembly:** reconstruct a six-syllable line from word buttons.
2. **Double blank:** restore two missing words in order.
3. **Previous verse:** find the line preceding a supplied eight-syllable line.
4. **Authenticity check:** distinguish the original from an altered line.
5. **Syllable recognition:** identify six- and eight-syllable lines.
6. **Changed-word detective:** identify the specific altered word.
7. **Initial-letter puzzle:** recognize a line from its initial letters.
8. **Typed missing word:** recall a word without multiple-choice answers.
9. **Three-pair matching:** match three six/eight-syllable pairs.
10. **Read, hide, recall:** read a line, conceal it, then type it from memory.

## Practice choices and feedback

11. **No-hint contract:** choose an optional run with hints disabled before starting.
12. **Focus view:** hide peripheral game information while answering.
13. **Correct-answer combos:** track current and best uninterrupted correct-answer runs.
14. **Completion ranks:** receive a rank based on accuracy and hint use.
15. **Targeted retry:** retry only missed or hinted questions without re-awarding the original run.
16. **Arcade answer review:** compare every submitted answer with the source after a run.
17. **Learning-category finder:** filter new games by the skill to practise.
18. **Forgiving typed recall:** accept NFC/NFD Vietnamese, case differences and unaccented answers where specified.

## Reading and durable recall

19. **Confirmed reading credit:** explicitly mark a reader page read; each new line earns credit once.
20. **Focus reading sessions:** choose one, three or five minutes and confirm completion.
21. **Pause-aware timer:** pause/resume manually; changing away from the tab pauses automatically.
22. **Bookmark discovery rewards:** reward the first save of each passage; re-saving does not earn again.
23. **Topic exploration stamps:** discover the four real topic collections through Lẩy Kiều.
24. **Creative practice rewards:** successful Lẩy Kiều generation contributes to goals.
25. **Reflection check-ins:** explicitly mark reflection after Bói Kiều without storing the private prompt.
26. **Targeted spaced practice:** `/play/mastery` draws from read lines and previously correct answers.
27. **Due-first review queue:** prioritize least-practised lines and defer today's remembered lines until tomorrow.
28. **Multi-day mastery:** increase each line's mastery once per local date; three days establishes mastery.
29. **Mastered-line refresher:** opt into reviewing already mastered lines.
30. **Hint-aware mastery:** hinted or incorrect answers do not raise mastery; unfinished rounds do not save.

## Goals and habits — `/play/adventure`

31. **Daily quest board:** claim reading, playing, saving, review, focus and goal rewards separately.
32. **Weekly quest board:** reading, variety, accuracy, focus, reflection, creation and consistency objectives.
33. **Adjustable daily goal:** choose 20, 50, 100 or 200 adventure XP.
34. **Six-chapter campaign:** reading, collecting, exploring, practising, accuracy and mastery milestones.
35. **Sequential campaign unlocks:** claim the previous chapter before unlocking the next reward.
36. **Cross-activity streak:** rewarded reading and other learning activities contribute to a personal streak.
37. **Longest-streak record:** compare the current habit with the longest retained streak.
38. **One-day streak repair:** spend currency to bridge yesterday's gap after an active day; the gap does not count as activity.
39. **Activity calendar:** inspect 28 days of recorded activity.
40. **Next-milestone recommendation:** show the next available chapter and a relevant activity shortcut.

## Rewards and self-expression

41. **Adventure levels and ranks:** increasing XP requirements advance a separate adventure rank.
42. **Earned-currency wallet:** earn and spend hạt ngọc through learning; no real-money purchases.
43. **Achievement gallery:** fourteen varied conditions with progress, search and earned/locked filtering.
44. **Pinned achievement:** display one earned badge on the personal greeting.
45. **Topic collectible album:** reveal a themed card for each discovered topic.
46. **Reading collectible album:** earn a card by reading in each quarter of the imported text.
47. **Personal reader profile:** save a nickname and choose a free avatar.
48. **Earned avatars:** buy and equip collectible avatars with earned currency.
49. **Earned titles:** equip unlocked rank titles or a purchased literary title.
50. **Earned profile colors:** purchase and apply profile accents.
51. **Owned reward inventory:** find and re-equip purchased rewards without buying again.

## Progress and portability

52. **Weekly report:** compare XP with the previous week; inspect activity, accuracy and focus time.
53. **Mode-specific records:** keep personal best accuracy for each classic and arcade mode.
54. **Lifetime learning statistics:** show accuracy, perfect runs and unaided perfect runs.
55. **Mastery notebook:** sort lines by recency, strength or need for practice and return to their sources.
56. **Session history:** inspect recent modes, dates, hints, results and adventure XP.
57. **Portable backup:** export the adventure as versioned JSON.
58. **Previewed restore:** validate a backup, preview its owner and totals, then explicitly replace adventure data.
59. **Confirmed fresh start:** reset only the adventure after entering a confirmation phrase.
60. **Browser-local continuity:** preserve progress after reload, refresh sequential changes from other tabs and retain in-memory play when storage fails.

## Progress rules

- Adventure uses `kieu-adventure-v1`. Classic scores remain in `kieu-games-v1`; bookmarks remain in `kieu-library-v1`. Adventure backup/reset only affects the new adventure. Historic classic results are not retroactively converted.
- New lines award 2 adventure XP and 1 hạt ngọc each; first saves award 5/2; first topic discoveries award 10/4.
- Composition awards 10/3 and reflection 5/2, up to three rewarded actions of each kind per local day.
- A completed game awards 5 XP plus 4 per correct answer, 10 for a perfect run and another 5 for a perfect unaided run. Currency is 2 plus correct answers plus 3 for a perfect run. Up to 20 sessions per day receive adventure credit. Classic games retain their original separate scoring.
- Each first successful review of a line that day awards 3 XP and 1 hạt ngọc, for up to 50 lines daily. Further review still advances mastery. Focus awards 2 XP and 1 hạt ngọc per completed minute, up to 120 minutes daily.
- Daily quests follow the device's local date; weekly quests start Monday. Claim rewards during the active period. Claims cannot be repeated. Historical goal targets are retained for weekly consistency.
- Scores are personal learning aids, not tamper-proof competition results. Browser data and JSON backups can be edited. There is no account, shared leaderboard, server sync or notification service.
- Storage retains up to 366 activity dates, 200 session results and 5,000 recent event IDs. Streak records cover retained activity. Cross-tab writes are best effort, not transactional.
- All source links use imported-edition line identifiers. Alterations in games are labelled and corrected in feedback. The original text is unchanged.

## Validation

Run `pnpm check`, `pnpm test:api`, `pnpm test:ui`, and `pnpm build`. New suites cover all ten modes, reward and date rules, duplicate claims, shop ownership, mastery, backups, reading and focus integration, and claim-to-purchase flows. Responsive checks cover new panels and practice views at 320, 390, 768 and 1280 pixels, including dark mode.
