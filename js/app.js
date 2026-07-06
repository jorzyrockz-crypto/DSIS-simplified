/**
 * ICS Tracking & Monitoring Tool
 * Phase 1: Core Layout — Main Application
 *
 * Bootstraps the shell, sidebar, header, context panel,
 * bottom navigation, and wires up the router.
 */

'use strict';

/* ============================================================
   App State
   ============================================================ */
const AppState = {
  sidebarCollapsed:      false,
  contextPanelCollapsed: false,
  drawerOpen:            false,
  mobileMenuOpen:        false,
  currentPage:           '#dashboard',
  onlineStatus:          navigator.onLine,
  // Phase 2 shared state
  editRecordId:          null,   // set by RecordsPage before navigating to #edit
  selectedRecordId:      null,   // set by pages to pre-select a record on #records
};

/* ============================================================
   Page Registry
   Each entry maps a hash → { module, meta }
   ============================================================ */
const PAGE_REGISTRY = {
  '#dashboard':     { module: () => DashboardPage,     meta: { title: 'Dashboard',      contextTitle: 'Overview'            } },
  '#records':       { module: () => RecordsPage,       meta: { title: 'ICS Records',    contextTitle: 'Record Details'      } },
  '#new':           { module: () => NewICSPage,         meta: { title: 'New ICS Record', contextTitle: 'Form Guide'          } },
  '#edit':          { module: () => NewICSPage,         meta: { title: 'Edit ICS Record',contextTitle: 'Form Guide'          } },
  '#view':          { module: () => ViewerPage,        meta: { title: 'ICS Detailed Viewer', contextTitle: 'Record Summary' } },
  '#notifications': { module: () => NotificationsPage, meta: { title: 'Notifications',  contextTitle: 'Notifications'       } },
  '#reports':       { module: () => ReportsPage,       meta: { title: 'Reports',        contextTitle: 'Report Shortcuts'    } },
  '#settings':      { module: () => SettingsPage,      meta: { title: 'Settings',       contextTitle: 'Version Info'        } },
};

/* ============================================================
   DOM Element References (populated after DOMContentLoaded)
   ============================================================ */
const DOM = {};

/* ============================================================
   Sidebar Builder
   ============================================================ */
function buildSidebar() {
  const sidebar = DOM.sidebar;

  // ── Logo ──────────────────────────────────────────────────────────────────
  const logoEl = document.createElement('div');
  logoEl.className = 'sidebar-logo';
  logoEl.innerHTML = `
    <div class="logo-mark" aria-hidden="true">ICS</div>
    <div class="logo-text">
      <div class="app-name">ICS Tracker</div>
      <div class="app-sub">Asset Management Tool</div>
    </div>
  `;
  sidebar.appendChild(logoEl);

  // ── Navigation ────────────────────────────────────────────────────────────
  const nav = document.createElement('nav');
  nav.className = 'sidebar-nav';
  nav.setAttribute('aria-label', 'Main navigation');

  const navItems = [
    { hash: '#dashboard',     iconName: 'dashboard',     label: 'Dashboard'      },
    { hash: '#records',       iconName: 'records',       label: 'ICS Records'    },
    { hash: '#new',           iconName: 'newics',        label: 'New ICS'        },
    { hash: '#notifications', iconName: 'notifications', label: 'Notifications', badge: '4' },
    { hash: '#reports',       iconName: 'reports',       label: 'Reports'        },
    { hash: '#settings',      iconName: 'settings',      label: 'Settings'       },
  ];

  navItems.forEach(item => {
    const link = document.createElement('a');
    link.className = 'nav-item';
    link.href = item.hash;
    link.setAttribute('data-tooltip', item.label);
    link.setAttribute('role', 'link');
    link.setAttribute('aria-label', item.label);
    link.id = `nav-${item.hash.replace('#', '')}`;

    link.innerHTML = `
      <span class="nav-icon">${Components.icon(item.iconName)}</span>
      <span class="nav-label">${item.label}</span>
      ${item.badge ? `<span class="nav-badge" aria-label="${item.badge} notifications">${item.badge}</span>` : ''}
    `;

    // Intercept clicks (router handles hash change, this handles mobile close)
    link.addEventListener('click', (e) => {
      if (AppState.mobileMenuOpen) {
        closeMobileMenu();
      }
    });

    nav.appendChild(link);
  });

  sidebar.appendChild(nav);

  // ── Footer / Collapse Button ───────────────────────────────────────────────
  const footer = document.createElement('div');
  footer.className = 'sidebar-footer';

  const collapseBtn = document.createElement('button');
  collapseBtn.className = 'collapse-btn';
  collapseBtn.setAttribute('aria-label', 'Toggle sidebar');
  collapseBtn.id = 'sidebar-collapse-btn';
  collapseBtn.innerHTML = `
    <span class="collapse-icon">${Components.icon('chevronLeft')}</span>
    <span class="collapse-label">Collapse Sidebar</span>
  `;
  collapseBtn.addEventListener('click', toggleSidebar);

  footer.appendChild(collapseBtn);
  sidebar.appendChild(footer);
}

/* ============================================================
   Header Builder
   ============================================================ */
function buildHeader() {
  const header = DOM.header;

  // Hamburger (mobile)
  const hamburger = document.createElement('button');
  hamburger.className = 'hamburger-btn';
  hamburger.setAttribute('aria-label', 'Open navigation menu');
  hamburger.id = 'hamburger-btn';
  hamburger.innerHTML = Components.icon('menu');
  hamburger.addEventListener('click', toggleMobileMenu);
  header.appendChild(hamburger);

  // Page title
  const titleEl = document.createElement('h1');
  titleEl.className = 'header-page-title';
  titleEl.id = 'header-page-title';
  titleEl.textContent = 'Dashboard';
  header.appendChild(titleEl);

  // Search box
  const searchEl = Components.searchBox({
    id: 'global-search',
    placeholder: 'Search ICS records, recipients…',
    label: 'Global search',
  });
  const sug = document.createElement('div');
  sug.className = 'header-search-suggestions';
  sug.id = 'header-search-suggestions';
  searchEl.appendChild(sug);
  header.appendChild(searchEl);

  // Wire header search dropdown logic
  wireHeaderSearch(searchEl, sug);

  // Spacer
  const spacer = document.createElement('div');
  spacer.className = 'header-spacer';
  header.appendChild(spacer);

  // Actions
  const actions = document.createElement('div');
  actions.className = 'header-actions';



  // Context panel toggle (desktop collapse / mobile drawer)
  const panelBtn = document.createElement('button');
  panelBtn.className = 'header-icon-btn';
  panelBtn.setAttribute('aria-label', 'Toggle context panel');
  panelBtn.id = 'context-panel-btn';
  panelBtn.innerHTML = Components.icon('panelRight');
  panelBtn.addEventListener('click', toggleContextPanel);
  actions.appendChild(panelBtn);

  // Divider
  const divider = document.createElement('div');
  divider.className = 'header-divider';
  actions.appendChild(divider);

  // Notification bell
  const bellBtn = document.createElement('button');
  bellBtn.className = 'header-icon-btn';
  bellBtn.setAttribute('aria-label', 'Notifications (4 unread)');
  bellBtn.id = 'header-notif-btn';
  bellBtn.innerHTML = `
    ${Components.icon('bell')}
    <span class="dot-badge" aria-hidden="true"></span>
  `;
  bellBtn.addEventListener('click', () => Router.navigate('#notifications'));
  actions.appendChild(bellBtn);

  // User avatar
  const avatar = document.createElement('div');
  avatar.className = 'user-avatar';
  avatar.setAttribute('role', 'button');
  avatar.setAttribute('aria-label', 'User profile');
  avatar.setAttribute('tabindex', '0');
  avatar.textContent = 'AD';
  avatar.title = 'Admin User';
  actions.appendChild(avatar);

  header.appendChild(actions);
}

/* ============================================================
   Context Panel Builder
   ============================================================ */
function buildContextPanel() {
  const panel = DOM.contextPanel;

  const panelHeader = document.createElement('div');
  panelHeader.className = 'panel-header';
  panelHeader.innerHTML = `<h3 id="context-panel-title">Overview</h3>`;
  panel.appendChild(panelHeader);

  const panelBody = document.createElement('div');
  panelBody.className = 'panel-body';
  panelBody.id = 'context-panel-body';
  panel.appendChild(panelBody);
}

/* ============================================================
   Context Drawer Builder (tablet/mobile overlay)
   ============================================================ */
function buildContextDrawer() {
  const drawer = DOM.contextDrawer;

  const handle = document.createElement('div');
  handle.className = 'drawer-handle';
  handle.innerHTML = `<h3 id="drawer-title">Overview</h3>`;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'btn btn-ghost btn-icon btn-sm';
  closeBtn.setAttribute('aria-label', 'Close panel');
  closeBtn.innerHTML = Components.icon('close');
  closeBtn.addEventListener('click', closeContextDrawer);
  handle.appendChild(closeBtn);

  drawer.appendChild(handle);

  const body = document.createElement('div');
  body.className = 'drawer-body';
  body.id = 'context-drawer-body';
  drawer.appendChild(body);
}

/* ============================================================
   Bottom Navigation Builder (mobile)
   ============================================================ */
function buildBottomNav() {
  const nav = DOM.bottomNav;
  nav.setAttribute('aria-label', 'Mobile bottom navigation');

  const items = [
    { hash: '#dashboard',     iconName: 'dashboard',     label: 'Home'    },
    { hash: '#records',       iconName: 'records',       label: 'Records' },
    { hash: '#new',           iconName: 'newics',        label: 'New',    isNew: true },
    { hash: '#notifications', iconName: 'notifications', label: 'Alerts', badge: '4' },
    { hash: '#more',          iconName: 'moreH',         label: 'More'    },
  ];

  items.forEach(item => {
    const btn = document.createElement('button');
    btn.className = `bottom-nav-item${item.isNew ? ' new-btn' : ''}`;
    btn.setAttribute('aria-label', item.label);
    btn.id = `bnav-${item.hash.replace('#', '')}`;

    const badgeHtml = item.badge
      ? `<span class="bnav-badge" aria-label="${item.badge} alerts">${item.badge}</span>`
      : '';

    btn.innerHTML = `
      <span class="bnav-icon">
        ${Components.icon(item.iconName)}
        ${badgeHtml}
      </span>
      <span class="bnav-label">${item.label}</span>
    `;

    btn.addEventListener('click', () => {
      if (item.hash === '#more') {
        toggleMobileMenu();
      } else {
        Router.navigate(item.hash);
      }
    });

    nav.appendChild(btn);
  });
}

/* ============================================================
   Overlay Builder
   ============================================================ */
function buildOverlay() {
  const overlay = DOM.overlay;
  overlay.addEventListener('click', () => {
    if (AppState.mobileMenuOpen) closeMobileMenu();
    if (AppState.drawerOpen)     closeContextDrawer();
  });
}

/* ============================================================
   Sidebar Toggle
   ============================================================ */
function toggleSidebar() {
  AppState.sidebarCollapsed = !AppState.sidebarCollapsed;
  DOM.sidebar.classList.toggle('collapsed', AppState.sidebarCollapsed);

  // Persist preference
  try {
    localStorage.setItem('ics-sidebar-collapsed', AppState.sidebarCollapsed ? '1' : '0');
  } catch (_) { /* LocalStorage may be unavailable */ }
}

function restoreSidebarState() {
  try {
    const stored = localStorage.getItem('ics-sidebar-collapsed');
    if (stored === '1') {
      AppState.sidebarCollapsed = true;
      DOM.sidebar.classList.add('collapsed');
    } else if (stored === '0') {
      AppState.sidebarCollapsed = false;
      DOM.sidebar.classList.remove('collapsed');
    } else {
      // Default state when no preference is saved (collapse on tablet, expand on desktop)
      if (window.innerWidth <= 1024) {
        AppState.sidebarCollapsed = true;
        DOM.sidebar.classList.add('collapsed');
      }
    }
  } catch (_) { /* ignore */ }
}

/* ============================================================
   Right Context Panel Desktop Toggle & Expander
   ============================================================ */
function toggleContextPanel() {
  if (window.innerWidth <= 1024) {
    AppState.drawerOpen ? closeContextDrawer() : openContextDrawer();
  } else {
    AppState.contextPanelCollapsed = !AppState.contextPanelCollapsed;
    if (DOM.contextPanel) {
      DOM.contextPanel.classList.toggle('collapsed', AppState.contextPanelCollapsed);
    }
    try {
      localStorage.setItem('ics-context-panel-collapsed', AppState.contextPanelCollapsed ? '1' : '0');
    } catch (_) {}
  }
}

function expandContextPanel() {
  if (window.innerWidth > 1024) {
    AppState.contextPanelCollapsed = false;
    if (DOM.contextPanel) {
      DOM.contextPanel.classList.remove('collapsed');
    }
    try {
      localStorage.setItem('ics-context-panel-collapsed', '0');
    } catch (_) {}
  }
}

function restoreContextPanelState() {
  try {
    const stored = localStorage.getItem('ics-context-panel-collapsed');
    if (stored === '1') {
      AppState.contextPanelCollapsed = true;
      if (DOM.contextPanel) {
        DOM.contextPanel.classList.add('collapsed');
      }
    }
  } catch (_) {}
}

/* ============================================================
   Mobile Menu
   ============================================================ */
function toggleMobileMenu() {
  AppState.mobileMenuOpen ? closeMobileMenu() : openMobileMenu();
}

function openMobileMenu() {
  AppState.mobileMenuOpen = true;
  DOM.sidebar.classList.add('mobile-open');
  DOM.overlay.classList.add('visible');
}

function closeMobileMenu() {
  AppState.mobileMenuOpen = false;
  DOM.sidebar.classList.remove('mobile-open');
  if (!AppState.drawerOpen) DOM.overlay.classList.remove('visible');
}

/* ============================================================
   Context Drawer (tablet/mobile)
   ============================================================ */
function openContextDrawer() {
  AppState.drawerOpen = true;
  DOM.contextDrawer.classList.add('open');
  DOM.overlay.classList.add('visible');

  // Sync drawer content with panel content
  const panelBody   = document.getElementById('context-panel-body');
  const drawerBody  = document.getElementById('context-drawer-body');
  if (panelBody && drawerBody) {
    drawerBody.innerHTML = panelBody.innerHTML;
  }
  // Sync title
  const panelTitle  = document.getElementById('context-panel-title');
  const drawerTitle = document.getElementById('drawer-title');
  if (panelTitle && drawerTitle) {
    drawerTitle.textContent = panelTitle.textContent;
  }
}

function closeContextDrawer() {
  AppState.drawerOpen = false;
  DOM.contextDrawer.classList.remove('open');
  if (!AppState.mobileMenuOpen) DOM.overlay.classList.remove('visible');
}

/* ============================================================
   Navigation Helpers
   ============================================================ */

/**
 * Update active state on nav items (sidebar + bottom nav).
 * @param {string} hash
 */
function setActiveNav(hash) {
  // Sidebar links
  DOM.sidebar.querySelectorAll('.nav-item').forEach(link => {
    const isActive = link.getAttribute('href') === hash;
    link.classList.toggle('active', isActive);
    link.setAttribute('aria-current', isActive ? 'page' : 'false');
  });

  // Bottom nav items (map #new → bnav-new, etc.)
  DOM.bottomNav.querySelectorAll('.bottom-nav-item').forEach(btn => {
    const id    = btn.id; // e.g. bnav-dashboard
    const bHash = '#' + id.replace('bnav-', '');
    btn.classList.toggle('active', bHash === hash);
  });
}

/**
 * Update the header page title.
 * @param {string} title
 */
function setHeaderTitle(title) {
  const el = document.getElementById('header-page-title');
  if (el) el.textContent = title;
}

/**
 * Update the context panel header title.
 * @param {string} title
 */
function setContextTitle(title) {
  const panelTitle  = document.getElementById('context-panel-title');
  const drawerTitle = document.getElementById('drawer-title');
  if (panelTitle)  panelTitle.textContent  = title;
  if (drawerTitle) drawerTitle.textContent = title;
}

/* ============================================================
   Page Renderer
   ============================================================ */
function renderPage(hash) {
  const entry = PAGE_REGISTRY[hash] || PAGE_REGISTRY['#dashboard'];
  const { module, meta } = entry;

  const workspace   = DOM.workspace;
  const contextBody = document.getElementById('context-panel-body');

  // Render
  const pageModule = module();
  pageModule.render(workspace, contextBody);

  // Toggle layout-specific workspace classes
  if (hash === '#settings') {
    workspace.classList.add('settings-view');
  } else {
    workspace.classList.remove('settings-view');
  }

  // Update chrome
  setHeaderTitle(meta.title);
  setContextTitle(meta.contextTitle);
  setActiveNav(hash);
  AppState.currentPage = hash;

  // Scroll workspace to top
  workspace.scrollTop = 0;

  // Update document title
  document.title = `${meta.title} — ICS Tracker`;
}

/* ============================================================
   Online / Offline Handling
   ============================================================ */
function updateOnlineStatus() {
  AppState.onlineStatus = navigator.onLine;
}

/* ============================================================
   Router Setup
   ============================================================ */
function setupRouter() {
  // Register all pages
  Object.keys(PAGE_REGISTRY).forEach(hash => {
    Router.register(hash, () => renderPage(hash), PAGE_REGISTRY[hash].meta);
  });

  // After-nav hook
  Router.afterNav((hash) => {
    // Close drawers on navigation
    if (AppState.drawerOpen) closeContextDrawer();
    // Workspace memory: Save last opened page
    try { localStorage.setItem('ics-last-page', hash); } catch {}
  });

  // Workspace memory: Restore last page if hash is empty
  try {
    const lastPage = localStorage.getItem('ics-last-page');
    if (!window.location.hash && lastPage) {
      window.location.hash = lastPage;
    }
  } catch {}

  Router.start();
}

/* ============================================================
   Real-Time Context Panel & Drawer Content Sync
   ============================================================ */
function initContextSync() {
  const panelBody = document.getElementById('context-panel-body');
  const drawerBody = document.getElementById('context-drawer-body');
  
  if (!panelBody || !drawerBody) return;
  
  let isSyncing = false;
  
  const observerCallback = (target, source) => {
    if (isSyncing) return;
    if (target.innerHTML === source.innerHTML) return;
    
    isSyncing = true;
    target.innerHTML = source.innerHTML;
    
    // Copy active inputs / textarea values (as innerHTML does not serialize dynamic form values)
    const sourceInputs = source.querySelectorAll('input, select, textarea');
    const targetInputs = target.querySelectorAll('input, select, textarea');
    sourceInputs.forEach((input, idx) => {
      if (targetInputs[idx]) {
        targetInputs[idx].value = input.value;
      }
    });

    if (target === panelBody) {
      panelBody.style.padding = '0';
    }
    isSyncing = false;
  };
  
  const panelObserver = new MutationObserver(() => {
    observerCallback(drawerBody, panelBody);
  });
  
  const drawerObserver = new MutationObserver(() => {
    observerCallback(panelBody, drawerBody);
  });
  
  const config = { childList: true, subtree: true, characterData: true };
  panelObserver.observe(panelBody, config);
  drawerObserver.observe(drawerBody, config);
}

/* ============================================================
   App Bootstrap
   ============================================================ */
function bootstrap() {
  try {
    const s = SettingsManager.get();
    if (s.theme) document.documentElement.setAttribute('data-theme', s.theme);
    if (s.bgTheme && window.applyAppTheme) {
      window.applyAppTheme(s.bgTheme);
    }
    // Restore card/panel background tint opacity with theme-aware colors
    const savedOpacity = s.bgOpacity || '75';
    const activeThemeMode = s.theme || 'light';
    const rgb = activeThemeMode === 'dark' ? '31, 31, 32' : '255, 255, 255';
    document.documentElement.style.setProperty('--workspace-glass-bg', `rgba(${rgb}, ${savedOpacity / 100})`);

    // Restore glass section toggles on launch
    if (window.updateWorkspaceGlassToggles) {
      window.updateWorkspaceGlassToggles({
        header: s.applyGlassHeader !== false,
        sidebar: s.applyGlassSidebar !== false,
        center: s.applyGlassCenter !== false,
        right: s.applyGlassRight !== false
      });
    }
  } catch {}

  // Collect DOM references
  DOM.sidebar       = document.getElementById('sidebar');
  DOM.header        = document.getElementById('header');
  DOM.workspace     = document.getElementById('workspace');
  DOM.contextPanel  = document.getElementById('context-panel');
  DOM.contextDrawer = document.getElementById('context-drawer');
  DOM.bottomNav     = document.getElementById('bottom-nav');
  DOM.overlay       = document.getElementById('overlay');

  if (!DOM.sidebar || !DOM.workspace) {
    console.error('[ICS App] Critical DOM elements not found. Aborting bootstrap.');
    return;
  }

  // Build shell components
  buildSidebar();
  buildHeader();
  buildContextPanel();
  buildContextDrawer();
  buildBottomNav();
  buildOverlay();

  // Restore persisted sidebar & context panel states
  restoreSidebarState();
  restoreContextPanelState();

  // Initialize context panel & drawer content sync
  initContextSync();

  // Network status
  window.addEventListener('online',  updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);

  // PWA Service Worker Registration
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js')
      .then(reg => console.log('[PWA] Service Worker active, scope:', reg.scope))
      .catch(err => console.error('[PWA] Service Worker registration failed:', err));
  }

  // First Launch Welcome Screen Experience
  try {
    if (localStorage.getItem('ics-welcomed-v1') !== 'true') {
      const welcome = document.createElement('div');
      welcome.className = 'welcome-backdrop';
      welcome.id = 'welcome-modal-overlay';
      welcome.innerHTML = `
        <div class="welcome-modal">
          <div class="welcome-icon">🏫</div>
          <h2 class="welcome-title">Welcome to ICS Tracker</h2>
          <p class="welcome-desc">A professional deped-aligned digital workspace to monitor, query, print, and backup Inventory Custodian Slips completely offline.</p>
          <button class="btn btn-primary" id="btn-welcome-dismiss">Get Started</button>
        </div>
      `;
      document.body.appendChild(welcome);
      welcome.querySelector('#btn-welcome-dismiss').addEventListener('click', () => {
        localStorage.setItem('ics-welcomed-v1', 'true');
        welcome.remove();
      });
    }
  } catch {}

  // Global keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Cmd/Ctrl+K → toggle command palette
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      CommandPalette.toggle();
    }
    // Cmd/Ctrl+F → focus search input
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      const searchInput = document.getElementById('global-search') ||
                          document.getElementById('records-search-input');
      if (searchInput) searchInput.focus();
    }
    // Cmd/Ctrl+N → new ICS
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
        e.preventDefault();
        Router.navigate('#new');
      }
    }
    // Cmd/Ctrl+S → Save ICS (Wizard Form)
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      const saveBtn = document.getElementById('form-save-btn');
      if (saveBtn && saveBtn.style.display !== 'none') {
        saveBtn.click();
      }
    }
    // Cmd/Ctrl+P → Print Preview
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      const printBtn = document.getElementById('vact-print');
      if (printBtn) {
        printBtn.click();
      } else {
        UIKit.toast('Open a record slip to preview printing.', 'info');
      }
    }
    // Cmd/Ctrl+B → Database Backup
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      RecordService.getAllRecords().then(recs => {
        BackupManager.generateBackup(recs);
        UIKit.toast('Database backup generated.', 'success');
      });
    }
    // Cmd/Ctrl+, → Open settings page
    if ((e.metaKey || e.ctrlKey) && e.key === ',') {
      e.preventDefault();
      Router.navigate('#settings');
    }
    // Escape → close drawers and palette
    if (e.key === 'Escape') {
      if (AppState.drawerOpen)     closeContextDrawer();
      if (AppState.mobileMenuOpen) closeMobileMenu();
      CommandPalette.close();
      const sug = document.getElementById('header-search-suggestions');
      if (sug) sug.classList.remove('active');
    }
  });

  // Phase 2: Initialize database, seed demo data, then start router
  DB.open()
    .then(() => RecordService.seedDemoData())
    .then(async () => {
      // Phase 5: Initialize services
      CommandPalette.init();
      const recs = await RecordService.getAllRecords();
      const notifs = NotificationEngine.generate(recs);
      window.App.updateNotificationCount(notifs.length);
      window.App.rebuildSavedSearches();

      setupRouter();
      console.log('[ICS App] Bootstrapped successfully — DB & Phase 5 ready.');
    })
    .catch(err => {
      console.error('[ICS App] Database initialization failed:', err);
      setupRouter();
    });
}

/* ============================================================
   Phase 5: Global helpers and Header Search Dropdown Logic
   ============================================================ */
window.App = {
  updateNotificationCount(count) {
    const badge = document.querySelector('#nav-notifications .nav-badge');
    if (badge) {
      if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    }
  },
  rebuildSavedSearches() {
    const listContainer = document.getElementById('sidebar-saved-searches');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    const list = FavoritesManager.getSearches();
    if (list.length === 0) {
      listContainer.innerHTML = `<span style="font-size:10px;color:var(--color-text-tertiary);padding-left:12px">No saved searches</span>`;
      return;
    }

    list.forEach(s => {
      const item = document.createElement('div');
      item.className = 'saved-search-item';
      item.innerHTML = `
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:140px">🔎 ${Utils.escapeHtml(s.name)}</span>
        <button class="saved-search-del-btn" title="Delete Saved Search">&times;</button>
      `;
      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('saved-search-del-btn')) return;
        AppState.preappliedFilters = s.filters;
        Router.navigate('#records');
      });
      item.querySelector('.saved-search-del-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        FavoritesManager.deleteSearch(s.name);
        window.App.rebuildSavedSearches();
      });
      listContainer.appendChild(item);
    });
  },
  openContextDrawer,
  closeContextDrawer,
  expandContextPanel
};

function wireHeaderSearch(searchEl, sug) {
  const input = searchEl.querySelector('input');
  
  input.addEventListener('focus', () => {
    _updateSuggestions(input.value.trim(), sug);
    sug.classList.add('active');
  });

  const handleInput = Utils.debounce(() => {
    _updateSuggestions(input.value.trim(), sug);
  }, 200);
  input.addEventListener('input', handleInput);

  document.addEventListener('click', (e) => {
    if (!searchEl.contains(e.target)) {
      sug.classList.remove('active');
    }
  });

  // Mobile search bar setup
  const mobileInput = document.getElementById('mobile-global-search');
  const mobileSuggest = document.getElementById('mobile-search-suggestions');
  const mobileBar = document.getElementById('mobile-search-bar');
  const mobileClear = document.getElementById('mobile-search-clear');

  if (mobileInput && mobileSuggest && mobileBar && mobileClear) {
    // 1. Sync Input & Proxy Events
    mobileInput.addEventListener('input', () => {
      sug.classList.add('active'); // Keep desktop container active
      input.value = mobileInput.value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      mobileClear.style.display = mobileInput.value ? 'flex' : 'none';
    });

    mobileClear.addEventListener('click', () => {
      mobileInput.value = '';
      mobileInput.dispatchEvent(new Event('input', { bubbles: true }));
      mobileClear.style.display = 'none';
      mobileInput.focus();
    });

    mobileInput.addEventListener('focus', () => {
      sug.classList.add('active'); // Make desktop container active on mobile focus
      _updateSuggestions(mobileInput.value.trim(), sug);
      mobileSuggest.innerHTML = sug.innerHTML;
      const isVisible = window.getComputedStyle(sug).display !== 'none' && mobileSuggest.innerHTML.trim() !== '';
      mobileSuggest.style.display = isVisible ? 'block' : 'none';
      mobileBar.classList.toggle('suggestions-open', isVisible);
    });

    // Delegate click events on copied search suggestions
    mobileSuggest.addEventListener('click', (e) => {
      const item = e.target.closest('.suggestion-item');
      if (item) {
        const hash = item.getAttribute('data-hash');
        if (hash) {
          mobileSuggest.style.display = 'none';
          mobileBar.classList.remove('suggestions-open');
          sug.classList.remove('active');
          Router.navigate(hash);
        }
      }
    });

    // 2. Sync Suggestions & Attached UI
    const observer = new MutationObserver(() => {
      mobileSuggest.innerHTML = sug.innerHTML;
      const isVisible = window.getComputedStyle(sug).display !== 'none' && mobileSuggest.innerHTML.trim() !== '';
      
      mobileSuggest.style.display = isVisible ? 'block' : 'none';
      mobileBar.classList.toggle('suggestions-open', isVisible);
    });
    observer.observe(sug, { childList: true, subtree: true, attributes: true });

    // Handle clicks outside mobile search to close
    document.addEventListener('click', (e) => {
      if (!mobileBar.contains(e.target)) {
        sug.classList.remove('active');
        mobileSuggest.style.display = 'none';
        mobileBar.classList.remove('suggestions-open');
      }
    });
  }
}

async function _updateSuggestions(query, sug) {
  sug.innerHTML = '';
  let records = [];
  try {
    records = await RecordService.getAllRecords();
  } catch {
    return;
  }

  const q = query.toLowerCase().trim();

  if (!q) {
    const favs = records.filter(r => r.isFavorite && r.status !== 'archived').slice(0, 3);
    const recents = RecentActivity.get('viewed').slice(0, 3);

    if (favs.length > 0) {
      sug.appendChild(_buildSectionHeader('Starred Records'));
      favs.forEach(r => {
        sug.appendChild(_buildSugRow(r.icsNumber || 'Draft', `Recipient: ${r.receivedBy}`, `#view?id=${r.id}`, sug));
      });
    }

    if (recents.length > 0) {
      sug.appendChild(_buildSectionHeader('Recent Searches'));
      recents.forEach(r => {
        sug.appendChild(_buildSugRow(r.icsNumber || 'Draft', `Viewed: ${r.receivedBy}`, `#view?id=${r.id}`, sug));
      });
    }

    if (favs.length === 0 && recents.length === 0) {
      sug.innerHTML = `<div style="font-size:10px;padding:var(--space-4);text-align:center;color:var(--color-text-tertiary)">Type to search records, recipients, serials...</div>`;
    }
    return;
  }

  const recMatches = [];
  const recipientMatches = new Map();
  const itemMatches = [];
  const serialMatches = [];

  records.forEach(r => {
    if ((r.icsNumber || '').toLowerCase().includes(q)) {
      recMatches.push(r);
    }
    if ((r.receivedBy || '').toLowerCase().includes(q)) {
      recipientMatches.set(r.receivedBy, r.id);
    }
    if (r.items) {
      r.items.forEach(item => {
        if ((item.description || '').toLowerCase().includes(q)) {
          itemMatches.push({ text: item.description, id: r.id });
        }
        if ((item.serialNumber || '').toLowerCase().includes(q)) {
          serialMatches.push({ text: item.serialNumber, id: r.id });
        }
      });
    }
  });

  let hasResults = false;

  if (recMatches.length > 0) {
    hasResults = true;
    sug.appendChild(_buildSectionHeader('ICS Records'));
    recMatches.slice(0, 4).forEach(r => {
      sug.appendChild(_buildSugRow(r.icsNumber || 'Draft', `Recipient: ${r.receivedBy}`, `#view?id=${r.id}`, sug));
    });
  }

  if (recipientMatches.size > 0) {
    hasResults = true;
    sug.appendChild(_buildSectionHeader('Recipients'));
    let count = 0;
    for (const [name, id] of recipientMatches.entries()) {
      if (count >= 4) break;
      sug.appendChild(_buildSugRow(name, 'Recipient', `#view?id=${id}`, sug));
      count++;
    }
  }

  if (itemMatches.length > 0) {
    hasResults = true;
    sug.appendChild(_buildSectionHeader('Inventory Items'));
    const uniqueItems = Array.from(new Map(itemMatches.map(item => [item.text, item])).values());
    uniqueItems.slice(0, 4).forEach(item => {
      sug.appendChild(_buildSugRow(item.text, 'Inventory Item', `#view?id=${item.id}`, sug));
    });
  }

  if (serialMatches.length > 0) {
    hasResults = true;
    sug.appendChild(_buildSectionHeader('Serial Numbers'));
    const uniqueSerials = Array.from(new Map(serialMatches.map(item => [item.text, item])).values());
    uniqueSerials.slice(0, 4).forEach(item => {
      sug.appendChild(_buildSugRow(item.text, 'Serial Number', `#view?id=${item.id}`, sug));
    });
  }

  if (!hasResults) {
    sug.innerHTML = `<div style="font-size:10px;padding:var(--space-4);text-align:center;color:var(--color-text-tertiary)">No matching records or serials found.</div>`;
  }
}

function _buildSectionHeader(title) {
  const el = document.createElement('div');
  el.className = 'suggestion-section-title';
  el.textContent = title;
  return el;
}

function _buildSugRow(label, sub, hash, sug) {
  const el = document.createElement('div');
  el.className = 'suggestion-item';
  el.setAttribute('data-hash', hash);
  el.innerHTML = `
    <span class="suggestion-item-main">${Utils.escapeHtml(label)}</span>
    <span class="suggestion-item-sub">${Utils.escapeHtml(sub)}</span>
  `;
  el.addEventListener('click', () => {
    sug.classList.remove('active');
    Router.navigate(hash);
  });
  return el;
}

/* ============================================================
   Phase 7: Future Extension Plugin Architecture
   ============================================================ */
window.ICSPlugins = {
  _hooks: {},
  register(hookName, fn) {
    if (!this._hooks[hookName]) this._hooks[hookName] = [];
    this._hooks[hookName].push(fn);
  },
  run(hookName, ...args) {
    if (this._hooks[hookName]) {
      this._hooks[hookName].forEach(fn => {
        try { fn(...args); } catch (err) { console.error(`[Plugin Hook Error] ${hookName}`, err); }
      });
    }
  }
};

/* ============================================================
   Entry Point
   ============================================================ */
document.addEventListener('DOMContentLoaded', bootstrap);
