/**
 * ICS Tracking & Monitoring Tool
 * Phase 2: ICS Database & Record Management — Recent Records Service
 */
'use strict';

const RecentRecords = (() => {
  const VIEWED_KEY = 'ics-recent-viewed';
  const EDITED_KEY = 'ics-recent-edited';
  const MAX        = 10;

  /* ----------------------------------------------------------
     Internal Read / Write
     ---------------------------------------------------------- */
  function _read(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch { return []; }
  }

  function _write(key, list) {
    try { localStorage.setItem(key, JSON.stringify(list)); }
    catch { /* localStorage full or blocked */ }
  }

  /* ----------------------------------------------------------
     Snapshot (only store minimal data, not the full record)
     ---------------------------------------------------------- */
  function _snap(record) {
    return {
      id:           record.id,
      icsNumber:    record.icsNumber,
      receivedBy:   record.receivedBy,
      entityName:   record.entityName,
      status:       record.status,
      modifiedDate: record.modifiedDate,
      totalCost:    record.totalCost,
    };
  }

  /* ----------------------------------------------------------
     Public API
     ---------------------------------------------------------- */
  function _push(key, record) {
    if (!record || !record.id) return;
    let list = _read(key).filter(r => r.id !== record.id); // deduplicate
    list.unshift(_snap(record));
    _write(key, list.slice(0, MAX));
  }

  function addViewed(record) { _push(VIEWED_KEY, record); }
  function addEdited(record) { _push(EDITED_KEY, record); }
  function getViewed()       { return _read(VIEWED_KEY); }
  function getEdited()       { return _read(EDITED_KEY); }

  function removeFromAll(id) {
    [VIEWED_KEY, EDITED_KEY].forEach(key => {
      _write(key, _read(key).filter(r => r.id !== id));
    });
  }

  function clear() {
    [VIEWED_KEY, EDITED_KEY].forEach(key => {
      try { localStorage.removeItem(key); } catch { /* ignore */ }
    });
  }

  return { addViewed, addEdited, getViewed, getEdited, removeFromAll, clear };
})();
