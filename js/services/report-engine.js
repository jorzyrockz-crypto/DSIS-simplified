/**
 * ICS Tracking & Monitoring Tool
 * Phase 6: Reports, Printing & Data Management — Report Engine
 */
'use strict';

const ReportEngine = (() => {

  /**
   * Filter records based on selected options.
   */
  function filterRecords(records, filters = {}) {
    return records.filter(r => {
      if (filters.year && Utils.getYear(r.dateIssued) !== parseInt(filters.year)) return false;
      if (filters.month) {
        const date = new Date(r.dateIssued);
        if (date.getMonth() + 1 !== parseInt(filters.month)) return false;
      }
      if (filters.fundCluster && r.fundCluster !== filters.fundCluster) return false;
      if (filters.recipient && !r.receivedBy.toLowerCase().includes(filters.recipient.toLowerCase())) return false;
      if (filters.office && r.office && !r.office.toLowerCase().includes(filters.office.toLowerCase())) return false;
      if (filters.entity && r.entityName && !r.entityName.toLowerCase().includes(filters.entity.toLowerCase())) return false;
      if (filters.status && filters.status !== 'all' && r.status !== filters.status) return false;
      return true;
    });
  }

  /**
   * Complete ICS Register Report
   */
  function generateICSRegister(records, filters = {}) {
    const list = filterRecords(records, filters);
    const headers = ['ICS Number', 'Date Issued', 'Recipient', 'Office', 'Total Items', 'Total Value', 'Status'];
    const rows = list.map(r => [
      r.icsNumber || '(Draft)',
      Utils.formatDate(r.dateIssued),
      r.receivedBy,
      r.office || '—',
      r.totalItems,
      Utils.formatCurrency(r.totalCost),
      Utils.capitalise(r.status)
    ]);
    return { headers, rows, rawData: list };
  }

  /**
   * Property Issued per Recipient Report
   */
  function generatePropertyPerRecipient(records, recipientName) {
    const headers = ['Item Description', 'Inventory No.', 'Serial No.', 'Qty', 'Unit Cost', 'Total Cost', 'ICS No.', 'Status'];
    const rows = [];
    const list = records.filter(r => r.receivedBy.toLowerCase().includes(recipientName.toLowerCase()) && r.status !== 'cancelled');

    list.forEach(r => {
      if (!r.items) return;
      r.items.forEach(item => {
        const itemStatus = (r.itemStatuses && r.itemStatuses[item.id]) || 'issued';
        rows.push([
          item.description,
          item.inventoryItemNumber || '—',
          item.serialNumber || '—',
          item.quantity,
          Utils.formatCurrency(item.unitCost),
          Utils.formatCurrency(item.totalCost),
          r.icsNumber || '(Draft)',
          Utils.capitalise(itemStatus)
        ]);
      });
    });

    return { headers, rows, rawData: list };
  }

  /**
   * Inventory Summary by Item Description
   */
  function generateInventorySummary(records) {
    const headers = ['Item Description', 'Total Qty', 'Average Unit Cost', 'Total Asset Value', 'Active', 'Returned', 'Disposed'];
    const itemMap = {};

    records.forEach(r => {
      if (r.status === 'cancelled') return;
      if (!r.items) return;
      r.items.forEach(item => {
        const desc = item.description.trim();
        if (!itemMap[desc]) {
          itemMap[desc] = { qty: 0, costSum: 0, itemsCount: 0, status: { active: 0, returned: 0, disposed: 0 } };
        }
        itemMap[desc].qty += item.quantity;
        itemMap[desc].costSum += item.totalCost;
        itemMap[desc].itemsCount++;

        const stat = (r.itemStatuses && r.itemStatuses[item.id]) || 'issued';
        if (stat === 'issued') itemMap[desc].status.active += item.quantity;
        else if (stat === 'returned') itemMap[desc].status.returned += item.quantity;
        else if (stat === 'disposed') itemMap[desc].status.disposed += item.quantity;
      });
    });

    const rows = Object.entries(itemMap).map(([desc, data]) => {
      const avg = data.qty > 0 ? (data.costSum / data.qty) : 0;
      return [
        desc,
        data.qty,
        Utils.formatCurrency(avg),
        Utils.formatCurrency(data.costSum),
        data.status.active,
        data.status.returned,
        data.status.disposed
      ];
    });

    return { headers, rows, rawData: itemMap };
  }

  /**
   * Useful Life Warnings & Audit Report
   */
  function generateEULReport(records, type = 'expired') {
    const headers = ['ICS Number', 'Item Description', 'Inventory No.', 'Date Issued', 'Useful Life', 'Days Remaining', 'Status'];
    const rows = [];

    records.forEach(r => {
      if (r.status === 'archived' || r.status === 'cancelled') return;
      if (!r.items) return;
      r.items.forEach(item => {
        const rul = MonitoringService.calculateRUL(r.dateIssued, item.estimatedUsefulLife);
        const match = type === 'expired' ? (rul.status === 'Expired') : (rul.status === 'Approaching EUL');
        if (match) {
          rows.push([
            r.icsNumber || '(Draft)',
            item.description,
            item.inventoryItemNumber || '—',
            Utils.formatDate(r.dateIssued),
            item.estimatedUsefulLife,
            rul.daysRemaining,
            rul.status
          ]);
        }
      });
    });

    return { headers, rows, rawData: records };
  }

  return {
    generateICSRegister,
    generatePropertyPerRecipient,
    generateInventorySummary,
    generateEULReport
  };
})();
