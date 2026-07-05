/**
 * ICS Tracking & Monitoring Tool
 * Phase 4: ICS Record Viewer, Timeline & Monitoring — Relationship Engine
 */
'use strict';

const RelationshipEngine = (() => {

  /**
   * Find records related to the target record.
   * Returns: [ { record: recordSummary, reasons: [ reasonStrings ] } ]
   * @param {Object} target - The record being inspected
   * @param {Array} allRecords - All records in the database
   */
  function findRelated(target, allRecords = []) {
    if (!target) return [];

    const relatedMap = new Map();

    const addReason = (rec, reason) => {
      if (rec.id === target.id) return;
      if (!relatedMap.has(rec.id)) {
        relatedMap.set(rec.id, {
          record: {
            id:           rec.id,
            icsNumber:    rec.icsNumber,
            receivedBy:   rec.receivedBy,
            office:       rec.office,
            status:       rec.status,
            totalCost:    rec.totalCost,
            dateIssued:   rec.dateIssued,
            modifiedDate: rec.modifiedDate,
          },
          reasons: [],
        });
      }
      const item = relatedMap.get(rec.id);
      if (!item.reasons.includes(reason)) {
        item.reasons.push(reason);
      }
    };

    const targetSerials = new Set(
      (target.items || []).map(i => i.serialNumber && i.serialNumber.trim().toLowerCase()).filter(Boolean)
    );
    const targetInvs = new Set(
      (target.items || []).map(i => i.inventoryItemNumber && i.inventoryItemNumber.trim().toLowerCase()).filter(Boolean)
    );

    allRecords.forEach(rec => {
      if (rec.id === target.id) return;

      // 1. Same Recipient
      if (target.receivedBy && rec.receivedBy &&
          target.receivedBy.trim().toLowerCase() === rec.receivedBy.trim().toLowerCase()) {
        addReason(rec, 'Same Recipient');
      }

      // 2. Same Office
      if (target.office && rec.office &&
          target.office.trim().toLowerCase() === rec.office.trim().toLowerCase()) {
        addReason(rec, 'Same Office');
      }

      // 3. Same Fund Cluster
      if (target.fundCluster && rec.fundCluster &&
          target.fundCluster.trim().toLowerCase() === rec.fundCluster.trim().toLowerCase()) {
        addReason(rec, 'Same Fund Cluster');
      }

      // 4. Overlapping Item Inventory or Serial Numbers
      if (rec.items && rec.items.length > 0) {
        rec.items.forEach(item => {
          if (item.serialNumber) {
            const snNorm = item.serialNumber.trim().toLowerCase();
            if (targetSerials.has(snNorm)) {
              addReason(rec, `Overlapping Serial Number (${item.serialNumber})`);
            }
          }
          if (item.inventoryItemNumber) {
            const invNorm = item.inventoryItemNumber.trim().toLowerCase();
            if (targetInvs.has(invNorm)) {
              addReason(rec, `Overlapping Inventory Item (${item.inventoryItemNumber})`);
            }
          }
        });
      }
    });

    // Return as array
    return Array.from(relatedMap.values());
  }

  return { findRelated };
})();
