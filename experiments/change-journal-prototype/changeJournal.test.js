'use strict';
const assert = require('node:assert/strict');
const { createChangeJournal } = require('./changeJournal');
class MemoryStorage {
  constructor() { this.map = new Map(); this.failAt = null; this.writes = 0; }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.writes++; if (this.failAt === this.writes) throw new Error('simulated interruption'); this.map.set(key, String(value)); }
}
const cases = [
  ['recover when interruption occurs after journal write', () => { const s = new MemoryStorage(), j = createChangeJournal(s, 'student-A'); s.failAt = 2; assert.throws(() => j.enqueue({ mutationId:'a', dataset:'progress', recordKey:'act', operation:'set', value:{played:true} })); s.failAt = null; assert.deepEqual(j.recover(), { replayed:1, pending:1 }); assert.deepEqual(j.read('progress').act, {played:true}); }],
  ['recover when data saved but status write fails', () => { const s = new MemoryStorage(), j = createChangeJournal(s, 'student-A'); s.failAt = 3; assert.throws(() => j.enqueue({ mutationId:'b', dataset:'stats', recordKey:'math', operation:'set', value:{attempts:1} })); s.failAt = null; j.recover(); assert.deepEqual(j.read('stats').math, {attempts:1}); }],
  ['deduplicate and reject mutation id collision', () => { const j = createChangeJournal(new MemoryStorage(), 'student-A'), x={mutationId:'c',dataset:'p',recordKey:'x',operation:'set',value:1}; j.enqueue(x); assert.equal(j.enqueue(x).duplicate,true); assert.throws(() => j.enqueue({...x,value:2}), /reused/); }],
  ['delete is replay safe and acknowledged entries compact', () => { const j=createChangeJournal(new MemoryStorage(),'student-A'); j.enqueue({mutationId:'d1',dataset:'n',recordKey:'n1',operation:'set',value:{read:false}}); j.enqueue({mutationId:'d2',dataset:'n',recordKey:'n1',operation:'delete'}); j.recover(); assert.equal('n1' in j.read('n'),false); assert.deepEqual(j.acknowledge(['d1','d2']),{acknowledged:2}); assert.deepEqual(j.compact(),{removed:2,remaining:0}); }],
  ['profile namespaces are isolated', () => { const s=new MemoryStorage(),a=createChangeJournal(s,'A'),b=createChangeJournal(s,'B'); a.enqueue({mutationId:'e',dataset:'p',recordKey:'x',operation:'set',value:1}); assert.deepEqual(b.read('p'),{}); }],
  ['reject increment operations', () => { const j=createChangeJournal(new MemoryStorage(),'A'); assert.throws(() => j.enqueue({mutationId:'f',dataset:'s',recordKey:'x',operation:'increment',value:1}), /replay-safe/); }]
];
for (const [name, run] of cases) { run(); console.log('PASS ' + name); }
console.log(cases.length + '/' + cases.length + ' tests passed');
