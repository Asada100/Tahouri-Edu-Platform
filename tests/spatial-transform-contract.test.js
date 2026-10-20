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

console.log('Spatial transform task contract: 14 checks passed.');
