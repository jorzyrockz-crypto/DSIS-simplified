/**
 * ICS Tracking & Monitoring Tool
 * Phase 6: Reports, Printing & Data Management — Maintenance Service
 */
'use strict';

const MaintenanceService = (() => {

  /**
   * Scans all records for database integrity anomalies.
   */
  function validateDatabase(records) {
    const issues = [];
    const ids = new Set();
    const activeIcsNumbers = new Set();

    records.forEach(r => {
      // 1. Check duplicate IDs
      if (ids.has(r.id)) {
        issues.push({ id: r.id, severity: 'critical', message: `Duplicate internal ID: "${r.id}"`, record: r });
      }
      ids.add(r.id);

      // 2. Check duplicate ICS numbers
      if (r.icsNumber && r.status !== 'archived' && r.status !== 'cancelled') {
        const num = r.icsNumber.trim().toUpperCase();
        if (activeIcsNumbers.has(num)) {
          issues.push({ id: r.id, severity: 'warning', message: `Duplicate ICS Number: "${r.icsNumber}"`, record: r });
        }
        activeIcsNumbers.add(num);
      }

      // 3. Check empty recipient
      if (!r.receivedBy || !r.receivedBy.trim()) {
        issues.push({ id: r.id, severity: 'warning', message: `Missing recipient name on slip.`, record: r });
      }

      // 4. Check empty items or invalid totals
      if (!r.items || r.items.length === 0) {
        issues.push({ id: r.id, severity: 'warning', message: `Record contains 0 item entries.`, record: r });
      } else {
        let calcCost = 0;
        r.items.forEach(item => {
          calcCost += item.totalCost || 0;
          if (item.quantity <= 0) {
            issues.push({ id: r.id, severity: 'warning', message: `Item "${item.description}" has zero or negative quantity.`, record: r });
          }
          if (item.unitCost <= 0) {
            issues.push({ id: r.id, severity: 'info', message: `Item "${item.description}" has zero unit cost.`, record: r });
          }
        });

        if (Math.abs(r.totalCost - calcCost) > 0.01) {
          issues.push({ id: r.id, severity: 'warning', message: `Record total cost mismatch. Calculated: ₱${calcCost.toFixed(2)}, Saved: ₱${r.totalCost.toFixed(2)}`, record: r });
        }
      }

      // 5. Corrupted Dates
      if (isNaN(Date.parse(r.dateIssued))) {
        issues.push({ id: r.id, severity: 'critical', message: `Invalid date issued format: "${r.dateIssued}"`, record: r });
      }
    });

    return issues;
  }

  /**
   * Recalculates totals and applies formatting fixes.
   */
  async function optimizeDatabase(records) {
    let fixedCount = 0;

    for (const r of records) {
      let isFixed = false;
      let calcCost = 0;

      if (r.items) {
        r.items.forEach(item => {
          const cost = item.quantity * item.unitCost;
          if (item.totalCost !== cost) {
            item.totalCost = cost;
            isFixed = true;
          }
          calcCost += cost;
        });
      }

      if (r.totalCost !== calcCost) {
        r.totalCost = calcCost;
        isFixed = true;
      }

      // Ensure standard arrays are initialized
      if (!r.timeline) { r.timeline = []; isFixed = true; }
      if (!r.notes) { r.notes = []; isFixed = true; }
      if (!r.tags) { r.tags = []; isFixed = true; }
      if (!r.attachments) { r.attachments = []; isFixed = true; }

      if (isFixed) {
        r.modifiedDate = new Date().toISOString();
        await RecordService.updateRecord(r.id, r);
        fixedCount++;
      }
    }

    await AuditLogger.log('maintenance', `Database optimized. Recalculated totals on ${fixedCount} records.`);
    return fixedCount;
  }

  return { validateDatabase, optimizeDatabase };
})();
