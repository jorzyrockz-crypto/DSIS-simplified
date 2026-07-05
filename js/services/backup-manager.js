/**
 * ICS Tracking & Monitoring Tool
 * Phase 6: Reports, Printing & Data Management — Backup & Restore Manager
 */
'use strict';

const BackupManager = (() => {

  /**
   * Generates a backup JSON file of the database.
   */
  async function generateBackup(records) {
    const settings = SettingsManager.get();
    const logs = await AuditLogger.getLogs();

    const data = {
      metadata: {
        app: 'ICS Tracking & Monitoring Tool',
        version: '1.0.0-phase6',
        timestamp: new Date().toISOString(),
        recordsCount: records.length,
      },
      records,
      settings,
      auditLogs: logs
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `ics_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    await AuditLogger.log('backup', 'Full database JSON backup generated.');
  }

  /**
   * Validates a backup object.
   */
  function validateBackup(data) {
    if (!data || typeof data !== 'object') {
      return { isValid: false, error: 'Backup is not a valid JSON object.' };
    }
    if (!data.metadata || data.metadata.app !== 'ICS Tracking & Monitoring Tool') {
      return { isValid: false, error: 'File is not a valid ICS Tracker backup.' };
    }
    if (!Array.isArray(data.records)) {
      return { isValid: false, error: 'Backup is missing records list.' };
    }
    return {
      isValid: true,
      counts: {
        records: data.records.length,
        logs: Array.isArray(data.auditLogs) ? data.auditLogs.length : 0
      }
    };
  }

  /**
   * Restores data.
   * @param {Object} data - Parsed JSON backup
   * @param {string} mode - 'merge' | 'replace'
   */
  async function performRestore(data, mode) {
    const validation = validateBackup(data);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    if (mode === 'replace') {
      // Clear database
      await DB.clear('records');
      // Save settings
      if (data.settings) {
        SettingsManager.save(data.settings);
      }
      // Insert all records
      await DB.putBatch('records', data.records);
    } else {
      // Merge: load current, put batch
      const current = await RecordService.getAllRecords();
      const currentMap = new Map(current.map(r => [r.id, r]));

      data.records.forEach(incoming => {
        // Overwrite if exists, otherwise append
        currentMap.set(incoming.id, incoming);
      });

      const mergedList = Array.from(currentMap.values());
      await DB.clear('records');
      await DB.putBatch('records', mergedList);
    }

    // Restore audit logs
    if (Array.isArray(data.auditLogs)) {
      await AuditLogger.saveLogs(data.auditLogs);
    }

    await AuditLogger.log('restore', `Database restored successfully via ${mode} mode. ${data.records.length} records processed.`);
  }

  return { generateBackup, validateBackup, performRestore };
})();
