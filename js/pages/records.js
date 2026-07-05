/**
 * ICS Tracking & Monitoring Tool
 * Phase 5: ICS Database & Record Management — Records Browser
 * Overhauled to a premium Notion/Linear document management workspace
 */
'use strict';

const RecordsPage = (() => {

  /* ----------------------------------------------------------
     Page State
     ---------------------------------------------------------- */
  let _state = {
    allRecords:      [],   // cached from DB
    displayRecords:  [],   // after filter/search/sort
    total:           0,
    totalPages:      1,
    page:            0,
    pageSize:        25,
    query:           '',
    sortBy:          'modifiedDate',
    sortOrder:       'desc',
    activeView:      'records', // 'records' | 'items' | 'recipients'
    displayMode:     localStorage.getItem('ics-display-mode') || 'list', // 'list' | 'grid'
    selectedIds:     [], // for selection mode tracking
    selectedId:      null, // for inspector tracking (record.id, itemKey, or recipient.name)
    filters: {
      status: 'all', year: null, fundCluster: null,
      isFavorite: false, needsAttention: false, recent: false,
      icsNumber: '', recipient: '', office: '', position: '', remarks: '',
      dateStart: '', dateEnd: '', tags: '',
      inventoryNumber: '', serialNumber: '', description: '', estimatedUsefulLife: '',
      amountMin: '', amountMax: ''
    },
    loading:         false,
    filterOptions:   { years: [], fundClusters: [], entities: [] },
  };

  /* DOM shortcuts */
  let _dom = {};
  let _contextBody = null;

  /* Debounced search */
  const _doSearch = Utils.debounce(_runQuery, 280);

  /* ----------------------------------------------------------
     Data Layer
     ---------------------------------------------------------- */
  async function _loadAll() {
    _state.loading = true;
    _renderSkeleton();
    try {
      _state.allRecords   = await RecordService.getAllRecords();
      _state.filterOptions= await RecordService.getFilterOptions();
      _populateFilterOptions();
      _runQuery();
    } catch (err) {
      console.error('[RecordsPage] Load error', err);
      _renderError('Failed to load records. Please refresh the page.');
    } finally {
      _state.loading = false;
    }
  }

  function _runQuery() {
    let recordsToSearch = _state.allRecords;

    // Apply Recent Activity filter if active
    if (_state.filters.recent) {
      const recentIds = RecentActivity.get('viewed').map(x => x.id);
      recordsToSearch = _state.allRecords.filter(r => recentIds.includes(r.id));
    }

    const result = SearchEngine.search(recordsToSearch, {
      query:     _state.query,
      filters:   _state.filters,
      sortBy:    _state.sortBy,
      sortOrder: _state.sortOrder,
      page:      _state.page,
      pageSize:  _state.pageSize,
    });

    _state.displayRecords = result.records;
    _state.total          = result.total;
    _state.totalPages     = result.totalPages;
    _state.page           = result.page;

    _renderList();
    _renderPagination();
    _updateSwitcherLabels();
    _updateSelectionToolbar();
    _syncFilterUI();
  }

  /* ----------------------------------------------------------
     Context Panel (Placeholder when browse mode)
     ---------------------------------------------------------- */
  /* ----------------------------------------------------------
     Context Panel (Placeholder & Contextual Inspectors)
     ---------------------------------------------------------- */
  function _updateContextPanel(data) {
    if (!_contextBody) return;
    _contextBody.innerHTML = '';

    if (!data) {
      _contextBody.appendChild(_emptyContextState());
      return;
    }

    if (_state.activeView === 'records') {
      _renderRecordInspector(_contextBody, data);
      _bindRecordInspectorEvents(_contextBody, data);
    } else if (_state.activeView === 'items') {
      _renderItemInspector(_contextBody, data);
      _bindItemInspectorEvents(_contextBody, data);
    } else if (_state.activeView === 'recipients') {
      _renderRecipientInspector(_contextBody, data);
      _bindRecipientInspectorEvents(_contextBody, data);
    }
  }

  function _emptyContextState() {
    const el = document.createElement('div');
    el.className = 'empty-state';
    el.innerHTML = `
      <div class="empty-icon">${Components.icon('records')}</div>
      <div class="empty-title">ICS Detailed Viewer</div>
      <div class="empty-desc">Click any card view to open the complete timeline tracking history, notes, and visual COA forms.</div>
    `;
    return el;
  }

  /* 📄 Records View Inspector Renderer */
  function _renderRecordInspector(container, record) {
    const statusColors = {
      active:    { bg: 'var(--color-primary-light)',  fg: 'var(--color-primary)' },
      draft:     { bg: 'var(--color-warning-light)',  fg: 'var(--color-warning)' },
      archived:  { bg: 'var(--color-surface-alt)',    fg: 'var(--color-text-tertiary)' },
      cancelled: { bg: 'var(--color-danger-light)',   fg: 'var(--color-danger)' },
    };
    const sc = statusColors[record.status] || statusColors.active;

    container.innerHTML = `
      <div class="detail-record-header">
        <div class="detail-record-avatar" style="background:${sc.bg};color:${sc.fg}">
          ${Utils.initials(record.receivedBy)}
        </div>
        <div class="detail-record-ics">${Utils.escapeHtml(record.icsNumber) || '(No ICS No.)'}</div>
        <div class="detail-record-name">${Utils.escapeHtml(record.receivedBy)}</div>
        <div style="margin-top:var(--space-2)">
          <span class="badge badge-${_statusVariant(record.status)}">${_statusLabel(record.status)}</span>
        </div>
      </div>

      <div style="margin-bottom: 12px; margin-top: -4px;">
        <div class="btn-group">
          <button class="btn btn-secondary btn-sm" id="cact-view" title="View Full Slip">${Components.icon('panelRight')}</button>
          <button class="btn btn-secondary btn-sm" id="cact-edit" title="Edit Slip">${Components.icon('edit')}</button>
          <button class="btn btn-secondary btn-sm" id="cact-print" title="Print Slip">${Components.icon('download')}</button>
          <button class="btn btn-secondary btn-sm" id="cact-fav" title="${record.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}" style="${record.isFavorite ? 'color:#F59E0B' : ''}">
            ${Components.icon('star')}
          </button>
        </div>
      </div>

      <div class="inspector-card">
        <h4 class="detail-section-title" style="margin-bottom:0">General Information</h4>
        <div class="detail-row">
          <div class="detail-key">Entity Name</div>
          <div class="detail-val">${Utils.escapeHtml(record.entityName) || '—'}</div>
        </div>
        <div class="detail-row">
          <div class="detail-key">Date Issued</div>
          <div class="detail-val">${Utils.formatDate(record.dateIssued) || '—'}</div>
        </div>
        <div class="detail-row">
          <div class="detail-key">Fund Cluster</div>
          <div class="detail-val">${Utils.escapeHtml(record.fundCluster) || '—'}</div>
        </div>
        <div class="detail-row">
          <div class="detail-key">Office</div>
          <div class="detail-val">${Utils.escapeHtml(record.office) || '—'}</div>
        </div>
        <div class="detail-row">
          <div class="detail-key">Position</div>
          <div class="detail-val">${Utils.escapeHtml(record.position) || '—'}</div>
        </div>
        <div class="detail-row">
          <div class="detail-key">Issued By</div>
          <div class="detail-val">${Utils.escapeHtml(record.issuedBy) || '—'}</div>
        </div>
      </div>

      <div class="inspector-card">
        <h4 class="detail-section-title" style="margin-bottom:0">Accountability</h4>
        <div class="items-list-container" style="display:flex;flex-direction:column;gap:8px">
          ${(record.items || []).map(item => `
            <div class="item-preview-row" style="display:flex;justify-content:space-between;align-items:flex-start;padding:8px;background:var(--color-surface-alt);border-radius:var(--radius-sm);font-size:var(--font-size-xs);">
              <div style="min-width:0;padding-right:8px">
                <div style="font-weight:600;color:var(--color-text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                  ${Utils.escapeHtml(item.description)}
                </div>
                <div style="color:var(--color-text-tertiary);margin-top:2px">
                  Qty: ${item.quantity} · SN: ${Utils.escapeHtml(item.serialNumber || 'N/A')}
                </div>
              </div>
              <div style="font-weight:600;color:var(--color-text-primary);flex-shrink:0">
                ${Utils.formatCurrency(item.quantity * item.unitCost)}
              </div>
            </div>
          `).join('') || '<p style="font-size:var(--font-size-xs);color:var(--color-text-tertiary);font-style:italic">No items attached to this slip.</p>'}
        </div>
      </div>

      <div class="inspector-card">
        <h4 class="detail-section-title" style="margin-bottom:0">Remarks</h4>
        <p style="font-size:var(--font-size-sm);color:var(--color-text-secondary);line-height:1.5;margin:0">${record.remarks || 'No remarks added.'}</p>
      </div>

    `;
  }

  function _bindRecordInspectorEvents(container, record) {
    container.querySelector('#cact-view')?.addEventListener('click', () => {
      Router.navigate(`#view?id=${record.id}`);
    });
    container.querySelector('#cact-edit')?.addEventListener('click', () => {
      AppState.editRecordId = record.id;
      Router.navigate('#edit');
    });
    container.querySelector('#cact-print')?.addEventListener('click', () => {
      PrintEngine.printRecords([record]);
    });
    container.querySelector('#cact-fav')?.addEventListener('click', async () => {
      try {
        const fav = !record.isFavorite;
        await RecordService.updateRecord(record.id, { isFavorite: fav });
        record.isFavorite = fav;
        _updateContextPanel(record);
        _runQuery();
      } catch (err) {
        UIKit.toast('Failed to update favorite status.', 'error');
      }
    });
  }

  /* 📦 Items View Inspector Renderer */
  function _renderItemInspector(container, { item, record }) {
    const totalCost = item.quantity * item.unitCost;
    const related = (record.items || []).filter(i => i.id !== item.id);

    const timelineHTML = `
      <div class="timeline" style="margin-top:12px;display:flex;flex-direction:column;gap:16px;position:relative;padding-left:16px;border-left:2px solid var(--color-border-light)">
        <div class="timeline-item" style="position:relative">
          <div class="timeline-dot" style="position:absolute;left:-23px;top:4px;width:12px;height:12px;border-radius:50%;background:var(--color-primary);border:2px solid var(--color-surface)"></div>
          <div style="font-size:12px;font-weight:600;color:var(--color-text-primary)">Viewed</div>
          <div style="font-size:11px;color:var(--color-text-tertiary)">Just now · by Supply Officer</div>
        </div>
        <div class="timeline-item" style="position:relative">
          <div class="timeline-dot" style="position:absolute;left:-23px;top:4px;width:12px;height:12px;border-radius:50%;background:var(--color-text-tertiary);border:2px solid var(--color-surface)"></div>
          <div style="font-size:12px;font-weight:600;color:var(--color-text-primary)">Modified</div>
          <div style="font-size:11px;color:var(--color-text-tertiary)">${Utils.formatRelativeTime(record.modifiedDate)}</div>
        </div>
        ${record.status !== 'draft' ? `
        <div class="timeline-item" style="position:relative">
          <div class="timeline-dot" style="position:absolute;left:-23px;top:4px;width:12px;height:12px;border-radius:50%;background:var(--color-success);border:2px solid var(--color-surface)"></div>
          <div style="font-size:12px;font-weight:600;color:var(--color-text-primary)">Issued</div>
          <div style="font-size:11px;color:var(--color-text-tertiary)">${Utils.formatDate(record.dateIssued)}</div>
        </div>` : ''}
        <div class="timeline-item" style="position:relative">
          <div class="timeline-dot" style="position:absolute;left:-23px;top:4px;width:12px;height:12px;border-radius:50%;background:var(--color-text-tertiary);border:2px solid var(--color-surface)"></div>
          <div style="font-size:12px;font-weight:600;color:var(--color-text-primary)">Created</div>
          <div style="font-size:11px;color:var(--color-text-tertiary)">${Utils.formatDate(record.createdDate)}</div>
        </div>
      </div>
    `;

    container.innerHTML = `
      <div class="detail-record-header">
        <div class="detail-record-avatar" style="background:rgba(16, 185, 129, 0.08);color:var(--color-success)">
          ${Components.icon('package')}
        </div>
        <div class="detail-record-ics" style="word-break:break-word;max-width:240px;margin:0 auto">${Utils.escapeHtml(item.description)}</div>
        <div class="detail-record-name">Inv No: ${Utils.escapeHtml(item.inventoryItemNumber) || '—'}</div>
        <div style="margin-top:var(--space-2)">
          <span class="badge badge-${_statusVariant(record.status)}">${_statusLabel(record.status)}</span>
        </div>
      </div>

      <div style="margin-bottom: 12px; margin-top: -4px;">
        <div class="btn-group">
          <button class="btn btn-secondary btn-sm" id="iact-view-ics-action" title="View Full ICS">${Components.icon('panelRight')}</button>
          <button class="btn btn-secondary btn-sm" id="iact-edit-item" title="Edit Item">${Components.icon('edit')}</button>
          <button class="btn btn-secondary btn-sm" id="iact-dup-item" title="Duplicate Item">${Components.icon('copy')}</button>
          <button class="btn btn-secondary btn-sm" id="iact-copy-inv" title="Copy Inventory Number">${Components.icon('list')}</button>
          <button class="btn btn-secondary btn-sm" id="iact-copy-sn" title="Copy Serial Number">${Components.icon('list')}</button>
        </div>
      </div>

      <div class="inspector-card">
        <h4 class="detail-section-title" style="margin-bottom:0">General Information</h4>
        <div class="detail-row">
          <div class="detail-key">Description</div>
          <div class="detail-val">${Utils.escapeHtml(item.description)}</div>
        </div>
        <div class="detail-row">
          <div class="detail-key">Inventory Number</div>
          <div class="detail-val">${Utils.escapeHtml(item.inventoryItemNumber) || '—'}</div>
        </div>
        <div class="detail-row">
          <div class="detail-key">Serial Number</div>
          <div class="detail-val">${Utils.escapeHtml(item.serialNumber) || '—'}</div>
        </div>
        <div class="detail-row">
          <div class="detail-key">Quantity</div>
          <div class="detail-val">${item.quantity}</div>
        </div>
        <div class="detail-row">
          <div class="detail-key">Unit</div>
          <div class="detail-val">${Utils.escapeHtml(item.unit) || 'pc'}</div>
        </div>
        <div class="detail-row">
          <div class="detail-key">Unit Cost</div>
          <div class="detail-val">${Utils.formatCurrency(item.unitCost)}</div>
        </div>
        <div class="detail-row">
          <div class="detail-key">Total Value</div>
          <div class="detail-val" style="font-weight:700">${Utils.formatCurrency(totalCost)}</div>
        </div>
        <div class="detail-row">
          <div class="detail-key">Useful Life</div>
          <div class="detail-val">${Utils.escapeHtml(item.estimatedUsefulLife) || '—'}</div>
        </div>
      </div>

      <div class="inspector-card">
        <h4 class="detail-section-title" style="margin-bottom:0">Related Records</h4>
        <div class="detail-row">
          <div class="detail-key">ICS Slip</div>
          <div class="detail-val">${Utils.escapeHtml(record.icsNumber)}</div>
        </div>
        <div class="detail-row">
          <div class="detail-key">Date Issued</div>
          <div class="detail-val">${Utils.formatDate(record.dateIssued)}</div>
        </div>
        <div class="detail-row">
          <div class="detail-key">Recipient</div>
          <div class="detail-val">${Utils.escapeHtml(record.receivedBy)}</div>
        </div>
        <div class="detail-row">
          <div class="detail-key">Office</div>
          <div class="detail-val">${Utils.escapeHtml(record.office) || '—'}</div>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="btn btn-primary btn-sm" id="iact-open-ics" style="flex:1">Open Full ICS</button>
          <button class="btn btn-secondary btn-sm" id="iact-view-recip" style="flex:1">View Recipient</button>
        </div>
      </div>

      <div class="inspector-card">
        <h4 class="detail-section-title" style="margin-bottom:0">Related Items (${related.length})</h4>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${related.map(rel => `
            <div class="related-item-row" data-id="${rel.id}" style="padding:8px 12px;background:var(--color-surface-alt);border-radius:var(--radius-sm);font-size:var(--font-size-xs);cursor:pointer;display:flex;justify-content:space-between;align-items:center;border:1px solid transparent;transition:all var(--transition-base)">
              <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:180px;font-weight:600;color:var(--color-text-primary)">
                ${Utils.escapeHtml(rel.description)}
              </div>
              <div style="color:var(--color-text-tertiary);font-size:11px">
                ${Utils.formatCurrency(rel.quantity * rel.unitCost)}
              </div>
            </div>
          `).join('') || '<p style="font-size:var(--font-size-xs);color:var(--color-text-tertiary);font-style:italic">No other items in this ICS.</p>'}
        </div>
      </div>

      <div class="inspector-card">
        <h4 class="detail-section-title" style="margin-bottom:0">Timeline</h4>
        ${timelineHTML}
      </div>



    `;
  }

  function _bindItemInspectorEvents(container, { item, record }) {
    container.querySelector('#iact-open-ics')?.addEventListener('click', () => {
      _state.activeView = 'records';
      _state.selectedId = record.id;
      _syncSwitcherUI();
      _runQuery();
      _updateContextPanel(record);
      const drawerBody = document.getElementById('context-drawer-body');
      if (drawerBody && AppState.drawerOpen) {
        _renderRecordInspector(drawerBody, record);
        _bindRecordInspectorEvents(drawerBody, record);
      }
    });

    container.querySelector('#iact-view-recip')?.addEventListener('click', () => {
      _state.activeView = 'recipients';
      _state.selectedId = record.receivedBy;
      _syncSwitcherUI();
      _runQuery();

      const rec = {
        name: record.receivedBy,
        office: record.office,
        position: record.position,
        lastDate: record.dateIssued
      };
      _updateContextPanel(rec);
      const drawerBody = document.getElementById('context-drawer-body');
      if (drawerBody && AppState.drawerOpen) {
        _renderRecipientInspector(drawerBody, rec);
        _bindRecipientInspectorEvents(drawerBody, rec);
      }
    });

    container.querySelectorAll('.related-item-row').forEach(row => {
      row.addEventListener('click', () => {
        const relId = row.getAttribute('data-id');
        const relItem = record.items.find(it => it.id === relId);
        if (relItem) {
          const itemKey = record.id + '_' + (relItem.inventoryItemNumber || relItem.description);
          _state.selectedId = itemKey;
          _updateContextPanel({ item: relItem, record });
          document.querySelectorAll('.record-card-p2').forEach(c => {
            c.classList.toggle('selected', c.dataset.id === itemKey);
          });
          const drawerBody = document.getElementById('context-drawer-body');
          if (drawerBody && AppState.drawerOpen) {
            _renderItemInspector(drawerBody, { item: relItem, record });
            _bindItemInspectorEvents(drawerBody, { item: relItem, record });
          }
        }
      });
    });

    container.querySelector('#iact-view-ics-action')?.addEventListener('click', () => {
      Router.navigate(`#view?id=${record.id}`);
    });
    container.querySelector('#iact-edit-item')?.addEventListener('click', () => {
      AppState.editRecordId = record.id;
      Router.navigate('#edit');
    });
    container.querySelector('#iact-dup-item')?.addEventListener('click', () => {
      _handleDuplicate(record.id);
    });
    container.querySelector('#iact-copy-inv')?.addEventListener('click', () => {
      if (item.inventoryItemNumber) {
        navigator.clipboard.writeText(item.inventoryItemNumber);
        UIKit.toast('Inventory item number copied.', 'success');
      } else {
        UIKit.toast('No inventory number available.', 'warning');
      }
    });
    container.querySelector('#iact-copy-sn')?.addEventListener('click', () => {
      if (item.serialNumber) {
        navigator.clipboard.writeText(item.serialNumber);
        UIKit.toast('Serial number copied.', 'success');
      } else {
        UIKit.toast('No serial number available.', 'warning');
      }
    });
  }

  /* 👤 Recipient View Profile Inspector Renderer */
  function _renderRecipientInspector(container, rec) {
    const recipientRecords = _state.allRecords.filter(r => r.receivedBy && r.receivedBy.trim().toLowerCase() === rec.name.trim().toLowerCase());
    const activeRecords = recipientRecords.filter(r => r.status === 'active');

    const allItems = [];
    recipientRecords.forEach(r => {
      (r.items || []).forEach(it => {
        allItems.push({ item: it, record: r });
      });
    });

    const totalEstimatedValue = allItems.reduce((acc, x) => acc + x.item.totalCost, 0);
    const dates = recipientRecords.map(r => r.dateIssued).filter(Boolean);
    const lastIssuedDate = dates.length > 0 ? dates.sort().pop() : null;

    const sortedRecordsByDate = [...recipientRecords].sort((a, b) => new Date(a.dateIssued) - new Date(b.dateIssued));
    const firstICS = sortedRecordsByDate[0];
    const latestICS = sortedRecordsByDate[sortedRecordsByDate.length - 1];

    const timelineHTML = `
      <div class="timeline" style="margin-top:12px;display:flex;flex-direction:column;gap:16px;position:relative;padding-left:16px;border-left:2px solid var(--color-border-light)">
        <div class="timeline-item" style="position:relative">
          <div class="timeline-dot" style="position:absolute;left:-23px;top:4px;width:12px;height:12px;border-radius:50%;background:var(--color-primary);border:2px solid var(--color-surface)"></div>
          <div style="font-size:12px;font-weight:600;color:var(--color-text-primary)">Profile Viewed</div>
          <div style="font-size:11px;color:var(--color-text-tertiary)">Just now</div>
        </div>
        ${latestICS ? `
        <div class="timeline-item" style="position:relative">
          <div class="timeline-dot" style="position:absolute;left:-23px;top:4px;width:12px;height:12px;border-radius:50%;background:var(--color-success);border:2px solid var(--color-surface)"></div>
          <div style="font-size:12px;font-weight:600;color:var(--color-text-primary)">Latest ICS Issued</div>
          <div style="font-size:11px;color:var(--color-text-tertiary)">${latestICS.icsNumber} on ${Utils.formatDate(latestICS.dateIssued)}</div>
        </div>` : ''}
        ${firstICS && firstICS.icsNumber !== latestICS?.icsNumber ? `
        <div class="timeline-item" style="position:relative">
          <div class="timeline-dot" style="position:absolute;left:-23px;top:4px;width:12px;height:12px;border-radius:50%;background:var(--color-text-tertiary);border:2px solid var(--color-surface)"></div>
          <div style="font-size:12px;font-weight:600;color:var(--color-text-primary)">First ICS Assigned</div>
          <div style="font-size:11px;color:var(--color-text-tertiary)">${firstICS.icsNumber} on ${Utils.formatDate(firstICS.dateIssued)}</div>
        </div>` : ''}
      </div>
    `;

    container.innerHTML = `
      <div class="detail-record-header">
        <div class="detail-record-avatar" style="background:rgba(139, 92, 246, 0.08);color:#8B5CF6">
          ${Components.icon('user')}
        </div>
        <div class="detail-record-ics" style="word-break:break-word;max-width:240px;margin:0 auto">${Utils.escapeHtml(rec.name)}</div>
        <div class="detail-record-name">${Utils.escapeHtml(rec.position) || 'No Position'}</div>
        <div style="margin-top:var(--space-2)">
          <span class="badge badge-success">Active Permanent</span>
        </div>
      </div>

      <div style="margin-bottom: 12px; margin-top: -4px;">
        <div class="btn-group">
          <button class="btn btn-secondary btn-sm" id="ract-view-ics" title="View Latest ICS">${Components.icon('panelRight')}</button>
          <button class="btn btn-secondary btn-sm" id="ract-view-items" title="View All Items">${Components.icon('package')}</button>
          <button class="btn btn-secondary btn-sm" id="ract-print-accountability" title="Print Accountability Summary" disabled>${Components.icon('download')}</button>
        </div>
      </div>

      <div class="inspector-card">
        <h4 class="detail-section-title" style="margin-bottom:0">General Information</h4>
        <div class="detail-row">
          <div class="detail-key">Name</div>
          <div class="detail-val">${Utils.escapeHtml(rec.name)}</div>
        </div>
        <div class="detail-row">
          <div class="detail-key">Position</div>
          <div class="detail-val">${Utils.escapeHtml(rec.position) || '—'}</div>
        </div>
        <div class="detail-row">
          <div class="detail-key">Office</div>
          <div class="detail-val">${Utils.escapeHtml(rec.office) || '—'}</div>
        </div>
        <div class="detail-row">
          <div class="detail-key">Employment Status</div>
          <div class="detail-val">Active Permanent</div>
        </div>
      </div>

      <div class="inspector-card">
        <h4 class="detail-section-title" style="margin-bottom:0">Accountability</h4>
        <div class="detail-row">
          <div class="detail-key">Active ICS</div>
          <div class="detail-val">${activeRecords.length}</div>
        </div>
        <div class="detail-row">
          <div class="detail-key">Total Items</div>
          <div class="detail-val">${allItems.reduce((acc, x) => acc + x.item.quantity, 0)}</div>
        </div>
        <div class="detail-row">
          <div class="detail-key">Total Estimated Value</div>
          <div class="detail-val" style="font-weight:700">${Utils.formatCurrency(totalEstimatedValue)}</div>
        </div>
        <div class="detail-row">
          <div class="detail-key">Last Issued Date</div>
          <div class="detail-val">${lastIssuedDate ? Utils.formatDate(lastIssuedDate) : '—'}</div>
        </div>
      </div>

      <div class="inspector-card">
        <h4 class="detail-section-title" style="margin-bottom:0">Related Records</h4>
        <div style="font-weight:600;font-size:var(--font-size-xs);color:var(--color-text-secondary);margin-bottom:4px">Active Slips (${activeRecords.length})</div>
        <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:16px">
          ${activeRecords.map(actRec => `
            <div class="active-ics-row" data-id="${actRec.id}" style="padding:8px 12px;background:var(--color-surface-alt);border-radius:var(--radius-sm);font-size:var(--font-size-xs);cursor:pointer;display:flex;justify-content:space-between;align-items:center;border:1px solid transparent;transition:all var(--transition-base)">
              <div style="font-weight:600;color:var(--color-text-primary)">
                ${Utils.escapeHtml(actRec.icsNumber)}
              </div>
              <div style="color:var(--color-text-tertiary);font-size:11px">
                ${Utils.formatDate(actRec.dateIssued)}
              </div>
            </div>
          `).join('') || '<p style="font-size:var(--font-size-xs);color:var(--color-text-tertiary);font-style:italic">No active ICS assigned.</p>'}
        </div>
        <div style="font-weight:600;font-size:var(--font-size-xs);color:var(--color-text-secondary);margin-bottom:4px">Issued Items (${allItems.length})</div>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${allItems.map(itData => `
            <div class="issued-item-row" data-record-id="${itData.record.id}" data-item-id="${itData.item.id}" data-item-key="${itData.record.id}_${itData.item.inventoryItemNumber || itData.item.description}" style="padding:8px 12px;background:var(--color-surface-alt);border-radius:var(--radius-sm);font-size:var(--font-size-xs);cursor:pointer;display:flex;justify-content:space-between;align-items:center;">
              <div style="min-width:0;padding-right:8px">
                <div style="font-weight:600;color:var(--color-text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:180px">
                  ${Utils.escapeHtml(itData.item.description)}
                </div>
                <div style="color:var(--color-text-tertiary);font-size:10px;margin-top:2px">
                  Inv No: ${Utils.escapeHtml(itData.item.inventoryItemNumber || 'N/A')}
                </div>
              </div>
              <div>
                <span class="badge badge-${_statusVariant(itData.record.status)}" style="font-size:9px">${_statusLabel(itData.record.status)}</span>
              </div>
            </div>
          `).join('') || '<p style="font-size:var(--font-size-xs);color:var(--color-text-tertiary);font-style:italic">No items currently issued.</p>'}
        </div>
      </div>

      <div class="inspector-card">
        <h4 class="detail-section-title" style="margin-bottom:0">Timeline</h4>
        ${timelineHTML}
      </div>
    `;
  }

  function _bindRecipientInspectorEvents(container, rec) {
    container.querySelectorAll('.active-ics-row').forEach(row => {
      row.addEventListener('click', () => {
        const recordId = row.getAttribute('data-id');
        const record = _state.allRecords.find(r => r.id === recordId);
        if (record) {
          _state.activeView = 'records';
          _state.selectedId = recordId;
          _syncSwitcherUI();
          _runQuery();
          _updateContextPanel(record);
          const drawerBody = document.getElementById('context-drawer-body');
          if (drawerBody && AppState.drawerOpen) {
            _renderRecordInspector(drawerBody, record);
            _bindRecordInspectorEvents(drawerBody, record);
          }
        }
      });
    });

    container.querySelectorAll('.issued-item-row').forEach(row => {
      row.addEventListener('click', () => {
        const recordId = row.getAttribute('data-record-id');
        const itemId = row.getAttribute('data-item-id');
        const itemKey = row.getAttribute('data-item-key');

        const record = _state.allRecords.find(r => r.id === recordId);
        if (record) {
          const item = record.items.find(i => i.id === itemId);
          if (item) {
            _state.activeView = 'items';
            _state.selectedId = itemKey;
            _syncSwitcherUI();
            _runQuery();
            _updateContextPanel({ item, record });
            const drawerBody = document.getElementById('context-drawer-body');
            if (drawerBody && AppState.drawerOpen) {
              _renderItemInspector(drawerBody, { item, record });
              _bindItemInspectorEvents(drawerBody, { item, record });
            }
          }
        }
      });
    });

    container.querySelector('#ract-new-ics')?.addEventListener('click', () => {
      Router.navigate('#new');
    });
    container.querySelector('#ract-view-all-items')?.addEventListener('click', () => {
      _state.activeView = 'items';
      _state.filters.recipient = rec.name;
      _state.selectedId = null;
      _syncSwitcherUI();
      _runQuery();
      _updateContextPanel(null);
    });
    container.querySelector('#ract-print-accountability')?.addEventListener('click', () => {
      UIKit.toast('Print Accountability Summary preview generated (placeholder).', 'info');
    });
  }

  /* ----------------------------------------------------------
     Advanced Filters Drawer Controls
     ---------------------------------------------------------- */
  function _toggleFiltersDrawer(isOpen) {
    const drawer = document.getElementById('adv-filter-drawer');
    const backdrop = document.getElementById('drawer-backdrop');
    if (!drawer || !backdrop) return;

    if (isOpen) {
      drawer.classList.add('open');
      backdrop.classList.add('visible');
    } else {
      drawer.classList.remove('open');
      backdrop.classList.remove('visible');
    }
  }

  function _applyAdvancedFilters() {
    const g = id => {
      const el = document.getElementById(id);
      return el ? el.value.trim() : '';
    };

    const yrVal = document.getElementById('adv-year')?.value;
    _state.filters.year            = yrVal ? parseInt(yrVal) : null;

    _state.filters.fundCluster     = document.getElementById('adv-fund')?.value || null;

    _state.filters.icsNumber       = g('adv-ics');
    _state.filters.recipient       = g('adv-recip');
    _state.filters.office          = g('adv-office');
    _state.filters.position        = g('adv-pos');
    _state.filters.remarks         = g('adv-remarks');
    _state.filters.dateStart       = g('adv-dateStart');
    _state.filters.dateEnd         = g('adv-dateEnd');
    _state.filters.tags            = g('adv-tags');
    _state.filters.inventoryNumber = g('adv-invNum');
    _state.filters.serialNumber    = g('adv-serial');
    _state.filters.description     = g('adv-desc');
    _state.filters.estimatedUsefulLife = g('adv-eul');
    _state.filters.amountMin       = g('adv-amountMin');
    _state.filters.amountMax       = g('adv-amountMax');
    _state.filters.isFavorite      = document.getElementById('adv-favs')?.checked || false;
    _state.filters.needsAttention  = document.getElementById('adv-attention')?.checked || false;
    _state.filters.recent          = document.getElementById('adv-recents')?.checked || false;

    _state.page = 0;
    _toggleFiltersDrawer(false);
    _runQuery();
  }

  function _clearAdvancedFilters() {
    const inputs = [
      'adv-ics', 'adv-recip', 'adv-office', 'adv-pos', 'adv-remarks',
      'adv-dateStart', 'adv-dateEnd', 'adv-tags', 'adv-invNum',
      'adv-serial', 'adv-desc', 'adv-eul', 'adv-amountMin', 'adv-amountMax'
    ];
    inputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    const yrSel = document.getElementById('adv-year');
    if (yrSel) yrSel.value = '';

    const fundSel = document.getElementById('adv-fund');
    if (fundSel) fundSel.value = '';

    const favsChk = document.getElementById('adv-favs');
    if (favsChk) favsChk.checked = false;

    const attChk = document.getElementById('adv-attention');
    if (attChk) attChk.checked = false;

    const recChk = document.getElementById('adv-recents');
    if (recChk) recChk.checked = false;

    _state.filters = {
      status: _state.filters.status, // preserve Row 3 status select value
      year: null, fundCluster: null,
      isFavorite: false, needsAttention: false, recent: false,
      icsNumber: '', recipient: '', office: '', position: '', remarks: '',
      dateStart: '', dateEnd: '', tags: '',
      inventoryNumber: '', serialNumber: '', description: '', estimatedUsefulLife: '',
      amountMin: '', amountMax: ''
    };

    _state.page = 0;
    _toggleFiltersDrawer(false);
    _runQuery();
  }

  /* ----------------------------------------------------------
     DOM Rendering Helpers
     ---------------------------------------------------------- */
  function _renderSkeleton() {
    if (!_dom.listWrap) return;
    _dom.listWrap.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'records-loading';
    for (let i = 0; i < 5; i++) {
      wrap.innerHTML += `
        <div class="record-skeleton" style="border-radius:18px;padding:24px;margin-bottom:16px">
          <div class="skel skel-sq"></div>
          <div>
            <div class="skel skel-line-lg"></div>
            <div class="skel skel-line-md"></div>
          </div>
        </div>
      `;
    }
    _dom.listWrap.appendChild(wrap);
  }

  function _renderError(msg) {
    if (!_dom.listWrap) return;
    _dom.listWrap.innerHTML = `
      <div class="empty-state" style="padding:48px 24px">
        <div class="empty-icon">${Components.icon('alert')}</div>
        <div class="empty-title">Something went wrong</div>
        <div class="empty-desc">${Utils.escapeHtml(msg)}</div>
      </div>
    `;
  }

  function _renderList() {
    if (!_dom.listWrap) return;
    _dom.listWrap.innerHTML = '';

    if (_state.displayRecords.length === 0) {
      _dom.listWrap.innerHTML = `
        <div class="empty-state" style="padding:64px 24px">
          <div class="empty-icon">${Components.icon('search')}</div>
          <div class="empty-title">No matching records found</div>
          <div class="empty-desc">We couldn't find any results for your active filters. Try clearing filters.</div>
          <button class="btn btn-secondary btn-sm" id="btn-empty-clear" style="margin-top:16px">Reset Filters</button>
        </div>
      `;
      document.getElementById('btn-empty-clear')?.addEventListener('click', _clearAdvancedFilters);
      return;
    }

    const container = document.createElement('div');
    container.className = _state.displayMode === 'grid' ? 'cards-grid' : 'records-list';

    if (_state.activeView === 'records') {
      _state.displayRecords.forEach(record => {
        container.appendChild(_buildRecordCard(record));
      });
    } else if (_state.activeView === 'items') {
      // Flatten all items
      const itemsList = [];
      _state.displayRecords.forEach(record => {
        (record.items || []).forEach(item => {
          itemsList.push({ item, record });
        });
      });

      if (itemsList.length === 0) {
        _dom.listWrap.innerHTML = `<div class="empty-state"><div class="empty-title">No items found</div></div>`;
        return;
      }

      itemsList.forEach(({ item, record }) => {
        container.appendChild(_buildItemCard(item, record));
      });
    } else if (_state.activeView === 'recipients') {
      // Group by recipient
      const recMap = {};
      _state.displayRecords.forEach(record => {
        const key = record.receivedBy ? record.receivedBy.trim() : 'Unnamed Recipient';
        if (!recMap[key]) {
          recMap[key] = { name: key, office: record.office, position: record.position, slipsCount: 0, totalValue: 0, lastDate: record.dateIssued };
        }
        recMap[key].slipsCount++;
        recMap[key].totalValue += (record.totalCost || 0);
        if (new Date(record.dateIssued) > new Date(recMap[key].lastDate)) {
          recMap[key].lastDate = record.dateIssued;
        }
      });

      Object.values(recMap).forEach(rec => {
        container.appendChild(_buildRecipientCard(rec));
      });
    }

    _dom.listWrap.appendChild(container);
  }

  /* 📄 Slip View Card Card Builder */
  function _buildRecordCard(record) {
    const card = document.createElement('div');
    const isHighlighted = _state.selectedId === record.id;
    card.className = `record-card-p2 card status-${record.status} ${isHighlighted ? 'selected' : ''}`;
    card.style.cssText = 'padding:20px 24px;border-radius:18px;box-shadow:var(--shadow-sm);border:1px solid var(--color-border);display:flex;align-items:center;position:relative;cursor:pointer;';
    card.dataset.id = record.id;

    const isSelected = _state.selectedIds.includes(record.id);

    const initials = Utils.initials(record.receivedBy);
    const starHtml = record.isFavorite ? `<span style="color:#F59E0B;font-size:14px;margin-left:4px">★</span>` : '';

    card.innerHTML = `
      <div class="card-checkbox-wrapper" onclick="event.stopPropagation();">
        <input type="checkbox" class="record-select-checkbox" data-id="${record.id}" ${isSelected ? 'checked' : ''}>
      </div>
      <div class="rc-avatar" style="width:40px;height:40px;border-radius:50%;background:rgba(99, 102, 241, 0.08);color:var(--color-primary);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;margin-right:16px;flex-shrink:0;">
        ${initials}
      </div>
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:4px">
        <div style="font-weight:700;font-size:var(--font-size-sm);color:var(--color-text-primary);display:flex;align-items:center;gap:4px">
          ${Utils.escapeHtml(record.icsNumber) || '(Draft)'}
          ${starHtml}
          <span class="badge badge-${_statusVariant(record.status)}" style="margin-left:8px;font-size:10px">${_statusLabel(record.status)}</span>
        </div>
        <div style="font-size:var(--font-size-sm);color:var(--color-text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
          ${Utils.escapeHtml(record.receivedBy) || 'No recipient name'}
        </div>
        <div style="font-size:11px;color:var(--color-text-tertiary)">
          ${Utils.escapeHtml(record.office || 'No office specified')} · ${record.totalItems} item${record.totalItems !== 1 ? 's' : ''} · ${Utils.formatCurrency(record.totalCost)}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;margin-left:16px;flex-shrink:0">
        <span style="font-size:11px;color:var(--color-text-tertiary)">Modified ${Utils.formatRelativeTime(record.modifiedDate)}</span>
        <div class="rc-dots-menu" onclick="event.stopPropagation();">
          <button class="btn btn-ghost btn-sm btn-icon rc-dots-trigger" style="width:28px;height:28px;border-radius:50%;padding:0;color:var(--color-text-secondary)" title="Record Actions">
            ${Components.icon('moreH')}
          </button>
          <div class="dots-dropdown">
            <button class="dots-item" data-action="view">👁️ View</button>
            <button class="dots-item" data-action="edit">✏️ Edit</button>
            <button class="dots-item" data-action="duplicate">👥 Duplicate</button>
            <button class="dots-item" data-action="archive">📥 Archive</button>
            <button class="dots-item" data-action="print">🖨️ Print</button>
            <button class="dots-item" data-action="delete" style="color:var(--color-danger)">✕ Delete</button>
          </div>
        </div>
      </div>
    `;

    // Click card details
    card.addEventListener('click', (e) => {
      if (e.target.closest('.rc-dots-menu') || e.target.closest('.card-checkbox-wrapper')) return;
      _state.selectedId = record.id;
      
      // Update highlights on all record cards
      document.querySelectorAll('.record-card-p2').forEach(c => {
        c.classList.toggle('selected', c.dataset.id === record.id);
      });
      
      _updateContextPanel(record);
      
      if (window.App && typeof window.App.expandContextPanel === 'function') {
        window.App.expandContextPanel();
      }
      if (window.innerWidth <= 1024 && window.App && typeof window.App.openContextDrawer === 'function') {
        window.App.openContextDrawer();
        const drawerBody = document.getElementById('context-drawer-body');
        if (drawerBody) {
          _bindRecordInspectorEvents(drawerBody, record);
        }
      }
    });

    // Checkbox click
    card.querySelector('.record-select-checkbox').addEventListener('change', (e) => {
      _toggleSelection(record.id, e.target.checked);
    });

    // Dots Trigger
    const trigger = card.querySelector('.rc-dots-trigger');
    const dropdown = card.querySelector('.dots-dropdown');
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      // Close other dropdowns
      document.querySelectorAll('.dots-dropdown').forEach(d => {
        if (d !== dropdown) d.classList.remove('active');
      });
      dropdown.classList.toggle('active');
    });

    // Wire actions
    dropdown.querySelectorAll('.dots-item').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        dropdown.classList.remove('active');
        const act = btn.getAttribute('data-action');
        if (act === 'view') Router.navigate(`#view?id=${record.id}`);
        else if (act === 'edit') {
          AppState.editRecordId = record.id;
          Router.navigate('#edit');
        }
        else if (act === 'duplicate') _handleDuplicate(record.id);
        else if (act === 'archive') _handleArchiveSingle(record.id);
        else if (act === 'print') PrintEngine.printRecords([record]);
        else if (act === 'delete') _handleDeleteSingle(record.id);
      });
    });

    // Click outside to close dropdowns
    document.addEventListener('click', () => {
      dropdown.classList.remove('active');
    });

    return card;
  }

  function _statusVariant(status) {
    return { active: 'success', draft: 'warning', archived: 'neutral', cancelled: 'danger', verified: 'success', pending_verification: 'info' }[status] || 'neutral';
  }

  function _statusLabel(status) {
    return { pending_verification: 'Pending' }[status] || Utils.capitalise(status || 'unknown');
  }

  /* 📦 Items Perspective Card Builder */
  function _buildItemCard(item, record) {
    const card = document.createElement('div');
    const itemKey = record.id + '_' + (item.inventoryItemNumber || item.description);
    const isHighlighted = _state.selectedId === itemKey;
    card.className = `record-card-p2 card ${isHighlighted ? 'selected' : ''}`;
    card.style.cssText = 'padding:20px 24px;border-radius:18px;box-shadow:var(--shadow-sm);border:1px solid var(--color-border);display:flex;align-items:center;position:relative;cursor:pointer;';
    card.dataset.id = itemKey;

    card.innerHTML = `
      <div class="rc-avatar" style="width:40px;height:40px;border-radius:50%;background:rgba(16, 185, 129, 0.08);color:var(--color-success);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;margin-right:16px;flex-shrink:0;">
        ${item.unit || 'pc'}
      </div>
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:4px">
        <div style="font-weight:700;font-size:var(--font-size-sm);color:var(--color-text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
          ${Utils.escapeHtml(item.description) || 'Unnamed Item'}
        </div>
        <div style="font-size:var(--font-size-sm);color:var(--color-text-secondary)">
          Qty: ${item.quantity} · Cost: ${Utils.formatCurrency(item.unitCost)} · Total: ${Utils.formatCurrency(item.totalCost)}
        </div>
        <div style="font-size:11px;color:var(--color-text-tertiary)">
          Serial: ${Utils.escapeHtml(item.serialNumber || 'N/A')} · Inv No: ${Utils.escapeHtml(item.inventoryItemNumber || 'N/A')}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;margin-left:16px;flex-shrink:0">
        <span class="badge badge-info" style="font-size:10px">${Utils.escapeHtml(record.icsNumber)}</span>
        <span style="font-size:11px;color:var(--color-text-tertiary)">Issued: ${Utils.formatDate(record.dateIssued)}</span>
      </div>
    `;

    card.addEventListener('click', () => {
      _state.selectedId = itemKey;

      document.querySelectorAll('.record-card-p2').forEach(c => {
        c.classList.toggle('selected', c.dataset.id === itemKey);
      });

      _updateContextPanel({ item, record });

      if (window.App && typeof window.App.expandContextPanel === 'function') {
        window.App.expandContextPanel();
      }

      if (window.innerWidth <= 1024 && window.App && typeof window.App.openContextDrawer === 'function') {
        window.App.openContextDrawer();
        const drawerBody = document.getElementById('context-drawer-body');
        if (drawerBody) {
          _bindItemInspectorEvents(drawerBody, { item, record });
        }
      }
    });

    return card;
  }

  /* 👤 Recipients Perspective Card Builder */
  function _buildRecipientCard(rec) {
    const card = document.createElement('div');
    const isHighlighted = _state.selectedId === rec.name;
    card.className = `record-card-p2 card ${isHighlighted ? 'selected' : ''}`;
    card.style.cssText = 'padding:20px 24px;border-radius:18px;box-shadow:var(--shadow-sm);border:1px solid var(--color-border);display:flex;align-items:center;position:relative;cursor:pointer;';
    card.dataset.id = rec.name;

    const initials = Utils.initials(rec.name);

    card.innerHTML = `
      <div class="rc-avatar" style="width:40px;height:40px;border-radius:50%;background:rgba(139, 92, 246, 0.08);color:#8B5CF6;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;margin-right:16px;flex-shrink:0;">
        ${initials}
      </div>
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:4px">
        <div style="font-weight:700;font-size:var(--font-size-sm);color:var(--color-text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
          ${Utils.escapeHtml(rec.name)}
        </div>
        <div style="font-size:var(--font-size-sm);color:var(--color-text-secondary)">
          ${Utils.escapeHtml(rec.position || 'No Position')} · ${Utils.escapeHtml(rec.office || 'No Office')}
        </div>
        <div style="font-size:11px;color:var(--color-text-tertiary)">
          Total Slips Received: ${rec.slipsCount} · Cumulative Value: ${Utils.formatCurrency(rec.totalValue)}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;margin-left:16px;flex-shrink:0">
        <button class="btn btn-secondary btn-sm" id="btn-view-recip-slips" style="height:28px">View Slips</button>
        <span style="font-size:11px;color:var(--color-text-tertiary)">Last Issued: ${Utils.formatDate(rec.lastDate)}</span>
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (e.target.closest('#btn-view-recip-slips')) return;
      _state.selectedId = rec.name;

      document.querySelectorAll('.record-card-p2').forEach(c => {
        c.classList.toggle('selected', c.dataset.id === rec.name);
      });

      _updateContextPanel(rec);

      if (window.App && typeof window.App.expandContextPanel === 'function') {
        window.App.expandContextPanel();
      }

      if (window.innerWidth <= 1024 && window.App && typeof window.App.openContextDrawer === 'function') {
        window.App.openContextDrawer();
        const drawerBody = document.getElementById('context-drawer-body');
        if (drawerBody) {
          _bindRecipientInspectorEvents(drawerBody, rec);
        }
      }
    });

    card.querySelector('#btn-view-recip-slips').addEventListener('click', (e) => {
      e.stopPropagation();
      _state.filters.recipient = rec.name;
      _state.activeView = 'records';
      _state.selectedId = null; // Reset selection
      _syncSwitcherUI();
      _runQuery();
      _updateContextPanel(null);
    });

    return card;
  }

  /* ----------------------------------------------------------
     Selection & Bulk Actions Toolbar (Floating bottom)
     ---------------------------------------------------------- */
  function _toggleSelection(id, checked) {
    if (checked) {
      if (!_state.selectedIds.includes(id)) _state.selectedIds.push(id);
    } else {
      _state.selectedIds = _state.selectedIds.filter(x => x !== id);
    }
    _updateSelectionToolbar();
  }

  function _updateSelectionToolbar() {
    const toolbar = document.getElementById('notif-selection-toolbar');
    if (!toolbar) return;

    const count = _state.selectedIds.length;
    if (count > 0) {
      toolbar.classList.add('active');
      toolbar.querySelector('#sel-count-label').textContent = `${count} record${count !== 1 ? 's' : ''} selected`;
    } else {
      toolbar.classList.remove('active');
    }
  }

  async function _handleBulkArchive() {
    const confirmed = await UIKit.confirm({
      title: 'Bulk Archive',
      message: `Archive all ${_state.selectedIds.length} selected slips?`,
      confirmText: 'Archive',
      cancelText: 'Cancel',
      variant: 'warning'
    });
    if (!confirmed) return;

    try {
      for (const id of _state.selectedIds) {
        await RecordService.archiveRecord(id);
      }
      UIKit.toast('Selected records archived.', 'success');
      _state.selectedIds = [];
      _loadAll();
    } catch {
      UIKit.toast('Failed to archive some records.', 'error');
    }
  }

  async function _handleBulkDelete() {
    const confirmed = await UIKit.confirm({
      title: 'Bulk Delete',
      message: `Permanently delete all ${_state.selectedIds.length} selected slips? This action cannot be undone.`,
      confirmText: 'Delete All',
      cancelText: 'Cancel',
      variant: 'danger'
    });
    if (!confirmed) return;

    try {
      for (const id of _state.selectedIds) {
        await RecordService.deleteRecord(id);
      }
      UIKit.toast('Selected records deleted.', 'success');
      _state.selectedIds = [];
      _loadAll();
    } catch {
      UIKit.toast('Failed to delete some records.', 'error');
    }
  }

  function _handleBulkExport() {
    const selected = _state.allRecords.filter(r => _state.selectedIds.includes(r.id));
    ExportService.exportJSON(selected);
    UIKit.toast('Selected records exported.', 'success');
  }

  function _handleBulkPrint() {
    const selected = _state.allRecords.filter(r => _state.selectedIds.includes(r.id));
    PrintEngine.printRecords(selected);
  }

  /* ----------------------------------------------------------
     Single Record Operations (three-dot menu handlers)
     ---------------------------------------------------------- */
  async function _handleDuplicate(id) {
    try {
      const copy = await RecordService.duplicateRecord(id);
      UIKit.toast('Record duplicated as Draft.', 'success');
      AppState.editRecordId = copy.id;
      Router.navigate('#edit');
    } catch {
      UIKit.toast('Failed to duplicate record.', 'error');
    }
  }

  async function _handleArchiveSingle(id) {
    try {
      await RecordService.archiveRecord(id);
      UIKit.toast('Record archived.', 'success');
      _loadAll();
    } catch {
      UIKit.toast('Failed to archive record.', 'error');
    }
  }

  async function _handleDeleteSingle(id) {
    const confirmed = await UIKit.confirm({
      title: 'Delete Slip',
      message: 'Permanently delete this Inventory Custodian Slip? This action is irreversible.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger'
    });
    if (!confirmed) return;

    try {
      await RecordService.deleteRecord(id);
      UIKit.toast('Record deleted.', 'success');
      _loadAll();
    } catch {
      UIKit.toast('Failed to delete record.', 'error');
    }
  }

  /* ----------------------------------------------------------
     View Switcher Label Refresher (Row 2 pills)
     ---------------------------------------------------------- */
  function _updateSwitcherLabels() {
    const switcher = document.getElementById('records-view-switcher');
    if (!switcher) return;

    const n = _state.allRecords.length;
    const m = _state.allRecords.reduce((acc, r) => acc + (r.items ? r.items.length : 0), 0);
    const k = new Set(_state.allRecords.map(r => r.receivedBy ? r.receivedBy.trim() : '').filter(Boolean)).size;

    switcher.innerHTML = `
      <button class="segmented-pill ${_state.activeView === 'records' ? 'active' : ''}" data-view="records">Records (${n})</button>
      <button class="segmented-pill ${_state.activeView === 'items' ? 'active' : ''}" data-view="items">Items (${m})</button>
      <button class="segmented-pill ${_state.activeView === 'recipients' ? 'active' : ''}" data-view="recipients">Recipients (${k})</button>
    `;

    switcher.querySelectorAll('.segmented-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        _state.activeView = btn.getAttribute('data-view');
        _state.page = 0;
        _runQuery();
      });
    });
  }

  function _syncSwitcherUI() {
    document.querySelectorAll('#records-view-switcher .segmented-pill').forEach(p => {
      p.classList.toggle('active', p.getAttribute('data-view') === _state.activeView);
    });
  }

  function _populateFilterOptions() {
    const yrSel = document.getElementById('adv-year');
    if (yrSel) {
      const current = yrSel.value;
      yrSel.innerHTML = '<option value="">All Years</option>';
      _state.filterOptions.years.forEach(yr => {
        const opt = document.createElement('option');
        opt.value = yr;
        opt.textContent = yr;
        if (String(yr) === current) opt.selected = true;
        yrSel.appendChild(opt);
      });
    }

    const fundSel = document.getElementById('adv-fund');
    if (fundSel) {
      const current = fundSel.value;
      fundSel.innerHTML = '<option value="">All Funds</option>';
      _state.filterOptions.fundClusters.forEach(fc => {
        const opt = document.createElement('option');
        opt.value = fc;
        opt.textContent = `Fund ${fc}`;
        if (fc === current) opt.selected = true;
        fundSel.appendChild(opt);
      });
    }
  }

  function _handleGlobalSearchInput(e) {
    _state.query = e.target.value;
    _state.page  = 0;
    _doSearch();
  }

  function _changePage(p) {
    _state.page = Math.max(0, Math.min(p, _state.totalPages - 1));
    _runQuery();
    const ws = document.getElementById('workspace');
    if (ws) ws.scrollTop = 0;
  }

  function _renderPagination() {
    if (!_dom.pagination) return;
    _dom.pagination.innerHTML = '';

    const page = _state.page;
    const total = _state.totalPages;

    if (total <= 1) return;

    const pages = document.createElement('div');
    pages.className = 'pagination-pages';

    const prev = document.createElement('button');
    prev.className = 'page-btn';
    prev.innerHTML = Components.icon('chevronLeft');
    prev.disabled = page === 0;
    prev.setAttribute('aria-label', 'Previous page');
    prev.addEventListener('click', () => _changePage(page - 1));
    pages.appendChild(prev);

    for (let i = 0; i < total; i++) {
      if (total > 6) {
        if (i === 0 || i === total - 1 || (i >= page - 1 && i <= page + 1)) {
          pages.appendChild(_pageBtn(i, i === page));
        } else if (i === 1 || i === total - 2) {
          pages.appendChild(_ellipsis());
        }
      } else {
        pages.appendChild(_pageBtn(i, i === page));
      }
    }

    const next = document.createElement('button');
    next.className = 'page-btn';
    next.innerHTML = Components.icon('chevronRight');
    next.disabled = page === total - 1;
    next.setAttribute('aria-label', 'Next page');
    next.addEventListener('click', () => _changePage(page + 1));
    pages.appendChild(next);

    _dom.pagination.appendChild(pages);
  }

  function _pageBtn(num, active = false) {
    const btn = document.createElement('button');
    btn.className = `page-btn${active ? ' active' : ''}`;
    btn.textContent = num + 1;
    btn.addEventListener('click', () => _changePage(num));
    return btn;
  }

  function _ellipsis() {
    const s = document.createElement('span');
    s.style.cssText = 'padding:0 4px;color:var(--color-text-tertiary);font-size:var(--font-size-sm);';
    s.textContent = '…';
    return s;
  }

  function _syncFilterUI() {
    const statusSelect = document.getElementById('org-status-select');
    if (statusSelect) {
      statusSelect.value = _state.filters.status || 'all';
    }

    const sortSelect = document.getElementById('org-sort-select');
    if (sortSelect) {
      sortSelect.value = `${_state.sortBy}:${_state.sortOrder}`;
    }

    const advStatus = document.getElementById('adv-status');
    if (advStatus) advStatus.value = _state.filters.status || 'all';

    const advYear = document.getElementById('adv-year');
    if (advYear) advYear.value = _state.filters.year || '';

    const advFund = document.getElementById('adv-fund');
    if (advFund) advFund.value = _state.filters.fundCluster || '';
  }

  /* ----------------------------------------------------------
     Keyboard Event Loops
     ---------------------------------------------------------- */
  function _setupKeyboard() {
    document.addEventListener('keydown', _keyHandler);
  }

  function _teardownKeyboard() {
    document.removeEventListener('keydown', _keyHandler);
  }

  function _keyHandler(e) {
    if (AppState.currentPage !== '#records') return;

    if (e.key === 'Escape') {
      const globalSearch = document.getElementById('global-search');
      if (globalSearch && document.activeElement === globalSearch) {
        globalSearch.blur();
      }
    }
  }

  /* ----------------------------------------------------------
     Main Render Layout
     ---------------------------------------------------------- */
  function render(workspace, contextBody) {
    workspace.innerHTML = '';
    _contextBody = contextBody;
    _state.selectedIds = []; // clear multiselect

    // Read pre-applied filters if navigated from Dashboard widgets
    if (AppState.preappliedFilters) {
      _state.filters = { ..._state.filters, ...AppState.preappliedFilters };
      AppState.preappliedFilters = null; // consume
    }

    // ── Global Navbar Search Integration ──
    const globalSearch = document.getElementById('global-search');
    if (globalSearch) {
      globalSearch.value = _state.query || '';
      globalSearch.addEventListener('input', _handleGlobalSearchInput);
    }

    // ROW 1 — Context
    const row1 = document.createElement('div');
    row1.style.cssText = 'display:flex;align-items:center;justify-content:space-between;width:100%;margin-bottom:var(--space-6)';
    row1.innerHTML = `
      <div>
        <h1 class="page-title" style="margin:0">ICS Records</h1>
        <p class="page-subtitle" style="margin:4px 0 0 0">Browse and manage Inventory Custodian Slips.</p>
      </div>
      <div>
        <button class="btn btn-primary" id="records-new-btn" style="height:36px;font-weight:500">
          + New ICS
        </button>
      </div>
    `;
    workspace.appendChild(row1);

    // ROW 2 — View Switcher
    const row2 = document.createElement('div');
    row2.className = 'view-switcher-segmented';
    row2.id = 'records-view-switcher';
    row2.style.cssText = 'margin-bottom:var(--space-6)';
    workspace.appendChild(row2);

    // ROW 3 — Organization
    const row3 = document.createElement('div');
    row3.style.cssText = 'display:flex;align-items:center;gap:12px;width:100%;margin-bottom:var(--space-6)';

    const statusSelect = document.createElement('select');
    statusSelect.className = 'form-control';
    statusSelect.style.cssText = 'width:140px;height:38px;';
    statusSelect.id = 'org-status-select';
    statusSelect.innerHTML = `
      <option value="all">Status: All</option>
      <option value="active">Status: Active</option>
      <option value="draft">Status: Draft</option>
      <option value="archived">Status: Archived</option>
    `;
    statusSelect.value = _state.filters.status || 'all';
    statusSelect.addEventListener('change', (e) => {
      _state.filters.status = e.target.value;
      _state.page = 0;
      _runQuery();
    });
    row3.appendChild(statusSelect);

    const sortSelect = document.createElement('select');
    sortSelect.className = 'form-control';
    sortSelect.style.cssText = 'width:200px;height:38px;';
    sortSelect.id = 'org-sort-select';
    [
      { label: 'Sort: Recently Modified', val: 'modifiedDate:desc' },
      { label: 'Sort: Oldest Modified',   val: 'modifiedDate:asc'  },
      { label: 'Sort: Newest First',      val: 'dateIssued:desc'   },
      { label: 'Sort: Oldest First',      val: 'dateIssued:asc'    },
      { label: 'Sort: ICS Number A→Z',    val: 'icsNumber:asc'     },
    ].forEach(({ label, val }) => {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = label;
      if (val === `${_state.sortBy}:${_state.sortOrder}`) opt.selected = true;
      sortSelect.appendChild(opt);
    });
    sortSelect.addEventListener('change', (e) => {
      const [sortBy, sortOrder] = e.target.value.split(':');
      _state.sortBy = sortBy;
      _state.sortOrder = sortOrder || 'desc';
      _state.page = 0;
      _runQuery();
    });
    row3.appendChild(sortSelect);

    const filterBtn = document.createElement('button');
    filterBtn.className = 'btn btn-secondary';
    filterBtn.style.cssText = 'height:38px;display:flex;align-items:center;gap:6px';
    filterBtn.id = 'org-filter-btn';
    filterBtn.innerHTML = `Filter ▼`;
    filterBtn.addEventListener('click', () => _toggleFiltersDrawer(true));
    row3.appendChild(filterBtn);

    workspace.appendChild(row3);

    // ROW 4 — Content
    const row4 = document.createElement('div');
    row4.style.cssText = 'width:100%;margin-top:12px';

    const contentHeader = document.createElement('div');
    contentHeader.style.cssText = 'display:flex;align-items:center;justify-content:flex-end;width:100%;margin-bottom:16px';

    const listBtn = document.createElement('button');
    listBtn.className = `btn btn-ghost btn-sm ${_state.displayMode === 'list' ? 'btn-primary' : ''}`;
    listBtn.style.padding = '4px 8px';
    listBtn.textContent = '☰ List';

    const gridBtn = document.createElement('button');
    gridBtn.className = `btn btn-ghost btn-sm ${_state.displayMode === 'grid' ? 'btn-primary' : ''}`;
    gridBtn.style.padding = '4px 8px';
    gridBtn.textContent = '▦ Grid';

    listBtn.addEventListener('click', () => {
      _state.displayMode = 'list';
      localStorage.setItem('ics-display-mode', 'list');
      listBtn.classList.add('btn-primary');
      gridBtn.classList.remove('btn-primary');
      _renderList();
    });

    gridBtn.addEventListener('click', () => {
      _state.displayMode = 'grid';
      localStorage.setItem('ics-display-mode', 'grid');
      gridBtn.classList.add('btn-primary');
      listBtn.classList.remove('btn-primary');
      _renderList();
    });

    contentHeader.appendChild(listBtn);
    contentHeader.appendChild(gridBtn);
    row4.appendChild(contentHeader);

    const listWrap = document.createElement('div');
    listWrap.id = 'records-list-wrap';
    row4.appendChild(listWrap);
    _dom.listWrap = listWrap;

    const pagination = document.createElement('div');
    pagination.className = 'pagination';
    pagination.style.marginTop = '24px';
    row4.appendChild(pagination);
    _dom.pagination = pagination;

    workspace.appendChild(row4);

    // ── Drawer backdrop & Adv Filter Drawer container ──
    let backdrop = document.getElementById('drawer-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'drawer-backdrop';
      backdrop.id = 'drawer-backdrop';
      document.body.appendChild(backdrop);
    }

    let drawer = document.getElementById('adv-filter-drawer');
    if (!drawer) {
      drawer = document.createElement('div');
      drawer.className = 'adv-filter-drawer';
      drawer.id = 'adv-filter-drawer';
      document.body.appendChild(drawer);
    }

    drawer.innerHTML = `
      <div class="adv-drawer-header">
        <span class="adv-drawer-title">Filters</span>
        <button class="btn btn-ghost btn-sm" id="btn-close-adv" style="width:24px;height:24px;border-radius:50%;padding:0">✕</button>
      </div>
      <div class="adv-drawer-body">
        <div class="form-group"><label class="form-label">Status</label>
          <select class="form-control" id="adv-status">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
            <option value="verified">Verified</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label">Year Issued</label>
          <select class="form-control" id="adv-year">
            <option value="">All Years</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label">Fund Cluster</label>
          <select class="form-control" id="adv-fund">
            <option value="">All Funds</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label">ICS Number</label><input class="form-control" id="adv-ics" type="text" placeholder="e.g. 2026-07-001"></div>
        <div class="form-group"><label class="form-label">Recipient Name</label><input class="form-control" id="adv-recip" type="text"></div>
        <div class="form-group"><label class="form-label">Office</label><input class="form-control" id="adv-office" type="text"></div>
        <div class="form-group"><label class="form-label">Position</label><input class="form-control" id="adv-pos" type="text"></div>
        <div class="form-group"><label class="form-label">Item Description</label><input class="form-control" id="adv-desc" type="text"></div>
        <div class="form-group"><label class="form-label">Inventory Item No.</label><input class="form-control" id="adv-invNum" type="text"></div>
        <div class="form-group"><label class="form-label">Serial Number</label><input class="form-control" id="adv-serial" type="text"></div>
        <div class="form-group"><label class="form-label">Estimated Useful Life</label><input class="form-control" id="adv-eul" type="text"></div>
        <div class="form-group"><label class="form-label">Min Asset Value (₱)</label><input class="form-control" id="adv-amountMin" type="number"></div>
        <div class="form-group"><label class="form-label">Max Asset Value (₱)</label><input class="form-control" id="adv-amountMax" type="number"></div>
        <div class="form-group"><label class="form-label">Date Start</label><input class="form-control" id="adv-dateStart" type="date"></div>
        <div class="form-group"><label class="form-label">Date End</label><input class="form-control" id="adv-dateEnd" type="date"></div>
        <div class="form-group"><label class="form-label">Tags</label><input class="form-control" id="adv-tags" type="text"></div>
        <div class="form-group"><label class="form-label">Remarks</label><input class="form-control" id="adv-remarks" type="text"></div>
        <div style="display:flex;flex-direction:column;gap:4px;margin-top:8px">
          <label style="display:flex;align-items:center;gap:6px;font-size:var(--font-size-sm)"><input type="checkbox" id="adv-favs"> Pin Favorites ⭐</label>
          <label style="display:flex;align-items:center;gap:6px;font-size:var(--font-size-sm);margin-top:4px"><input type="checkbox" id="adv-attention"> Requires Audit ⚠️</label>
          <label style="display:flex;align-items:center;gap:6px;font-size:var(--font-size-sm);margin-top:4px"><input type="checkbox" id="adv-recents"> Recently Viewed ⏱️</label>
        </div>
      </div>
      <div class="adv-drawer-footer">
        <button class="btn btn-primary" id="btn-apply-adv" style="width:100%">Apply Filters</button>
        <button class="btn btn-ghost" id="btn-clear-adv" style="width:100%">Clear All Filters</button>
      </div>
    `;

    // Wire Advanced Drawer events
    backdrop.addEventListener('click', () => _toggleFiltersDrawer(false));
    drawer.querySelector('#btn-close-adv').addEventListener('click', () => _toggleFiltersDrawer(false));
    drawer.querySelector('#btn-apply-adv').addEventListener('click', _applyAdvancedFilters);
    drawer.querySelector('#btn-clear-adv').addEventListener('click', _clearAdvancedFilters);

    // ── Sticky Selection Toolbar ──
    let selToolbar = document.getElementById('notif-selection-toolbar');
    if (!selToolbar) {
      selToolbar = document.createElement('div');
      selToolbar.className = 'selection-toolbar';
      selToolbar.id = 'notif-selection-toolbar';
      selToolbar.innerHTML = `
        <span id="sel-count-label">0 selected</span>
        <div style="display:flex;gap:4px">
          <button class="sel-action-btn" id="bulk-archive-btn">📥 Archive</button>
          <button class="sel-action-btn" id="bulk-print-btn">🖨️ Print</button>
          <button class="sel-action-btn" id="bulk-export-btn">📤 Export</button>
          <button class="sel-action-btn" id="bulk-delete-btn" style="color:#F87171">✕ Delete</button>
        </div>
      `;
      document.body.appendChild(selToolbar);

      // Wire bulk actions
      selToolbar.querySelector('#bulk-archive-btn').addEventListener('click', _handleBulkArchive);
      selToolbar.querySelector('#bulk-delete-btn').addEventListener('click', _handleBulkDelete);
      selToolbar.querySelector('#bulk-export-btn').addEventListener('click', _handleBulkExport);
      selToolbar.querySelector('#bulk-print-btn').addEventListener('click', _handleBulkPrint);
    }

    document.getElementById('records-new-btn').addEventListener('click', () => Router.navigate('#new'));

    // Setup shortcuts
    _setupKeyboard();

    // Default context placeholder
    _updateContextPanel(null);

    // Fetch and render records
    _loadAll();
  }

  function destroy() {
    _teardownKeyboard();
    // Hide drawer & selection toolbar
    _toggleFiltersDrawer(false);
    const toolbar = document.getElementById('notif-selection-toolbar');
    if (toolbar) toolbar.classList.remove('active');

    // Unbind navbar search
    const globalSearch = document.getElementById('global-search');
    if (globalSearch) {
      globalSearch.removeEventListener('input', _handleGlobalSearchInput);
    }
  }

  return { render, destroy };
})();
