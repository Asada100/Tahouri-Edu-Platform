#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const emittedEvents = [];
const silentConsole = { log() {}, warn() {}, error() {} };
const context = vm.createContext({
  console: silentConsole,
  window: {},
  EventManager: {
    emit(name, payload) {
      emittedEvents.push({ name, payload });
    }
  }
});

const runtimeFiles = [
  'engine/activity/activityResult.js',
  'engine/question/classificationProvider.js',
  'engine/activity/classificationTypes/classificationTypeRegistry.js',
  'engine/activity/classificationTypes/choiceClassification.js',
  'engine/activity/classificationTypes/multiStageClassification.js',
  'engine/activity/classificationEngine.js'
];

for (const relativePath of runtimeFiles) {
  const source = fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
  vm.runInContext(source, context, { filename: relativePath });
}

const engine = context.window.ClassificationEngine;
const provider = context.window.ClassificationProvider;
const checks = [];

function check(name, fn) {
  fn();
  checks.push(name);
}

function makeActivity({ allowRetry = true } = {}) {
  return {
    id: 'multi-stage-regression-fixture',
    settings: { allowRetry, scorePerCorrect: 10 },
    classification: {
      mode: 'multiStage',
      instruction: 'هر مرحله را کامل کن.',
      stages: [
        {
          id: 'first',
          mode: 'choice',
          categories: [{ id: 'a', title: 'الف' }, { id: 'b', title: 'ب' }],
          items: [
            { id: 'item-1', content: 'یک', categoryId: 'a' },
            { id: 'item-2', content: 'دو', categoryId: 'b' }
          ]
        },
        {
          id: 'second',
          mode: 'dragDrop',
          categories: [{ id: 'c', title: 'پ' }, { id: 'd', title: 'ت' }],
          items: [
            { id: 'item-3', content: 'سه', categoryId: 'c' },
            { id: 'item-4', content: 'چهار', categoryId: 'd' }
          ]
        }
      ]
    }
  };
}

check('multi-stage starts on stage 1 with total activity count', () => {
  const activity = makeActivity();
  const state = engine.start(activity);
  assert.equal(state.mode, 'multiStage');
  assert.equal(state.currentStage, 0);
  assert.equal(state.totalStages, 2);
  assert.equal(state.totalItems, 4);
  assert.equal(state.items.length, 2);
});

check('retry, stage transition, session restore, and final score work together', () => {
  emittedEvents.length = 0;
  const activity = makeActivity({ allowRetry: true });
  engine.start(activity);

  const wrong = engine.classifyItem('item-1', 'b');
  assert.equal(wrong.correct, false);
  assert.equal(wrong.retryAllowed, true);
  assert.equal(engine.getState().classifiedItems, 0);

  engine.classifyItem('item-1', 'a');
  const transition = engine.classifyItem('item-2', 'b');
  assert.equal(transition.stageCompleted, true);
  assert.equal(transition.completedStage, 0);
  assert.equal(transition.currentStage, 1);

  let state = engine.getState();
  assert.equal(state.stageCompleted, 1);
  assert.equal(state.totalClassifiedItems, 2);
  assert.equal(state.classifiedItems, 0);
  assert.equal(state.score, 20);

  const snapshot = engine.getSessionState();
  engine.reset();
  engine.start(activity);
  assert.equal(engine.restoreSession(snapshot), true);
  state = engine.getState();
  assert.equal(state.currentStage, 1);
  assert.equal(state.items[0].id, 'item-3');

  engine.classifyItem('item-3', 'c');
  engine.classifyItem('item-4', 'd');

  state = engine.getState();
  const result = engine.getResult();
  assert.equal(state.finished, true);
  assert.equal(state.totalClassifiedItems, 4);
  assert.equal(state.correctAnswers, 4);
  assert.equal(state.wrongAnswers, 1);
  assert.equal(state.moves, 5);
  assert.equal(result.percentage, 100);
  assert.equal(result.stars, 5);
  assert.equal(result.completed, true);
  assert.equal(emittedEvents.filter(event => event.name === 'activityFinished').length, 1);
});

check('wrong answer without retry counts toward stage completion and final percentage', () => {
  emittedEvents.length = 0;
  const activity = makeActivity({ allowRetry: false });
  engine.start(activity);

  const transition = engine.classifyItem('item-1', 'b');
  assert.equal(transition.correct, false);
  assert.equal(transition.stageCompleted, true);
  assert.equal(engine.getState().totalClassifiedItems, 1);
  assert.equal(engine.getState().currentStage, 1);

  engine.classifyItem('item-3', 'c');
  const result = engine.classifyItem('item-4', 'd');
  assert.equal(result.percentage, 75);
  assert.equal(result.correctAnswers, 3);
  assert.equal(result.wrongAnswers, 1);
  assert.equal(result.completed, true);
  assert.equal(emittedEvents.filter(event => event.name === 'activityFinished').length, 1);
});

check('existing single-stage classification still completes normally', () => {
  emittedEvents.length = 0;
  const activity = {
    id: 'single-stage-regression-fixture',
    settings: { scorePerCorrect: 10 },
    classification: {
      mode: 'choice',
      categories: [{ id: 'yes', title: 'بله' }],
      items: [{ id: 'single-item', content: 'نمونه', categoryId: 'yes' }]
    }
  };
  engine.start(activity);
  const result = engine.classifyItem('single-item', 'yes');
  assert.equal(result.percentage, 100);
  assert.equal(engine.getState().finished, true);
  assert.equal(emittedEvents.filter(event => event.name === 'activityFinished').length, 1);
});

check('real in-platform multi-stage activity completes through every stage', () => {
  emittedEvents.length = 0;
  const file = path.join(
    process.cwd(),
    'content/grades/grade6/science/chapter1/multiStageAnimalJourney/activity.json'
  );
  const activity = JSON.parse(fs.readFileSync(file, 'utf8'));
  const normalized = provider.getContent(activity);
  assert.equal(normalized.mode, 'multiStage');
  assert.equal(normalized.stages.length, 3);

  engine.start(activity);
  for (let stageIndex = 0; stageIndex < normalized.stages.length; stageIndex += 1) {
    const stage = normalized.stages[stageIndex];
    for (const item of stage.items) {
      engine.classifyItem(item.id, item.categoryId);
    }
    const state = engine.getState();
    if (stageIndex < normalized.stages.length - 1) {
      assert.equal(state.currentStage, stageIndex + 1);
      assert.equal(state.stageCompleted, stageIndex + 1);
    }
  }

  const state = engine.getState();
  const result = engine.getResult();
  assert.equal(state.finished, true);
  assert.equal(state.totalStages, 3);
  assert.equal(state.totalItems, 12);
  assert.equal(state.correctAnswers, 12);
  assert.equal(result.percentage, 100);
  assert.equal(result.stars, 5);
  assert.equal(emittedEvents.filter(event => event.name === 'activityFinished').length, 1);
});

console.log('Multi-stage classification regression: PASS');
for (const name of checks) console.log('PASS - ' + name);
console.log('Checks passed: ' + checks.length);
