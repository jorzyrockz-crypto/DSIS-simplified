/**
 * ICS Tracking & Monitoring Tool
 * Phase 5: Smart Search, Filters, Notifications — Favorites Manager
 */
'use strict';

const FavoritesManager = (() => {
  const RECIP_KEY = 'ics-fav-recipients';
  const SEARCH_KEY = 'ics-fav-searches';

  function _read(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch { return []; }
  }

  function _write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); }
    catch { /* ignore */ }
  }

  /* Favorite Recipients */
  function toggleRecipient(name) {
    if (!name || !name.trim()) return;
    const n = name.trim();
    let list = _read(RECIP_KEY);
    if (list.includes(n)) {
      list = list.filter(x => x !== n);
    } else {
      list.push(n);
    }
    _write(RECIP_KEY, list);
    return list.includes(n);
  }

  function getRecipients() {
    return _read(RECIP_KEY);
  }

  function isRecipient(name) {
    if (!name) return false;
    return _read(RECIP_KEY).includes(name.trim());
  }

  /* Favorite Searches / Saved Searches */
  function saveSearch(name, filters) {
    if (!name || !name.trim()) return;
    const n = name.trim();
    let list = _read(SEARCH_KEY);
    // Remove if already exists to overwrite
    list = list.filter(x => x.name.toLowerCase() !== n.toLowerCase());
    list.push({ name: n, filters });
    _write(SEARCH_KEY, list);
  }

  function deleteSearch(name) {
    let list = _read(SEARCH_KEY);
    list = list.filter(x => x.name.toLowerCase() !== name.trim().toLowerCase());
    _write(SEARCH_KEY, list);
  }

  function getSearches() {
    return _read(SEARCH_KEY);
  }

  return {
    toggleRecipient, getRecipients, isRecipient,
    saveSearch, deleteSearch, getSearches
  };
})();
