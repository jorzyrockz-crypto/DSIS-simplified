/**
 * ICS Tracking & Monitoring Tool
 * Phase 5: Dashboard — Live Statistics and Premium SaaS Overview
 */
'use strict';

const DashboardPage = (() => {

  let _allRecords = [];
  let _contextBody = null;

  /* ----------------------------------------------------------
     Context Panel — Health & Alerts Only (Linear Style)
     ---------------------------------------------------------- */
  function _renderContextPanel(contextBody, stats) {
    contextBody.innerHTML = '';
    _contextBody = contextBody;

    // 0. Database Stats (Legacy Dashboard stats moved to context)
    const statsCard = document.createElement('div');
    statsCard.className = 'context-card';
    statsCard.style.marginBottom = 'var(--space-4)';
    statsCard.innerHTML = `
      <div class="context-card-title">Database Overview</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
        <div style="background:var(--color-bg);padding:8px;border-radius:6px;text-align:center">
          <div style="font-size:10px;color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:0.5px">Records</div>
          <div style="font-size:14px;font-weight:600;color:var(--color-text-primary)">${stats.total}</div>
        </div>
        <div style="background:var(--color-bg);padding:8px;border-radius:6px;text-align:center">
          <div style="font-size:10px;color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:0.5px">Items</div>
          <div style="font-size:14px;font-weight:600;color:var(--color-text-primary)">${stats.totalItems}</div>
        </div>
        <div style="background:var(--color-bg);padding:8px;border-radius:6px;text-align:center">
          <div style="font-size:10px;color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:0.5px">Drafts</div>
          <div style="font-size:14px;font-weight:600;color:var(--color-text-primary)">${stats.drafts}</div>
        </div>
        <div style="background:var(--color-bg);padding:8px;border-radius:6px;text-align:center">
          <div style="font-size:10px;color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:0.5px">Asset Value</div>
          <div style="font-size:11px;font-weight:600;color:var(--color-text-primary)">₱${stats.totalCost.toLocaleString()}</div>
        </div>
      </div>
    `;
    contextBody.appendChild(statsCard);

    // 1. System Health Widget
    const healthCard = document.createElement('div');
    healthCard.className = 'context-card';
    healthCard.style.marginBottom = 'var(--space-4)';
    healthCard.innerHTML = `
      <div class="context-card-title">🛡️ System Workspace Health</div>
      <div style="display:flex;align-items:center;gap:12px;margin-top:8px">
        <div style="width:48px;height:48px;border-radius:50%;background:rgba(16, 185, 129, 0.08);color:var(--color-success);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px">
          98%
        </div>
        <div>
          <div style="font-size:var(--font-size-sm);font-weight:600;color:var(--color-text-primary)">98% Status</div>
          <div style="font-size:11px;color:var(--color-text-secondary)">Saved locally</div>
        </div>
      </div>
    `;
    contextBody.appendChild(healthCard);

    // 2. Recent Alerts Widget
    const alertsCard = document.createElement('div');
    alertsCard.className = 'context-card';
    alertsCard.innerHTML = `
      <div class="context-card-title">🚨 Recent Alerts</div>
      <div style="margin-top:8px;display:flex;flex-direction:column;gap:6px" id="context-alerts-list"></div>
    `;
    contextBody.appendChild(alertsCard);

    const alertsList = alertsCard.querySelector('#context-alerts-list');
    const alerts = NotificationEngine.generate(_allRecords).slice(0, 4);
    if (alerts.length === 0) {
      alertsList.innerHTML = `<p style="font-size:11px;color:var(--color-text-tertiary);margin:0">No active warnings or alerts.</p>`;
    } else {
      alerts.forEach(a => {
        const item = document.createElement('div');
        item.style.cssText = 'padding:6px 0;border-bottom:1px solid var(--color-border-light);display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer';
        item.innerHTML = `
          <span style="font-size:var(--font-size-xs);color:var(--color-text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px">
            ⚠️ ${Utils.escapeHtml(a.title)}
          </span>
          <span class="badge badge-${a.category}" style="font-size:8px;padding:2px 4px">${a.category}</span>
        `;
        item.addEventListener('click', () => Router.navigate(`#view?id=${a.recordId}`));
        alertsList.appendChild(item);
      });
    }
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

    const hero = document.createElement('div');
    hero.className = 'dashboard-hero';
    hero.innerHTML = `
      <div class="hero-content" style="display:flex;align-items:center;justify-content:space-between;width:100%;margin-bottom:var(--space-6)">
        <div class="hero-text">
          <h1 class="hero-greeting" style="font-size:var(--font-size-2xl);font-weight:700;margin:0;color:var(--color-text-primary)">Supply ICS Dashboard</h1>
          <p class="hero-date" style="font-size:var(--font-size-xs);color:var(--color-text-secondary);margin:4px 0 0 0">${dayStr} · ${timeStr}</p>
        </div>
        <div>
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

    // Wire primary button
    document.getElementById('dash-hero-new-btn')?.addEventListener('click', () => Router.navigate('#new'));

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

      // Render stats cards
      statsGrid.appendChild(Components.statCard({
        iconName: 'box',
        value:  totalActiveAssets,
        label:  'Total Active Assets',
        change: `Across all records`,
        variant:'primary',
      }));
      statsGrid.appendChild(Components.statCard({
        iconName: 'grid',
        value:  healthyAssets,
        label:  'Healthy Assets',
        change: `> 30 days remaining`,
        variant:'success',
      }));
      statsGrid.appendChild(Components.statCard({
        iconName: 'clock',
        value:  approachingAssets,
        label:  'Approaching EUL',
        change: `< 30 days remaining`,
        variant: approachingAssets > 0 ? 'warning' : 'primary',
      }));
      statsGrid.appendChild(Components.statCard({
        iconName: 'alert',
        value:  expiredAssets,
        label:  'Expired Assets',
        change: expiredAssets > 0 ? 'Action required' : 'All clear',
        variant: expiredAssets > 0 ? 'critical' : 'primary',
      }));

      // Render widgets
      _renderWidgets(widgetsGrid, watchlistItems);

      // Render right Context Panel
      _renderContextPanel(contextBody, stats);

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
    container.style.display = '';
    container.style.gridTemplateColumns = '';
    container.appendChild(_buildWatchlistWidget(watchlistItems));
    container.appendChild(_buildRecentWidget());
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

  function destroy() {}

  return { render, destroy };
})();
