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
    register(type, handler) { registered[type] = handler; return true; },
    get(type) { return registered[type]; }
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
    emitChanged() { emitted.push({ name: 'puzzleChanged', payload: this.getState() }); return true; },
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
  let transitionCheckAttempted = false;
  let transitionCheckResult = null;
  let engineUnderTest = null;
  const scores = { score: 0, correct: 0, wrong: 0,
    reset() { this.score = 0; this.correct = 0; this.wrong = 0; },
    addCorrect() { this.correct++; this.score += 10; },
    addWrong() { this.wrong++; }
  };
  context.ScoreManager = scores;
  context.QuestionProvider = { async getPuzzleQuestions() { return []; } };
  context.ActivityResult = { create(result) { return result; } };
  context.setTimeout = callback => { callback(); return 1; };
  context.EventManager = {
    emit(name, payload) {
      emitted.push({ name, payload });
      lifecycleEvents.push({ name, payload });
      if (name === 'activityReady' && engineUnderTest && !transitionCheckAttempted) {
        transitionCheckAttempted = true;
        transitionCheckResult = engineUnderTest.check();
      }
    }
  };
  vm.runInNewContext(
    fs.readFileSync('engine/activity/puzzleEngine.js', 'utf8'),
    context,
    { filename: 'engine/activity/puzzleEngine.js' }
  );

  const engine = context.PuzzleEngine;
  engineUnderTest = engine;
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

  engine.setTypeAnswer(9);
  assert.equal(engine.check(), false, 'incorrect Pattern answer does not advance');
  assert.equal(engine.currentQuestion, 0, 'incorrect Pattern answer keeps the current question');
  assert.equal(scores.wrong, 1, 'incorrect Pattern answer is counted once');

  engine.setTypeAnswer(2);
  assert.equal(engine.check(), true, 'correct Pattern answer advances the lifecycle');
  assert.equal(engine.currentQuestion, 1);
  assert.equal(engine.puzzle.type, 'spatial');
  assert.equal(transitionCheckAttempted, true);
  assert.equal(transitionCheckResult, false, 'checks triggered during question transition are ignored');
  assert.equal(scores.correct, 1, 'transition-time checks cannot award a second point');
  assert.equal(scores.wrong, 1, 'transition-time checks cannot register a stale wrong answer');
  assert.equal(lifecycleEvents.filter(event => event.name === 'activityReady').length, 1,
    'the next question publishes activityReady');

  engine.setTypeAnswer({ pieceId: 'one', row: 1, col: 1 });
  assert.equal(engine.check(), false, 'incorrect Spatial placement does not complete');
  assert.equal(engine.currentQuestion, 1, 'incorrect Spatial placement keeps the current question');
  assert.equal(scores.wrong, 2, 'incorrect Spatial placement is counted once');

  engine.setTypeAnswer({ pieceId: 'one', row: 0, col: 0 });
  assert.equal(engine.check(), true, 'correct Spatial placement completes the activity');
  assert.equal(engine.state.isFinished, true);
  assert.equal(scores.correct, 2);
  assert.equal(scores.wrong, 2);

  const resultEvents = lifecycleEvents.filter(event =>
    event.name === 'activityFinished' || event.name === 'puzzleFinished');
  assert.equal(resultEvents.length, 2, 'completion emits each final event exactly once');
  const result = resultEvents.find(event => event.name === 'activityFinished').payload;
  assert.equal(result.totalQuestions, 2);
  assert.equal(result.correctAnswers, 2);
  assert.equal(result.wrongAnswers, 2, 'final result includes wrong attempts');
  assert.equal(result.percentage, 100, 'percentage reflects completed correct questions');
  assert.equal(result.score, 20);
  assert.equal(engine.check(), false, 'finished activity cannot complete again');
  const scoreAfterFinish = scores.score;
  const wrongAfterFinish = scores.wrong;
  const wrongEventsAfterFinish = lifecycleEvents.filter(event => event.name === 'puzzleWrong').length;
  assert.equal(engine.emitWrong(), false, 'late wrong-answer events are rejected after completion');
  assert.equal(scores.score, scoreAfterFinish, 'late wrong-answer events cannot change final score');
  assert.equal(scores.wrong, wrongAfterFinish, 'late wrong-answer events cannot change wrong-answer count');
  assert.equal(lifecycleEvents.filter(event => event.name === 'puzzleWrong').length, wrongEventsAfterFinish,
    'late wrong-answer events are not published');

  assert.equal(lifecycleEvents.filter(event => event.name === 'activityFinished').length, 1);

  // Restarting must create a clean run with no state or score leakage.
  const secondActivity = {
    id: 'pattern-spatial-restart-test',
    title: 'Restart test',
    puzzle: { questions: [
      { type: 'pattern', items: [1, null, 1], missingIndex: 1, answer: 1 }
    ] }
  };
  const second = await engine.start(secondActivity);
  assert.equal(second.type, 'pattern');
  assert.equal(engine.activity.id, secondActivity.id);
  assert.equal(engine.currentQuestion, 0);
  assert.equal(engine.state.started, true);
  assert.equal(engine.state.isFinished, false);
  assert.equal(engine.transitioning, false);
  assert.equal(engine.checking, false);
  assert.equal(engine.moves, 0);
  assert.equal(engine.userAnswer, null);
  assert.equal(scores.score, 0, 'new activity clears the previous score');
  assert.equal(scores.correct, 0, 'new activity clears previous correct answers');
  assert.equal(scores.wrong, 0, 'new activity clears previous wrong answers');
  assert.equal(engine.questions.length, 1);
  assert.equal(engine.puzzle.type, 'pattern');

  engine.setTypeAnswer(1);
  assert.equal(engine.check(), true);
  assert.equal(scores.score, 10);
  assert.equal(scores.correct, 1);
  assert.equal(engine.state.isFinished, true);

  engine.reset();
  assert.equal(engine.state.started, false);
  assert.equal(engine.state.isFinished, false);
  assert.equal(engine.activity, null);
  assert.equal(engine.puzzle, null);
  assert.deepEqual(Array.from(engine.questions), []);
  assert.equal(engine.currentQuestion, 0);
  assert.deepEqual(Array.from(engine.items), []);
  assert.equal(engine.userAnswer, null);
  assert.equal(engine.moves, 0);
  assert.equal(engine.transitioning, false);
  assert.equal(engine.checking, false);
  assert.equal(scores.score, 0, 'reset clears score');
  assert.equal(scores.correct, 0, 'reset clears correct count');
  assert.equal(scores.wrong, 0, 'reset clears wrong count');
  const eventsAfterReset = lifecycleEvents.length;
  assert.equal(engine.setOrder([3, 2, 1]), false, 'ordering input is rejected after reset');
  assert.equal(engine.setSequenceAnswer(4), false, 'sequence input is rejected after reset');
  assert.equal(engine.setVisualMathAnswer(4), false, 'visual math input is rejected after reset');
  assert.equal(engine.setGenericAnswer(4), false, 'generic input is rejected after reset');
  assert.equal(engine.setTypeAnswer(4), false, 'typed input is rejected after reset');
  assert.equal(engine.setCell(0, 4), false, 'cell input is rejected after reset');
  assert.equal(engine.setCells([4]), false, 'bulk cell input is rejected after reset');
  assert.equal(engine.check(), false, 'answer check is rejected after reset');
  assert.equal(engine.moves, 0, 'rejected input cannot change move count');
  assert.equal(engine.userAnswer, null, 'rejected input cannot set an answer');
  assert.equal(lifecycleEvents.length, eventsAfterReset, 'rejected input emits no puzzle events');
  assert.equal(scores.score, 0, 'rejected input cannot change score');


  // Even a failed start must not leak the previous run's score.
  scores.score = 70;
  scores.correct = 7;
  scores.wrong = 3;
  const failed = await engine.start({
    id: 'invalid-restart-test',
    puzzle: { questions: [] }
  });
  assert.equal(failed, null);
  assert.equal(scores.score, 0);
  assert.equal(scores.correct, 0);
  assert.equal(scores.wrong, 0);
  assert.equal(engine.currentQuestion, 0);
  assert.equal(engine.moves, 0);
  assert.equal(engine.userAnswer, null);
  assert.equal(engine.state.started, false);
  assert.equal(engine.state.isFinished, false);

  const startedEventsBeforeInvalidHandler = lifecycleEvents.filter(event => event.name === 'activityStarted').length;
  const invalidHandlerStart = await engine.start({
    id: 'unsupported-puzzle-test',
    puzzle: { questions: [{ type: 'notRegisteredPuzzleType' }] }
  });
  assert.equal(invalidHandlerStart, null);
  assert.equal(engine.state.started, false, 'failed initial handler leaves engine inactive');
  assert.equal(engine.state.isFinished, false);
  assert.equal(engine.activity, null, 'failed initial handler clears activity');
  assert.equal(engine.puzzle, null, 'failed initial handler clears puzzle');
  assert.deepEqual(Array.from(engine.questions), [], 'failed initial handler clears question list');
  assert.equal(engine.currentQuestion, 0);
  assert.deepEqual(Array.from(engine.items), []);
  assert.equal(engine.userAnswer, null);
  assert.equal(engine.moves, 0);
  assert.equal(engine.transitioning, false);
  assert.equal(engine.checking, false);
  assert.equal(scores.score, 0);
  assert.equal(scores.correct, 0);
  assert.equal(scores.wrong, 0);
  assert.equal(lifecycleEvents.filter(event => event.name === 'activityStarted').length,
    startedEventsBeforeInvalidHandler, 'failed start does not emit activityStarted');

  // A failed transition must abort cleanly rather than leave a half-active activity.
  const startedBeforeTransitionFailure = lifecycleEvents.filter(event => event.name === 'activityStarted').length;
  const finishedBeforeTransitionFailure = lifecycleEvents.filter(event => event.name === 'activityFinished').length;
  const failedTransitionActivity = {
    id: 'failed-transition-test',
    title: 'Failed transition test',
    puzzle: { questions: [
      { type: 'pattern', items: [3, null, 3], missingIndex: 1, answer: 3 },
      { type: 'notRegisteredPuzzleType' }
    ] }
  };
  const firstTransitionQuestion = await engine.start(failedTransitionActivity);
  assert.equal(firstTransitionQuestion.type, 'pattern');
  engine.setTypeAnswer(3);
  assert.equal(engine.check(), true, 'the submitted answer is correct even though advancing to the next question fails');
  assert.equal(engine.state.started, false, 'failed transition deactivates the engine');
  assert.equal(engine.state.isFinished, false, 'failed transition is not reported as completed');
  assert.equal(engine.activity, null);
  assert.equal(engine.puzzle, null);
  assert.deepEqual(Array.from(engine.questions), []);
  assert.equal(engine.currentQuestion, 0);
  assert.deepEqual(Array.from(engine.items), []);
  assert.equal(engine.userAnswer, null);
  assert.equal(engine.moves, 0);
  assert.equal(engine.transitioning, false);
  assert.equal(engine.checking, false);
  assert.equal(scores.score, 0, 'partial score is cleared after failed transition');
  assert.equal(scores.correct, 0);
  assert.equal(scores.wrong, 0);
  assert.equal(lifecycleEvents.filter(event => event.name === 'activityStarted').length,
    startedBeforeTransitionFailure + 1, 'only the initial start event is emitted');
  assert.equal(lifecycleEvents.filter(event => event.name === 'activityFinished').length,
    finishedBeforeTransitionFailure, 'incomplete activity does not emit a finished event');

  // Missing activity data must not leave the previous activity attached.
  const beforeMissingData = await engine.start({
    id: 'missing-data-cleanup-test',
    puzzle: { questions: [
      { type: 'pattern', items: [4, null, 4], missingIndex: 1, answer: 4 }
    ] }
  });
  assert.equal(beforeMissingData.type, 'pattern');
  scores.score = 30;
  scores.correct = 3;
  const missingDataStart = await engine.start(null);
  assert.equal(missingDataStart, null);
  assert.equal(engine.state.started, false);
  assert.equal(engine.activity, null);
  assert.equal(engine.puzzle, null);
  assert.deepEqual(Array.from(engine.questions), []);
  assert.equal(engine.currentQuestion, 0);
  assert.equal(engine.transitioning, false);
  assert.equal(engine.checking, false);
  assert.equal(scores.score, 0);
  assert.equal(scores.correct, 0);
  assert.equal(scores.wrong, 0);

  // Provider exceptions must also leave no partial startup state.
  context.QuestionProvider = { async getPuzzleQuestions() { throw new Error('provider test failure'); } };
  scores.score = 20;
  scores.correct = 2;
  const providerFailure = await engine.start({ id: 'provider-failure-test', puzzle: { type: 'pattern' } });
  assert.equal(providerFailure, null);
  assert.equal(engine.state.started, false);
  assert.equal(engine.activity, null);
  assert.equal(engine.puzzle, null);
  assert.deepEqual(Array.from(engine.questions), []);
  assert.equal(engine.currentQuestion, 0);
  assert.equal(engine.transitioning, false);
  assert.equal(engine.checking, false);
  assert.equal(scores.score, 0);
  assert.equal(scores.correct, 0);
  assert.equal(scores.wrong, 0);

  // A slow, stale provider response must not overwrite a newer activity.
  let resolveStaleQuestions;
  context.QuestionProvider = {
    getPuzzleQuestions() {
      return new Promise(resolve => { resolveStaleQuestions = resolve; });
    }
  };
  const staleStartPromise = engine.start({
    id: 'stale-async-start',
    puzzle: { type: 'pattern' }
  });
  const newerActivity = {
    id: 'newer-file-activity',
    title: 'Newer activity',
    puzzle: { questions: [
      { type: 'pattern', items: [8, null, 8], missingIndex: 1, answer: 8 }
    ] }
  };
  const newerStart = await engine.start(newerActivity);
  assert.equal(newerStart.type, 'pattern');
  assert.equal(engine.activity.id, 'newer-file-activity');
  resolveStaleQuestions([
    { type: 'pattern', items: [2, null, 2], missingIndex: 1, answer: 2 }
  ]);
  assert.equal(await staleStartPromise, null, 'stale asynchronous start is discarded');
  assert.equal(engine.activity.id, 'newer-file-activity', 'stale response cannot replace the newer activity');
  assert.equal(engine.puzzle.answer, 8);
  assert.equal(engine.state.started, true);
  assert.equal(engine.state.isFinished, false);
  assert.equal(engine.currentQuestion, 0);
  assert.equal(scores.score, 0);
  assert.equal(scores.correct, 0);
  assert.equal(scores.wrong, 0);

  // PuzzleScreen must ignore stale ready events from another question or activity.
  context.EventManager.on = function () {};
  context.document = {
    getElementById() { return null; },
    createElement() { return { id: '', textContent: '' }; },
    head: { appendChild() {} }
  };
  vm.runInNewContext(fs.readFileSync('engine/ui/puzzleScreen.js', 'utf8'), context, {
    filename: 'engine/ui/puzzleScreen.js'
  });
  let renderedState = null;
  context.PuzzleScreen.show = state => { renderedState = state; };
  const currentReadyPayload = {
    activity: engine.activity,
    engine,
    engineName: 'PuzzleEngine',
    questionIndex: engine.currentQuestion,
    result: engine.getState()
  };
  context.PuzzleScreen.handleActivityReady(currentReadyPayload);
  assert.ok(renderedState, 'current activityReady event renders its question');
  renderedState = null;
  context.PuzzleScreen.handleActivityReady({
    ...currentReadyPayload,
    questionIndex: engine.currentQuestion + 1
  });
  assert.equal(renderedState, null, 'stale question ready event is ignored');
  context.PuzzleScreen.handleActivityReady({
    ...currentReadyPayload,
    activity: { id: 'old-activity' }
  });
  assert.equal(renderedState, null, 'ready event for a different activity is ignored');
  engine.reset();
  context.PuzzleScreen.handleActivityReady(currentReadyPayload);
  assert.equal(renderedState, null, 'ready event after reset is ignored');

  // A delayed transition callback from an old run must not unlock a newer run's transition.
  const originalSetTimeout = context.setTimeout;
  const delayedCallbacks = [];
  context.setTimeout = callback => { delayedCallbacks.push(callback); return delayedCallbacks.length; };
  const transitionActivity = id => ({
    id,
    title: id,
    puzzle: { questions: [
      { type: 'pattern', items: [1, null, 1], missingIndex: 1, answer: 1 },
      { type: 'pattern', items: [2, null, 2], missingIndex: 1, answer: 2 }
    ] }
  });
  await engine.start(transitionActivity('old-run'));
  engine.setTypeAnswer(1);
  assert.equal(engine.check(), true, 'old run begins a question transition');
  assert.equal(engine.transitioning, true);
  assert.equal(delayedCallbacks.length, 1);

  engine.reset();
  await engine.start(transitionActivity('new-run'));
  engine.setTypeAnswer(1);
  assert.equal(engine.check(), true, 'new run begins its own question transition');
  assert.equal(engine.transitioning, true);
  assert.equal(delayedCallbacks.length, 2);

  delayedCallbacks[0]();
  assert.equal(engine.transitioning, true,
    'stale callback from old run cannot clear the current transition lock');
  delayedCallbacks[1]();
  assert.equal(engine.transitioning, false, 'current callback releases its own transition lock');
  context.setTimeout = originalSetTimeout;

  // Duplicate finish calls in a single check must not award credit or skip questions twice.
  {
    const originalHandler = context.PuzzleTypeRegistry.get('pattern');
    context.PuzzleTypeRegistry.register('duplicateFinishRegression', {
      start(engine, puzzle) { engine.puzzle = { ...puzzle }; engine.items = []; return engine.puzzle; },
      check(engine) { engine.finish(); engine.finish(); return true; }
    });
    const duplicateFinishStart = lifecycleEvents.length;
    const duplicateFinishActivity = {
      id: 'duplicate-finish-regression',
      puzzle: { questions: [
        { type: 'duplicateFinishRegression', answer: 1 },
        { type: 'pattern', items: [2, null, 2], missingIndex: 1, answer: 2 }
      ] }
    };
    await engine.start(duplicateFinishActivity);
    assert.equal(engine.check(), true);
    assert.equal(scores.correct, 1, 'duplicate finish calls award credit only once');
    assert.equal(engine.currentQuestion, 1, 'duplicate finish calls cannot skip a question');
    assert.equal(engine.puzzle.type, 'pattern', 'the next question remains active');
    assert.equal(lifecycleEvents.slice(duplicateFinishStart).filter(event => event.name === 'puzzleFinished').length, 0,
      'a duplicate finish cannot end a multi-question activity early');
    context.PuzzleTypeRegistry.register('pattern', originalHandler);
  }

  // Restarting synchronously from puzzleFinished must suppress the old run's later finish event.
  const finishEventStart = lifecycleEvents.length;
  const previousEmit = context.EventManager.emit;
  let restartOnPuzzleFinished = true;
  const finishRestartActivity = {
    id: 'finish-event-restart-target',
    puzzle: { questions: [
      { type: 'pattern', items: [7, null, 7], missingIndex: 1, answer: 7 }
    ] }
  };
  context.EventManager.emit = function (name, payload) {
    previousEmit.call(this, name, payload);
    if (name === 'puzzleFinished' && restartOnPuzzleFinished) {
      restartOnPuzzleFinished = false;
      void engine.start(finishRestartActivity);
    }
  };
  await engine.start({
    id: 'finish-event-restart-source',
    puzzle: { questions: [
      { type: 'pattern', items: [6, null, 6], missingIndex: 1, answer: 6 }
    ] }
  });
  engine.setTypeAnswer(6);
  assert.equal(engine.check(), true, 'source activity completes and triggers a synchronous restart');
  assert.equal(engine.activity.id, 'finish-event-restart-target', 'new activity remains active');
  assert.equal(engine.state.started, true);
  assert.equal(engine.state.isFinished, false);
  const finishRestartEvents = lifecycleEvents.slice(finishEventStart);
  assert.equal(finishRestartEvents.filter(event =>
    event.name === 'puzzleFinished' && event.payload.activityId === 'finish-event-restart-source').length,
    1, 'source run publishes its initial puzzleFinished event');
  assert.equal(finishRestartEvents.filter(event =>
    event.name === 'activityFinished' && event.payload.activityId === 'finish-event-restart-source').length,
    0, 'source run cannot publish activityFinished after a listener starts a new run');
  context.EventManager.emit = previousEmit;

  // Restarting inside puzzleStarted must suppress activityPlaying from the old run.
  await engine.start({
    id: 'puzzle-started-restart-source',
    puzzle: { questions: [
      { type: 'pattern', items: [10, null, 10], missingIndex: 1, answer: 10 }
    ] }
  });
  const puzzleStartedEventIndex = lifecycleEvents.length;
  const activityPlayingCountBeforePuzzleStarted = lifecycleEvents.filter(event => event.name === 'activityPlaying').length;
  let restartOnPuzzleStarted = true;
  context.EventManager.emit = function (name, payload) {
    previousEmit.call(this, name, payload);
    if (name === 'puzzleStarted' && restartOnPuzzleStarted) {
      restartOnPuzzleStarted = false;
      void engine.start({
        id: 'puzzle-started-restart-target',
        puzzle: { questions: [
          { type: 'pattern', items: [11, null, 11], missingIndex: 1, answer: 11 }
        ] }
      });
    }
  };
  engine.emitStarted();
  assert.equal(engine.activity.id, 'puzzle-started-restart-target');
  assert.equal(lifecycleEvents.filter(event => event.name === 'activityPlaying').length,
    activityPlayingCountBeforePuzzleStarted + 2,
    'replacement run publishes its normal start events, but the superseded run adds no activityPlaying');
  assert.equal(lifecycleEvents.slice(puzzleStartedEventIndex).filter(event =>
    event.name === 'puzzleStarted').length, 2,
    'source and replacement puzzles each publish their own puzzleStarted event');
  context.EventManager.emit = previousEmit;

  // A synchronous puzzleChanged listener may replace the activity. The old edit must not
  // be reported as a successful edit against the newly active run.
  await engine.start({
    id: 'puzzle-changed-restart-source',
    puzzle: { questions: [
      { type: 'pattern', items: [12, null, 12], missingIndex: 1, answer: 12 }
    ] }
  });
  let restartOnPuzzleChanged = true;
  context.EventManager.emit = function (name, payload) {
    previousEmit.call(this, name, payload);
    if (name === 'puzzleChanged' && restartOnPuzzleChanged) {
      restartOnPuzzleChanged = false;
      void engine.start({
        id: 'puzzle-changed-restart-target',
        puzzle: { questions: [
          { type: 'pattern', items: [13, null, 13], missingIndex: 1, answer: 13 }
        ] }
      });
    }
  };
  assert.equal(engine.setTypeAnswer(12), false,
    'an answer edit is rejected as current if its change listener replaces the run');
  assert.equal(engine.activity.id, 'puzzle-changed-restart-target');
  assert.equal(engine.userAnswer, null, 'the superseded answer does not overwrite the replacement run');
  context.EventManager.emit = previousEmit;

  // A puzzleWrong listener can also restart synchronously; emitWrong must report the old
  // attempt as stale and leave the replacement activity untouched.
  await engine.start({
    id: 'puzzle-wrong-restart-source',
    puzzle: { questions: [
      { type: 'pattern', items: [14, null, 14], missingIndex: 1, answer: 14 }
    ] }
  });
  engine.setTypeAnswer(99);
  let restartOnPuzzleWrong = true;
  context.EventManager.emit = function (name, payload) {
    previousEmit.call(this, name, payload);
    if (name === 'puzzleWrong' && restartOnPuzzleWrong) {
      restartOnPuzzleWrong = false;
      void engine.start({
        id: 'puzzle-wrong-restart-target',
        puzzle: { questions: [
          { type: 'pattern', items: [15, null, 15], missingIndex: 1, answer: 15 }
        ] }
      });
    }
  };
  assert.equal(engine.check(), false, 'the superseded incorrect check does not pass');
  assert.equal(engine.activity.id, 'puzzle-wrong-restart-target');
  assert.equal(engine.userAnswer, null, 'the old incorrect answer does not leak into the replacement run');
  context.EventManager.emit = previousEmit;

  // Restarting from puzzleStarted while a transition initializes its next question must
  // suppress stale activityReady and must not let failed transition cleanup reset the new run.
  const readyRestartStart = lifecycleEvents.length;
  await engine.start({
    id: 'transition-ready-restart-source',
    puzzle: { questions: [
      { type: 'pattern', items: [20, null, 20], missingIndex: 1, answer: 20 },
      { type: 'pattern', items: [21, null, 21], missingIndex: 1, answer: 21 }
    ] }
  });
  const readyCountBeforeTransition = lifecycleEvents.filter(event =>
    event.name === 'activityReady' && event.payload?.activity?.id === 'transition-ready-restart-source').length;
  let restartDuringNextPuzzleStart = true;
  context.EventManager.emit = function (name, payload) {
    previousEmit.call(this, name, payload);
    if (name === 'puzzleStarted' && restartDuringNextPuzzleStart) {
      restartDuringNextPuzzleStart = false;
      void engine.start({
        id: 'transition-ready-restart-target',
        puzzle: { questions: [
          { type: 'pattern', items: [22, null, 22], missingIndex: 1, answer: 22 }
        ] }
      });
    }
  };
  engine.setTypeAnswer(20);
  assert.equal(engine.check(), true,
    'the answer was correct even though a listener superseded the transition');
  assert.equal(engine.activity.id, 'transition-ready-restart-target',
    'failed transition cleanup cannot reset the replacement activity');
  assert.equal(engine.state.started, true);
  assert.equal(engine.puzzle.answer, 22);
  assert.equal(lifecycleEvents.filter(event =>
    event.name === 'activityReady' && event.payload?.activity?.id === 'transition-ready-restart-source').length,
    readyCountBeforeTransition,
    'superseded source question does not publish a stale activityReady event');
  assert.equal(lifecycleEvents.slice(readyRestartStart).filter(event =>
    event.name === 'activityStarted' && event.payload?.id === 'transition-ready-restart-source').length,
    1, 'only the initial source start event is emitted');
  assert.equal(scores.score, 0, 'replacement run retains its clean score after stale transition');
  context.EventManager.emit = previousEmit;

  console.log('Pattern and Spatial handler + PuzzleEngine lifecycle/reset/failure regression checks passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
