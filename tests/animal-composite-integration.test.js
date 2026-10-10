'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const activityPath = 'content/grades/grade6/science/chapter1/compositeAnimalMediaDemo/activity.json';
const activity = JSON.parse(fs.readFileSync(activityPath, 'utf8'));
const index = JSON.parse(fs.readFileSync('data/activities.json', 'utf8'));
const events = [];
let finalResult = null;

const context = {
  console: { log() {}, warn() {}, error() {} },
  EventManager: { emit(name, payload) { events.push({ name, payload }); } },
  ActivityManager: { finish(result) { finalResult = result; } },
  ActivityResult: { create(payload) { return payload; } },
  MatchingTypeRegistry: {
    has() { return false; },
    get() { return { prepare(data) { return data; } }; }
  },
  Math, JSON, Number, String, Array, Object, Set
};
context.window = context;

for (const path of [
  'engine/question/matchingProvider.js',
  'engine/activity/matchingEngine.js',
  'engine/question/compositeActivityProvider.js',
  'engine/activity/compositeActivityEngine.js'
]) {
  vm.runInNewContext(fs.readFileSync(path, 'utf8'), context, { filename: path });
}

assert.ok(index.some(item => item.id === activity.id && item.title === activity.title),
  'activity must be registered in the platform activity index');
assert.equal(activity.composite.stages.length, 3, 'activity must have exactly three stages');
assert.equal(activity.composite.stages[2].interaction, 'matching');
assert.equal(activity.composite.stages[2].matching.pairs.length, 4);
for (const stage of activity.composite.stages) {
  if (stage.prompt && stage.prompt.type === 'image') {
    assert.ok(fs.existsSync(stage.prompt.src), 'missing prompt image: ' + stage.prompt.src);
  }
}

let state = context.CompositeActivityEngine.start(activity);
assert.equal(state.totalStages, 3);
assert.equal(state.stage.id, 'cat-group');

// Complete the first choice stage correctly.
let answer = context.CompositeActivityEngine.answer('cat-mammal');
assert.equal(answer.correct, true);
state = context.CompositeActivityEngine.next();
assert.equal(state.stage.id, 'frog-group');

// Complete the second choice stage correctly.
answer = context.CompositeActivityEngine.answer('frog-amphibian');
assert.equal(answer.correct, true);
state = context.CompositeActivityEngine.next();
assert.equal(state.stage.id, 'animal-group-matching');

// Run the actual matching engine against the activity's four configured pairs.
const matchingActivity = {
  id: activity.id + '::animal-group-matching',
  type: 'matching',
  settings: { compositeStage: true },
  matching: state.stage.matching
};
const matchingState = context.MatchingEngine.start(matchingActivity);
assert.ok(matchingState && matchingState.started, 'matching stage must start');
for (const pair of state.stage.matching.pairs) {
  context.MatchingEngine.select('left', pair.left.id);
  context.MatchingEngine.select('right', pair.right.id);
}
const matchingFinished = events.find(event => event.name === 'compositeMatchingFinished');
assert.ok(matchingFinished, 'matching stage must emit its internal completion event');
assert.equal(events.filter(event => event.name === 'activityFinished').length, 0,
  'inner matching stage must not finish the parent activity');
assert.equal(matchingFinished.payload.result.percentage, 100);

state = context.CompositeActivityEngine.completeMatchingStage(matchingFinished.payload.result);
assert.ok(state && state.answers[2], 'composite engine must accept matching completion');
const result = context.CompositeActivityEngine.next();
assert.equal(result.activityId, activity.id);
assert.equal(result.completed, true);
assert.equal(result.percentage, 100);
assert.equal(result.correctAnswers, 3);
assert.equal(result.totalQuestions, 3);
assert.equal(finalResult.activityId, activity.id);
assert.equal(events.filter(event => event.name === 'activityFinished').length, 0,
  'composite engine should finish through ActivityManager, not emit a duplicate finish event');

console.log('Full animal composite activity integration checks passed');
