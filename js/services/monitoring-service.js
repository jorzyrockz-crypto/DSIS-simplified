/**
 * ICS Tracking & Monitoring Tool
 * Phase 4: ICS Record Viewer, Timeline & Monitoring — Monitoring Service
 */
'use strict';

const MonitoringService = (() => {

  const ITEM_STATUSES = [
    { value: 'issued',        label: 'Issued',        variant: 'primary' },
    { value: 'returned',      label: 'Returned',      variant: 'success' },
    { value: 'transferred',   label: 'Transferred',   variant: 'info'    },
    { value: 'disposed',      label: 'Disposed',      variant: 'neutral' },
    { value: 'lost',          label: 'Lost',          variant: 'danger'  },
    { value: 'missing',       label: 'Missing',       variant: 'danger'  },
    { value: 'damaged',       label: 'Damaged',       variant: 'warning' },
    { value: 'serviceable',   label: 'Serviceable',   variant: 'success' },
    { value: 'unserviceable', label: 'Unserviceable', variant: 'danger'  },
  ];

  const RECORD_STATUSES = [
    { value: 'draft',                label: 'Draft',                variant: 'warning' },
    { value: 'active',               label: 'Active',               variant: 'primary' },
    { value: 'pending_verification', label: 'Pending Verification', variant: 'info'    },
    { value: 'verified',             label: 'Verified',             variant: 'success' },
    { value: 'archived',             label: 'Archived',             variant: 'neutral' },
    { value: 'cancelled',            label: 'Cancelled',            variant: 'danger'  },
  ];

  /**
   * Parse estimated useful life string (e.g. "5 Years", "10 Years") into integer years.
   */
  function parseEulYears(eulString) {
    if (!eulString) return 5; // Default to 5
    const m = String(eulString).match(/(\d+)/);
    return m ? parseInt(m[1]) : 5;
  }

  /**
   * Calculate Remaining Useful Life (RUL) details for an item.
   * @param {string} dateIssuedStr - YYYY-MM-DD
   * @param {string} eulString - e.g. "5 Years"
   */
  function calculateRUL(dateIssuedStr, eulString) {
    if (!dateIssuedStr) return { daysRemaining: 0, yearsRemaining: 0, status: 'Normal' };

    const issueDate = new Date(dateIssuedStr + 'T00:00:00');
    const years = parseEulYears(eulString);

    // Calculate expiry date
    const expiryDate = new Date(issueDate);
    expiryDate.setFullYear(expiryDate.getFullYear() + years);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime      = expiryDate.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const yearsRemaining = parseFloat((daysRemaining / 365.25).toFixed(1));

    let status = 'Normal';
    if (daysRemaining <= 0) {
      status = 'Expired';
    } else if (daysRemaining <= 30) { // 1 month
      status = 'Approaching EUL';
    }

    return {
      daysRemaining,
      yearsRemaining: Math.max(0, yearsRemaining),
      status,
      expiryDate: expiryDate.toISOString().split('T')[0],
    };
  }

  return {
    ITEM_STATUSES,
    RECORD_STATUSES,
    calculateRUL,
  };
})();
