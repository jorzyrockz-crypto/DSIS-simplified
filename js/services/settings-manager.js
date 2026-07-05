/**
 * ICS Tracking & Monitoring Tool
 * Phase 6: Reports, Printing & Data Management — Settings Manager
 */
'use strict';

const SettingsManager = (() => {
  const STORAGE_KEY = 'ics-settings-v1';

  const DEFAULTS = {
    schoolName: 'Division Office High School',
    office: 'Supply Office',
    entityName: 'Department of Education',
    address: 'General Santos City, South Cotabato',
    fundCluster: '01',
    propertyCustodian: 'Supply Officer Name',
    signatories: {
      receivedFrom: 'Supply Officer / Property Custodian',
      receivedFromDesignation: 'Supply Officer II',
      receivedBy: 'End User / Recipient',
      receivedByDesignation: 'Teacher / Staff',
    },
    icsNumberFormat: 'YYYY-MM-###',
    sequenceReset: 'yearly',
    yearPrefix: true,
    manualOverride: false,
    theme: 'light'
  };

  function get() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? { ...DEFAULTS, ...JSON.parse(data) } : { ...DEFAULTS };
    } catch {
      return { ...DEFAULTS };
    }
  }

  function save(settings) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      // Apply theme immediately if page supports it
      if (settings.theme) {
        document.documentElement.setAttribute('data-theme', settings.theme);
      }
    } catch (err) {
      console.error('[SettingsManager] Save error:', err);
    }
  }

  return { get, save, DEFAULTS };
})();
