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
  let _collapsedHeaders = {};

  /* ----------------------------------------------------------
     Context Panel 
     ---------------------------------------------------------- */
  function _renderContext(container) {
    if (!container) return;
    container.innerHTML = '';

    const counts = { critical: 0, warning: 0, reminder: 0, info: 0 };
    _notifications.forEach(n => {
      if (counts[n.category] !== undefined) counts[n.category]++;
    });

    const icons = {
        critical: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
        warning: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
        reminder: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
        info: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
        integrity: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>`
    };

    const contextHtml = `
      <div style="padding: 12px 0;">
          <div style="text-transform: uppercase; font-size: 11px; font-weight: 700; color: var(--color-text-tertiary); margin-bottom: 20px;">Notifications</div>
          
          <button class="btn btn-secondary" id="nact-mark-all" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; border-radius: 12px; margin-bottom: 30px; height: 44px; font-weight: 600;">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              Mark All as Read
          </button>

          <div style="border: 1px solid var(--color-border); border-radius: 16px; padding: 16px; margin-bottom: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); background: var(--color-surface);">
              <div style="text-transform: uppercase; font-size: 10px; font-weight: 700; color: var(--color-text-tertiary); margin-bottom: 16px;">Notification Summary</div>
              
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--color-border-light);">
                  <div style="display: flex; align-items: center; font-size: 13px; color: var(--color-text-secondary);">
                      ${icons.critical} Critical Errors
                  </div>
                  <span style="background: #fee2e2; color: #ef4444; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 11px; font-weight: 700;">${counts.critical}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--color-border-light);">
                  <div style="display: flex; align-items: center; font-size: 13px; color: var(--color-text-secondary);">
                      ${icons.warning} Warnings
                  </div>
                  <span style="background: #ffedd5; color: #f97316; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 11px; font-weight: 700;">${counts.warning}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--color-border-light);">
                  <div style="display: flex; align-items: center; font-size: 13px; color: var(--color-text-secondary);">
                      ${icons.reminder} Reminders
                  </div>
                  <span style="background: #e0e7ff; color: #6366f1; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 11px; font-weight: 700;">${counts.reminder}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0;">
                  <div style="display: flex; align-items: center; font-size: 13px; color: var(--color-text-secondary);">
                      ${icons.info} Info Alerts
                  </div>
                  <span style="background: #f3f4f6; color: #6b7280; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 11px; font-weight: 700;">${counts.info}</span>
              </div>
          </div>

          <div style="background: var(--color-surface-alt); border: 1px solid var(--color-border); border-radius: 16px; padding: 16px;">
              <div style="display: flex; align-items: center; margin-bottom: 8px;">
                  ${icons.integrity}
                  <span style="font-size: 13px; font-weight: 600; color: var(--color-text-primary);">Automated Integrity Engine</span>
              </div>
              <p style="font-size: 12px; color: var(--color-text-secondary); line-height: 1.6; margin: 0;">
                  Notifications are dynamically compiled by scanning for duplicate serial numbers, empty fields, and end of useful life (EUL) asset expiries.
              </p>
          </div>
      </div>
    `;

    container.innerHTML = contextHtml;

    const markBtn = container.querySelector('#nact-mark-all');
    if (markBtn) {
      markBtn.addEventListener('click', () => {
        _notifications.forEach(n => NotificationEngine.markRead(n.id));
        _loadNotificationsAndRender();
        UIKit.toast('All alerts marked as read.', 'success');
      });
    }
  }

  function _renderContext(container) {
    if (!container) return;
    container.innerHTML = '';

    const counts = { critical: 0, warning: 0, reminder: 0, info: 0 };
    _notifications.forEach(n => {
      if (counts[n.category] !== undefined) counts[n.category]++;
    });

    const lead = Components.contextLead({
      eyebrow: 'Notifications',
      title: 'Alert Center',
      desc: 'A compact summary of what needs attention across the workspace.',
      iconName: 'notifications',
      badge: `${_notifications.length} Total`,
      tier: 'hero'
    });
    lead.appendChild(Components.contextMetricGrid([
      { label: 'Critical', value: String(counts.critical) },
      { label: 'Warnings', value: String(counts.warning) },
      { label: 'Reminders', value: String(counts.reminder) },
      { label: 'Info', value: String(counts.info) }
    ]));
    container.appendChild(lead);

    const actionsCard = Components.contextCard({
      title: 'Actions',
      iconName: 'check',
      subtitle: 'Resolve the feed in batches when you just need a quick cleanup.',
      tier: 'action'
    });
    const markBtn = document.createElement('button');
    markBtn.id = 'nact-mark-all';
    markBtn.className = 'btn btn-secondary';
    markBtn.textContent = 'Mark All as Read';
    markBtn.addEventListener('click', () => {
      _notifications.forEach(n => NotificationEngine.markRead(n.id));
      _loadNotificationsAndRender();
      UIKit.toast('All alerts marked as read.', 'success');
    });
    actionsCard.querySelector('.context-card-body').appendChild(
      Components.contextActionGroup([markBtn])
    );
    container.appendChild(actionsCard);

    container.appendChild(Components.contextCard({
      title: 'Integrity Engine',
      iconName: 'cpu',
      body: 'Notifications are compiled from duplicate serial checks, missing field audits, and end-of-useful-life monitoring.',
      tier: 'status'
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

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - (24 * 60 * 60 * 1000);
    const weekStart = todayStart - (7 * 24 * 60 * 60 * 1000);

    const groups = {
      'Today': [],
      'Yesterday': [],
      'Earlier this Week': [],
      'Older': []
    };

    filtered.forEach(n => {
      const card = document.createElement('div');
      card.className = `notif-card ${n.read ? 'read' : 'unread'} category-${n.category}`;
      card.style.cssText = `
        position:relative;background-color:transparent;border:none;
        border-bottom:1px solid var(--color-border-light);border-radius:0px;
        padding:16px;margin:0px;display:flex;align-items:flex-start;gap:var(--space-4);
        box-shadow:none;transition:background-color 0.2s;
      `;

      let themeColor = 'var(--color-text-secondary)';
      let bgColor = 'var(--color-surface-alt)';
      let iconHTML = '';
      
      const cardIcons = {
        critical: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
        warning: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
        reminder: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
        info: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
      };

      if (n.category === 'critical') {
        themeColor = 'var(--color-danger)';
        bgColor = 'var(--color-danger-light, rgba(239, 68, 68, 0.1))';
        iconHTML = cardIcons.critical;
      } else if (n.category === 'warning') {
        themeColor = 'var(--color-warning)';
        bgColor = 'var(--color-warning-light, rgba(245, 158, 11, 0.1))';
        iconHTML = cardIcons.warning;
      } else if (n.category === 'reminder') {
        themeColor = 'var(--color-primary)';
        bgColor = 'var(--color-primary-light, rgba(99, 102, 241, 0.1))';
        iconHTML = cardIcons.reminder;
      } else {
        themeColor = 'var(--color-text-secondary)';
        bgColor = 'var(--color-surface-alt)';
        iconHTML = cardIcons.info;
      }

      const iconWrapper = document.createElement('div');
      iconWrapper.className = 'notif-icon-wrapper';
      iconWrapper.innerHTML = iconHTML;
      iconWrapper.style.cssText = `
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background-color: ${bgColor};
        color: ${themeColor};
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        margin-right: 16px;
        transition: all 0.2s ease;
      `;
      card.appendChild(iconWrapper);

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
      actions.style.cssText = 'display:flex;gap:6px;align-self:flex-start;flex-shrink:0';
      
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

      // Group based on timestamp
      const time = new Date(n.timestamp).getTime();
      if (time >= todayStart) groups['Today'].push(card);
      else if (time >= yesterdayStart) groups['Yesterday'].push(card);
      else if (time >= weekStart) groups['Earlier this Week'].push(card);
      else groups['Older'].push(card);
    });

    let isFirstHeader = true;

    Object.keys(groups).forEach(label => {
      if (groups[label].length > 0) {
        // Create Header
        const header = document.createElement('div');
        header.className = 'notif-timeline-header';
        
        const isToday = label === 'Today';
        const iconColor = isToday ? 'var(--color-primary)' : 'currentColor';
        const clockIconHTML = `<svg class="timeline-clock-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 12px; flex-shrink: 0; transition: transform 0.2s ease-in-out, color 0.2s ease;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
        
        const isCollapsed = !!_collapsedHeaders[label];
        const caretRotate = isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)';
        const caretIconHTML = `<span class="caret-icon" style="margin-right: 10px; font-size: 10px; display: inline-block; transition: transform 0.3s ease; transform: ${caretRotate}; color: var(--color-text-tertiary);">▼</span>`;
        
        const titleContainer = document.createElement('div');
        titleContainer.style.cssText = 'display:flex;align-items:center;';
        titleContainer.innerHTML = `${caretIconHTML}${clockIconHTML}<span>${label}</span>`;
        header.appendChild(titleContainer);

        header.style.cssText = 'font-size:22px;text-transform:none;display:flex;align-items:center;justify-content:space-between;color:var(--color-text-primary);font-weight:600;width:100%;padding-right:8px;';
        header.style.cursor = 'pointer';
        header.style.userSelect = 'none';
        listContainer.appendChild(header);

        const svg = titleContainer.querySelector('.timeline-clock-icon');
        if (svg) {
          header.addEventListener('mouseenter', () => {
            svg.style.transform = 'scale(1.1)';
          });
          header.addEventListener('mouseleave', () => {
            svg.style.transform = 'scale(1)';
          });
        }

        // Toggle logic
        header.addEventListener('click', (e) => {
          if (e.target.closest('#notif-header-mark-all')) return;
          _collapsedHeaders[label] = !_collapsedHeaders[label];
          _renderList();
        });

        // If it's the first header, append the Mark All Read button
        if (isFirstHeader) {
          isFirstHeader = false;
          
          const markAllBtn = document.createElement('button');
          markAllBtn.id = 'notif-header-mark-all';
          markAllBtn.className = 'btn-text-action';
          markAllBtn.textContent = 'Mark all read';
          markAllBtn.style.cssText = `
            background: transparent !important;
            border: none !important;
            color: var(--color-primary, #6366f1) !important;
            font-size: 13px !important;
            font-weight: 600 !important;
            padding: 4px 8px !important;
            cursor: pointer !important;
            height: auto !important;
            text-decoration: none !important;
            box-shadow: none !important;
            margin: 0 !important;
            transition: opacity 0.2s ease;
            outline: none;
          `;
          
          markAllBtn.addEventListener('mouseenter', () => {
            markAllBtn.style.opacity = '0.7';
          });
          markAllBtn.addEventListener('mouseleave', () => {
            markAllBtn.style.opacity = '1';
          });
          
          markAllBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            _notifications.forEach(n => NotificationEngine.markRead(n.id));
            _loadNotificationsAndRender();
            UIKit.toast('All alerts marked as read.', 'success');
          });
          
          header.appendChild(markAllBtn);
        }

        // Add Cards
        groups[label].forEach(card => {
          if (isCollapsed) {
            card.style.display = 'none';
          } else {
            card.style.display = 'flex';
          }
          listContainer.appendChild(card);
        });
      }
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

    // Wired actions handled in list rendering

    // Initial load
    _loadNotificationsAndRender();

    // Desktop notifications permission request
    if ("Notification" in window) {
      if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
          if (permission === "granted") {
            new Notification("Notifications Enabled", {
              body: "You will now receive alerts for new system events.",
              icon: "https://via.placeholder.com/128"
            });
          }
        });
      }
    }

    workspace.classList.add('page-enter');
    setTimeout(() => workspace.classList.remove('page-enter'), 300);
  }

  return { render };
})();
