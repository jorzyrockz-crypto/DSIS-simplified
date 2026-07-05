/**
 * ICS Tracking & Monitoring Tool
 * Phase 4: ICS Record Viewer, Timeline & Monitoring — Health Analyzer
 */
'use strict';

const HealthAnalyzer = (() => {

  /**
   * Run health checks on an ICS Record.
   * Returns: { score, label, issues: [ { severity, message } ] }
   * @param {Object} record - The record to scan
   * @param {Array} allRecords - All other active records for duplicate DB cross-checks
   */
  function analyze(record, allRecords = []) {
    const issues = [];
    let score = 100;

    if (!record) {
      return { score: 0, label: 'Critical', issues: [{ severity: 'error', message: 'No record data found' }] };
    }

    const otherRecs = allRecords.filter(r => r.id !== record.id && r.status !== 'archived' && r.status !== 'cancelled');

    // ── 1. General Info Validation ─────────────────────────────
    if (!record.icsNumber || !record.icsNumber.trim()) {
      issues.push({ severity: 'error', message: 'ICS Number is blank.' });
      score -= 35;
    }

    if (!record.receivedBy || !record.receivedBy.trim()) {
      issues.push({ severity: 'error', message: 'Recipient name is blank.' });
      score -= 35;
    }

    if (!record.dateIssued) {
      issues.push({ severity: 'error', message: 'Date Issued is missing.' });
      score -= 35;
    } else {
      const d = new Date(record.dateIssued + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        const today = new Date(); today.setHours(23,59,59,999);
        if (d > today) {
          issues.push({ severity: 'error', message: 'Date Issued is in the future.' });
          score -= 35;
        }
      }
    }

    if (!record.receivedDate) {
      issues.push({ severity: 'warning', message: 'Received Date is missing.' });
      score -= 15;
    } else {
      const rd = new Date(record.receivedDate + 'T00:00:00');
      const idStr = record.dateIssued;
      if (idStr && !isNaN(rd.getTime())) {
        const idDate = new Date(idStr + 'T00:00:00');
        if (rd < idDate) {
          issues.push({ severity: 'error', message: 'Received Date cannot be before Date Issued.' });
          score -= 35;
        }
      }
    }

    if (!record.issuedBy || !record.issuedBy.trim()) {
      issues.push({ severity: 'error', message: 'Issuing officer is missing.' });
      score -= 35;
    }

    if (!record.entityName || !record.entityName.trim()) {
      issues.push({ severity: 'info', message: 'Entity name is missing (optional).' });
      score -= 5;
    }

    if (!record.fundCluster || !record.fundCluster.trim()) {
      issues.push({ severity: 'info', message: 'Fund Cluster is missing (optional).' });
      score -= 5;
    }

    if (!record.remarks || !record.remarks.trim()) {
      issues.push({ severity: 'info', message: 'Record general remarks are missing (optional).' });
      score -= 5;
    }

    // ── 2. Items Validation ───────────────────────────────────
    const items = record.items || [];
    if (items.length === 0) {
      issues.push({ severity: 'error', message: 'The record contains no items.' });
      score -= 35;
    } else {
      const invNumbers = new Set();
      const serials = new Set();

      items.forEach((item, idx) => {
        const itemPrefix = `Item #${idx + 1} (${item.description || 'Unnamed'}):`;

        // Description
        if (!item.description || !item.description.trim()) {
          issues.push({ severity: 'error', message: `${itemPrefix} Description is empty.` });
          score -= 35;
        }

        // Qty & Cost
        if (item.quantity <= 0) {
          issues.push({ severity: 'error', message: `${itemPrefix} Quantity must be greater than zero.` });
          score -= 35;
        }
        if (item.unitCost < 0) {
          issues.push({ severity: 'error', message: `${itemPrefix} Unit cost cannot be negative.` });
          score -= 35;
        }

        // Duplicates within form
        if (item.inventoryItemNumber) {
          const invNorm = item.inventoryItemNumber.trim().toLowerCase();
          if (invNumbers.has(invNorm)) {
            issues.push({ severity: 'error', message: `${itemPrefix} Duplicate Inventory Number "${item.inventoryItemNumber}" inside this slip.` });
            score -= 35;
          } else {
            invNumbers.add(invNorm);
          }

          // Duplicates in DB
          const dbInvDup = otherRecs.some(r => r.items && r.items.some(i =>
            i.inventoryItemNumber && i.inventoryItemNumber.trim().toLowerCase() === invNorm
          ));
          if (dbInvDup) {
            issues.push({ severity: 'error', message: `${itemPrefix} Inventory Number "${item.inventoryItemNumber}" conflicts with an existing record in database.` });
            score -= 35;
          }
        } else {
          issues.push({ severity: 'warning', message: `${itemPrefix} Inventory Number is missing.` });
          score -= 15;
        }

        // Serials Check
        if (item.serialNumber) {
          const serialNorm = item.serialNumber.trim().toLowerCase();
          if (serials.has(serialNorm)) {
            issues.push({ severity: 'warning', message: `${itemPrefix} Duplicate Serial Number "${item.serialNumber}" inside this slip.` });
            score -= 15;
          } else {
            serials.add(serialNorm);
          }

          // DB Cross Check (Warning Only)
          const dbSerialDup = otherRecs.some(r => r.items && r.items.some(i =>
            i.serialNumber && i.serialNumber.trim().toLowerCase() === serialNorm
          ));
          if (dbSerialDup) {
            issues.push({ severity: 'warning', message: `${itemPrefix} Serial Number "${item.serialNumber}" matches an existing item in database.` });
            score -= 15;
          }
        }
      });
    }

    // Bound score between 0 and 100
    score = Math.max(0, Math.min(100, score));

    // Health Score classifications
    let label = 'Excellent';
    if (score < 40) {
      label = 'Critical';
    } else if (score < 70) {
      label = 'Needs Attention';
    } else if (score < 90) {
      label = 'Good';
    }

    return {
      score,
      label,
      issues: issues.sort((a, b) => {
        // Sort error first, then warning, then info
        const priority = { error: 0, warning: 1, info: 2 };
        return priority[a.severity] - priority[b.severity];
      }),
    };
  }

  return { analyze };
})();
