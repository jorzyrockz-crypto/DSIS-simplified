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
    theme: 'light',
    bgTheme: 'default'
  };

  const themes = [
    { id: 'default', name: 'Default', type: 'color', val: '#f8fafc' },
    { id: 'slate', name: 'Slate', type: 'color', val: '#334155' },
    { id: 'sunset', name: 'Sunset', type: 'gradient', val: 'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)' },
    { id: 'ocean', name: 'Ocean', type: 'image', val: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80' },
    { id: 'mountain', name: 'Mountain', type: 'image', val: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80' }
  ];

  window.applyAppTheme = (themeId) => {
    const theme = themes.find(t => t.id === themeId);
    if (!theme) return;
    
    const body = document.body;
    if (theme.type === 'image') {
        body.style.backgroundImage = `url(${theme.val})`;
        body.style.backgroundSize = 'cover';
        body.style.backgroundAttachment = 'fixed';
        body.classList.add('theme-image-active');
    } else {
        body.style.backgroundImage = 'none';
        body.style.backgroundColor = theme.val;
        body.classList.remove('theme-image-active');
    }

    // Border highlights on thumbnail selections
    document.querySelectorAll('.theme-thumb div').forEach(div => {
      div.style.borderColor = 'transparent';
    });
    const selectedThumb = document.getElementById(`theme-preview-${themeId}`);
    if (selectedThumb) {
      selectedThumb.style.borderColor = 'var(--color-primary)';
    }
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
      if (settings.bgTheme) {
        window.applyAppTheme(settings.bgTheme);
      }
    } catch (err) {
      console.error('[SettingsManager] Save error:', err);
    }
  }

  return { get, save, DEFAULTS, themes };
})();
