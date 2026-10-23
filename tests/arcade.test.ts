import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ARCADE_ROUNDS,
  arcadeAnswerText,
  arcadeModes,
  arcadeRank,
  createArcadeQuestions,
  isArcadeCorrect,
  isArcadeMode,
  normalizeArcadeAnswer,
  type ArcadeMode,
} from '../lib/arcade'
import { verses, words } from '../lib/kieu'

const modes = Object.keys(arcadeModes) as ArcadeMode[]
test('ten arcade modes generate deterministic, answerable, original-source rounds', () => {
  assert.equal(modes.length, 10)
  for (const mode of modes) {
    for (let seed = 0; seed < 12; seed++) {
      const questions = createArcadeQuestions(mode, String(seed))
      assert.deepEqual(questions, createArcadeQuestions(mode, String(seed)))
      assert.equal(questions.length, ARCADE_ROUNDS)
      assert.equal(new Set(questions.map(question => question.passage[0].id)).size, ARCADE_ROUNDS)
      for (const question of questions) {
        assert.ok(isArcadeCorrect(question, question.answer), `${mode} seed ${seed}`)
        assert.ok(!isArcadeCorrect(question, []))
        assert.ok(!isArcadeCorrect(question, ['not-an-answer']))
        assert.equal(
          new Set(question.choices.map(choice => choice.id)).size,
          question.choices.length
        )
        assert.ok(question.hint.length > 0)
        assert.ok(question.explanation.length > 0)
        question.passage.forEach(verse => {
          assert.deepEqual(
            verse,
            verses.find(item => item.id === verse.id)
          )
          assert.ok([6, 8].includes(words(verse.text).length))
        })
        assert.ok(question.masteryIds.every(id => question.passage.some(verse => verse.id === id)))
        if (!['typed-word', 'recall'].includes(mode))
          question.answer.forEach(id =>
            assert.ok(question.choices.some(choice => choice.id === id))
          )
      }
    }
  }
})

test('word ordering accepts interchangeable repeated words but rejects reused chips', () => {
  const question = createArcadeQuestions('word-order', 'tokens')[0]
  question.choices = [
    { id: '0', text: 'người' },
    { id: '1', text: 'người' },
    { id: '2', text: 'đi' },
  ]
  question.answer = ['0', '1', '2']
  assert.ok(isArcadeCorrect(question, ['1', '0', '2']))
  assert.ok(!isArcadeCorrect(question, ['0', '0', '2']))
  assert.ok(!isArcadeCorrect(question, ['2', '1', '0']))
})

test('typed memory accepts NFC, NFD, no accents, case and punctuation, but not missing words', () => {
  for (const mode of ['typed-word', 'recall'] as const) {
    const question = createArcadeQuestions(mode, 'typed')[0]
    const answer = question.answer[0]
    assert.ok(isArcadeCorrect(question, [answer.normalize('NFD')]))
    assert.ok(isArcadeCorrect(question, [` ${normalizeArcadeAnswer(answer).toUpperCase()}! `]))
    assert.ok(!isArcadeCorrect(question, [`${answer} thêm`]))
    assert.ok(!isArcadeCorrect(question, ['']))
  }
})

test('every mechanic reconstructs or tests the correct part of its source', () => {
  for (let seed = 0; seed < 15; seed++) {
    for (const mode of modes) {
      for (const question of createArcadeQuestions(mode, String(seed))) {
        const source = question.passage[0].text
        if (mode === 'word-order') {
          assert.equal(
            question.answer
              .map(id => question.choices.find(choice => choice.id === id)!.text)
              .join(' '),
            words(source).join(' ')
          )
          assert.notDeepEqual(
            question.choices.map(choice => choice.text),
            words(source)
          )
        }
        if (mode === 'double-blank') {
          assert.equal(
            question.prompt
              .replace('① _____', question.answer[0])
              .replace('② _____', question.answer[1]),
            source
          )
          assert.equal(
            new Set(question.choices.map(choice => choice.text.toLocaleLowerCase('vi'))).size,
            question.choices.length
          )
          assert.ok(!isArcadeCorrect(question, [...question.answer].reverse()))
        }
        if (mode === 'typed-word')
          assert.equal(question.prompt.replace('_____', question.answer[0]), source)
        if (mode === 'previous-verse') {
          assert.equal(question.prompt, question.passage[1].text)
          assert.equal(question.answer[0], source)
        }
        if (mode === 'true-verse')
          assert.equal(question.prompt === source, question.answer[0] === 'original')
        if (mode === 'syllable-count')
          assert.equal(Number(question.answer[0]), words(question.prompt).length)
        if (mode === 'changed-word') {
          const differences = question.choices.flatMap((choice, index) =>
            choice.text !== words(source)[index] ? [String(index)] : []
          )
          assert.deepEqual(differences, question.answer)
        }
        if (mode === 'initials') {
          const initials = (text: string) =>
            words(text)
              .map(word => word[0].toLocaleUpperCase('vi'))
              .join(' · ')
          assert.equal(question.prompt, initials(source))
          assert.equal(
            question.choices.filter(choice => initials(choice.text) === question.prompt).length,
            1
          )
        }
        if (mode === 'pair-match') {
          assert.equal(question.left?.length, 3)
          assert.equal(new Set(question.choices.map(choice => choice.text)).size, 3)
          question.answer.forEach((id, index) =>
            assert.equal(Number(id), question.passage[index * 2 + 1].id)
          )
          assert.ok(!isArcadeCorrect(question, [...question.answer].reverse()))
        }
        if (mode === 'recall') assert.equal(question.memory, source)
      }
    }
  }
})

test('mode guards and result descriptions handle invalid routes and skips', () => {
  assert.ok(isArcadeMode('recall'))
  assert.ok(!isArcadeMode('constructor'))
  assert.ok(!isArcadeMode('missing'))
  const question = createArcadeQuestions('changed-word', 'description')[0]
  assert.equal(arcadeAnswerText(question, []), 'Đã bỏ qua')
  assert.equal(arcadeAnswerText(question, ['']), 'Đã bỏ qua')
  assert.ok(arcadeAnswerText(question, question.answer).length)
  assert.equal(arcadeRank(5, 5, 0), 'Tri âm trọn vẹn')
  assert.notEqual(arcadeRank(5, 5, 1), 'Tri âm trọn vẹn')
})
