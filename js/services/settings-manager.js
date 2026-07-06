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
    bgTheme: 'default',
    bgOpacity: '75',
    applyGlassHeader: true,
    applyGlassSidebar: true,
    applyGlassCenter: true,
    applyGlassRight: true
  };

  const themes = [
    { id: 'default',  name: 'Default',  type: 'color',    val: '#f8fafc',  glass: 'rgba(255, 255, 255, 0.8)',    accent: '#6366f1' },
    { id: 'slate',    name: 'Slate',    type: 'color',    val: '#1e293b',  glass: 'rgba(255, 255, 255, 0.1)',    accent: '#94a3b8' },
    { id: 'sunset',   name: 'Sunset',   type: 'gradient', val: 'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)', glass: 'rgba(255, 255, 255, 0.7)',  accent: '#d946ef' },
    { id: 'ocean',    name: 'Ocean',    type: 'image',    val: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80', glass: 'rgba(255, 255, 255, 0.65)', accent: '#06b6d4' },
    { id: 'mountain', name: 'Mountain', type: 'image',    val: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80', glass: 'rgba(255, 255, 255, 0.7)',  accent: '#0ea5a4' },
  ];

  // Robust theme applier: returns true on success, false if themeId not found
  window.applyAppTheme = (themeId) => {
    const theme = themes.find(t => t.id === themeId);
    const root = document.documentElement;
    const body = document.body;

    // Helper: convert #RRGGBB or #RGB to rgba(r,g,b,a)
    function hexToRgba(hex, alpha = 0.133) {
      if (!hex || typeof hex !== 'string') return null;
      let h = hex.replace('#', '').trim();
      if (h.length === 3) {
        h = h.split('').map(c => c + c).join('');
      }
      if (h.length !== 6) return null;
      const r = parseInt(h.slice(0,2), 16);
      const g = parseInt(h.slice(2,4), 16);
      const b = parseInt(h.slice(4,6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // If theme doesn't exist, clear previously-applied bg/theme variables and return false
    if (!theme) {
      // Clear accents
      root.style.removeProperty('--color-primary');
      root.style.removeProperty('--color-primary-hover');
      root.style.removeProperty('--color-primary-soft');
      root.style.removeProperty('--glass-color');
      root.style.removeProperty('--workspace-theme-image');
      root.style.removeProperty('--workspace-theme-color');
      // Clear body background
      body.style.backgroundImage = '';
      body.style.backgroundColor = '';
      body.classList.remove('workspace-enhanced-bg', 'workspace-bg-loading');
      // Clear active thumb if present
      try { document.querySelectorAll('.theme-thumb').forEach(t => t.classList.remove('active')); } catch (e) {}
      return false;
    }

    // Compute safe accent + soft variant
    const accent = theme.accent || '';
    let soft = null;
    if (accent.startsWith('#')) {
      // Use ~0.133 alpha (hex 22 ≈ 34/255 ≈ 0.133)
      soft = hexToRgba(accent, 0.133);
    } else if (/^rgba?\(/.test(accent)) {
      // If already rgba() or rgb(), add alpha if missing (simple approach)
      soft = accent.replace(/rgba?\(([^)]+)\)/, (m, inner) => {
        const parts = inner.split(',').map(p => p.trim());
        // If already has 4th alpha value, reduce it
        if (parts.length === 4) {
          const a = parseFloat(parts[3]);
          parts[3] = Math.max(0, Math.min(1, a * 0.6)).toString();
        } else {
          parts.push('0.13');
        }
        return `rgba(${parts.join(', ')})`;
      });
    } else {
      // Fallback: attempt to use provided value as-is (best-effort)
      soft = accent || null;
    }

    // Apply CSS variables
    if (accent) root.style.setProperty('--color-primary', accent);
    root.style.setProperty('--color-primary-hover', accent || '');
    if (soft) root.style.setProperty('--color-primary-soft', soft);
    if (theme.glass) root.style.setProperty('--glass-color', theme.glass);

    // Update active thumbnail classes if thumbnails exist
    try {
      document.querySelectorAll('.theme-thumb').forEach(t => t.classList.remove('active'));
      const activeThumb = document.querySelector(`[data-theme-id="${themeId}"]`);
      if (activeThumb) activeThumb.classList.add('active');
    } catch (e) {
      // ignore — thumbnails may not be in DOM yet
    }

    // Apply background depending on type.
    // For images, preload then apply to avoid flash and wasted reflows.
    if (theme.type === 'image') {
      root.style.setProperty('--workspace-theme-image', `url("${theme.val}")`);
      root.style.removeProperty('--workspace-theme-color');
      // indicate loading state
      body.classList.add('workspace-bg-loading');
      const img = new Image();
      img.onload = () => {
        try {
          body.style.backgroundImage = `url("${theme.val}")`;
          body.style.backgroundColor = '';
          body.classList.add('workspace-enhanced-bg');
        } catch (e) {
          body.style.backgroundImage = '';
          body.classList.remove('workspace-enhanced-bg');
        }
        body.classList.remove('workspace-bg-loading');
      };
      img.onerror = () => {
        body.style.backgroundImage = '';
        body.classList.remove('workspace-enhanced-bg', 'workspace-bg-loading');
      };
      // start preload; this will start network fetch but only set background after load
      img.src = theme.val;
    } else if (theme.type === 'gradient') {
      root.style.setProperty('--workspace-theme-image', theme.val);
      root.style.removeProperty('--workspace-theme-color');
      // apply gradient directly
      body.style.backgroundImage = theme.val;
      body.style.backgroundColor = '';
      body.classList.add('workspace-enhanced-bg');
      body.classList.remove('workspace-bg-loading');
    } else {
      root.style.setProperty('--workspace-theme-image', 'none');
      root.style.setProperty('--workspace-theme-color', theme.val || '');
      // color or default
      body.style.backgroundImage = 'none';
      body.style.backgroundColor = theme.val || '';
      body.classList.remove('workspace-enhanced-bg', 'workspace-bg-loading');
    }

    return true;
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
        // applyAppTheme returns true if theme applied; fallback to default if false
        const applied = window.applyAppTheme(settings.bgTheme);
        if (!applied) {
          // fallback to default theme to avoid leaving stale state
          try { window.applyAppTheme(DEFAULTS.bgTheme); } catch (e) {}
        }
      }
      // Apply glass section toggles immediately
      if (window.updateWorkspaceGlassToggles) {
        window.updateWorkspaceGlassToggles({
          header: settings.applyGlassHeader !== false,
          sidebar: settings.applyGlassSidebar !== false,
          center: settings.applyGlassCenter !== false,
          right: settings.applyGlassRight !== false
        });
      }
    } catch (err) {
      console.error('[SettingsManager] Save error:', err);
    }
  }

  // Global toggle stylesheet renderer
  window.updateWorkspaceGlassToggles = (settings) => {
    let style = document.getElementById('theme-section-logic');
    if (!style) {
      style = document.createElement('style');
      style.id = 'theme-section-logic';
      document.head.appendChild(style);
    }

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const fallbackBg = isDark ? '#1e293b' : '#ffffff';
    const fallbackBorder = isDark ? '#334155' : '#e4e4e7';

    style.innerHTML = `
      ${!settings.header ? `body.workspace-enhanced-bg header#header { background: ${fallbackBg} !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important; border-bottom: 1px solid ${fallbackBorder} !important; }` : ''}
      ${!settings.sidebar ? `body.workspace-enhanced-bg #sidebar { background: ${fallbackBg} !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important; border-right: 1px solid ${fallbackBorder} !important; }` : ''}
      ${!settings.center ? `body.workspace-enhanced-bg #workspace, body.workspace-enhanced-bg .context-card, body.workspace-enhanced-bg .stat-card, body.workspace-enhanced-bg .notif-card, body.workspace-enhanced-bg .inspector-card, body.workspace-enhanced-bg .hero-section { background: ${fallbackBg} !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important; border: 1px solid ${fallbackBorder} !important; box-shadow: none !important; }
      body.workspace-enhanced-bg .wizard-sticky-bar, body.workspace-enhanced-bg .form-card, body.workspace-enhanced-bg .wizard-step-panel { background: ${fallbackBg} !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important; border: 1px solid ${fallbackBorder} !important; box-shadow: none !important; }` : ''}
      ${!settings.right ? `body.workspace-enhanced-bg #context-panel, body.workspace-enhanced-bg #context-drawer, body.workspace-enhanced-bg .panel-header, body.workspace-enhanced-bg .drawer-handle { background: ${fallbackBg} !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important; border-left: 1px solid ${fallbackBorder} !important; box-shadow: none !important; }` : ''}
    `;
  };

  return { get, save, DEFAULTS, themes };
})();
