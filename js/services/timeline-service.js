/**
 * ICS Tracking & Monitoring Tool
 * Phase 4: ICS Record Viewer, Timeline & Monitoring — Timeline Service
 */
'use strict';

const TimelineService = (() => {

  const ACTIONS = {
    created:               'Record Created',
    draft_saved:           'Draft Saved',
    edited:                'Record Edited',
    item_added:            'Item Added',
    item_removed:          'Item Removed',
    recipient_changed:     'Recipient Updated',
    archived:              'Record Archived',
    restored:              'Record Restored',
    viewed:                'Record Viewed',
    status_changed:        'Status Changed',
    item_status_changed:   'Item Status Updated',
    note_added:            'Internal Note Added',
    note_deleted:          'Internal Note Deleted',
  };

  /**
   * Log an event to a record's audit timeline.
   * Modifies the record object in place and logs the action.
   * @param {Object} record
   * @param {string} action - key from ACTIONS
   * @param {string} notes - optional notes detail
   */
  function logEvent(record, action, notes = '') {
    if (!record) return;
    if (!record.timeline) record.timeline = [];

    const label = ACTIONS[action] || action;

    const event = {
      id:        Utils.uuid(),
      timestamp: new Date().toISOString(),
      action:    label,
      user:      'Supply Officer', // Placeholder user
      device:    'Local Browser',  // Placeholder device
      notes:     String(notes).trim(),
    };

    // Unshift to keep newest first
    record.timeline.unshift(event);
  }

  return { logEvent, ACTIONS };
})();
