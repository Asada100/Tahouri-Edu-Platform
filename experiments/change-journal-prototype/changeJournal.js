'use strict';
function createChangeJournal(storage, namespace) {
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') throw new TypeError('Storage-compatible object required');
  if (!namespace || typeof namespace !== 'string') throw new TypeError('namespace required');
  const journalKey = 'Tahouri_ChangeJournal_v1:' + namespace;
  const dataPrefix = 'Tahouri_ChangeJournal_Data_v1:' + namespace + ':';
  const readJournal = () => { const raw = storage.getItem(journalKey); if (raw === null) return []; const value = JSON.parse(raw); if (!Array.isArray(value)) throw new Error('Invalid journal'); return value; };
  const writeJournal = entries => storage.setItem(journalKey, JSON.stringify(entries));
  const readDataset = dataset => { const raw = storage.getItem(dataPrefix + encodeURIComponent(dataset)); if (raw === null) return {}; const value = JSON.parse(raw); if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid dataset'); return value; };
  const apply = entry => { const data = readDataset(entry.dataset); if (entry.operation === 'set') data[entry.recordKey] = entry.value; else if (entry.operation === 'delete') delete data[entry.recordKey]; else throw new Error('Unsupported operation'); storage.setItem(dataPrefix + encodeURIComponent(entry.dataset), JSON.stringify(data)); };
  const fingerprint = entry => JSON.stringify({ dataset: entry.dataset, recordKey: entry.recordKey, operation: entry.operation, value: entry.operation === 'set' ? entry.value : null });
  return {
    enqueue(input) {
      if (!input || !input.dataset || !input.recordKey || !input.mutationId) throw new TypeError('dataset, recordKey and mutationId required');
      if (!['set', 'delete'].includes(input.operation)) throw new Error('Only replay-safe set/delete operations are supported');
      const entry = { mutationId: String(input.mutationId), dataset: String(input.dataset), recordKey: String(input.recordKey), operation: input.operation, ...(input.operation === 'set' ? { value: input.value } : {}), status: 'pending', createdAt: input.createdAt || new Date().toISOString() };
      const entries = readJournal(); const prior = entries.find(item => item.mutationId === entry.mutationId);
      if (prior) { if (fingerprint(prior) !== fingerprint(entry)) throw new Error('mutationId reused with different content'); if (prior.status !== 'acked') apply(prior); return { duplicate: true, status: prior.status }; }
      entries.push(entry); writeJournal(entries); apply(entry); entry.status = 'applied'; writeJournal(entries);
      return { duplicate: false, status: entry.status };
    },
    recover() { const entries = readJournal(); let replayed = 0; for (const entry of entries) { if (entry.status === 'acked') continue; apply(entry); if (entry.status !== 'applied') { entry.status = 'applied'; replayed++; } } writeJournal(entries); return { replayed, pending: entries.filter(x => x.status !== 'acked').length }; },
    pending() { return readJournal().filter(x => x.status !== 'acked').map(({ status, ...entry }) => entry); },
    acknowledge(ids) { const set = new Set(ids || []); const entries = readJournal(); let acknowledged = 0; for (const entry of entries) if (set.has(entry.mutationId) && entry.status !== 'acked') { entry.status = 'acked'; acknowledged++; } writeJournal(entries); return { acknowledged }; },
    compact() { const entries = readJournal(); const kept = entries.filter(x => x.status !== 'acked'); writeJournal(kept); return { removed: entries.length - kept.length, remaining: kept.length }; },
    read: readDataset,
    inspect: readJournal
  };
}
if (typeof module !== 'undefined' && module.exports) module.exports = { createChangeJournal };
