'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const handlers = {};
const score = { correct: 0, wrong: 0, score: 0, reset() { this.correct = 0; this.wrong = 0; this.score = 0; }, addCorrect() { this.correct++; this.score += 10; }, addWrong() { this.wrong++; } };
const context = {
  console: { log() {}, warn() {}, error() {} },
  Math, Number, String, Object, Array, Set, JSON,
  setTimeout(callback) { callback(); },
  EventManager: { emit() {} },
  ScoreManager: score,
  ActivityResult: { create(value) { return value; } },
  QuestionProvider: { async getPuzzleQuestions() { return []; } },
  PuzzleTypeRegistry: { register(type, handler) { handlers[type] = handler; return true; }, get(type) { return handlers[type]; } }
};
context.window = context;

for (const path of [
  'engine/activity/puzzleTypes/geometryTransforms.js',
  'engine/activity/puzzleTypes/spatialPuzzle.js',
  'engine/activity/puzzleEngine.js'
]) {
  vm.runInNewContext(fs.readFileSync(path, 'utf8'), context, { filename: path });
}

(async () => {
  const registry = JSON.parse(fs.readFileSync('data/activities.json', 'utf8'));
  const entry = registry.find(item => item.id === 'mathGeometryTransforms');
  assert.ok(entry, 'transform activity is registered');
  const config = JSON.parse(fs.readFileSync(entry.path + '/activity.json', 'utf8'));
  const activity = { ...config, ...entry, puzzle: config.puzzle };

  const first = await context.PuzzleEngine.start(activity);
  assert.equal(first.mode, 'transform', 'PuzzleEngine starts the first transform question');
  assert.equal(context.PuzzleEngine.questions.length, 4, 'PuzzleEngine loads all four file-defined questions');

  for (let questionIndex = 0; questionIndex < config.puzzle.questions.length; questionIndex++) {
    const state = context.PuzzleEngine.getState();
    assert.equal(state.mode, 'transform', 'current question is routed to spatial transform renderer');
    const expected = context.PuzzleEngine.puzzle.targetPoints;
    expected.forEach((point, index) => {
      assert.equal(context.PuzzleEngine.setTypeAnswer({ index, x: point.x, y: point.y }), true,
        'answer point ' + index + ' is accepted for question ' + questionIndex);
    });
    context.PuzzleEngine.transitioning = false;
    assert.ok(context.PuzzleEngine.check(), 'correct answer is accepted for question ' + questionIndex);
    if (questionIndex < config.puzzle.questions.length - 1) {
      assert.equal(context.PuzzleEngine.currentQuestion, questionIndex + 1, 'correct answer advances to next question');
      context.PuzzleEngine.transitioning = false;
    }
  }

  assert.equal(context.PuzzleEngine.state.isFinished, true, 'last correct answer completes the activity');
  assert.equal(score.correct, 4, 'all four correct answers are scored');
  console.log('Spatial transform PuzzleEngine runtime flow passed.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
