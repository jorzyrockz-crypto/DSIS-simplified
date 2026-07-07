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
    {
      id: 'default',
      name: 'Default',
      type: 'color',
      val: '#f8fafc',
      darkVal: '#111827',
      glass: 'rgba(255, 255, 255, 0.8)',
      accent: '#6366f1',
      calibration: { shellBlur: 22, shellSaturation: 145, contentBlur: 16, contentSaturation: 135, inputBlur: 7, surface: 0.22, surfaceStrong: 0.34, surfaceSoft: 0.14, border: 0.38, divider: 0.24, input: 0.54, inputBorder: 0.4 }
    },
    {
      id: 'office',
      name: 'Office',
      type: 'color',
      val: '#e8eef2',
      darkVal: '#122a2d',
      glass: 'rgba(247, 250, 252, 0.9)',
      accent: '#0f766e',
      calibration: { shellBlur: 18, shellSaturation: 118, contentBlur: 12, contentSaturation: 118, inputBlur: 6, surface: 0.18, surfaceStrong: 0.3, surfaceSoft: 0.11, border: 0.32, divider: 0.2, input: 0.5, inputBorder: 0.35 }
    },
    {
      id: 'office-warm',
      name: 'Office Warm',
      type: 'color',
      val: '#efe2d2',
      darkVal: '#342116',
      glass: 'rgba(255, 248, 239, 0.92)',
      accent: '#c26d1c',
      calibration: { shellBlur: 16, shellSaturation: 108, contentBlur: 11, contentSaturation: 108, inputBlur: 5, surface: 0.2, surfaceStrong: 0.32, surfaceSoft: 0.12, border: 0.34, divider: 0.2, input: 0.52, inputBorder: 0.36 }
    },
    {
      id: 'office-cool',
      name: 'Office Cool',
      type: 'color',
      val: '#dfeaf5',
      darkVal: '#14283f',
      glass: 'rgba(244, 249, 255, 0.92)',
      accent: '#2563eb',
      calibration: { shellBlur: 20, shellSaturation: 128, contentBlur: 13, contentSaturation: 128, inputBlur: 6, surface: 0.16, surfaceStrong: 0.24, surfaceSoft: 0.09, border: 0.28, divider: 0.18, input: 0.46, inputBorder: 0.32 }
    },
    {
      id: 'office-minimal',
      name: 'Office Minimal',
      type: 'color',
      val: '#e5e7eb',
      darkVal: '#1f2937',
      glass: 'rgba(250, 250, 250, 0.94)',
      accent: '#334155',
      calibration: { shellBlur: 12, shellSaturation: 100, contentBlur: 8, contentSaturation: 100, inputBlur: 4, surface: 0.12, surfaceStrong: 0.18, surfaceSoft: 0.06, border: 0.22, divider: 0.14, input: 0.4, inputBorder: 0.26 }
    },
    {
      id: 'slate',
      name: 'Slate',
      type: 'color',
      val: '#1e293b',
      darkVal: '#0f172a',
      glass: 'rgba(255, 255, 255, 0.1)',
      accent: '#94a3b8',
      calibration: { shellBlur: 20, shellSaturation: 130, contentBlur: 14, contentSaturation: 125, inputBlur: 7, surface: 0.2, surfaceStrong: 0.32, surfaceSoft: 0.12, border: 0.34, divider: 0.22, input: 0.48, inputBorder: 0.36 }
    },
    {
      id: 'sunset',
      name: 'Sunset',
      type: 'gradient',
      val: 'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)',
      darkTone: '#3b1f4a',
      glass: 'rgba(255, 255, 255, 0.7)',
      accent: '#d946ef',
      calibration: { shellBlur: 24, shellSaturation: 150, contentBlur: 17, contentSaturation: 140, inputBlur: 8, surface: 0.28, surfaceStrong: 0.42, surfaceSoft: 0.18, border: 0.4, divider: 0.25, input: 0.58, inputBorder: 0.43 }
    },
    {
      id: 'ocean',
      name: 'Ocean',
      type: 'image',
      val: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
      darkTone: '#082f49',
      glass: 'rgba(255, 255, 255, 0.65)',
      accent: '#06b6d4',
      calibration: { shellBlur: 28, shellSaturation: 165, contentBlur: 19, contentSaturation: 150, inputBlur: 8, surface: 0.24, surfaceStrong: 0.36, surfaceSoft: 0.15, border: 0.36, divider: 0.22, input: 0.55, inputBorder: 0.4 }
    },
    {
      id: 'mountain',
      name: 'Mountain',
      type: 'image',
      val: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
      darkTone: '#1f2937',
      glass: 'rgba(255, 255, 255, 0.7)',
      accent: '#0ea5a4',
      calibration: { shellBlur: 26, shellSaturation: 155, contentBlur: 18, contentSaturation: 145, inputBlur: 8, surface: 0.26, surfaceStrong: 0.39, surfaceSoft: 0.17, border: 0.38, divider: 0.24, input: 0.57, inputBorder: 0.42 }
    },
  ];

  function clampAlpha(value, min = 0, max = 1) {
    return Math.max(min, Math.min(max, value));
  }

  function getThemeProfile(themeId) {
    return themes.find(t => t.id === themeId)?.calibration || themes[0].calibration;
  }

  function getThemeById(themeId) {
    return themes.find(t => t.id === themeId) || themes[0];
  }

  function getEffectiveSurfaceOpacity(themeId, storedOpacity) {
    const theme = getThemeById(themeId);
    return theme.type === 'color' ? '100' : (storedOpacity || '75');
  }

  function getThemeDarkRgb(theme) {
    return hexToRgbString(theme.darkVal || theme.darkTone || theme.val);
  }

  function hexToRgbString(hex) {
    if (!hex || typeof hex !== 'string') return null;
    let h = hex.replace('#', '').trim();
    if (h.length === 3) {
      h = h.split('').map(c => c + c).join('');
    }
    if (h.length !== 6) return null;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }

  window.applyWorkspaceSurfaceOpacity = (opacityValue, themeMode = 'light', themeId = 'default') => {
    const root = document.documentElement;
    const normalizedOpacity = clampAlpha(Number(opacityValue) / 100, 0.1, 1);
    const isDark = themeMode === 'dark';
    const profile = getThemeProfile(themeId);
    const theme = getThemeById(themeId);
    const themeRgb = hexToRgbString(theme.val);
    const themeDarkRgb = getThemeDarkRgb(theme);
    const usesFlatThemeColor = theme.type === 'color' && Boolean(themeRgb);

    const glassRgb = isDark
      ? (themeDarkRgb || '31, 31, 32')
      : (usesFlatThemeColor ? themeRgb : '255, 255, 255');
    const surfaceRgb = isDark
      ? (themeDarkRgb || '15, 23, 42')
      : (usesFlatThemeColor ? themeRgb : '255, 255, 255');
    const borderRgb = isDark
      ? (themeDarkRgb || '148, 163, 184')
      : (usesFlatThemeColor ? themeRgb : '255, 255, 255');
    const textPrimary = isDark
      ? `rgba(248, 250, 252, ${clampAlpha(0.92 + (normalizedOpacity * 0.04), 0.9, 0.98)})`
      : `rgba(15, 23, 42, ${clampAlpha(0.9 + (normalizedOpacity * 0.08), 0.9, 0.98)})`;
    const textSecondary = isDark
      ? `rgba(226, 232, 240, ${clampAlpha(0.7 + (normalizedOpacity * 0.12), 0.68, 0.9)})`
      : `rgba(71, 85, 105, ${clampAlpha(0.68 + (normalizedOpacity * 0.16), 0.66, 0.86)})`;
    const textMuted = isDark
      ? `rgba(148, 163, 184, ${clampAlpha(0.64 + (normalizedOpacity * 0.1), 0.6, 0.82)})`
      : `rgba(100, 116, 139, ${clampAlpha(0.58 + (normalizedOpacity * 0.14), 0.56, 0.78)})`;
    const textShadow = isDark
      ? '0 1px 1px rgba(2, 6, 23, 0.28)'
      : '0 1px 1px rgba(255, 255, 255, 0.16)';

    root.style.setProperty('--workspace-glass-bg', `rgba(${glassRgb}, ${normalizedOpacity})`);
    root.style.setProperty('--workspace-shell-blur', `blur(${profile.shellBlur}px) saturate(${profile.shellSaturation}%)`);
    root.style.setProperty('--workspace-ui-blur', `blur(${profile.contentBlur}px) saturate(${profile.contentSaturation}%)`);
    root.style.setProperty('--workspace-input-blur', `blur(${profile.inputBlur}px)`);
    root.style.setProperty('--workspace-ui-surface', `rgba(${surfaceRgb}, ${clampAlpha(normalizedOpacity * profile.surface, 0.08, 0.5)})`);
    root.style.setProperty('--workspace-ui-surface-strong', `rgba(${surfaceRgb}, ${clampAlpha(normalizedOpacity * profile.surfaceStrong, 0.12, 0.62)})`);
    root.style.setProperty('--workspace-ui-surface-soft', `rgba(${surfaceRgb}, ${clampAlpha(normalizedOpacity * profile.surfaceSoft, 0.06, 0.34)})`);
    root.style.setProperty('--workspace-ui-border', `rgba(${borderRgb}, ${clampAlpha(normalizedOpacity * profile.border, 0.12, 0.42)})`);
    root.style.setProperty('--workspace-ui-divider', `rgba(${borderRgb}, ${clampAlpha(normalizedOpacity * profile.divider, 0.08, 0.3)})`);
    root.style.setProperty('--workspace-ui-input', `rgba(${surfaceRgb}, ${clampAlpha(normalizedOpacity * profile.input, 0.18, 0.58)})`);
    root.style.setProperty('--workspace-ui-input-border', `rgba(${borderRgb}, ${clampAlpha(normalizedOpacity * profile.inputBorder, 0.12, 0.44)})`);
    root.style.setProperty('--workspace-text-primary', textPrimary);
    root.style.setProperty('--workspace-text-secondary', textSecondary);
    root.style.setProperty('--workspace-text-muted', textMuted);
    root.style.setProperty('--workspace-text-shadow', textShadow);
  };

  // Robust theme applier: returns true on success, false if themeId not found
  window.applyAppTheme = (themeId) => {
    const theme = getThemeById(themeId);
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

    const primaryLight = accent.startsWith('#') ? hexToRgba(accent, 0.08) : soft;
    const primaryMuted = accent.startsWith('#') ? hexToRgba(accent, 0.16) : soft;
    const sidebarHover = accent.startsWith('#') ? hexToRgba(accent, 0.07) : soft;
    const sidebarActiveBg = accent.startsWith('#') ? hexToRgba(accent, 0.12) : soft;

    // Apply CSS variables
    if (accent) root.style.setProperty('--color-primary', accent);
    root.style.setProperty('--color-primary-hover', accent || '');
    if (soft) root.style.setProperty('--color-primary-soft', soft);
    if (primaryLight) root.style.setProperty('--color-primary-light', primaryLight);
    if (primaryMuted) root.style.setProperty('--color-primary-muted', primaryMuted);
    if (accent) root.style.setProperty('--color-info', accent);
    if (primaryLight) root.style.setProperty('--color-info-light', primaryLight);
    if (accent) root.style.setProperty('--color-sidebar-active', accent);
    if (sidebarHover) root.style.setProperty('--color-sidebar-hover', sidebarHover);
    if (sidebarActiveBg) root.style.setProperty('--color-sidebar-active-bg', sidebarActiveBg);
    if (theme.glass) root.style.setProperty('--glass-color', theme.glass);
    root.setAttribute('data-workspace-theme', themeId);

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
          try {
            const settings = get();
            window.applyWorkspaceSurfaceOpacity(
              getEffectiveSurfaceOpacity(themeId, settings.bgOpacity),
              settings.theme || 'light',
              themeId
            );
          } catch {}
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
      try {
        const settings = get();
        window.applyWorkspaceSurfaceOpacity(
          getEffectiveSurfaceOpacity(themeId, settings.bgOpacity),
          settings.theme || 'light',
          themeId
        );
      } catch {}
    } else {
      root.style.setProperty('--workspace-theme-image', 'none');
      root.style.setProperty('--workspace-theme-color', theme.val || '');
      // color or default
      body.style.backgroundImage = 'none';
      body.style.backgroundColor = (
        document.documentElement.getAttribute('data-theme') === 'dark'
          ? (theme.darkVal || theme.val || '')
          : (theme.val || '')
      );
      body.classList.remove('workspace-enhanced-bg', 'workspace-bg-loading');
      try {
        const settings = get();
        window.applyWorkspaceSurfaceOpacity(
          getEffectiveSurfaceOpacity(themeId, settings.bgOpacity),
          settings.theme || 'light',
          themeId
        );
      } catch {}
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
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const theme = getThemeById(document.documentElement.getAttribute('data-workspace-theme') || DEFAULTS.bgTheme);
    const fallbackBg = isDark
      ? (theme.darkVal || theme.darkTone || '#1e293b')
      : (theme.type === 'color' ? (theme.val || '#ffffff') : '#ffffff');
    const fallbackBorder = isDark
      ? (theme.darkVal || theme.darkTone || '#334155')
      : (theme.type === 'color' ? (theme.val || '#e4e4e7') : '#e4e4e7');
    document.documentElement.style.setProperty('--workspace-fallback-bg', fallbackBg);
    document.documentElement.style.setProperty('--workspace-fallback-border', fallbackBorder);

    const body = document.body;
    if (!body) return;

    body.classList.toggle('glass-disabled-header', !settings.header);
    body.classList.toggle('glass-disabled-sidebar', !settings.sidebar);
    body.classList.toggle('glass-disabled-center', !settings.center);
    body.classList.toggle('glass-disabled-right', !settings.right);
  };

  return { get, save, DEFAULTS, themes };
})();
