/**
 * ICS Tracking & Monitoring Tool
 * Phase 5: Smart Search, Filters, Notifications — Notification Engine
 */
'use strict';

const NotificationEngine = (() => {
  const STATE_KEY = 'ics-notifications-user-state';

  function _readStates() {
    try { return JSON.parse(localStorage.getItem(STATE_KEY)) || {}; }
    catch { return {}; }
  }

  function _writeStates(states) {
    try { localStorage.setItem(STATE_KEY, JSON.stringify(states)); }
    catch { /* ignore */ }
  }

  /**
   * Run full audit logs against all records to generate notifications.
   * @param {Array} records - All database records
   */
  function generate(records) {
    const list = [];
    const states = _readStates();

    // Group items by inventory item number to identify duplicates
    const invMap = {};
    const serialMap = {};
    const activeRecs = records.filter(r => r.status !== 'archived' && r.status !== 'cancelled');

    activeRecs.forEach(r => {
      if (!r.items) return;
      r.items.forEach(item => {
        if (item.inventoryItemNumber) {
          const inv = item.inventoryItemNumber.trim().toUpperCase();
          if (!invMap[inv]) invMap[inv] = [];
          invMap[inv].push(r);
        }
        if (item.serialNumber) {
          const sn = item.serialNumber.trim().toUpperCase();
          if (!serialMap[sn]) serialMap[sn] = [];
          serialMap[sn].push(r);
        }
      });
    });

    records.forEach(r => {
      const isDraft = r.status === 'draft';
      const rName = r.receivedBy || 'Unnamed Recipient';

      // ── Check 1: Duplicate ICS Number ──
      if (r.icsNumber && r.status !== 'archived') {
        const matches = activeRecs.filter(o => o.id !== r.id && o.icsNumber && o.icsNumber.trim().toLowerCase() === r.icsNumber.trim().toLowerCase());
        if (matches.length > 0) {
          list.push(_buildNotif({
            id: `dup-ics-${r.id}`,
            recordId: r.id,
            icsNumber: r.icsNumber,
            title: 'Duplicate ICS Number Detected',
            desc: `ICS Number "${r.icsNumber}" conflicts with another active record.`,
            category: 'critical',
          }));
        }
      }

      // ── Check 2: Drafts Not Completed ──
      if (isDraft) {
        const createdTime = new Date(r.createdDate).getTime();
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        if (createdTime < oneDayAgo) {
          list.push(_buildNotif({
            id: `draft-pending-${r.id}`,
            recordId: r.id,
            icsNumber: r.icsNumber || '(Draft)',
            title: 'Unfinished Draft Alert',
            desc: `Draft "${r.icsNumber || 'Untitled'}" was created over 24 hours ago.`,
            category: 'reminder',
          }));
        }
      }

      // ── Check 3: Missing Fields ──
      if (r.status === 'active' || r.status === 'verified') {
        const missing = [];
        if (!r.receivedBy) missing.push('Recipient');
        if (!r.issuedBy) missing.push('Issued By');
        if (r.items && r.items.length === 0) missing.push('Item entries');

        if (missing.length > 0) {
          list.push(_buildNotif({
            id: `missing-fields-${r.id}`,
            recordId: r.id,
            icsNumber: r.icsNumber,
            title: 'Missing Required Fields',
            desc: `Active record is missing critical information: ${missing.join(', ')}.`,
            category: 'warning',
          }));
        }
      }

      // ── Check 4: Large Asset Value (Cost Variance) ──
      if (r.totalCost > 100000 && r.status !== 'cancelled') {
        list.push(_buildNotif({
          id: `large-cost-${r.id}`,
          recordId: r.id,
          icsNumber: r.icsNumber,
          title: 'High-Value Asset Slip',
          desc: `ICS contains total asset value exceeding ₱100,000 (${Utils.formatCurrency(r.totalCost)}).`,
          category: 'info',
        }));
      }

      // ── Check 5: EUL Warnings ──
      if (r.items && r.status !== 'archived' && r.status !== 'cancelled') {
        r.items.forEach(item => {
          const rul = MonitoringService.calculateRUL(r.dateIssued, item.estimatedUsefulLife);
          if (rul.status === 'Expired') {
            list.push(_buildNotif({
              id: `eul-expired-${item.id}`,
              recordId: r.id,
              icsNumber: r.icsNumber,
              title: 'Expired Asset EUL',
              desc: `Item "${item.description}" has expired estimated useful life.`,
              category: 'warning',
            }));
          } else if (rul.status === 'Approaching EUL') {
            list.push(_buildNotif({
              id: `eul-approach-${item.id}`,
              recordId: r.id,
              icsNumber: r.icsNumber,
              title: 'Approaching End of Life',
              desc: `Item "${item.description}" approaches EUL in ${rul.daysRemaining} days.`,
              category: 'reminder',
            }));
          }
        });
      }
    });

    // ── Check 6: Duplicate Inventory Item Numbers ──
    Object.entries(invMap).forEach(([invNum, recList]) => {
      if (recList.length > 1) {
        recList.forEach(r => {
          list.push(_buildNotif({
            id: `dup-inv-${invNum}-${r.id}`,
            recordId: r.id,
            icsNumber: r.icsNumber,
            title: 'Duplicate Inventory Number',
            desc: `Inventory No. "${invNum}" is assigned to multiple active records.`,
            category: 'critical',
          }));
        });
      }
    });

    // ── Check 7: Duplicate Serial Numbers ──
    Object.entries(serialMap).forEach(([sn, recList]) => {
      if (recList.length > 1) {
        recList.forEach(r => {
          list.push(_buildNotif({
            id: `dup-serial-${sn}-${r.id}`,
            recordId: r.id,
            icsNumber: r.icsNumber,
            title: 'Duplicate Serial Number',
            desc: `Serial Number "${sn}" conflicts across multiple active items.`,
            category: 'warning',
          }));
        });
      }
    });

    // Restore user states and filter out dismissed notifications
    return list.map(item => {
      const state = states[item.id] || {};
      return {
        ...item,
        read:      !!state.read,
        pinned:    !!state.pinned,
        dismissed: !!state.dismissed,
      };
    }).filter(item => !item.dismissed);
  }

  function _buildNotif({ id, recordId, icsNumber, title, desc, category }) {
    return {
      id,
      recordId,
      icsNumber,
      title,
      desc,
      category, // 'info' | 'reminder' | 'warning' | 'critical'
      timestamp: new Date().toISOString(),
      read: false,
      pinned: false,
      dismissed: false
    };
  }

  /* User Actions */
  function markRead(id) {
    const states = _readStates();
    if (!states[id]) states[id] = {};
    states[id].read = true;
    _writeStates(states);
  }

  function togglePin(id) {
    const states = _readStates();
    if (!states[id]) states[id] = {};
    states[id].pinned = !states[id].pinned;
    _writeStates(states);
  }

  function dismiss(id) {
    const states = _readStates();
    if (!states[id]) states[id] = {};
    states[id].dismissed = true;
    _writeStates(states);
  }

  return { generate, markRead, togglePin, dismiss };
})();
