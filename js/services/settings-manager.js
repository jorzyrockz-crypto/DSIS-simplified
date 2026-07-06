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
    { id: 'default',  name: 'Default',  type: 'color',    val: '#f8fafc',  glass: 'rgba(255, 255, 255, 0.8)',    accent: '#6366f1' },
    { id: 'slate',    name: 'Slate',    type: 'color',    val: '#1e293b',  glass: 'rgba(255, 255, 255, 0.1)',    accent: '#94a3b8' },
    { id: 'sunset',   name: 'Sunset',   type: 'gradient', val: 'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)', glass: 'rgba(255, 255, 255, 0.7)',  accent: '#d946ef' },
    { id: 'ocean',    name: 'Ocean',    type: 'image',    val: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80', glass: 'rgba(255, 255, 255, 0.65)', accent: '#06b6d4' },
    { id: 'mountain', name: 'Mountain', type: 'image',    val: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80', glass: 'rgba(255, 255, 255, 0.7)',  accent: '#10b981' }
  ];

  window.applyAppTheme = (themeId) => {
    const theme = themes.find(t => t.id === themeId);
    if (!theme) return;

    const body = document.body;
    const root = document.documentElement;

    // Apply per-theme accent color and soft variant
    root.style.setProperty('--color-primary', theme.accent);
    root.style.setProperty('--color-primary-hover', theme.accent);
    root.style.setProperty('--color-primary-soft', theme.accent + '22');

    // Apply glass tint for background overlay elements
    root.style.setProperty('--glass-color', theme.glass);

    // Update active thumbnail classes
    document.querySelectorAll('.theme-thumb').forEach(t => t.classList.remove('active'));
    const activeThumb = document.querySelector(`[data-theme-id="${themeId}"]`);
    if (activeThumb) activeThumb.classList.add('active');

    // Apply background
    if (theme.type === 'image') {
      body.style.backgroundImage = `url(${theme.val})`;
      body.classList.add('workspace-enhanced-bg');
    } else if (theme.type === 'gradient') {
      body.style.backgroundImage = theme.val;
      body.classList.add('workspace-enhanced-bg');
    } else {
      body.style.backgroundImage = 'none';
      body.style.backgroundColor = theme.val;
      body.classList.remove('workspace-enhanced-bg');
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
