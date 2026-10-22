'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const registered = {};
const context = {
  console: { log() {}, warn() {}, error() {} },
  Math, Number, String, Object, Array, Set, JSON,
  EventManager: { emit() {} },
  PuzzleTypeRegistry: {
    register(type, handler) { registered[type] = handler; return true; }
  }
};
context.window = context;
vm.runInNewContext(
  fs.readFileSync('engine/activity/puzzleTypes/geometryTransforms.js', 'utf8'),
  context,
  { filename: 'engine/activity/puzzleTypes/geometryTransforms.js' }
);
vm.runInNewContext(
  fs.readFileSync('engine/activity/puzzleTypes/spatialPuzzle.js', 'utf8'),
  context,
  { filename: 'engine/activity/puzzleTypes/spatialPuzzle.js' }
);

const handler = registered.spatial;
assert.ok(handler, 'spatial handler registers');
const base = {
  type: 'spatial',
  mode: 'transform',
  coordinateSystem: { xMin: -5, xMax: 5, yMin: -5, yMax: 5, unitStep: 1 },
  operation: { kind: 'translate', dx: 2, dy: -1 },
  points: [{ x: -1, y: 2 }, { x: 1, y: 2 }],
  targetPoints: [{ x: 1, y: 1 }, { x: 3, y: 1 }]
};

assert.deepEqual(JSON.parse(JSON.stringify(handler.validateTransformPuzzleData(base))), {
  valid: true, reason: null
}, 'valid translation task is accepted');

const validOperations = [
  { kind: 'rotate', center: { x: 0, y: 0 }, degrees: 90 },
  { kind: 'reflectLine', lineStart: { x: 0, y: -5 }, lineEnd: { x: 0, y: 5 } },
  { kind: 'reflectPoint', center: { x: 0, y: 0 } }
];
for (const operation of validOperations) {
  assert.equal(handler.validateTransformPuzzleData({ ...base, operation }).valid, true,
    operation.kind + ' operation is accepted');
}

const invalidCases = [
  [{ ...base, mode: 'place' }, 'wrong mode rejected'],
  [{ ...base, operation: { kind: 'unknown' } }, 'unknown operation rejected'],
  [{ ...base, points: [] }, 'empty source shape rejected'],
  [{ ...base, targetPoints: [{ x: 1, y: 1 }] }, 'mismatched source/target point counts rejected'],
  [{ ...base, points: [{ x: 99, y: 0 }] }, 'out-of-bounds source point rejected'],
  [{ ...base, targetPoints: [{ x: 0, y: Infinity }, { x: 3, y: 1 }] }, 'non-finite target rejected'],
  [{ ...base, operation: { kind: 'translate', dx: NaN, dy: 1 } }, 'invalid translation rejected'],
  [{ ...base, operation: { kind: 'rotate', center: { x: 0, y: 0 }, degrees: Infinity } }, 'invalid angle rejected'],
  [{ ...base, operation: { kind: 'reflectLine', lineStart: { x: 1, y: 1 }, lineEnd: { x: 1, y: 1 } } }, 'zero-length reflection line rejected'],
  [{ ...base, operation: { kind: 'reflectPoint', center: { x: 20, y: 0 } } }, 'out-of-bounds reflection center rejected']
];
for (const [data, label] of invalidCases) {
  assert.equal(handler.validateTransformPuzzleData(data).valid, false, label);
}

const engine = {
  puzzle: null, items: [], userAnswer: null, moves: 0,
  emitStarted() {},
  emitChanged() { return true; },
  emitWrong() { this.wrong = (this.wrong || 0) + 1; return false; },
  finish() { this.finished = true; return true; },
  getState() { return { type: this.puzzle.type, mode: this.puzzle.mode }; }
};
assert.ok(handler.start(engine, base), 'valid transform activity starts');
assert.equal(engine.puzzle.mode, 'transform');
assert.equal(handler.setAnswer(engine, { index: 0, x: 1, y: 1 }), true,
  'first transformed point can be placed');
assert.equal(handler.check(engine), false, 'cannot check until every output point is placed');
assert.equal(engine.finished, undefined);
assert.equal(handler.setAnswer(engine, { index: 1, x: 3, y: 1 }), true,
  'second transformed point can be placed');
assert.equal(handler.check(engine), true, 'correct transformed shape finishes');
assert.equal(engine.finished, true);

const wrongEngine = {
  ...engine, puzzle: null, items: [], userAnswer: null, moves: 0,
  finished: false, wrong: 0,
  emitStarted() {}, emitChanged() { return true; },
  emitWrong() { this.wrong++; }, finish() { this.finished = true; },
  getState() { return { type: this.puzzle.type, mode: this.puzzle.mode }; }
};
assert.ok(handler.start(wrongEngine, base), 'wrong-answer test starts');
handler.setAnswer(wrongEngine, { index: 0, x: 0, y: 0 });
handler.setAnswer(wrongEngine, { index: 1, x: 3, y: 1 });
assert.equal(handler.check(wrongEngine), false, 'incorrect transformed point is rejected');
assert.equal(wrongEngine.wrong, 1);
assert.equal(wrongEngine.finished, false, 'incorrect answer remains retryable');

const registry = JSON.parse(fs.readFileSync('data/activities.json', 'utf8'));
const activityEntry = registry.find(item => item.id === 'mathGeometryTransforms');
assert.ok(activityEntry, 'Grade 6 transform activity is registered');
const activity = JSON.parse(fs.readFileSync(activityEntry.path + '/activity.json', 'utf8'));
assert.equal(activity.id, activityEntry.id);
assert.equal(activity.puzzle.mode, 'transform');
assert.equal(activity.puzzle.questions.length, 4, 'activity covers all four transform types');
for (const question of activity.puzzle.questions) {
  assert.equal(handler.validateTransformPuzzleData(question).valid, true,
    question.operation.kind + ' content passes the transform data contract');
  const questionEngine = {
    puzzle: null, items: [], userAnswer: null, moves: 0,
    emitStarted() {}, emitChanged() { return true; }, emitWrong() {},
    finish() { this.finished = true; return true; },
    getState() { return { type: this.puzzle.type, mode: this.puzzle.mode }; }
  };
  assert.ok(handler.start(questionEngine, question),
    question.operation.kind + ' activity question initializes');
}
assert.ok(context.SharedGeometryTransforms, 'shared geometry helper is loaded for gameplay');
console.log('Spatial transform contract and gameplay checks passed.');
