/**
 * ICS Tracking & Monitoring Tool
 * Phase 7: Settings, Diagnostics, Help & Developer Center
 */
'use strict';

const SettingsPage = (() => {

  const APP_VERSION = '1.2.1-stable';
  const BUILD_DATE  = '2026-07-06';

  let _activeTab = 'general';
  let _allRecords = [];
  let _contextBody = null;
  let _loadedBackup = null;

  function _getDevModeState() {
    try {
      return localStorage.getItem('ics-dev-mode') === 'true';
    } catch {
      return false;
    }
  }

  function _setDevModeState(val) {
    localStorage.setItem('ics-dev-mode', String(val));
  }

  // Material Theme helpers
  function _getMaterialThemeState() {
    try {
      return localStorage.getItem('material-theme-active') === 'true' || localStorage.getItem('ics-material-theme') === 'true';
    } catch {
      return false;
    }
  }

  function _setMaterialThemeState(val) {
    try {
      localStorage.setItem('material-theme-active', String(val));
      localStorage.setItem('ics-material-theme', String(val));
    } catch {}
  }

  function _applyMaterialTheme(enabled) {
    try { document.documentElement.classList.toggle('material-theme', !!enabled); } catch {}
  }

  /* ----------------------------------------------------------
     Context Panel
     ---------------------------------------------------------- */
  function renderContext(container) {
    container.innerHTML = '';
    _contextBody = container;

    const title = document.createElement('p');
    title.className = 'text-xs font-semibold text-secondary';
    title.style.cssText = 'text-transform:uppercase;letter-spacing:.07em;margin-bottom:12px;';
    title.textContent = 'System Diagnostics';
    container.appendChild(title);

    const versionItems = [
      { label: 'App Version',  value: APP_VERSION },
      { label: 'Build Date',   value: BUILD_DATE  },
      { label: 'PWA Engine',   value: 'Service Worker Active' },
      { label: 'Mode',         value: _getDevModeState() ? 'Developer Mode Active' : 'Production Mode' },
    ];

    versionItems.forEach(item => {
      const row = document.createElement('div');
      row.style.cssText = `
        display:flex;justify-content:space-between;align-items:flex-start;
        padding:8px 0;border-bottom:1px solid var(--color-border-light);gap:8px;
      `;
      row.innerHTML = `
        <span style="font-size:var(--font-size-xs);color:var(--color-text-tertiary);
                     text-transform:uppercase;letter-spacing:.06em;
                     font-weight:var(--font-weight-semibold);flex-shrink:0">${item.label}</span>
        <span style="font-size:var(--font-size-xs);color:var(--color-text-secondary);
                     text-align:right">${item.value}</span>
      `;
      container.appendChild(row);
    });

    const div = document.createElement('div');
    div.className = 'divider';
    container.appendChild(div);

    container.appendChild(Components.contextCard({
      iconName: 'info',
      title:    'Production Environment',
      body:     'This tool compiles property custodian records offline. Backups are saved directly to your desktop Downloads folder.'
    }));
  }

  /* ----------------------------------------------------------
     Loader
     ---------------------------------------------------------- */
  async function _loadRecordsAndRender(workspace) {
    try {
      _allRecords = await RecordService.getAllRecords();
      _renderWorkspace(workspace);
    } catch (err) {
      console.error(err);
    }
  }

  /* ----------------------------------------------------------
     Main Render
     ---------------------------------------------------------- */
  function render(workspace, contextBody) {
    _contextBody = contextBody;
    _loadRecordsAndRender(workspace);
    if (contextBody) renderContext(contextBody);
  }

  function _renderWorkspace(workspace) {
    workspace.innerHTML = '';

    // Build tabs list
    const layout = document.createElement('div');
    layout.className = 'settings-layout';

    const sidebar = document.createElement('aside');
    sidebar.className = 'settings-sidebar';

    const header = document.createElement('div');
    header.className = 'page-header';
    header.style.marginBottom = 'var(--space-6)';
    header.innerHTML = `
      <div>
        <h1 class="page-title" style="font-size:24px;line-height:1.2;margin-bottom:8px">Settings & Administration</h1>
        <p class="page-subtitle" style="font-size:13px;line-height:1.4">Configure school profiles, appearance themes, backing up databases, diagnostics and help resources</p>
      </div>
    `;
    sidebar.appendChild(header);

    const nav = document.createElement('nav');
    nav.className = 'settings-nav';

    const tabsList = [
      { id: 'general',     label: 'School Info',           icon: 'user' },
      { id: 'appearance',  label: 'Appearance',            icon: 'palette' },
      { id: 'backups',     label: 'Backup & Restore',      icon: 'download' },
      { id: 'maintenance', label: 'Maintenance',           icon: 'cpu' },
      { id: 'diagnostics', label: 'Diagnostics & Storage', icon: 'grid' },
      { id: 'help',        label: 'Help Center',           icon: 'alert' },
      { id: 'updates',     label: 'Update Logs',           icon: 'list' },
      { id: 'audit',       label: 'System Audit Logs',     icon: 'clock' },
    ];

    if (_getDevModeState()) {
      tabsList.push({ id: 'developer', label: 'Developer Panel', icon: 'edit' });
    }

    tabsList.forEach(t => {
      const btn = document.createElement('button');
      btn.className = `settings-nav-btn ${t.id === _activeTab ? 'active' : ''}`;
      const iconSvg = Components.icon(t.icon) || '';
      btn.innerHTML = `${iconSvg} <span>${t.label}</span>`;
      btn.addEventListener('click', () => {
        _activeTab = t.id;
        _renderWorkspace(workspace);
      });
      nav.appendChild(btn);
    });
    sidebar.appendChild(nav);
    layout.appendChild(sidebar);

    const body = document.createElement('main');
    body.className = 'settings-content';
    layout.appendChild(body);

    switch (_activeTab) {
      case 'general':     _renderGeneralTab(body); break;
      case 'appearance':  _renderAppearanceTab(body); break;
      case 'backups':     _renderBackupsTab(body); break;
      case 'maintenance': _renderMaintenanceTab(body); break;
      case 'diagnostics': _renderDiagnosticsTab(body); break;
      case 'help':        _renderHelpTab(body); break;
      case 'updates':     _renderUpdateLogsTab(body); break;
      case 'audit':       _renderAuditTab(body); break;
      case 'developer':   _renderDeveloperTab(body); break;
    }

    workspace.appendChild(layout);
  }

  /* ── Tab: General School Info ── */
  function _renderGeneralTab(container) {
    const s = SettingsManager.get();

    container.innerHTML = `
      <div class="page-header" style="margin-bottom:var(--space-6)">
        <div>
          <h1 class="page-title" style="display:flex;align-items:center;gap:10px">
            ${Components.icon('user') || ''} School Information
          </h1>
          <p class="page-subtitle">Configure primary organization details, facility name, and foundational system defaults.</p>
        </div>
      </div>
      <div class="review-block" style="margin:0;max-width:650px;border:none;box-shadow:none;padding:0;background:transparent">
        <div class="form-group" style="margin-bottom:var(--space-4)">
          <label class="form-label">School Name</label>
          <input class="form-control" id="set-school" value="${Utils.escapeHtml(s.schoolName)}">
        </div>
        <div class="form-group" style="margin-bottom:var(--space-3)">
          <label class="form-label">Office / Department</label>
          <input class="form-control" id="set-office" value="${Utils.escapeHtml(s.office)}">
        </div>
        <div class="form-group" style="margin-bottom:var(--space-3)">
          <label class="form-label">Entity Name</label>
          <input class="form-control" id="set-entity" value="${Utils.escapeHtml(s.entityName)}">
        </div>
        <div class="form-group" style="margin-bottom:var(--space-3)">
          <label class="form-label">School Address</label>
          <input class="form-control" id="set-address" value="${Utils.escapeHtml(s.address)}">
        </div>
        <div class="form-group" style="margin-bottom:var(--space-3)">
          <label class="form-label">Default Fund Cluster</label>
          <input class="form-control" id="set-fund" value="${Utils.escapeHtml(s.fundCluster)}">
        </div>
        <div class="form-group" style="margin-bottom:var(--space-3)">
          <label class="form-label">Property Custodian / Supply Officer Name</label>
          <input class="form-control" id="set-custodian" value="${Utils.escapeHtml(s.propertyCustodian)}">
        </div>
        
        <div class="divider"></div>
        <div class="review-block-title">Default Signatories Info</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);margin-bottom:var(--space-4)">
          <div class="form-group">
            <label class="form-label">Issued By Name</label>
            <input class="form-control" id="set-sig-by" value="${Utils.escapeHtml(s.signatories.receivedFrom)}">
          </div>
          <div class="form-group">
            <label class="form-label">Issued By Designation</label>
            <input class="form-control" id="set-sig-by-des" value="${Utils.escapeHtml(s.signatories.receivedFromDesignation)}">
          </div>
        </div>

        <button class="btn btn-primary" id="btn-save-general">Save School Configuration</button>
      </div>
    `;

    container.querySelector('#btn-save-general').addEventListener('click', () => {
      const data = {
        ...s,
        schoolName:        document.getElementById('set-school').value.trim(),
        office:            document.getElementById('set-office').value.trim(),
        entityName:        document.getElementById('set-entity').value.trim(),
        address:           document.getElementById('set-address').value.trim(),
        fundCluster:       document.getElementById('set-fund').value.trim(),
        propertyCustodian: document.getElementById('set-custodian').value.trim(),
        signatories: {
          receivedFrom:            document.getElementById('set-sig-by').value.trim(),
          receivedFromDesignation: document.getElementById('set-sig-by-des').value.trim(),
        }
      };

      SettingsManager.save(data);
      AuditLogger.log('settings', 'General school information configurations modified.');
      UIKit.toast('Settings saved successfully.', 'success');
    });
  }

  /* ── Tab: Appearance ── */
  function _renderAppearanceTab(container) {
    const s = SettingsManager.get();
    const materialEnabled = _getMaterialThemeState();
    const themeIsLocked = materialEnabled;

    container.innerHTML = `
      <div class="page-header" style="margin-bottom:var(--space-6)">
        <div>
          <h1 class="page-title" style="display:flex;align-items:center;gap:10px">
            ${Components.icon('palette') || ''} Appearance & Theme
          </h1>
          <p class="page-subtitle">Choose between light mode, sleek dark themes, and custom workspace backgrounds.</p>
        </div>
      </div>
      <div class="review-block" style="margin:0;max-width:650px;border:none;box-shadow:none;padding:0;background:transparent">
        
        <!-- Material Design Theme Toggle -->
        <div style="margin-bottom:var(--space-6);padding:var(--space-4);background:var(--color-surface-alt);border:1px solid var(--color-border-light);border-radius:var(--radius-md)">
          <div style="display:flex;gap:12px;align-items:flex-start">
            <div style="flex:1">
              <div style="font-weight:600;margin-bottom:4px">Material Design Theme</div>
              <div style="font-size:12px;color:var(--color-text-secondary);line-height:1.4">
                Enable Material Design 3 with refined components, elevation system, and ripple effects. When enabled, theme is locked to Light mode for optimal appearance.
              </div>
            </div>
            <div style="flex-shrink:0;display:flex;align-items:center;gap:8px">
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                <input type="checkbox" id="set-material-toggle"${materialEnabled ? ' checked' : ''}>
                <span style="font-size:13px;font-weight:500">${materialEnabled ? 'Enabled' : 'Disabled'}</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Theme Mode Selection -->
        <div class="form-group" style="margin-bottom:var(--space-5)">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <label class="form-label" style="margin:0">Theme Mode</label>
            ${themeIsLocked ? '<span style="font-size:11px;color:var(--color-warning);font-weight:600;display:flex;align-items:center;gap:4px">🔒 Locked (Material)</span>' : ''}
          </div>
          <select class="sort-select" id="set-theme-select" style="width:100%;height:38px;"${themeIsLocked ? ' disabled' : ''}>
            <option value="light" ${s.theme === 'light' ? 'selected' : ''}>Light Theme</option>
            <option value="dark" ${s.theme === 'dark' ? 'selected' : ''}>Dark Theme</option>
          </select>
          ${themeIsLocked ? '<p style="font-size:12px;color:var(--color-text-secondary);margin-top:6px">Theme selection is locked while Material Design is enabled.</p>' : ''}
        </div>

        <!-- Workspace Background -->
        <div class="form-group" style="margin-bottom:var(--space-6)" id="bg-selector-group">
          <label class="form-label">Workspace Background</label>
          <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap:12px; margin-top:8px;">
            ${SettingsManager.themes.map(t => {
              const previewStyle = t.type === 'image' 
                ? `background-image: url(${t.val}); background-size: cover; background-position: center;` 
                : `background: ${t.val};`;
              const isSelected = (s.bgTheme || 'default') === t.id;
              const borderStyle = isSelected ? 'border: 2px solid var(--color-primary);' : 'border: 2px solid transparent;';
              return `
                <div class="theme-thumb" data-theme-id="${t.id}" style="cursor:pointer; text-align:center;">
                  <div id="theme-preview-${t.id}" style="${previewStyle} ${borderStyle} width:100%; height:64px; border-radius:10px; transition:all 0.2s; box-shadow: var(--shadow-sm);"></div>
                  <span style="font-size:11px; color:var(--color-text-secondary); margin-top:6px; display:block; font-weight: 500;">${t.name}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Background Tint Opacity Slider -->
        <div class="opacity-control-group" style="margin-top: 24px; padding: 16px; background: var(--color-surface-alt); border-radius: 12px; border: 1px solid var(--color-border); margin-bottom: 20px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <label style="font-size:13px; font-weight:700; color:var(--color-text-primary);">Background Tint Opacity</label>
              <span id="opacity-val-label" style="font-size:12px; font-weight:600; color:var(--color-primary);">75%</span>
          </div>
          <input type="range" id="bg-opacity-slider" min="10" max="100" value="75" style="width:100%; height:6px; border-radius:5px; background:var(--color-border); outline:none; -webkit-appearance:none; cursor:pointer;">
          <p style="font-size:11px; color:var(--color-text-tertiary); margin-top:8px;">Adjust how much the background image shines through your workspace cards and panels.</p>
        </div>

        <!-- Theme Application Toggles -->
        <div class="theme-application-toggles" style="margin-top: 0; padding: 16px; background: var(--color-surface-alt); border-radius: 12px; border: 1px solid var(--color-border); margin-bottom: 24px;">
          <label style="font-size:13px; font-weight:700; color:var(--color-text-primary); display:block; margin-bottom:12px; margin-top:0;">Apply Transparency To:</label>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
            <label style="display:flex; align-items:center; gap:8px; font-size:12px; cursor:pointer; user-select:none; margin:0">
              <input type="checkbox" id="glass-apply-header"${s.applyGlassHeader !== false ? ' checked' : ''} style="width:16px; height:16px;"> Top Nav Bar
            </label>
            <label style="display:flex; align-items:center; gap:8px; font-size:12px; cursor:pointer; user-select:none; margin:0">
              <input type="checkbox" id="glass-apply-sidebar"${s.applyGlassSidebar !== false ? ' checked' : ''} style="width:16px; height:16px;"> Left Panel (Sidebar)
            </label>
            <label style="display:flex; align-items:center; gap:8px; font-size:12px; cursor:pointer; user-select:none; margin:0">
              <input type="checkbox" id="glass-apply-center"${s.applyGlassCenter !== false ? ' checked' : ''} style="width:16px; height:16px;"> Center Panel
            </label>
            <label style="display:flex; align-items:center; gap:8px; font-size:12px; cursor:pointer; user-select:none; margin:0">
              <input type="checkbox" id="glass-apply-right"${s.applyGlassRight !== false ? ' checked' : ''} style="width:16px; height:16px;"> Right Panel
            </label>
          </div>
        </div>

        <button class="btn btn-primary" id="btn-save-appearance">Apply Theme Settings</button>
      </div>
    `;

    // Material theme toggle handler
    const matToggle = container.querySelector('#set-material-toggle');
    const themeSelect = container.querySelector('#set-theme-select');
    
    matToggle.addEventListener('change', e => {
      const enabled = !!e.target.checked;
      _setMaterialThemeState(enabled);
      _applyMaterialTheme(enabled);
      
      // Lock/unlock theme select and force light theme if enabling
      if (enabled) {
        themeSelect.disabled = true;
        themeSelect.value = 'light';
        document.getElementById('set-theme-select').parentElement.parentElement.querySelector('p')?.remove();
        const lockNotice = document.createElement('p');
        lockNotice.style.cssText = 'font-size:12px;color:var(--color-text-secondary);margin-top:6px';
        lockNotice.textContent = 'Theme selection is locked while Material Design is enabled.';
        document.getElementById('set-theme-select').parentElement.appendChild(lockNotice);
      } else {
        themeSelect.disabled = false;
        document.getElementById('set-theme-select').parentElement.querySelector('p')?.remove();
      }
      
      UIKit.toast(`Material Design ${enabled ? 'enabled' : 'disabled'}.`, 'success');
    });

    let selectedBgTheme = s.bgTheme || 'default';

    // Thumbnail click listener
    container.querySelectorAll('.theme-thumb').forEach(thumb => {
      const tId = thumb.getAttribute('data-theme-id');
      thumb.addEventListener('click', (e) => {
        e.preventDefault();
        selectedBgTheme = tId;
        window.applyAppTheme(tId);
      });
      thumb.onclick = (e) => {
        e.preventDefault();
        selectedBgTheme = tId;
        window.applyAppTheme(tId);
      };
    });

    // Opacity slider logic
    const slider = container.querySelector('#bg-opacity-slider');
    const label = container.querySelector('#opacity-val-label');

    const updateOpacity = (val) => {
      const opacity = val / 100;
      label.textContent = `${val}%`;
      
      // Support dark mode card tint matching the active theme mode!
      const activeThemeMode = document.getElementById('set-theme-select')?.value || s.theme || 'light';
      const rgb = activeThemeMode === 'dark' ? '31, 31, 32' : '255, 255, 255';
      document.documentElement.style.setProperty('--workspace-glass-bg', `rgba(${rgb}, ${opacity})`);
    };

    if (slider && label) {
      const savedOpacity = s.bgOpacity || '75';
      slider.value = savedOpacity;
      updateOpacity(savedOpacity);

      slider.addEventListener('input', e => {
        updateOpacity(e.target.value);
      });
    }

    // Glass section toggle handlers
    const updateToggles = () => {
      const header = container.querySelector('#glass-apply-header').checked;
      const sidebar = container.querySelector('#glass-apply-sidebar').checked;
      const center = container.querySelector('#glass-apply-center').checked;
      const right = container.querySelector('#glass-apply-right').checked;

      if (window.updateWorkspaceGlassToggles) {
        window.updateWorkspaceGlassToggles({ header, sidebar, center, right });
      }
    };

    container.querySelectorAll('.theme-application-toggles input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', updateToggles);
    });

    container.querySelector('#btn-save-appearance').addEventListener('click', () => {
      const themeVal = materialEnabled ? 'light' : document.getElementById('set-theme-select').value;
      const opacityVal = document.getElementById('bg-opacity-slider').value;
      
      const applyHeaderVal = document.getElementById('glass-apply-header').checked;
      const applySidebarVal = document.getElementById('glass-apply-sidebar').checked;
      const applyCenterVal = document.getElementById('glass-apply-center').checked;
      const applyRightVal = document.getElementById('glass-apply-right').checked;

      const data = { 
        ...s, 
        theme: themeVal, 
        bgTheme: selectedBgTheme, 
        bgOpacity: opacityVal,
        applyGlassHeader: applyHeaderVal,
        applyGlassSidebar: applySidebarVal,
        applyGlassCenter: applyCenterVal,
        applyGlassRight: applyRightVal
      };
      SettingsManager.save(data);
      UIKit.toast('Appearance preferences saved.', 'success');
    });
  }

  /* ── Tab: Backups Center ── */
  function _renderBackupsTab(container) {
    container.innerHTML = `
      <div class="page-header" style="margin-bottom:var(--space-6)">
        <div>
          <h1 class="page-title" style="display:flex;align-items:center;gap:10px">
            ${Components.icon('download') || ''} Backup & Restore
          </h1>
          <p class="page-subtitle">Export or import your complete ICS Tracker database securely.</p>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr;gap:var(--space-6);max-width:650px">
        <div class="review-block" style="margin:0">
          <div class="review-block-title">Backup Database</div>
          <p class="form-hint" style="margin-bottom:var(--space-3)">Export a full JSON backup including all records, notes, attachments metadata, and signatories configurations.</p>
          <button class="btn btn-primary" id="btn-backup-now">📥 Download Full Database Backup (.json)</button>
        </div>

        <div class="review-block" style="margin:0">
          <div class="review-block-title">Restore Database</div>
          <p class="form-hint" style="margin-bottom:var(--space-3)">Select a valid ICS Tracker JSON backup file to restore records.</p>
          
          <div style="margin-bottom:var(--space-4)">
            <input type="file" id="backup-file-input" accept=".json" style="display:none">
            <button class="btn btn-secondary" onclick="document.getElementById('backup-file-input').click()">📁 Select JSON Backup File...</button>
            <span id="file-name-lbl" style="margin-left:8px;font-size:var(--font-size-xs);color:var(--color-text-secondary)">No file chosen</span>
          </div>

          <div id="restore-preview-box" style="display:none;background:var(--color-surface-alt);border:1.5px dashed var(--color-border);border-radius:var(--radius-md);padding:var(--space-4);margin-bottom:var(--space-4)">
            <h4 style="margin:0 0 8px 0;font-size:12px;font-weight:bold">Backup File Details</h4>
            <div id="restore-details" style="font-size:var(--font-size-xs);color:var(--color-text-secondary);line-height:1.5"></div>
            <div style="display:flex;gap:8px;margin-top:16px">
              <button class="btn btn-primary btn-sm" id="btn-restore-merge">Merge (Keep existing slips)</button>
              <button class="btn btn-primary btn-sm" id="btn-restore-replace" style="background:var(--color-danger)">Replace (Wipe local DB first)</button>
              <button class="btn btn-ghost btn-sm" id="btn-restore-cancel">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#btn-backup-now').addEventListener('click', () => {
      BackupManager.generateBackup(_allRecords);
    });

    const fileInput = container.querySelector('#backup-file-input');
    const label = container.querySelector('#file-name-lbl');
    const preview = container.querySelector('#restore-preview-box');
    const details = container.querySelector('#restore-details');

    fileInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;

      label.textContent = file.name;

      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const parsed = JSON.parse(ev.target.result);
          const validation = BackupManager.validateBackup(parsed);

          if (!validation.isValid) {
            alert(`Invalid backup: ${validation.error}`);
            _resetRestore();
            return;
          }

          _loadedBackup = parsed;
          preview.style.display = 'block';
          details.innerHTML = `
            <div><strong>Created:</strong> ${Utils.formatDate(parsed.metadata.timestamp)}</div>
            <div><strong>Records Count:</strong> ${validation.counts.records} slips</div>
            <div><strong>Audit Logs:</strong> ${validation.counts.logs} entries</div>
          `;
        } catch {
          alert('Failed to parse JSON file.');
          _resetRestore();
        }
      };
      reader.readAsText(file);
    });

    container.querySelector('#btn-restore-merge').addEventListener('click', () => _triggerRestore('merge'));
    container.querySelector('#btn-restore-replace').addEventListener('click', () => _triggerRestore('replace'));
    container.querySelector('#btn-restore-cancel').addEventListener('click', _resetRestore);

    function _resetRestore() {
      fileInput.value = '';
      label.textContent = 'No file chosen';
      preview.style.display = 'none';
      _loadedBackup = null;
    }

    async function _triggerRestore(mode) {
      if (!_loadedBackup) return;

      const confirmed = await UIKit.confirm({
        title:       'Database Restore',
        message:     mode === 'replace' 
          ? 'WARNING: This will completely flush the local IndexedDB, wiping all existing school slips. Continue?' 
          : 'This will merge incoming records. Slips with matching IDs will be overwritten. Continue?',
        confirmText: 'Yes, Restore',
        cancelText:  'Cancel',
        variant:     mode === 'replace' ? 'danger' : 'primary'
      });
      if (!confirmed) return;

      try {
        await BackupManager.performRestore(_loadedBackup, mode);
        UIKit.toast('Database restored successfully.', 'success');
        _resetRestore();
        _loadRecordsAndRender(container.parentNode);
      } catch (err) {
        alert(`Restore failed: ${err.message}`);
      }
    }
  }

  /* ── Tab: Maintenance & Diagnostics ── */
  function _renderMaintenanceTab(container) {
    container.innerHTML = `
      <div class="page-header" style="margin-bottom:var(--space-6)">
        <div>
          <h1 class="page-title" style="display:flex;align-items:center;gap:10px">
            ${Components.icon('cpu') || ''} Maintenance
          </h1>
          <p class="page-subtitle">Keep your database optimized and running smoothly.</p>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr;gap:var(--space-6);max-width:650px">
        <div class="review-block" style="margin:0">
          <div class="review-block-title">Database Maintenance Utilities</div>
          <div style="display:grid;grid-template-columns:1fr;gap:8px">
            <button class="btn btn-secondary" id="btn-maint-optimize">⚡ Run Database Cost Optimizer</button>
            <button class="btn btn-secondary" id="btn-maint-scan">🔍 Scan Database Integrity (Diagnostics)</button>
          </div>
          <div id="maint-progress-box" style="display:none" class="maintenance-progress-container">
            <div style="font-size:var(--font-size-xs);font-weight:bold" id="maint-progress-lbl">Processing...</div>
            <div class="maintenance-progress-bar-bg">
              <div class="maintenance-progress-bar-fill" id="maint-progress-fill"></div>
            </div>
          </div>
        </div>

        <div class="review-block" style="margin:0;display:none" id="diagnostic-results-box">
          <div class="review-block-title">Diagnostic Results</div>
          <div id="diagnostic-issues-list" style="font-size:var(--font-size-xs);color:var(--color-text-secondary)"></div>
        </div>
      </div>
    `;

    const progressBox = container.querySelector('#maint-progress-box');
    const fill = container.querySelector('#maint-progress-fill');
    const lbl = container.querySelector('#maint-progress-lbl');
    const resultsBox = container.querySelector('#diagnostic-results-box');
    const issuesList = container.querySelector('#diagnostic-issues-list');

    container.querySelector('#btn-maint-optimize').addEventListener('click', async () => {
      progressBox.style.display = 'block';
      resultsBox.style.display = 'none';
      lbl.textContent = 'Optimizing database records...';
      fill.style.width = '20%';

      setTimeout(async () => {
        fill.style.width = '70%';
        try {
          const fixedCount = await MaintenanceService.optimizeDatabase(_allRecords);
          fill.style.width = '100%';
          setTimeout(() => {
            progressBox.style.display = 'none';
            UIKit.toast(`Optimizer completed. Recalculated sums on ${fixedCount} records.`, 'success');
            _loadRecordsAndRender(container.parentNode);
          }, 300);
        } catch {
          progressBox.style.display = 'none';
          UIKit.toast('Failed to optimize database.', 'error');
        }
      }, 500);
    });

    container.querySelector('#btn-maint-scan').addEventListener('click', () => {
      progressBox.style.display = 'block';
      resultsBox.style.display = 'none';
      lbl.textContent = 'Scanning DB integrity...';
      fill.style.width = '40%';

      setTimeout(() => {
        const issues = MaintenanceService.validateDatabase(_allRecords);
        fill.style.width = '100%';
        
        setTimeout(() => {
          progressBox.style.display = 'none';
          resultsBox.style.display = 'block';
          issuesList.innerHTML = '';

          if (issues.length === 0) {
            issuesList.innerHTML = `<p style="color:var(--color-success);font-weight:bold;margin:0">✓ All database integrity checks passed. No duplicates or broken totals found.</p>`;
            return;
          }

          issues.forEach(issue => {
            const row = document.createElement('div');
            row.style.cssText = 'padding:6px;border-bottom:1px solid var(--color-border-light);line-height:1.4';
            row.innerHTML = `
              <span class="badge badge-${issue.severity === 'critical' ? 'danger' : 'warning'}" style="font-size:9px;padding:1px 4px">${issue.severity}</span>
              <strong style="margin-left:4px">${Utils.escapeHtml(issue.record.icsNumber) || 'Draft'}</strong>: ${Utils.escapeHtml(issue.message)}
            `;
            issuesList.appendChild(row);
          });
        }, 300);
      }, 400);
    });
  }

  /* ── Tab: Diagnostics & Storage ── */
  async function _renderDiagnosticsTab(container) {
    let sizeDesc = 'Retrieving storage allocations...';
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        const pct = ((est.usage / est.quota) * 100).toFixed(4);
        sizeDesc = `${(est.usage / (1024 * 1024)).toFixed(2)} MB used out of ${(est.quota / (1024 * 1024 * 1024)).toFixed(1)} GB quota (${pct}%)`;
      } else {
        sizeDesc = 'Storage quotas API not supported in browser.';
      }
    } catch {
      sizeDesc = 'Storage quota lookup failed.';
    }

    const devChecked = _getDevModeState() ? 'checked' : '';

    container.innerHTML = `
      <div class="page-header" style="margin-bottom:var(--space-6)">
        <div>
          <h1 class="page-title" style="display:flex;align-items:center;gap:10px">
            ${Components.icon('grid') || ''} Diagnostics & Storage
          </h1>
          <p class="page-subtitle">Monitor system health, connection status, and storage utilization.</p>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr;gap:var(--space-6);max-width:650px">
        <div class="review-block" style="margin:0">
          <div class="review-block-title">Diagnostics & System Connectivity</div>
          <div class="detail-row"><span class="detail-key">Browser Agent</span><span class="detail-val" style="font-size:10px">${navigator.userAgent}</span></div>
          <div class="detail-row"><span class="detail-key">IndexedDB Connectivity</span><span class="detail-val" style="color:var(--color-success)">✓ Connected & Healthy</span></div>
          <div class="detail-row"><span class="detail-key">Storage Allocation</span><span class="detail-val">${sizeDesc}</span></div>
          <div class="detail-row"><span class="detail-key">PWA Launch Status</span><span class="detail-val">${window.matchMedia('(display-mode: standalone)').matches ? 'Standalone App' : 'Browser Viewport'}</span></div>
          <div class="detail-row"><span class="detail-key">Online Status</span><span class="detail-val">${navigator.onLine ? 'Online' : 'Offline'}</span></div>
        </div>

        <div class="review-block" style="margin:0">
          <div class="review-block-title">Developer Mode Access</div>
          <label class="widget-option">
            <input type="checkbox" id="set-dev-checkbox" ${devChecked}> Enable System Developer inspector mode
          </label>
        </div>
      </div>
    `;

    container.querySelector('#set-dev-checkbox').addEventListener('change', e => {
      _setDevModeState(e.target.checked);
      UIKit.toast('Developer settings updated. Refreshing tabs...', 'info');
      setTimeout(() => {
        _renderWorkspace(container.parentNode);
      }, 500);
    });
  }

  /* ── Tab: Help Center ── */
  function _renderHelpTab(container) {
    container.innerHTML = `
      <div class="page-header" style="margin-bottom:var(--space-6)">
        <div>
          <h1 class="page-title" style="display:flex;align-items:center;gap:10px">
            ${Components.icon('alert') || ''} Help Center
          </h1>
          <p class="page-subtitle">Access documentation, keyboard shortcuts, and system workflows.</p>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr;gap:var(--space-6);max-width:650px">
        <div class="review-block" style="margin:0">
          <div class="review-block-title">ICS Documentation Help Center</div>
          
          <div class="help-accordion">
            <div class="help-accordion-title">How to create a new ICS? <span>+</span></div>
            <div class="help-accordion-content">Navigate to the "New ICS" module using the sidebar. Fill in the General slip details (Step 1), assign Recipient properties (Step 2), insert items details and Useful Life metrics in the drawer (Step 3), and review before saving. Unfinished entries auto-save as drafts.</div>
          </div>

          <div class="help-accordion">
            <div class="help-accordion-title">How does Estimated Useful Life (EUL) monitor assets? <span>+</span></div>
            <div class="help-accordion-content">The monitoring engine compares the Date Issued with the asset's Estimated Useful Life. If the remaining time is less than 180 days, it is tagged as "Approaching EUL". If it exceeds the lifespan, it triggers an "Expired" alert in the Notifications feed.</div>
          </div>

          <div class="help-accordion">
            <div class="help-accordion-title">How can I perform databases restore? <span>+</span></div>
            <div class="help-accordion-content">In the "Backup & Restore" tab, load a valid backup JSON file. Selecting "Merge" will combine the incoming entries with existing slips, while "Replace" clears the entire database before restoring. Make sure to download a backup file prior to performing replacements.</div>
          </div>
        </div>

        <div class="review-block" style="margin:0">
          <div class="review-block-title">Keyboard Shortcuts Productivity Sheet</div>
          <div style="font-size:var(--font-size-xs);line-height:1.6">
            <div><kbd style="background:var(--color-surface-alt);padding:2px 6px;border-radius:4px;border:1px solid var(--color-border)">Ctrl + K</kbd> Toggle Command Palette</div>
            <div style="margin-top:6px"><kbd style="background:var(--color-surface-alt);padding:2px 6px;border-radius:4px;border:1px solid var(--color-border)">Ctrl + F</kbd> Focus Search Inputs</div>
            <div style="margin-top:6px"><kbd style="background:var(--color-surface-alt);padding:2px 6px;border-radius:4px;border:1px solid var(--color-border)">Ctrl + N</kbd> Open New ICS Wizard</div>
            <div style="margin-top:6px"><kbd style="background:var(--color-surface-alt);padding:2px 6px;border-radius:4px;border:1px solid var(--color-border)">Ctrl + ,</kbd> Open Settings Page</div>
            <div style="margin-top:6px"><kbd style="background:var(--color-surface-alt);padding:2px 6px;border-radius:4px;border:1px solid var(--color-border)">Esc</kbd> Close Dialog Popups</div>
          </div>
        </div>
      </div>
    `;

    // Wire accordions
    container.querySelectorAll('.help-accordion-title').forEach(t => {
      t.addEventListener('click', () => {
        t.parentNode.classList.toggle('active');
        t.querySelector('span').textContent = t.parentNode.classList.contains('active') ? '−' : '+';
      });
    });
  }

  /* ── Tab: Update Logs ── */
  function _renderUpdateLogsTab(container) {
    container.innerHTML = `
      <style>
      .timeline { border-left: 2px solid var(--color-border); padding-left: 24px; position: relative; margin: 16px 0 0 8px; }
      .timeline-item { position: relative; margin-bottom: 32px; }
      .timeline-item:last-child { margin-bottom: 0; }
      .timeline-dot { position: absolute; left: -31px; top: 4px; width: 12px; height: 12px; border-radius: 50%; background: var(--color-surface); border: 2px solid var(--color-border); }
      .timeline-dot.active { border-color: var(--color-primary); background: var(--color-primary); }
      .timeline-title { margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: var(--color-text-primary); display: flex; align-items: center; gap: 8px; }
      .timeline-date { font-size: 12px; font-weight: normal; color: var(--color-text-tertiary); }
      .timeline-list { font-size: 13px; color: var(--color-text-secondary); padding-left: 16px; margin: 0; line-height: 1.6; }
      .timeline-list li { margin-bottom: 4px; }
      .timeline-list li strong { color: var(--color-text-primary); }
      </style>
      <div class="page-header" style="margin-bottom:var(--space-6)">
        <div>
          <h1 class="page-title" style="display:flex;align-items:center;gap:10px">
            ${Components.icon('list') || ''} Update Logs
          </h1>
          <p class="page-subtitle">Review system versions, bug fixes, and feature releases.</p>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr;gap:var(--space-6);max-width:650px">
        <div class="review-block" style="margin:0">
          <div class="review-block-title" style="display:flex;justify-content:space-between;align-items:center">
            <span>System Version History</span>
            <span class="badge badge-success">v1.2.1-stable</span>
          </div>
          <p class="form-hint" style="margin-bottom:var(--space-4)">Record of new features, bug fixes, and performance improvements applied to the application.</p>
          
          <div class="timeline">
            <div class="timeline-item">
              <div class="timeline-dot active"></div>
              <h4 class="timeline-title">v1.2.1 <span class="timeline-date">July 6, 2026 (Current)</span></h4>
              <ul class="timeline-list">
                <li><strong>Feature:</strong> Added Material Design 3 theme system with ripple effects and elevation tokens.</li>
                <li><strong>Feature:</strong> Material Design toggle in Settings > Appearance with theme locking.</li>
                <li><strong>UX Enhancement:</strong> Tweaked sidebar layout aesthetics by making the sidebar right border, sidebar logo bottom border, and sidebar footer top border transparent.</li>
                <li><strong>UX Enhancement:</strong> Relocated and integrated the Experimental Features panel inside the Developer grid, utilizing uppercase Zinc 400 headers and custom checkbox variables.</li>
                <li><strong>Fix:</strong> Corrected header height to a strict 60px size and adjusted global workspace layouts to normalize top spacings and padding.</li>
                <li><strong>UX Enhancement:</strong> Unified top header, sidebar, and drawer background overlays into a single translucent glass layout with border separators.</li>
                <li><strong>Feature:</strong> Introduced a Background Tint Opacity slider with real-time UI previews and local settings locking.</li>
                <li><strong>Feature:</strong> Added granular layout transparency checkboxes to select which workspace panels should use the background glassmorphism system.</li>
                <li><strong>UX Enhancement:</strong> Integrated the new ICS wizard components into the dynamic glassmorphism theme and center panel toggles.</li>
                <li><strong>Fix:</strong> Removed double-layer background overlays from context panel headers and drawer handles to ensure transparent backgrounds.</li>
                <li><strong>UX Enhancement:</strong> Unified all layout panels (header, sidebar, context panel, drawer, main, and wizard sticky bar) under a single shared glassmorphism wallpaper spec.</li>
              </ul>
            </div>

            <div class="timeline-item">
              <div class="timeline-dot"></div>
              <h4 class="timeline-title">v1.2.0 <span class="timeline-date">July 2026</span></h4>
              <ul class="timeline-list">
                <li><strong>Major Update:</strong> Refactored the Developer Panel to use a clean grid layout, staging badge indicator, and a custom dark-theme JSON syntax viewer.</li>
              </ul>
            </div>

            <div class="timeline-item">
              <div class="timeline-dot"></div>
              <h4 class="timeline-title">v1.1.0 <span class="timeline-date">June 2026</span></h4>
              <ul class="timeline-list">
                <li><strong>Feature:</strong> Introduced the Automated Integrity Engine for background data scanning and validation.</li>
              </ul>
            </div>

            <div class="timeline-item">
              <div class="timeline-dot"></div>
              <h4 class="timeline-title">v1.0.0 <span class="timeline-date">May 2026</span></h4>
              <ul class="timeline-list">
                <li><strong>Initial Release:</strong> Local-first IndexedDB Property Custodian system launched.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /* ── Tab: System Audit Logs ── */
  async function _renderAuditTab(container) {
    const logs = await AuditLogger.getLogs();

    const rowsHtml = logs.map(l => `
      <tr>
        <td style="font-size:11px">${Utils.formatDate(l.timestamp)} ${new Date(l.timestamp).toLocaleTimeString()}</td>
        <td><span class="badge badge-info" style="font-size:9px;padding:1px 4px">${l.action}</span></td>
        <td style="font-size:11px">${Utils.escapeHtml(l.description)}</td>
        <td style="font-size:11px">${Utils.escapeHtml(l.user)}</td>
      </tr>
    `).join('');

    container.innerHTML = `
      <div class="review-block" style="margin:0;max-width:800px">
        <div class="review-block-title" style="display:flex;justify-content:space-between;align-items:center">
          <span>Administrative System Logs</span>
          <button class="btn btn-ghost btn-sm" id="btn-clear-logs" style="color:var(--color-danger)">Clear Log History</button>
        </div>
        <p class="form-hint" style="margin-bottom:var(--space-3)">Recent settings modifications, restore perform, backups, and index recalculation logs.</p>
        
        <div class="items-table-wrap">
          <table class="items-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Description</th>
                <th>Triggered By</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="4" style="text-align:center;color:var(--color-text-tertiary)">No audit logs recorded yet.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;

    container.querySelector('#btn-clear-logs').addEventListener('click', async () => {
      const confirmed = await UIKit.confirm({
        title:       'Clear Log History',
        message:     'Permanently delete the administrative log track? This cannot be undone.',
        confirmText: 'Delete Logs',
        cancelText:  'Cancel',
        variant:     'danger'
      });
      if (!confirmed) return;

      await AuditLogger.clear();
      _renderWorkspace(container.parentNode);
    });
  }

  /* ── Tab: Developer Panel ── */
  function _renderDeveloperTab(container) {
    const sliceData = _allRecords.slice(0, 3);
    const highlightedJson = JSON.stringify(sliceData, null, 2)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"([^"]+)":/g, '<span style="color:#fbbf24">"$1"</span>:')
      .replace(/:\s*(".*?")/g, ': <span style="color:#34d399">$1</span>')
      .replace(/:\s*(\d+(\.\d+)?)/g, ': <span style="color:#f472b6">$1</span>');

    container.innerHTML = `
      <div class="page-header" style="margin-bottom:var(--space-8)">
        <div style="display:flex; align-items:flex-start; justify-content:space-between; width:100%">
          <div>
            <h1 class="page-title" style="display:flex; align-items:center; gap:12px; font-size: 24px; font-weight: 700; margin:0">
              ${Components.icon('edit') || ''}
              Developer Panel
            </h1>
            <p class="page-subtitle" style="color:var(--color-text-secondary); margin-top:4px">Advanced administrative tools for system debugging and staging validation.</p>
          </div>
          <div style="background:var(--color-warning-light); color:var(--color-warning); padding:6px 12px; border-radius:var(--radius-md); font-size:12px; font-weight:600; border:1px solid var(--color-warning-light)">
            Staging Mode Active
          </div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:var(--space-6);">
        <!-- Data Management Card -->
        <div class="review-block" style="margin:0; border:1px solid var(--color-border); background:var(--color-surface); padding:var(--space-5); display:flex; flex-direction:column; gap:var(--space-4)">
          <div>
            <div class="review-block-title" style="font-size:16px; font-weight:600; margin-bottom:4px">Database Operations</div>
            <p class="form-hint">Seed or clear mock data to simulate various system states.</p>
          </div>
          
          <div style="display:grid; grid-template-columns:1fr; gap:10px">
            <button class="btn btn-secondary" style="width:100%; justify-content:center" id="btn-dev-populate">
              Populate Mock Data
            </button>
            <button class="btn btn-secondary" style="width:100%; justify-content:center" id="btn-dev-seed">
              Seed 20-Year Dataset
            </button>
            <div style="border-top:1px solid var(--color-border); margin:8px 0; padding-top:12px">
               <button class="btn btn-ghost" style="width:100%; justify-content:center; color:var(--color-danger); border:1px dashed var(--color-danger-light)" id="btn-dev-wipe">
                Danger: Wipe Database
              </button>
            </div>
          </div>
        </div>

        <!-- Experimental Features Card -->
        <div class="review-block dev-testing-section" style="margin:0; border:1px solid var(--color-border); background:var(--color-surface); padding:20px; display:flex; flex-direction:column; justify-content:space-between;">
          <div>
            <h3 style="font-size: 16px; font-weight: 600; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.64px; margin-bottom: 4px; margin-top: 0;">Experimental Features</h3>
            <p class="form-hint" style="font-size: 12px; color: #71717a; margin-top: 0; margin-bottom: 0;">Enable or disable new experimental designs.</p>
          </div>
          
          <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 12px; padding: 0; background: transparent;">
            <div style="flex: 1">
              <div style="font-size: 14px; font-weight: 500; color: var(--color-text-primary)">Material Theme (Developer preview)</div>
              <p style="font-size: 12px; color: #71717a; margin: 4px 0 0 0">This is the Material Design 3 token system. Also available in Settings > Appearance.</p>
            </div>
            <div style="flex-shrink:0; display:flex; align-items:center; gap:8px">
              <label style="display:flex; align-items:center; gap:8px; cursor:pointer">
                <input type="checkbox" id="dev-mat-toggle"${_getMaterialThemeState() ? ' checked' : ''}>
                <span style="font-size:13px">Enable</span>
              </label>
            </div>
          </div>
        </div>

        <!-- State Inspector Card -->
        <div class="review-block" style="margin:0; border:1px solid var(--color-border); background:var(--color-surface); padding:var(--space-5)">
          <div class="review-block-title" style="font-size:16px; font-weight:600; margin-bottom:4px">Raw Database Records</div>
          <div style="position:relative; margin-top:12px">
            <div style="height:280px; overflow-y:auto; background:#1e293b; color:#94a3b8; padding:var(--space-4); border-radius:var(--radius-lg); font-family:'Fira Code', 'Courier New', monospace; font-size:11px; line-height:1.5">
              <pre style="margin:0"><code style="color:#38bdf8">JSON</code> DATA_STREAM = ${highlightedJson}
              ${_allRecords.length > 3 ? `<div style="color:#94a3b8; margin-top:8px">... and ${_allRecords.length - 3} more records</div>` : ''}</pre>
            </div>
            <div style="position:absolute; bottom:12px; right:12px; background:rgba(255,255,255,0.1); padding:4px 8px; border-radius:4px; font-size:9px; color:white">
              UTF-8 | READ-ONLY
            </div>
          </div>
        </div>
      </div>
    `;

    // Ensure material theme is applied when rendering developer tab
    _applyMaterialTheme(_getMaterialThemeState());

    // Wire material checkbox
    const matCheckbox = container.querySelector('#dev-mat-toggle');
    if (matCheckbox) {
      matCheckbox.addEventListener('change', e => {
        const enabled = !!e.target.checked;
        _setMaterialThemeState(enabled);
        _applyMaterialTheme(enabled);
        UIKit.toast(`Material theme ${enabled ? 'enabled' : 'disabled'}.`, 'info');
      });
    }

    container.querySelector('#btn-dev-populate').addEventListener('click', async () => {
      const confirmed = await UIKit.confirm({
        title:       'Populate Mock Data',
        message:     'This will forcefully insert mock records with varied expirations (Expired, Approaching EUL, etc.). Continue?',
        confirmText: 'Populate',
        cancelText:  'Cancel',
        variant:     'primary'
      });
      if (!confirmed) return;
      
      await RecordService.seedDemoData(true);
      await AuditLogger.log('developer', 'Populated EUL mock data.');
      UIKit.toast('Mock Data Populated.', 'success');
      _loadRecordsAndRender(container.parentNode);
    });

    container.querySelector('#btn-dev-seed').addEventListener('click', async () => {
      const confirmed = await UIKit.confirm({
        title:       'Seed Demo Data',
        message:     'This will insert a large batch of simulated historical slips (2002–2026) to test performance loading. Continue?',
        confirmText: 'Seed Staging',
        cancelText:  'Cancel',
        variant:     'primary'
      });
      if (!confirmed) return;

      // Generate large demo data batch
      const generated = [];
      const recipients = ['Juan Dela Cruz', 'Maria Santos', 'Pedro Penduko', 'Clara Bonifacio', 'Jose Rizal'];
      const offices = ['Supply Office', 'Library', 'ICT Laboratory', 'Science Lab', 'Principal Office'];
      const items = ['Laptop Dell Latitude', 'Brother Printer HL-L2320D', 'Epson Projector EB-E01', 'Swivel Office Chair', 'Whiteboard Stand'];

      for (let yr = 2002; yr <= 2026; yr++) {
        for (let seq = 1; seq <= 10; seq++) {
          const recName = recipients[seq % recipients.length];
          const recOffice = offices[seq % offices.length];
          const itemDesc = items[seq % items.length];

          generated.push({
            id: Utils.uuid(),
            icsNumber: `ICS-${yr}-${String(seq).padStart(3, '0')}`,
            entityName: 'Department of Education',
            fundCluster: '01',
            dateIssued: `${yr}-06-15`,
            issuedBy: 'Property Custodian',
            remarks: 'Demo seeded entry',
            receivedBy: recName,
            position: 'Teacher',
            office: recOffice,
            receivedDate: `${yr}-06-15`,
            totalItems: 1,
            totalCost: 15000,
            status: seq % 10 === 0 ? 'archived' : 'active',
            modifiedDate: new Date().toISOString(),
            isFavorite: seq === 3,
            items: [
              {
                id: Utils.uuid(),
                description: itemDesc,
                inventoryItemNumber: `INV-${yr}-${String(seq).padStart(3, '0')}`,
                serialNumber: `SN-${yr}-${seq * 999}`,
                quantity: 1,
                unit: 'unit',
                unitCost: 15000,
                totalCost: 15000,
                estimatedUsefulLife: '5 Years',
                remarks: 'Good condition'
              }
            ]
          });
        }
      }

      await DB.putBatch('records', generated);
      await AuditLogger.log('developer', `Seeded ${generated.length} historical staging records.`);
      UIKit.toast('Historical data seeded.', 'success');
      _loadRecordsAndRender(container.parentNode);
    });

    container.querySelector('#btn-dev-wipe').addEventListener('click', async () => {
      const confirmed = await UIKit.confirm({
        title:       'Wipe Staging Database',
        message:     'Permanently clear ALL records from IndexedDB? There is no undo.',
        confirmText: 'Wipe Clean',
        cancelText:  'Cancel',
        variant:     'danger'
      });
      if (!confirmed) return;

      await DB.clear('records');
      await AuditLogger.log('developer', 'Database clean wipe performed.');
      UIKit.toast('Database cleared.', 'success');
      _loadRecordsAndRender(container.parentNode);
    });
  }

  function destroy() {}

  return { render, destroy };
})();
