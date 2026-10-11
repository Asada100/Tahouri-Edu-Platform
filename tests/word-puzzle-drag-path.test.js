'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const emitted = [];
const context = {
  console: { log() {}, warn() {}, error() {} },
  Math, Number, String, Object, Array, Set, JSON
};
context.window = context;
context.EventManager = { emit(name, payload) { emitted.push({ name, payload }); } };
context.ActivityResult = { create(result) { return result; } };

for (const path of [
  'engine/wordPuzzle/wordRepository.js',
  'engine/wordPuzzle/pathEngine.js',
  'engine/wordPuzzle/difficultyEngine.js',
  'engine/wordPuzzle/hintEngine.js',
  'engine/wordPuzzle/scoreEngine.js',
  'engine/wordPuzzle/wordPuzzleValidator.js',
  'engine/wordPuzzle/wordPuzzleEngine.js'
]) {
  vm.runInNewContext(fs.readFileSync(path, 'utf8'), context, { filename: path });
}

const activity = {
  id: 'word-puzzle-drag-test',
  settings: { rounds: 1, modes: ['wordBuilder'], difficulty: 2 },
  puzzle: {
    words: [
      { word: 'مدرسه', clue: 'محل آموزش' },
      { word: 'کتاب', clue: 'چیزی برای خواندن' },
      { word: 'دانش', clue: 'آگاهی' }
    ],
    families: [{ base: 'علم', members: ['عالم', 'علوم'] }]
  }
};

let state = context.WordPuzzleEngine.start(activity);
assert.equal(state.data.type, 'wordBuilder');
assert.equal(state.data.grid.length, 4);
assert.equal(state.data.grid.every(row => row.length === 4), true);
assert.equal(state.data.path.length, [...state.data.word].length);
assert.equal(context.WordPuzzlePathEngine.valid(state.data.grid, state.data.path), true);
assert.equal(context.WordPuzzlePathEngine.read(state.data.grid, state.data.path), state.data.word);

const correct = context.WordPuzzleEngine.submitBuilder(
  context.WordPuzzlePathEngine.read(state.data.grid, state.data.path)
);
assert.equal(correct.correct, true, 'tracing the generated answer path must accept the word');
assert.equal(correct.finished, true);
assert.equal(correct.percentage, 100);

state = context.WordPuzzleEngine.start({
  ...activity,
  settings: { rounds: 1, modes: ['wordSearch'], difficulty: 2 }
});
assert.equal(state.data.type, 'wordSearch');
assert.ok(state.data.placements.length > 0);
const placement = state.data.placements[0];
assert.equal(context.WordPuzzlePathEngine.valid(state.data.grid, placement.path), true);
assert.equal(context.WordPuzzlePathEngine.straight(placement.path), true);
assert.equal(
  context.WordPuzzlePathEngine.read(state.data.grid, placement.path),
  placement.word
);
const found = context.WordPuzzleEngine.submitSearch(placement.path);
assert.equal(found.correct, true, 'dragging along a placed word must accept it');

state = context.WordPuzzleEngine.start({
  ...activity,
  settings: { rounds: 1, modes: ['lPath'], difficulty: 2 }
});
assert.equal(state.data.type, 'lPath');
assert.equal(context.WordPuzzlePathEngine.valid(state.data.grid, state.data.path), true);
assert.equal(context.WordPuzzlePathEngine.isL(state.data.path), true);
assert.equal(context.WordPuzzlePathEngine.read(state.data.grid, state.data.path), state.data.word);

const screen = fs.readFileSync('engine/ui/wordPuzzleScreen.js', 'utf8');
assert.match(screen, /pointerdown/);
assert.match(screen, /pointermove/);
assert.match(screen, /elementFromPoint/);
assert.match(screen, /answer\.textContent=value/);

console.log('Word Puzzle drag-path regression checks passed');
