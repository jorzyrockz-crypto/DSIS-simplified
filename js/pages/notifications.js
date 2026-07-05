/**
 * ICS Tracking & Monitoring Tool
 * Phase 5: Smart Search, Filters, Notifications — Notifications Page
 */
'use strict';

const NotificationsPage = (() => {

  let _allRecords = [];
  let _notifications = [];
  let _contextBody = null;
  let _filterCategory = 'all'; // 'all' | 'critical' | 'warning' | 'reminder' | 'info'

  /* ----------------------------------------------------------
     Context Panel 
     ---------------------------------------------------------- */
  function _renderContext(container) {
    container.innerHTML = '';

    const counts = { critical: 0, warning: 0, reminder: 0, info: 0 };
    _notifications.forEach(n => {
      if (counts[n.category] !== undefined) counts[n.category]++;
    });

    const contextHtml = `
      <div style="margin-bottom: 12px; margin-top: -4px;">
        <div class="btn-group" style="display:flex;">
          <button class="btn btn-secondary btn-sm" id="nact-mark-read" style="flex:1;justify-content:center" title="Mark All as Read">
            ${Components.icon('check')} Mark All as Read
          </button>
        </div>
      </div>

      <div class="inspector-card" style="margin-bottom:16px">
        <h4 class="detail-section-title" style="margin-bottom:0">Notification Summary</h4>
        <div class="detail-row">
          <div class="detail-key">Critical Errors</div>
          <div class="detail-val"><span class="badge badge-danger">${counts.critical}</span></div>
        </div>
        <div class="detail-row">
          <div class="detail-key">Warnings</div>
          <div class="detail-val"><span class="badge badge-warning">${counts.warning}</span></div>
        </div>
        <div class="detail-row">
          <div class="detail-key">Reminders</div>
          <div class="detail-val"><span class="badge badge-info">${counts.reminder}</span></div>
        </div>
        <div class="detail-row">
          <div class="detail-key">Info Alerts</div>
          <div class="detail-val"><span class="badge badge-neutral">${counts.info}</span></div>
        </div>
      </div>
    `;

    // Wrap the HTML inside a temporary div to extract children cleanly
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = contextHtml;
    while (tempDiv.firstChild) {
      container.appendChild(tempDiv.firstChild);
    }

    const markBtn = container.querySelector('#nact-mark-read');
    if (markBtn) {
      markBtn.addEventListener('click', () => {
        _notifications.forEach(n => NotificationEngine.markRead(n.id));
        _loadNotificationsAndRender();
        UIKit.toast('All alerts marked as read.', 'success');
      });
    }

    container.appendChild(Components.contextCard({
      iconName: 'info',
      title:    'Automated Integrity Engine',
      body:     'Notifications are dynamically compiled by scanning for duplicate serial numbers, empty fields, and end of useful life (EUL) asset expiries.',
    }));
  }

  /* ----------------------------------------------------------
     Loader
     ---------------------------------------------------------- */
  async function _loadNotificationsAndRender() {
    try {
      _allRecords = await RecordService.getAllRecords();
      _notifications = NotificationEngine.generate(_allRecords);

      // Render main workspace & context
      _renderList();
      _renderContext(_contextBody);

      // Rebuild sidebar count badges if applicable
      if (window.App && typeof window.App.updateNotificationCount === 'function') {
        window.App.updateNotificationCount(_notifications.length);
      }
    } catch (err) {
      console.error(err);
    }
  }

  /* ----------------------------------------------------------
     DOM Rendering (List)
     ---------------------------------------------------------- */
  function _renderList() {
    const listContainer = document.getElementById('notif-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    const filtered = _notifications.filter(n => {
      if (_filterCategory === 'all') return true;
      if (_filterCategory === 'unread') return !n.read;
      return n.category === _filterCategory;
    });

    // Stable sort: keep pinned items at the top
    filtered.sort((a, b) => {
      const pinA = a.pinned ? 1 : 0;
      const pinB = b.pinned ? 1 : 0;
      return pinB - pinA;
    });

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state" style="padding:48px 24px">
          <div class="empty-icon">${Components.icon('bell')}</div>
          <div class="empty-title">All Clear! No alerts</div>
          <div class="empty-desc">Your ICS database records are fully healthy with no asset useful life warnings or duplicate data.</div>
        </div>
      `;
      return;
    }

    filtered.forEach(n => {
      const card = document.createElement('div');
      card.className = `notif-card ${n.read ? 'read' : 'unread'} category-${n.category}`;
      card.style.cssText = `
        position:relative;background:var(--color-surface);border:1px solid var(--color-border);
        border-radius:var(--radius-lg);padding:20px 24px;margin-bottom:var(--space-4);
        display:flex;align-items:flex-start;gap:var(--space-4);box-shadow:var(--shadow-sm);
        transition:box-shadow var(--transition-fast);
      `;

      const bulletColor = { critical: 'var(--color-danger)', warning: 'var(--color-warning)', reminder: 'var(--color-primary)', info: 'var(--color-text-secondary)' }[n.category] || 'var(--color-primary)';
      const bullet = document.createElement('span');
      bullet.style.cssText = `width:8px;height:8px;border-radius:50%;background:${bulletColor};margin-top:6px;flex-shrink:0;`;
      card.appendChild(bullet);

      const main = document.createElement('div');
      main.style.cssText = 'flex:1;min-width:0;cursor:pointer;';
      main.innerHTML = `
        <div style="font-weight:600;font-size:var(--font-size-sm);color:var(--color-text-primary);display:flex;align-items:center;gap:6px">
          ${n.pinned ? '<span style="color:var(--color-primary);font-size:11px">📌</span>' : ''} ${Utils.escapeHtml(n.title)}
          <span style="font-size:10px;font-weight:400;color:var(--color-text-tertiary)">(${n.icsNumber})</span>
        </div>
        <p style="font-size:var(--font-size-xs);color:var(--color-text-secondary);margin-top:4px;line-height:1.4">${Utils.escapeHtml(n.desc)}</p>
        <span style="font-size:10px;color:var(--color-text-tertiary);margin-top:4px;display:inline-block">${Utils.formatRelativeTime(n.timestamp)}</span>
      `;
      main.addEventListener('click', () => {
        NotificationEngine.markRead(n.id);
        Router.navigate(`#view?id=${n.recordId}`);
      });
      card.appendChild(main);

      // Actions sidebar inside card (Clean circular SVG buttons)
      const actions = document.createElement('div');
      actions.style.cssText = 'display:flex;gap:6px;align-self:center;flex-shrink:0';
      
      const pinSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="${n.pinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-.44-1.24l-2.33-2.92A2 2 0 0 1 15.8 9.84V5H8.2v4.84a2 2 0 0 1-.43 1.24l-2.33 2.92A2 2 0 0 0 5 15.24z"/></svg>`;
      
      actions.innerHTML = `
        <button class="btn btn-ghost btn-sm btn-icon btn-notif-pin" style="width:32px;height:32px;border-radius:50%;padding:0;color:${n.pinned ? 'var(--color-primary)' : 'var(--color-text-secondary)'}" title="${n.pinned ? 'Unpin' : 'Pin to top'}">
          ${pinSvg}
        </button>
        <button class="btn btn-ghost btn-sm btn-icon btn-notif-read" style="width:32px;height:32px;border-radius:50%;padding:0;color:var(--color-text-secondary)" title="${n.read ? 'Mark Unread' : 'Mark Read'}">
          ${Components.icon('check')}
        </button>
        <button class="btn btn-ghost btn-sm btn-icon btn-notif-dismiss" style="width:32px;height:32px;border-radius:50%;padding:0;color:var(--color-danger)" title="Dismiss Alert">
          ${Components.icon('close')}
        </button>
      `;

      actions.querySelector('.btn-notif-pin').addEventListener('click', () => {
        NotificationEngine.togglePin(n.id);
        _loadNotificationsAndRender();
      });
      actions.querySelector('.btn-notif-read').addEventListener('click', () => {
        NotificationEngine.markRead(n.id);
        _loadNotificationsAndRender();
      });
      actions.querySelector('.btn-notif-dismiss').addEventListener('click', () => {
        NotificationEngine.dismiss(n.id);
        _loadNotificationsAndRender();
      });

      card.appendChild(actions);
      listContainer.appendChild(card);
    });
  }

  /* ----------------------------------------------------------
     Main Render
     ---------------------------------------------------------- */
  function render(workspace, contextBody) {
    workspace.innerHTML = '';
    _contextBody = contextBody;

    // Header
    const header = document.createElement('div');
    header.className = 'page-header';
    header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;width:100%;margin-bottom:var(--space-6)';
    header.innerHTML = `
      <div>
        <h1 class="page-title" style="margin:0">Notifications</h1>
        <p class="page-subtitle" style="margin:4px 0 0 0">Review and resolve system integrity alerts</p>
      </div>
      <div>
        <button class="btn btn-secondary btn-sm" id="notif-header-mark-all" style="height:32px">
          Mark All as Read
        </button>
      </div>
    `;
    workspace.appendChild(header);

    // Filters row
    const chipsList = [
      { id: 'notif-chip-all',      label: 'All Alerts',     val: 'all' },
      { id: 'notif-chip-unread',   label: 'Unread Only',    val: 'unread' },
      { id: 'notif-chip-critical', label: 'Critical Errors',val: 'critical' },
      { id: 'notif-chip-warning',  label: 'Warnings',       val: 'warning' },
      { id: 'notif-chip-reminder', label: 'Reminders',      val: 'reminder' },
      { id: 'notif-chip-info',     label: 'Info Alerts',    val: 'info' },
    ];
    const chips = Components.chipGroup(chipsList.map(c => ({
      label: c.label,
      active: c.val === _filterCategory,
      id: c.id
    })));
    chips.style.marginBottom = '24px'; /* Fixed spacing bug: added bottom margin separating filters from feed */

    chips.querySelectorAll('.chip').forEach((chip, idx) => {
      chip.addEventListener('click', () => {
        _filterCategory = chipsList[idx].val;
        // toggle active states
        chips.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        _renderList();
      });
    });
    workspace.appendChild(chips);

    // List Container
    const list = document.createElement('div');
    list.className = 'notif-list';
    list.id = 'notif-list';
    workspace.appendChild(list);

    // Wire header action
    setTimeout(() => {
      const markAllBtn = document.getElementById('notif-header-mark-all');
      if (markAllBtn) {
        markAllBtn.addEventListener('click', () => {
          _notifications.forEach(n => NotificationEngine.markRead(n.id));
          _loadNotificationsAndRender();
          UIKit.toast('All alerts marked as read.', 'success');
        });
      }
    }, 0);

    // Initial load
    _loadNotificationsAndRender();

    workspace.classList.add('page-enter');
    setTimeout(() => workspace.classList.remove('page-enter'), 300);
  }

  return { render };
})();
