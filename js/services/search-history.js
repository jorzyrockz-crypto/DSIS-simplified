/**
 * ICS Tracking & Monitoring Tool
 * Phase 5: Smart Search, Filters, Notifications — Search History Manager
 */
'use strict';

const SearchHistory = (() => {
  const HIST_KEY = 'ics-search-history';
  const MAX = 20;

  function _read() {
    try { return JSON.parse(localStorage.getItem(HIST_KEY)) || []; }
    catch { return []; }
  }

  function _write(list) {
    try { localStorage.setItem(HIST_KEY, JSON.stringify(list)); }
    catch { /* ignore */ }
  }

  function add(query) {
    if (!query || !query.trim()) return;
    const q = query.trim();

    let list = _read();
    const existingIdx = list.findIndex(x => x.text.toLowerCase() === q.toLowerCase());

    if (existingIdx >= 0) {
      const match = list[existingIdx];
      // Keep pinned status
      list.splice(existingIdx, 1);
      list.unshift(match);
    } else {
      list.unshift({
        id: Utils.uuid(),
        text: q,
        pinned: false
      });
    }

    // Stable sort: keep pinned items at the top
    list.sort((a, b) => {
      const pinA = a.pinned ? 1 : 0;
      const pinB = b.pinned ? 1 : 0;
      return pinB - pinA;
    });

    _write(list.slice(0, MAX));
  }

  function togglePin(id) {
    const list = _read();
    const match = list.find(x => x.id === id);
    if (match) {
      match.pinned = !match.pinned;
      // Re-sort
      list.sort((a, b) => {
        const pinA = a.pinned ? 1 : 0;
        const pinB = b.pinned ? 1 : 0;
        return pinB - pinA;
      });
      _write(list);
    }
  }

  function remove(id) {
    const list = _read().filter(x => x.id !== id);
    _write(list);
  }

  function clear() {
    // Keep pinned items when clearing
    const list = _read().filter(x => x.pinned);
    _write(list);
  }

  function get() {
    return _read();
  }

  return { add, togglePin, remove, clear, get };
})();
