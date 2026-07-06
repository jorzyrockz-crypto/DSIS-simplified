/**
 * ICS Tracking & Monitoring Tool
 * Phase 5: Dashboard — Live Statistics and Premium SaaS Overview
 */
'use strict';

const DashboardPage = (() => {

  let _allRecords = [];
  let _contextBody = null;
  let _customConfig = {
    showActive: true,
    showHealthy: true,
    showApproaching: true,
    showExpired: true,
    showValue: false,
    showDistribution: false,
    columns: 'auto'
  };

  // Load saved config
  try {
    const saved = localStorage.getItem('dsis_dashboard_config');
    if (saved) {
      Object.assign(_customConfig, JSON.parse(saved));
    }
  } catch (e) {
    console.error(e);
  }

  /* ----------------------------------------------------------
     Context Panel — Health & Alerts Only (Linear Style)
     ---------------------------------------------------------- */
  function _renderContextPanel(contextBody, stats) {
    contextBody.innerHTML = '';
    _contextBody = contextBody;

    const icons = {
      critical: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
      warning: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
      reminder: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
      info: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
      health: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>`
    };

    const alerts = NotificationEngine.generate(_allRecords).slice(0, 3);
    let alertsHtml = '';
    if (alerts.length === 0) {
      alertsHtml = `<div style="font-size:12px; color:var(--color-text-secondary); padding: 8px 0;">No active alerts.</div>`;
    } else {
      alertsHtml = alerts.map(a => {
        const alertIcon = icons[a.category] || icons.info;
        const badgeClass = a.category === 'critical' ? 'badge-danger' : (a.category === 'warning' ? 'badge-warning' : (a.category === 'reminder' ? 'badge-info' : 'badge-neutral'));
        const badgeLabel = a.category.charAt(0).toUpperCase() + a.category.slice(1);
        return `
          <div class="recent-alert-item" style="cursor:pointer;" data-record-id="${a.recordId}">
            <div style="display:flex; align-items:center; gap:10px; flex:1; min-width:0;">
              ${alertIcon}
              <span style="font-size:12px; color:var(--color-text-primary); font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${Utils.escapeHtml(a.title)}</span>
            </div>
            <span class="badge ${badgeClass}" style="font-size:9px; padding:2px 6px; border-radius:4px; flex-shrink:0;">${badgeLabel}</span>
          </div>
        `;
      }).join('');
    }

    const cardsHtml = `
      <div class="context-card">
        <div class="context-card-title">Database Overview</div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 4px;">
          <div class="db-stat-item">
            <div style="font-size:10px; color:var(--color-text-tertiary); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px">Records</div>
            <div style="font-size:16px; font-weight:700; color:var(--color-text-primary)">${stats.total}</div>
          </div>
          <div class="db-stat-item">
            <div style="font-size:10px; color:var(--color-text-tertiary); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px">Items</div>
            <div style="font-size:16px; font-weight:700; color:var(--color-text-primary)">${stats.totalItems}</div>
          </div>
          <div class="db-stat-item">
            <div style="font-size:10px; color:var(--color-text-tertiary); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px">Drafts</div>
            <div style="font-size:16px; font-weight:700; color:var(--color-text-primary)">${stats.drafts}</div>
          </div>
          <div class="db-stat-item">
            <div style="font-size:10px; color:var(--color-text-tertiary); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px">Asset Value</div>
            <div style="font-size:14px; font-weight:700; color:var(--color-text-primary)">₱${stats.totalCost.toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div class="context-card">
        <div class="context-card-title">${icons.health} Workspace Health</div>
        <div style="display:flex; align-items:center; gap:16px; margin-top:4px">
          <div class="health-indicator" style="width:52px; height:52px; border-radius:50%; background:var(--color-success-light, #f0fdf4); border: 3px solid var(--color-success-border, #dcfce7); color:var(--color-success, #16a34a); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:15px">
            98%
          </div>
          <div>
            <div style="font-size:13px; font-weight:700; color:var(--color-text-primary)">System Stable</div>
            <div style="font-size:11px; color:var(--color-text-secondary)">All syncs completed</div>
          </div>
        </div>
      </div>

      <div class="context-card">
        <div class="context-card-title">Recent Alerts</div>
        <div style="display:flex; flex-direction:column; gap:2px">
          ${alertsHtml}
        </div>
      </div>
    `;

    contextBody.innerHTML = cardsHtml;

    // Attach click events to recent alert items
    contextBody.querySelectorAll('.recent-alert-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.getAttribute('data-record-id');
        Router.navigate(`#view?id=${id}`);
      });
    });
  }

  /* ----------------------------------------------------------
     Main Render
     ---------------------------------------------------------- */
  async function render(workspace, contextBody) {
    workspace.innerHTML = '';

    // Load DB records
    try {
      _allRecords = await RecordService.getAllRecords();
    } catch {
      _allRecords = [];
    }

    // ── Page Header ──
    const now       = new Date();
    const timeStr   = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
    const dayStr    = now.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    const userName = document.querySelector('.user-avatar')?.title || 'Admin User';
    const hour = now.getHours();
    let greetingText = 'Good morning';
    if (hour >= 12 && hour < 17) greetingText = 'Good afternoon';
    if (hour >= 17) greetingText = 'Good evening';
    const greeting = `${greetingText}, ${userName.split(' ')[0]}!`;

    const hero = document.createElement('div');
    hero.className = 'dashboard-hero';
    hero.innerHTML = `
      <div class="hero-content" style="display:flex;align-items:center;justify-content:space-between;width:100%;margin-bottom:var(--space-6)">
        <div class="hero-text">
          <h1 class="hero-greeting" style="font-size:var(--font-size-2xl);font-weight:700;margin:0;color:var(--color-text-primary)">${greeting}</h1>
          <p class="hero-date" style="font-size:var(--font-size-xs);color:var(--color-text-secondary);margin:4px 0 0 0">${dayStr} · ${timeStr}</p>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary" id="dash-hero-customize-btn" style="height:32px;font-size:13px;padding:0 12px;display:flex;align-items:center;font-weight:500">
            Customize
          </button>
          <button class="btn btn-primary" id="dash-hero-new-btn" style="background:var(--color-primary);border-color:var(--color-primary);box-shadow:none;font-weight:500">
            + New ICS Record
          </button>
        </div>
      </div>
    `;
    workspace.appendChild(hero);

    // Stats Grid
    const statsGrid = document.createElement('div');
    statsGrid.className = 'stats-grid';
    statsGrid.id = 'dash-stats-grid';
    workspace.appendChild(statsGrid);

    // Widgets Grid (2-column layout for Recent Activity & Favorites)
    const widgetsGrid = document.createElement('div');
    widgetsGrid.className = 'widgets-container';
    widgetsGrid.style.cssText = 'width:100%;';
    workspace.appendChild(widgetsGrid);

    // Wire primary buttons
    document.getElementById('dash-hero-new-btn')?.addEventListener('click', () => Router.navigate('#new'));
    document.getElementById('dash-hero-customize-btn')?.addEventListener('click', () => {
      _showCustomizationDialog(workspace);
    });

    // Populate data
    try {
      const stats = await RecordService.getStats();

      // Calculate Lifespan Metrics
      let totalActiveAssets = 0;
      let healthyAssets = 0;
      let approachingAssets = 0;
      let expiredAssets = 0;
      const watchlistItems = [];

      _allRecords.forEach(r => {
        if (r.status === 'archived' || r.status === 'cancelled') return;
        if (!r.items) return;
        r.items.forEach(item => {
          totalActiveAssets++;
          const rul = MonitoringService.calculateRUL(r.dateIssued, item.estimatedUsefulLife);
          if (rul.status === 'Expired') {
            expiredAssets++;
            watchlistItems.push({ item, record: r, rul });
          } else if (rul.status === 'Approaching EUL') {
            approachingAssets++;
            watchlistItems.push({ item, record: r, rul });
          } else {
            healthyAssets++;
          }
        });
      });

      // Sort watchlist by days remaining
      watchlistItems.sort((a, b) => a.rul.daysRemaining - b.rul.daysRemaining);

      // Set grid columns
      if (_customConfig.columns === '2') {
        statsGrid.style.gridTemplateColumns = 'repeat(2, 1fr)';
      } else if (_customConfig.columns === '4') {
        statsGrid.style.gridTemplateColumns = 'repeat(4, 1fr)';
      } else {
        statsGrid.style.gridTemplateColumns = '';
      }

      // Render stats cards conditionally
      if (_customConfig.showActive) {
        statsGrid.appendChild(Components.statCard({
          iconName: 'box',
          value:  totalActiveAssets,
          label:  'Total Active Assets',
          change: `Across all records`,
          variant:'primary',
        }));
      }
      if (_customConfig.showHealthy) {
        statsGrid.appendChild(Components.statCard({
          iconName: 'grid',
          value:  healthyAssets,
          label:  'Healthy Assets',
          change: `> 30 days remaining`,
          variant:'success',
        }));
      }
      if (_customConfig.showApproaching) {
        statsGrid.appendChild(Components.statCard({
          iconName: 'clock',
          value:  approachingAssets,
          label:  'Approaching EUL',
          change: `< 30 days remaining`,
          variant: approachingAssets > 0 ? 'warning' : 'primary',
        }));
      }
      if (_customConfig.showExpired) {
        statsGrid.appendChild(Components.statCard({
          iconName: 'alert',
          value:  expiredAssets,
          label:  'Expired Assets',
          change: expiredAssets > 0 ? 'Action required' : 'All clear',
          variant: expiredAssets > 0 ? 'critical' : 'primary',
        }));
      }
      if (_customConfig.showValue) {
        const formattedVal = stats.totalCost >= 1000000 
          ? `₱${(stats.totalCost / 1000000).toFixed(1)}M` 
          : `₱${stats.totalCost.toLocaleString()}`;
        statsGrid.appendChild(Components.statCard({
          iconName: 'reports',
          value:  formattedVal,
          label:  'Total Inventory Value',
          change: `Asset Cost Sum`,
          variant:'info',
        }));
      }

      // Render widgets
      _renderWidgets(widgetsGrid, watchlistItems);

      // Render right Context Panel
      _renderContextPanel(contextBody, stats);

      // Initialize drag-and-drop sort handlers
      _initDragAndDrop(statsGrid);

    } catch (err) {
      console.error('[DashboardPage] Stats error', err);
    }

    workspace.classList.add('page-enter');
    setTimeout(() => workspace.classList.remove('page-enter'), 300);
  }

  /* ----------------------------------------------------------
     Widgets Renderer (Recent Activity & Favorites)
     ---------------------------------------------------------- */
  function _renderWidgets(container, watchlistItems) {
    container.innerHTML = '';
    container.style.display = 'grid';
    container.appendChild(_buildUrgentWidget(watchlistItems));
    if (_customConfig.showDistribution) {
      container.appendChild(_buildDistributionWidget());
    }
    container.appendChild(_buildWatchlistWidget(watchlistItems));
    container.appendChild(_buildRecentWidget());
  }

  function _calculateOfficeDistribution() {
    const offices = {};
    let totalItems = 0;
    _allRecords.forEach(r => {
      if (r.status === 'archived' || r.status === 'cancelled') return;
      if (!r.items) return;
      const count = r.items.length;
      const office = r.office ? r.office.trim() : 'Unspecified';
      offices[office] = (offices[office] || 0) + count;
      totalItems += count;
    });

    const list = Object.entries(offices).map(([name, count]) => {
      const pct = totalItems > 0 ? Math.round((count / totalItems) * 100) : 0;
      return { name, count, pct };
    });

    list.sort((a, b) => b.count - a.count);
    return { list: list.slice(0, 4), totalItems };
  }

  function _buildDistributionWidget() {
    const card = document.createElement('div');
    card.className = 'widget-card';
    card.style.cssText = 'grid-column: 1 / -1;';
    
    const dist = _calculateOfficeDistribution();
    
    let itemsHtml = '';
    if (dist.list.length === 0) {
      itemsHtml = `
        <div style="padding:16px;text-align:center;color:var(--color-text-secondary);font-size:var(--font-size-xs)">
          No office distribution data available.
        </div>
      `;
    } else {
      itemsHtml = dist.list.map(office => {
        return `
          <div style="display: flex; align-items: center; gap: 12px; padding: 4px var(--space-4);">
            <span style="width: 120px; font-size: 12px; font-weight:600; color:var(--color-text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${Utils.escapeHtml(office.name)}</span>
            <div style="flex: 1; height: 8px; background: var(--color-border-light); border-radius: 4px; overflow: hidden;">
              <div style="width: ${office.pct}%; height: 100%; background: var(--color-primary); border-radius: 4px;"></div>
            </div>
            <span style="font-size: 12px; font-weight: 600; color:var(--color-text-primary); width:36px; text-align:right;">${office.pct}%</span>
          </div>
        `;
      }).join('');
    }

    card.innerHTML = `
      <div class="widget-card-header">
        <div class="widget-card-title">Distribution by Office</div>
      </div>
      <div class="widget-card-body" style="display:flex; flex-direction:column; gap:12px; padding:var(--space-4) 0;">
        ${itemsHtml}
      </div>
    `;
    return card;
  }

  function _buildUrgentWidget(watchlistItems) {
    const card = document.createElement('div');
    card.className = 'widget-card urgent-accent';
    card.style.cssText = 'grid-column: 1 / -1; border-left: 4px solid var(--color-danger) !important;';
    
    // Get top 2 urgent items
    const urgents = watchlistItems.slice(0, 2);
    
    let listHtml = '';
    if (urgents.length === 0) {
      listHtml = `
        <div style="padding:16px;text-align:center;color:var(--color-text-secondary);font-size:var(--font-size-xs)">
          No urgent items requiring attention.
        </div>
      `;
    } else {
      urgents.forEach((entry, idx) => {
        const isExpired = entry.rul.status === 'Expired';
        const desc = Utils.escapeHtml(entry.item.description) || 'Asset';
        const sn = Utils.escapeHtml(entry.item.serialNumber) || 'No SN';
        const recipient = Utils.escapeHtml(entry.record.receivedBy) || 'Unnamed';
        const office = Utils.escapeHtml(entry.record.office) || 'Unknown Office';
        const daysText = isExpired ? 'Expired' : `${entry.rul.daysRemaining} days remaining`;
        
        // Extract 2 letter abbreviation
        const abbr = desc.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || 'AS';

        if (idx === 0) {
          // Highlighted primary issue (large)
          const bgColor = isExpired ? 'rgba(239, 68, 68, 0.05)' : 'rgba(245, 158, 11, 0.05)';
          const borderColor = isExpired ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)';
          const textColor = isExpired ? 'var(--color-danger)' : 'var(--color-warning)';
          const avatarBg = isExpired ? 'var(--color-danger)' : 'var(--color-warning)';
          const avatarTextColor = isExpired ? '#fff' : '#1E2433';
          
          listHtml += `
            <div class="urgent-highlight-row" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: ${bgColor}; border-radius: 10px; border: 1px solid ${borderColor}; transition: transform 0.2s ease; cursor:pointer;" data-id="${entry.record.id}">
              <div style="display: flex; align-items: center; gap: 14px; min-width:0; flex:1;">
                  <div style="width: 40px; height: 40px; background: ${avatarBg}; color: ${avatarTextColor}; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px; flex-shrink:0;">${abbr}</div>
                  <div style="min-width:0; flex:1;">
                      <div style="font-size: 14px; font-weight: 700; color: ${textColor}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${isExpired ? 'Expired' : 'EUL Approaching'}: ${desc}</div>
                      <div style="font-size: 12px; color: var(--color-text-secondary); margin-top: 2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${recipient} · ${office} · <span style="font-weight: 600;">${daysText}</span></div>
                  </div>
              </div>
              <div style="display: flex; gap: 8px; margin-left: 12px;">
                  <button class="btn btn-secondary btn-sm btn-view-slip" data-id="${entry.record.id}" style="background:var(--color-surface); font-size:11px; height:28px; padding:0 10px;">View Slip</button>
                  <button class="btn btn-primary btn-sm btn-resolve-now" data-id="${entry.record.id}" style="background:${avatarBg}; border:none; font-size:11px; color:${avatarTextColor}; height:28px; padding:0 10px; font-weight:600;">Resolve Now</button>
              </div>
            </div>
          `;
        } else {
          // Secondary issue (small)
          listHtml += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: var(--color-surface-alt); border-radius: 8px; border: 1px solid var(--color-border-light); margin-top: 4px;">
              <div style="display: flex; align-items: center; gap: 14px; min-width:0; flex:1;">
                  <div style="width: 32px; height: 32px; background: var(--color-text-tertiary); color: #fff; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 10px; flex-shrink:0;">${abbr}</div>
                  <div style="min-width:0; flex:1;">
                      <div style="font-size: 13px; font-weight: 600; color: var(--color-text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${isExpired ? 'Expired' : 'Approaching EUL'}: ${desc}</div>
                      <div style="font-size: 11px; color: var(--color-text-secondary); margin-top: 2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${recipient} · ${office} · ${daysText}</div>
                  </div>
              </div>
              <button class="btn btn-ghost btn-sm btn-manage-urgent" data-id="${entry.record.id}" style="font-size:11px; color:var(--color-primary); font-weight:600; height:28px; padding:0 8px;">Manage</button>
            </div>
          `;
        }
      });
    }

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding: var(--space-4) var(--space-4) 0 var(--space-4);">
          <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: var(--color-text-primary); display: flex; align-items: center; gap: 8px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              Urgent Attention Required
          </h3>
          <span style="font-size: 11px; font-weight: 600; color: var(--color-danger); background: rgba(239, 68, 68, 0.08); padding: 2px 8px; border-radius: 99px;">Action Required</span>
      </div>
      <div class="widget-card-body" style="display:flex; flex-direction:column; gap:12px; padding:0 var(--space-4) var(--space-4) var(--space-4);">
        ${listHtml}
      </div>
    `;

    // Add mouseover scales and click events
    setTimeout(() => {
      const highlightRow = card.querySelector('.urgent-highlight-row');
      if (highlightRow) {
        highlightRow.addEventListener('mouseenter', () => {
          highlightRow.style.transform = 'scale(1.01)';
        });
        highlightRow.addEventListener('mouseleave', () => {
          highlightRow.style.transform = 'scale(1)';
        });
        highlightRow.addEventListener('click', () => {
          const id = highlightRow.getAttribute('data-id');
          Router.navigate(`#view?id=${id}`);
        });
      }

      card.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-id');
          Router.navigate(`#view?id=${id}`);
        });
      });
    }, 0);

    return card;
  }

  function _buildWatchlistWidget(watchlistItems) {
    const card = _createWidgetCard('Asset Lifespan Watchlist');
    const body = card.querySelector('.widget-card-body');
    body.style.padding = '0'; // For edge-to-edge table

    if (watchlistItems.length === 0) {
      body.innerHTML = `
        <div style="text-align:center;padding:48px 16px;color:var(--color-text-secondary)">
          <div style="font-size:32px;margin-bottom:12px;opacity:0.8">🎉</div>
          <div style="font-weight:600;font-size:var(--font-size-md);color:var(--color-text-primary);margin-bottom:6px">All Assets Healthy</div>
          <p style="font-size:var(--font-size-sm);color:var(--color-text-secondary);margin:0;line-height:1.4">There are no assets expired or approaching their Estimated Useful Life.</p>
        </div>
      `;
    } else {
      const listWrapper = document.createElement('div');

      watchlistItems.forEach((entry, idx) => {
        const row = document.createElement('div');
        row.className = 'watchlist-row';
        
        let statusBadge = '';
        const isExpired = entry.rul.status === 'Expired';
        if (isExpired) {
          statusBadge = '<span class="badge badge-danger" style="font-size:10px;padding:2px 6px">Expired</span>';
        } else {
          statusBadge = '<span class="badge badge-warning" style="font-size:10px;padding:2px 6px">Warning</span>';
        }

        const daysText = isExpired ? Math.abs(entry.rul.daysRemaining) + ' days over' : entry.rul.daysRemaining + ' days left';
        const statusColor = isExpired ? 'var(--color-danger)' : 'var(--color-warning)';
        
        const invNo = Utils.escapeHtml(entry.item.inventoryItemNumber) || 'No Inv';
        const icsNo = Utils.escapeHtml(entry.record.icsNumber);

        row.innerHTML = `
          <div class="watchlist-row-badge">
            ${statusBadge}
          </div>
          <div class="watchlist-row-info">
            <div class="watchlist-row-title">
              ${Utils.escapeHtml(entry.item.description)}
            </div>
            <div class="watchlist-row-subtitle">
              ICS: ${icsNo} &bull; ${invNo}
            </div>
          </div>
          <div class="watchlist-row-meta">
            <div class="watchlist-row-days" style="color:${statusColor}">${daysText}</div>
          </div>
        `;
        
        row.addEventListener('click', () => {
          Router.navigate('#view?id=' + entry.record.id);
        });
        
        listWrapper.appendChild(row);
      });
      
      body.appendChild(listWrapper);
    }
    return card;
  }

  function _buildRecentWidget() {
    const list = RecentActivity.get('viewed').slice(0, 8);
    const card = _createWidgetCard('Recent Activity');
    const body = card.querySelector('.widget-card-body');

    if (list.length === 0) {
      body.innerHTML = `
        <div style="text-align:center;padding:32px 16px;color:var(--color-text-secondary)">
          <div style="font-size:28px;margin-bottom:12px;opacity:0.8">⏱️</div>
          <div style="font-weight:600;font-size:var(--font-size-sm);color:var(--color-text-primary);margin-bottom:6px">No recent activity</div>
          <button class="btn btn-secondary btn-sm" onclick="Router.navigate('#records')" style="margin:0 auto;height:32px">Browse Records</button>
        </div>
      `;
    } else {
      list.forEach(r => {
        const item = document.createElement('div');
        item.className = 'widget-list-item';
        item.innerHTML = `
          <span><strong>${Utils.escapeHtml(r.icsNumber) || 'Draft'}</strong></span>
          <span style="color:var(--color-text-secondary)">${Utils.escapeHtml(r.receivedBy)}</span>
        `;
        item.addEventListener('click', () => Router.navigate(`#view?id=${r.id}`));
        body.appendChild(item);
      });
    }
    return card;
  }

  function _createWidgetCard(title) {
    const el = document.createElement('div');
    el.className = 'widget-card';
    el.innerHTML = `
      <div class="widget-card-header">
        <div class="widget-card-title">${title}</div>
      </div>
      <div class="widget-card-body"></div>
    `;
    return el;
  }

  function _initDragAndDrop(container) {
    let dragSource = null;
    
    container.querySelectorAll('.stat-card').forEach(card => {
      card.setAttribute('draggable', 'true');
      card.classList.add('is-draggable');
      
      card.addEventListener('dragstart', (e) => {
        dragSource = card;
        e.dataTransfer.effectAllowed = 'move';
        card.style.opacity = '0.5';
      });
      
      card.addEventListener('dragend', () => {
        dragSource = null;
        card.style.opacity = '1';
        container.querySelectorAll('.stat-card').forEach(c => c.classList.remove('drag-over'));
      });
      
      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        return false;
      });
      
      card.addEventListener('dragenter', () => {
        if (card !== dragSource) {
          card.classList.add('drag-over');
        }
      });
      
      card.addEventListener('dragleave', () => {
        card.classList.remove('drag-over');
      });
      
      card.addEventListener('drop', (e) => {
        e.preventDefault();
        if (card !== dragSource && dragSource) {
          const children = Array.from(container.children);
          const srcIdx = children.indexOf(dragSource);
          const targetIdx = children.indexOf(card);
          
          if (srcIdx < targetIdx) {
            container.insertBefore(dragSource, card.nextSibling);
          } else {
            container.insertBefore(dragSource, card);
          }
        }
      });
    });
  }

  function _showCustomizationDialog(workspace) {
    let overlay = document.getElementById('customization-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'customization-overlay';
      document.body.appendChild(overlay);
    }
    
    overlay.style.display = 'flex';

    overlay.innerHTML = `
      <div class="customization-dialog">
        <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: var(--color-text-primary)">Customize Dashboard</h3>
        <p style="margin: 0; font-size: 12px; color: var(--color-text-secondary)">Toggle statistics card visibility and layout preferences.</p>
        
        <div style="display:flex; flex-direction:column; gap:10px; margin-top:8px;">
          <label style="display:flex; align-items:center; gap:8px; font-size:13px; color:var(--color-text-primary); cursor:pointer;">
            <input type="checkbox" id="custom-show-active" ${_customConfig.showActive ? 'checked' : ''}>
            Total Active Assets
          </label>
          <label style="display:flex; align-items:center; gap:8px; font-size:13px; color:var(--color-text-primary); cursor:pointer;">
            <input type="checkbox" id="custom-show-healthy" ${_customConfig.showHealthy ? 'checked' : ''}>
            Healthy Assets
          </label>
          <label style="display:flex; align-items:center; gap:8px; font-size:13px; color:var(--color-text-primary); cursor:pointer;">
            <input type="checkbox" id="custom-show-approaching" ${_customConfig.showApproaching ? 'checked' : ''}>
            Approaching EUL
          </label>
          <label style="display:flex; align-items:center; gap:8px; font-size:13px; color:var(--color-text-primary); cursor:pointer;">
            <input type="checkbox" id="custom-show-expired" ${_customConfig.showExpired ? 'checked' : ''}>
            Expired Assets
          </label>
          <label style="display:flex; align-items:center; gap:8px; font-size:13px; color:var(--color-text-primary); cursor:pointer;">
            <input type="checkbox" id="custom-show-value" ${_customConfig.showValue ? 'checked' : ''}>
            Total Inventory Value (Financial)
          </label>
          <label style="display:flex; align-items:center; gap:8px; font-size:13px; color:var(--color-text-primary); cursor:pointer;">
            <input type="checkbox" id="custom-show-dist" ${_customConfig.showDistribution ? 'checked' : ''}>
            Distribution by Office (Analytics)
          </label>
        </div>

        <div style="display:flex; flex-direction:column; gap:6px; margin-top:8px;">
          <span style="font-size:12px; font-weight:600; color:var(--color-text-secondary)">Grid Columns Layout</span>
          <select id="custom-columns-select" class="select" style="height:36px; font-size:13px; border-radius:6px; padding:0 8px; border: 1px solid var(--color-border); background-color: var(--color-surface); color: var(--color-text-primary); outline: none;">
            <option value="auto" ${_customConfig.columns === 'auto' ? 'selected' : ''}>Auto-Fit (Fluid Grid)</option>
            <option value="2" ${_customConfig.columns === '2' ? 'selected' : ''}>2 Columns Layout</option>
            <option value="4" ${_customConfig.columns === '4' ? 'selected' : ''}>4 Columns Layout</option>
          </select>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
          <button class="btn btn-secondary btn-sm" id="custom-cancel-btn">Cancel</button>
          <button class="btn btn-primary btn-sm" id="custom-save-btn" style="background:var(--color-primary); border-color:var(--color-primary);">Save Changes</button>
        </div>
      </div>
    `;

    overlay.querySelector('#custom-cancel-btn').addEventListener('click', () => {
      overlay.style.display = 'none';
    });
    
    overlay.querySelector('#custom-save-btn').addEventListener('click', () => {
      _customConfig.showActive = overlay.querySelector('#custom-show-active').checked;
      _customConfig.showHealthy = overlay.querySelector('#custom-show-healthy').checked;
      _customConfig.showApproaching = overlay.querySelector('#custom-show-approaching').checked;
      _customConfig.showExpired = overlay.querySelector('#custom-show-expired').checked;
      _customConfig.showValue = overlay.querySelector('#custom-show-value').checked;
      _customConfig.showDistribution = overlay.querySelector('#custom-show-dist').checked;
      _customConfig.columns = overlay.querySelector('#custom-columns-select').value;
      
      try {
        localStorage.setItem('dsis_dashboard_config', JSON.stringify(_customConfig));
      } catch (e) {
        console.error(e);
      }
      
      overlay.style.display = 'none';
      render(workspace, _contextBody);
    });
  }

  function destroy() {}

  return { render, destroy };
})();
