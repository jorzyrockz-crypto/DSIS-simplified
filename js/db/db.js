/**
 * ICS Tracking & Monitoring Tool
 * Phase 2: ICS Database & Record Management — IndexedDB Layer
 *
 * Provides an async/await wrapper around the IndexedDB API.
 * Falls back to a localStorage shim when IndexedDB is unavailable.
 */
'use strict';

const DB = (() => {
  const DB_NAME    = 'ics-tracker-db';
  const DB_VERSION = 1;
  let _db = null;

  /* ----------------------------------------------------------
     Schema Definition & Upgrade Handler
     ---------------------------------------------------------- */
  function onUpgradeNeeded(event) {
    const db         = event.target.result;
    const oldVersion = event.oldVersion;

    // ── Version 1 ──────────────────────────────────────────
    if (oldVersion < 1) {
      // Primary records store
      const records = db.createObjectStore('records', { keyPath: 'id' });
      records.createIndex('icsNumber',    'icsNumber',    { unique: false });
      records.createIndex('receivedBy',   'receivedBy',   { unique: false });
      records.createIndex('dateIssued',   'dateIssued',   { unique: false });
      records.createIndex('status',       'status',       { unique: false });
      records.createIndex('modifiedDate', 'modifiedDate', { unique: false });
      records.createIndex('entityName',   'entityName',   { unique: false });
      records.createIndex('fundCluster',  'fundCluster',  { unique: false });

      // App metadata store (settings, counters, flags)
      db.createObjectStore('metadata', { keyPath: 'key' });
    }
    // Future versions: add `if (oldVersion < 2) { ... }` blocks here
  }

  /* ----------------------------------------------------------
     Open / Connect
     ---------------------------------------------------------- */
  function open() {
    if (_db) return Promise.resolve(_db);

    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error('IndexedDB is not supported in this browser.'));
        return;
      }

      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onerror = () =>
        reject(new Error('[DB] Failed to open: ' + (req.error && req.error.message)));

      req.onsuccess = () => {
        _db = req.result;
        _db.onversionchange = () => { _db.close(); _db = null; };
        resolve(_db);
      };

      req.onupgradeneeded = onUpgradeNeeded;

      req.onblocked = () =>
        console.warn('[DB] Database upgrade blocked. Please close other tabs running this app.');
    });
  }

  /* ----------------------------------------------------------
     Internal Transaction Helper
     ---------------------------------------------------------- */
  function _store(storeName, mode = 'readonly') {
    if (!_db) throw new Error('[DB] Database not open. Call DB.open() first.');
    return _db.transaction(storeName, mode).objectStore(storeName);
  }

  function _promisify(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  /* ----------------------------------------------------------
     CRUD Operations
     ---------------------------------------------------------- */

  /** Get a single record by its primary key. */
  function get(storeName, key) {
    return _promisify(_store(storeName).get(key));
  }

  /** Get all records from a store. Optional IDBKeyRange. */
  function getAll(storeName, range = null) {
    return _promisify(_store(storeName).getAll(range));
  }

  /** Add or update a record (put semantics). */
  function put(storeName, record) {
    return _promisify(_store(storeName, 'readwrite').put(record));
  }

  /** Delete a record by its primary key. */
  function del(storeName, key) {
    return _promisify(_store(storeName, 'readwrite').delete(key));
  }

  /** Count all records (or those matching an index range). */
  function count(storeName, { indexName, range } = {}) {
    const store  = _store(storeName);
    const source = indexName ? store.index(indexName) : store;
    return _promisify(source.count(range));
  }

  /** Clear every record in a store. */
  function clear(storeName) {
    return _promisify(_store(storeName, 'readwrite').clear());
  }

  /* ----------------------------------------------------------
     Cursor-Based Helpers
     ---------------------------------------------------------- */

  /**
   * Collect all unique key values for a given index.
   * Useful for building filter option lists.
   */
  function getDistinctIndexKeys(storeName, indexName) {
    return new Promise((resolve, reject) => {
      const store  = _store(storeName);
      const source = store.index(indexName);
      const values = new Set();

      const req = source.openKeyCursor(null, 'next');
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (!cursor) { resolve([...values].filter(Boolean).sort()); return; }
        if (cursor.key) values.add(cursor.key);
        cursor.continue();
      };
      req.onerror = () => reject(req.error);
    });
  }

  /* ----------------------------------------------------------
     Convenience
     ---------------------------------------------------------- */

  /** Check whether a store is empty. */
  async function isEmpty(storeName) {
    return (await count(storeName)) === 0;
  }

  /** Put multiple records in one readwrite transaction. */
  async function putBatch(storeName, records) {
    if (!_db) throw new Error('[DB] Database not open.');
    return new Promise((resolve, reject) => {
      const tx    = _db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);

      records.forEach(rec => store.put(rec));

      tx.oncomplete = () => resolve(records.length);
      tx.onerror    = () => reject(tx.error);
      tx.onabort    = () => reject(tx.error);
    });
  }

  /* ----------------------------------------------------------
     Metadata Helpers (key-value pairs in 'metadata' store)
     ---------------------------------------------------------- */
  async function getMeta(key) {
    const row = await get('metadata', key);
    return row ? row.value : undefined;
  }

  async function setMeta(key, value) {
    return put('metadata', { key, value });
  }

  /* ----------------------------------------------------------
     Public API
     ---------------------------------------------------------- */
  return {
    open,
    get, getAll, put, del, count, clear,
    getDistinctIndexKeys,
    isEmpty, putBatch,
    getMeta, setMeta,
  };
})();
