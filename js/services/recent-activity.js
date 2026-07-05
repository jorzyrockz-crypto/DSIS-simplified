/**
 * ICS Tracking & Monitoring Tool
 * Phase 5: Smart Search, Filters, Notifications — Recent Activity Manager
 */
'use strict';

const RecentActivity = (() => {
  const MAX = 20;

  function _key(type) {
    return `ics-activity-${type}`;
  }

  function _read(type) {
    try { return JSON.parse(localStorage.getItem(_key(type))) || []; }
    catch { return []; }
  }

  function _write(type, list) {
    try { localStorage.setItem(_key(type), JSON.stringify(list)); }
    catch { /* ignore */ }
  }

  function _snap(record) {
    return {
      id:           record.id,
      icsNumber:    record.icsNumber,
      receivedBy:   record.receivedBy,
      entityName:   record.entityName,
      status:       record.status,
      modifiedDate: record.modifiedDate || new Date().toISOString(),
      totalCost:    record.totalCost || 0,
    };
  }

  function add(type, record) {
    if (!record || !record.id) return;
    let list = _read(type).filter(r => r.id !== record.id);
    list.unshift(_snap(record));
    _write(type, list.slice(0, MAX));
  }

  function get(type) {
    return _read(type);
  }

  function removeFromAll(id) {
    ['viewed', 'edited', 'created', 'archived'].forEach(type => {
      const filtered = _read(type).filter(r => r.id !== id);
      _write(type, filtered);
    });
  }

  function clear() {
    ['viewed', 'edited', 'created', 'archived'].forEach(type => {
      try { localStorage.removeItem(_key(type)); } catch { /* ignore */ }
    });
  }

  return { add, get, removeFromAll, clear };
})();

// Backward compatibility wrapper for Phase 2/3 pages
const RecentRecords = {
  addViewed: (rec) => RecentActivity.add('viewed', rec),
  addEdited: (rec) => RecentActivity.add('edited', rec),
  getViewed: () => RecentActivity.get('viewed'),
  getEdited: () => RecentActivity.get('edited'),
  removeFromAll: (id) => RecentActivity.removeFromAll(id),
  clear: () => RecentActivity.clear(),
};
