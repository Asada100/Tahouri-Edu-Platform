'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const emitted = [];
const registered = {};
const context = {
  console: { log() {}, warn() {}, error() {} },
  Math, Number, String, Object, Array, Set, JSON,
  EventManager: { emit(name, payload) { emitted.push({ name, payload }); } },
  PuzzleTypeRegistry: {
    register(type, handler) { registered[type] = handler; return true; }
  }
};
context.window = context;

for (const path of [
  'engine/activity/puzzleTypes/patternPuzzle.js',
  'engine/activity/puzzleTypes/spatialPuzzle.js'
]) {
  vm.runInNewContext(fs.readFileSync(path, 'utf8'), context, { filename: path });
}

function makeEngine() {
  return {
    puzzle: null,
    items: [],
    userAnswer: null,
    moves: 0,
    detectDataType(values) {
      return values.every(value => typeof value === 'number') ? 'number' : 'text';
    },
    emitStarted() { emitted.push({ name: 'puzzleStarted' }); },
    getState() {
      return {
        type: this.puzzle && this.puzzle.type,
        mode: this.puzzle && this.puzzle.mode,
        grid: this.puzzle && this.puzzle.grid ? { ...this.puzzle.grid } : null,
        axis: this.puzzle && this.puzzle.axis,
        items: [...this.items],
        placements: this.puzzle && this.puzzle.placements ? { ...this.puzzle.placements } : {},
        pieces: this.puzzle && this.puzzle.pieces ? [...this.puzzle.pieces] : []
      };
    },
    valuesEqual(a, b) { return a === b; },
    finish() { this.finished = true; return true; },
    emitWrong() { this.wrong = (this.wrong || 0) + 1; }
  };
}

assert.ok(registered.pattern, 'Pattern handler registers');
assert.ok(registered.spatial, 'Spatial handler registers');

// Pattern: valid setup, answer replacement, correct/wrong evaluation and invalid data.
{
  const engine = makeEngine();
  const handler = registered.pattern;
  const state = handler.start(engine, {
    items: [2, 4, 2, 4, 2, null],
    missingIndex: 5,
    answer: 4,
    options: [2, 4, 6, 8]
  });
  assert.equal(state.type, 'pattern');
  assert.equal(engine.puzzle.dataType, 'number');
  assert.equal(handler.setAnswer(engine, 4), true);
  assert.equal(engine.items[5], 4);
  assert.equal(handler.check(engine), true);
  assert.equal(engine.finished, true);

  const wrongEngine = makeEngine();
  handler.start(wrongEngine, { items: [1, null, 1], missingIndex: 1, answer: 2 });
  handler.setAnswer(wrongEngine, 3);
  assert.equal(handler.check(wrongEngine), false);
  assert.equal(wrongEngine.wrong, 1);
  assert.equal(handler.start(makeEngine(), { items: [1, 2], missingIndex: 4, answer: 3 }), null);
  assert.equal(handler.start(makeEngine(), { items: [1, null], missingIndex: 1 }), null);

  const textEngine = makeEngine();
  handler.start(textEngine, { items: ['روشن', null, 'روشن'], missingIndex: 1, answer: 'روشن‌تر' });
  assert.equal(textEngine.puzzle.dataType, 'text');
  assert.equal(handler.setAnswer(textEngine, 'روشن‌تر'), true);
  assert.equal(handler.check(textEngine), true, 'string-valued patterns can be checked');
}

// Spatial Place: placements remain editable, invalid moves are rejected, completion checks targets.
{
  const engine = makeEngine();
  const handler = registered.spatial;
  const started = handler.start(engine, {
    type: 'spatial',
    mode: 'place',
    grid: { rows: 2, cols: 2 },
    pieces: [
      { id: 'a', label: 'A', target: { row: 0, col: 0 } },
      { id: 'b', label: 'B', target: { row: 1, col: 1 } }
    ]
  });
  assert.equal(started.mode, 'place');
  assert.equal(handler.setAnswer(engine, { pieceId: 'a', row: 0, col: 0 }), true);
  assert.equal(handler.setAnswer(engine, { pieceId: 'b', row: 1, col: 1 }), true);
  assert.equal(handler.check(engine), true);
  assert.equal(engine.finished, true);

  const invalidEngine = makeEngine();
  handler.start(invalidEngine, {
    mode: 'place',
    grid: { rows: 2, cols: 2 },
    pieces: [{ id: 'a', target: { row: 0, col: 0 } }]
  });
  assert.equal(handler.setAnswer(invalidEngine, { pieceId: 'missing', row: 0, col: 0 }), false);
  assert.equal(handler.setAnswer(invalidEngine, { pieceId: 'a', row: 2, col: 0 }), false);
  assert.equal(handler.check(invalidEngine), false, 'cannot finish before a user move');

  const swapEngine = makeEngine();
  handler.start(swapEngine, {
    mode: 'place',
    grid: { rows: 2, cols: 2 },
    pieces: [
      { id: 'left', target: { row: 0, col: 0 } },
      { id: 'right', target: { row: 1, col: 1 } }
    ]
  });
  handler.setAnswer(swapEngine, { pieceId: 'left', row: 0, col: 0 });
  handler.setAnswer(swapEngine, { pieceId: 'right', row: 1, col: 1 });
  handler.setAnswer(swapEngine, { pieceId: 'left', row: 1, col: 1 });
  assert.equal(swapEngine.puzzle.placements.left.row, 1);
  assert.equal(swapEngine.puzzle.placements.right.row, 0);
  assert.equal(handler.check(swapEngine), false, 'swapping pieces must update ownership rather than duplicate a placement');
  handler.setAnswer(swapEngine, { pieceId: 'left', row: 0, col: 0 });
  assert.equal(handler.check(swapEngine), true, 'pieces can be moved back to the correct targets');

  const duplicateTargetEngine = makeEngine();
  assert.equal(handler.start(duplicateTargetEngine, {
    mode: 'place',
    grid: { rows: 2, cols: 2 },
    pieces: [
      { id: 'one', target: { row: 0, col: 0 } },
      { id: 'two', target: { row: 0, col: 0 } }
    ]
  }), null, 'duplicate target cells are rejected');

  assert.equal(handler.start(makeEngine(), {
    mode: 'place',
    grid: { rows: 0, cols: 2 },
    pieces: [{ id: 'out-of-grid', target: { row: 0, col: 0 } }]
  }), null, 'targets outside an invalid grid are rejected');

  const duplicateIdEngine = makeEngine();
  assert.equal(handler.start(duplicateIdEngine, {
    mode: 'place',
    grid: { rows: 2, cols: 2 },
    pieces: [
      { id: 'duplicate', target: { row: 0, col: 0 } },
      { id: 'duplicate', target: { row: 1, col: 1 } }
    ]
  }), null, 'duplicate piece IDs are rejected before they can block completion');
}

// Spatial Symmetry: generated pieces must mirror across the selected axis and remain inside the grid.
for (const axis of ['vertical', 'horizontal']) {
  for (let attempt = 0; attempt < 25; attempt++) {
    const engine = makeEngine();
    const handler = registered.spatial;
    const state = handler.start(engine, {
      mode: 'symmetry',
      grade: 'grade6',
      generator: { axis, difficulty: 'medium' }
    });
    assert.ok(state, 'generated symmetry activity starts');
    assert.equal(state.mode, 'symmetry');
    for (const piece of state.pieces) {
      assert.ok(piece.source.row >= 0 && piece.source.row < state.grid.rows);
      assert.ok(piece.source.col >= 0 && piece.source.col < state.grid.cols);
      assert.ok(piece.target.row >= 0 && piece.target.row < state.grid.rows);
      assert.ok(piece.target.col >= 0 && piece.target.col < state.grid.cols);
      if (axis === 'vertical') {
        assert.equal(piece.target.row, piece.source.row);
        assert.equal(piece.target.col, state.grid.cols - 1 - piece.source.col);
      } else {
        assert.equal(piece.target.col, piece.source.col);
        assert.equal(piece.target.row, state.grid.rows - 1 - piece.source.row);
      }
    }
  }
}



// PuzzleEngine integration: exercise the real engine lifecycle through multiple questions.
(async function runPuzzleEngineLifecycleIntegration() {
  const lifecycleEvents = [];
  const scores = { score: 0, correct: 0, wrong: 0,
    reset() { this.score = 0; this.correct = 0; this.wrong = 0; },
    addCorrect() { this.correct++; this.score += 10; },
    addWrong() { this.wrong++; }
  };
  context.ScoreManager = scores;
  context.ActivityResult = { create(result) { return result; } };
  context.setTimeout = callback => { callback(); return 1; };
  context.EventManager = {
    emit(name, payload) {
      emitted.push({ name, payload });
      lifecycleEvents.push({ name, payload });
    }
  };
  vm.runInNewContext(
    fs.readFileSync('engine/activity/puzzleEngine.js', 'utf8'),
    context,
    { filename: 'engine/activity/puzzleEngine.js' }
  );

  const engine = context.PuzzleEngine;
  const activity = {
    id: 'pattern-spatial-lifecycle-test',
    title: 'Lifecycle test',
    puzzle: {
      questions: [
        { type: 'pattern', items: [2, null, 2], missingIndex: 1, answer: 2 },
        { type: 'spatial', mode: 'place', grid: { rows: 2, cols: 2 }, pieces: [
          { id: 'one', label: '1', target: { row: 0, col: 0 } }
        ] }
      ]
    }
  };

  const first = await engine.start(activity);
  assert.equal(first.type, 'pattern');
  assert.equal(engine.state.started, true);
  assert.equal(scores.correct, 0);
  assert.equal(engine.finish(), false, 'completion is rejected outside check()');

  engine.setTypeAnswer(2);
  assert.equal(engine.check(), true, 'correct Pattern answer advances the lifecycle');
  assert.equal(engine.currentQuestion, 1);
  assert.equal(engine.puzzle.type, 'spatial');
  assert.equal(lifecycleEvents.filter(event => event.name === 'activityReady').length, 1,
    'the next question publishes activityReady');

  engine.setTypeAnswer({ pieceId: 'one', row: 0, col: 0 });
  assert.equal(engine.check(), true, 'correct Spatial placement completes the activity');
  assert.equal(engine.state.isFinished, true);
  assert.equal(scores.correct, 2);
  assert.equal(scores.wrong, 0);

  const resultEvents = lifecycleEvents.filter(event =>
    event.name === 'activityFinished' || event.name === 'puzzleFinished');
  assert.equal(resultEvents.length, 2, 'completion emits each final event exactly once');
  const result = resultEvents.find(event => event.name === 'activityFinished').payload;
  assert.equal(result.totalQuestions, 2);
  assert.equal(result.correctAnswers, 2);
  assert.equal(result.percentage, 100);
  assert.equal(result.score, 20);
  assert.equal(engine.check(), false, 'finished activity cannot complete again');
  assert.equal(lifecycleEvents.filter(event => event.name === 'activityFinished').length, 1);
  console.log('Pattern and Spatial handler + PuzzleEngine lifecycle regression checks passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
