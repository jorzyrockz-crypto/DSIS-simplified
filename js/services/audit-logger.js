/**
 * ICS Tracking & Monitoring Tool
 * Phase 6: Reports, Printing & Data Management — System Audit Logger
 */
'use strict';

const AuditLogger = (() => {
  const META_KEY = 'ics-system-audit-logs';

  async function getLogs() {
    try {
      const logs = await DB.getMeta(META_KEY);
      return Array.isArray(logs) ? logs : [];
    } catch {
      return [];
    }
  }

  async function saveLogs(list) {
    try {
      await DB.setMeta(META_KEY, list);
    } catch (err) {
      console.error('[AuditLogger] Save logs error:', err);
    }
  }

  async function log(action, description) {
    const logs = await getLogs();
    const entry = {
      id: Utils.uuid(),
      action: action.toUpperCase(),
      description,
      user: 'Supply Officer',
      timestamp: new Date().toISOString()
    };
    logs.unshift(entry);
    await saveLogs(logs.slice(0, 100)); // Cap logs at 100 entries
  }

  async function clear() {
    await saveLogs([]);
  }

  return { getLogs, saveLogs, log, clear };
})();
// Ensure window.AuditLogger is global
window.AuditLogger = AuditLogger;
