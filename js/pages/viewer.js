/**
 * ICS Tracking & Monitoring Tool
 * Phase 4: ICS Record Viewer, Timeline & Monitoring — Viewer Page
 *
 * Detailed read-only detailed viewer page rendering record details,
 * item monitoring status, EUL alerts, timeline, notes, attachments preparation,
 * related records links, and COA form previews.
 */
'use strict';

const ViewerPage = (() => {

  let _record = null;
  let _allRecords = [];
  let _contextBody = null;
  let _activeTab = 'details'; // 'details' | 'timeline' | 'notes' | 'preview'

  /* DOM Shortcuts */
  let _dom = {};

  /* ----------------------------------------------------------
     State Management / Loader
     ---------------------------------------------------------- */
  async function _loadRecord() {
    const hash = window.location.hash || '';
    const m = hash.match(/id=([a-f0-9-]+)/i);
    const id = m ? m[1] : null;

    if (!id) {
      _renderError('No record ID specified in URL.');
      return;
    }

    try {
      _allRecords = await RecordService.getAllRecords();
      _record = _allRecords.find(r => r.id === id);

      if (!_record) {
        _renderError('Record not found in database.');
        return;
      }

      // Log Viewed event (only if the last timeline event is not already "Record Viewed" to avoid clutter)
      if (!_record.timeline || _record.timeline.length === 0 || _record.timeline[0].action !== 'Record Viewed') {
        TimelineService.logEvent(_record, 'viewed', 'Opened in record viewer.');
        await RecordService.updateRecord(_record.id, _record);
      }

      _renderAll();
    } catch (err) {
      console.error('[ViewerPage] Error loading record:', err);
      _renderError('Failed to load record details from IndexedDB.');
    }
  }

  /* ----------------------------------------------------------
     Navigation Helpers
     ---------------------------------------------------------- */
  function _getPrevAndNext() {
    // Sort all records using the default engine sort (favorites first)
    const sorted = SearchEngine.applySort(_allRecords, 'modifiedDate', 'desc');
    sorted.sort((a, b) => {
      const favA = a.isFavorite ? 1 : 0;
      const favB = b.isFavorite ? 1 : 0;
      return favB - favA;
    });

    const idx = sorted.findIndex(r => r.id === _record.id);
    return {
      prev: idx > 0 ? sorted[idx - 1] : null,
      next: idx < sorted.length - 1 ? sorted[idx + 1] : null,
    };
  }

  function _navigatePrev() {
    const { prev } = _getPrevAndNext();
    if (prev) Router.navigate(`#view?id=${prev.id}`);
  }

  function _navigateNext() {
    const { next } = _getPrevAndNext();
    if (next) Router.navigate(`#view?id=${next.id}`);
  }

  /* ----------------------------------------------------------
     Mutations
     ---------------------------------------------------------- */
  async function _updateRecordData() {
    try {
      _record.modifiedDate = new Date().toISOString();
      await RecordService.updateRecord(_record.id, _record);
      _renderAll();
      UIKit.toast('Record updated.', 'success');
    } catch (err) {
      console.error(err);
      UIKit.toast('Failed to save changes.', 'error');
    }
  }

  async function _toggleFavorite() {
    _record.isFavorite = !_record.isFavorite;
    TimelineService.logEvent(_record, 'edited', _record.isFavorite ? 'Record pinned to favorites.' : 'Record removed from favorites.');
    await _updateRecordData();
  }

  async function _handleRecordStatusChange(newStatus) {
    if (newStatus === _record.status) return;
    const oldStatus = _record.status;
    _record.status = newStatus;
    TimelineService.logEvent(_record, 'status_changed', `Record status changed from ${Utils.capitalise(oldStatus)} to ${Utils.capitalise(newStatus)}.`);
    await _updateRecordData();
  }

  async function _handleItemStatusChange(itemId, newStatus) {
    if (!_record.itemStatuses) _record.itemStatuses = {};
    const oldStatus = _record.itemStatuses[itemId] || 'issued';
    _record.itemStatuses[itemId] = newStatus;

    const item = _record.items.find(i => i.id === itemId);
    const desc = item ? item.description : 'Item';

    TimelineService.logEvent(_record, 'item_status_changed', `Item "${desc}" status updated from ${Utils.capitalise(oldStatus)} to ${Utils.capitalise(newStatus)}.`);
    await _updateRecordData();
  }

  /* ----------------------------------------------------------
     Notes Managers
     ---------------------------------------------------------- */
  async function _addNote() {
    const inp = document.getElementById('new-note-text');
    if (!inp || !inp.value.trim()) return;

    const note = {
      id: Utils.uuid(),
      timestamp: new Date().toISOString(),
      text: inp.value.trim(),
    };

    if (!_record.notes) _record.notes = [];
    _record.notes.unshift(note);

    TimelineService.logEvent(_record, 'note_added', `Added internal note: "${Utils.truncate(note.text, 30)}".`);
    inp.value = '';
    await _updateRecordData();
  }

  async function _deleteNote(noteId) {
    if (!_record.notes) return;
    const idx = _record.notes.findIndex(n => n.id === noteId);
    if (idx < 0) return;

    const note = _record.notes[idx];
    _record.notes.splice(idx, 1);

    TimelineService.logEvent(_record, 'note_deleted', `Deleted internal note: "${Utils.truncate(note.text, 30)}".`);
    await _updateRecordData();
  }

  async function _editNote(noteId) {
    if (!_record.notes) return;
    const note = _record.notes.find(n => n.id === noteId);
    if (!note) return;

    const newText = prompt('Edit internal note:', note.text);
    if (newText === null || newText.trim() === '') return;

    note.text = newText.trim();
    TimelineService.logEvent(_record, 'edited', `Updated internal note: "${Utils.truncate(note.text, 30)}".`);
    await _updateRecordData();
  }

  /* ----------------------------------------------------------
     Attachments Manager (Metadata Prep)
     ---------------------------------------------------------- */
  async function _addAttachment() {
    const name = prompt('Enter attachment file name (e.g. receipt.pdf, warranty.jpg):');
    if (!name || !name.trim()) return;

    const typeMap = {
      pdf: 'PDF Document',
      png: 'Image (PNG)',
      jpg: 'Image (JPEG)',
      jpeg: 'Image (JPEG)',
      docx: 'Word Document',
      xlsx: 'Excel Spreadsheet',
    };
    const ext = name.split('.').pop().toLowerCase();
    const type = typeMap[ext] || 'Attachment Link';

    const att = {
      id: Utils.uuid(),
      name: name.trim(),
      type,
      dateAdded: new Date().toISOString(),
    };

    if (!_record.attachments) _record.attachments = [];
    _record.attachments.unshift(att);

    TimelineService.logEvent(_record, 'edited', `Linked attachment metadata: "${att.name}".`);
    await _updateRecordData();
  }

  async function _deleteAttachment(id) {
    if (!_record.attachments) return;
    const idx = _record.attachments.findIndex(a => a.id === id);
    if (idx < 0) return;

    const att = _record.attachments[idx];
    _record.attachments.splice(idx, 1);

    TimelineService.logEvent(_record, 'edited', `Removed attachment link: "${att.name}".`);
    await _updateRecordData();
  }

  /* ----------------------------------------------------------
     Actions
     ---------------------------------------------------------- */
  function _handleEdit() {
    AppState.editRecordId = _record.id;
    Router.navigate('#edit');
  }

  async function _handleDelete() {
    const confirmed = await UIKit.confirm({
      title:       'Delete Record',
      message:     `Permanently delete "${_record.icsNumber || 'this record'}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText:  'Cancel',
      variant:     'danger',
    });
    if (!confirmed) return;

    try {
      await RecordService.deleteRecord(_record.id);
      UIKit.toast('Record deleted.', 'success');
      Router.navigate('#records');
    } catch (err) {
      UIKit.toast('Failed to delete record.', 'error');
    }
  }

  async function _handleArchive() {
    try {
      _record.status = 'archived';
      TimelineService.logEvent(_record, 'archived', 'Soft-archived from details viewer.');
      await _updateRecordData();
    } catch (err) {
      UIKit.toast('Failed to archive record.', 'error');
    }
  }

  async function _handleRestore() {
    try {
      _record.status = 'active';
      TimelineService.logEvent(_record, 'restored', 'Restored to active status from archive.');
      await _updateRecordData();
    } catch (err) {
      UIKit.toast('Failed to restore record.', 'error');
    }
  }

  /* ----------------------------------------------------------
     DOM Rendering (Workspace Main)
     ---------------------------------------------------------- */
  function _renderError(msg) {
    const ws = document.getElementById('workspace');
    if (!ws) return;
    ws.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${Components.icon('alert')}</div>
        <div class="empty-title">Error Loading Record</div>
        <div class="empty-desc">${Utils.escapeHtml(msg)}</div>
        <button class="btn btn-secondary" onclick="Router.navigate('#records')" style="margin-top:var(--space-4)">
          Back to Records List
        </button>
      </div>
    `;
  }

  function _renderAll() {
    const ws = document.getElementById('workspace');
    if (!ws) return;
    ws.innerHTML = '';

    // Quick navigation bar
    const { prev, next } = _getPrevAndNext();
    const navBar = document.createElement('div');
    navBar.className = 'quick-nav-bar';
    navBar.innerHTML = `
      <button class="btn btn-ghost btn-sm" id="vnav-back">
        ← Back to List
      </button>
      <div class="flex gap-2">
        <button class="btn btn-ghost btn-sm" id="vnav-prev" ${!prev ? 'disabled' : ''} title="Previous Record (Left Arrow)">
          ${Components.icon('chevronLeft')} Prev
        </button>
        <span style="font-size:var(--font-size-xs);color:var(--color-text-tertiary);align-self:center">
          ${_record.icsNumber || '(Draft)'}
        </span>
        <button class="btn btn-ghost btn-sm" id="vnav-next" ${!next ? 'disabled' : ''} title="Next Record (Right Arrow)">
          Next ${Components.icon('chevronRight')}
        </button>
      </div>
    `;
    ws.appendChild(navBar);

    // Header
    const isFav = !!_record.isFavorite;
    const header = document.createElement('div');
    header.className = 'page-header';
    header.style.marginBottom = 'var(--space-4)';
    header.innerHTML = `
      <div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <h1 class="page-title" style="margin:0">${Utils.escapeHtml(_record.icsNumber) || '(Draft Record)'}</h1>
          <button class="favorite-btn ${isFav ? 'active' : ''}" id="v-fav-btn" title="${isFav ? 'Remove Pin' : 'Pin to favorites'}">
            ★
          </button>
          <span class="badge badge-${_statusVariant(_record.status)}">${_statusLabel(_record.status)}</span>
        </div>
        <p class="page-subtitle">${Utils.escapeHtml(_record.receivedBy)} · ${Utils.escapeHtml(_record.office || 'No Office Specified')}</p>
      </div>
    `;
    ws.appendChild(header);

    // Tab buttons
    const tabsWrap = document.createElement('div');
    tabsWrap.className = 'viewer-tabs';
    [
      { id: 'details',  label: 'Asset Details' },
      { id: 'timeline', label: 'History Timeline' },
      { id: 'notes',    label: 'Notes & Attachments' },
      { id: 'preview',  label: 'COA Form Preview' },
    ].forEach(t => {
      const btn = document.createElement('button');
      btn.className = `viewer-tab-btn ${t.id === _activeTab ? 'active' : ''}`;
      btn.textContent = t.label;
      btn.addEventListener('click', () => {
        _activeTab = t.id;
        _renderAll();
      });
      tabsWrap.appendChild(btn);
    });
    ws.appendChild(tabsWrap);

    // Tab Contents Wrap
    const tabBody = document.createElement('div');
    ws.appendChild(tabBody);

    switch (_activeTab) {
      case 'details':  _renderDetailsTab(tabBody); break;
      case 'timeline': _renderTimelineTab(tabBody); break;
      case 'notes':    _renderNotesTab(tabBody); break;
      case 'preview':  _renderFormPreviewTab(tabBody); break;
    }

    // Context Panel Right side
    _renderContextPanel();

    // Wire local nav events
    document.getElementById('vnav-back').addEventListener('click', () => Router.navigate('#records'));
    if (prev) document.getElementById('vnav-prev').addEventListener('click', _navigatePrev);
    if (next) document.getElementById('vnav-next').addEventListener('click', _navigateNext);
    document.getElementById('v-fav-btn').addEventListener('click', _toggleFavorite);
  }

  function _renderDetailsTab(container) {
    // ── 1. Record Summary Details ──
    const summaryGrid = document.createElement('div');
    summaryGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:var(--space-4);margin-bottom:var(--space-6)';
    summaryGrid.innerHTML = `
      <div class="review-block" style="margin:0">
        <div class="review-block-title">Slip Details</div>
        <div class="detail-row"><span class="detail-key">Entity</span><span class="detail-val">${Utils.escapeHtml(_record.entityName) || '—'}</span></div>
        <div class="detail-row"><span class="detail-key">Fund Cluster</span><span class="detail-val">${Utils.escapeHtml(_record.fundCluster) || '—'}</span></div>
        <div class="detail-row"><span class="detail-key">Date Issued</span><span class="detail-val">${Utils.formatDate(_record.dateIssued)}</span></div>
        <div class="detail-row"><span class="detail-key">Issued By</span><span class="detail-val">${Utils.escapeHtml(_record.issuedBy)}</span></div>
      </div>
      <div class="review-block" style="margin:0">
        <div class="review-block-title">Recipient details</div>
        <div class="detail-row"><span class="detail-key">Name</span><span class="detail-val">${Utils.escapeHtml(_record.receivedBy)}</span></div>
        <div class="detail-row"><span class="detail-key">Position</span><span class="detail-val">${Utils.escapeHtml(_record.position) || '—'}</span></div>
        <div class="detail-row"><span class="detail-key">Office</span><span class="detail-val">${Utils.escapeHtml(_record.office) || '—'}</span></div>
        <div class="detail-row"><span class="detail-key">Received Date</span><span class="detail-val">${Utils.formatDate(_record.receivedDate)}</span></div>
      </div>
    `;
    container.appendChild(summaryGrid);

    // ── 2. Item Summary Stats ──
    const items = _record.items || [];
    const totalCost = items.reduce((s, i) => s + i.totalCost, 0);
    const totalQty = items.reduce((s, i) => s + i.quantity, 0);
    const avgCost = items.length > 0 ? (totalCost / totalQty) : 0;

    const statsGrid = document.createElement('div');
    statsGrid.className = 'stats-grid';
    statsGrid.style.marginBottom = 'var(--space-5)';
    statsGrid.innerHTML = `
      ${Components.statCard({ label: 'Total Issued Items', value: items.length, iconName: 'package', variant: 'primary' }).outerHTML}
      ${Components.statCard({ label: 'Total Quantity', value: totalQty, iconName: 'box', variant: 'success' }).outerHTML}
      ${Components.statCard({ label: 'Total Slip Value', value: Utils.formatCurrency(totalCost), iconName: 'reports', variant: 'info' }).outerHTML}
      ${Components.statCard({ label: 'Average Unit Cost', value: Utils.formatCurrency(avgCost), iconName: 'info', variant: 'neutral' }).outerHTML}
    `;
    container.appendChild(statsGrid);

    // ── 3. Table of Items ──
    const tableWrap = document.createElement('div');
    tableWrap.className = 'items-table-wrap';
    tableWrap.id = 'items-table-wrap';
    tableWrap.innerHTML = `
      <table class="items-table">
        <thead>
          <tr>
            <th class="item-num">#</th>
            <th>Description</th>
            <th>Inventory No.</th>
            <th>Serial No.</th>
            <th style="text-align:right">Qty</th>
            <th>Unit</th>
            <th style="text-align:right">Cost</th>
            <th style="text-align:right">Total</th>
            <th>Useful Life</th>
            <th>Item Status</th>
          </tr>
        </thead>
        <tbody id="v-items-tbody"></tbody>
      </table>
    `;
    container.appendChild(tableWrap);

    // Mobile items cards
    const mobileList = document.createElement('div');
    mobileList.className = 'items-mobile-list';
    mobileList.id = 'items-mobile-list';
    container.appendChild(mobileList);

    const tbody = tableWrap.querySelector('tbody');
    items.forEach((item, idx) => {
      // Calculate RUL
      const rul = MonitoringService.calculateRUL(_record.dateIssued, item.estimatedUsefulLife);
      const rulClass = { 'Normal': 'rul-normal', 'Approaching EUL': 'rul-approaching', 'Expired': 'rul-expired' }[rul.status];

      // Item status selector options
      const itemStatus = (_record.itemStatuses && _record.itemStatuses[item.id]) || 'issued';

      // Table Row
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="item-num">${idx + 1}</td>
        <td>
          <div style="font-weight:600;color:var(--color-text-primary)">${Utils.escapeHtml(item.description)}</div>
          ${item.remarks ? `<div style="font-size:10px;color:var(--color-text-tertiary);margin-top:2px;">Notes: ${Utils.escapeHtml(item.remarks)}</div>` : ''}
        </td>
        <td>${Utils.escapeHtml(item.inventoryItemNumber) || '—'}</td>
        <td>${Utils.escapeHtml(item.serialNumber) || '—'}</td>
        <td style="text-align:right">${item.quantity}</td>
        <td>${Utils.escapeHtml(item.unit)}</td>
        <td style="text-align:right">${Utils.formatCurrency(item.unitCost)}</td>
        <td style="text-align:right;font-weight:600;color:var(--color-text-primary)">${Utils.formatCurrency(item.totalCost)}</td>
        <td>
          <div class="rul-badge ${rulClass}" title="${rul.daysRemaining} days left">${rul.status} (${rul.yearsRemaining}y)</div>
        </td>
        <td>
          <select class="sort-select item-status-select" data-item-id="${item.id}">
            ${MonitoringService.ITEM_STATUSES.map(s => `<option value="${s.value}" ${s.value === itemStatus ? 'selected' : ''}>${s.label}</option>`).join('')}
          </select>
        </td>
      `;
      tbody.appendChild(tr);

      // Mobile card
      const mCard = document.createElement('div');
      mCard.className = 'item-mobile-card';
      mCard.innerHTML = `
        <div class="item-mobile-card-header">
          <div class="item-mobile-card-title">${Utils.escapeHtml(item.description)}</div>
          <div class="rul-badge ${rulClass}">${rul.status}</div>
        </div>
        <div class="item-mobile-card-meta">
          <span><strong>Inv:</strong> ${Utils.escapeHtml(item.inventoryItemNumber) || '—'}</span>
          <span><strong>SN:</strong> ${Utils.escapeHtml(item.serialNumber) || '—'}</span>
          <span><strong>Qty:</strong> ${item.quantity} ${item.unit} x ${Utils.formatCurrency(item.unitCost)}</span>
          <span><strong>EUL:</strong> ${item.estimatedUsefulLife} (${rul.yearsRemaining}y left)</span>
          ${item.remarks ? `<span style="width:100%"><strong>Notes:</strong> ${Utils.escapeHtml(item.remarks)}</span>` : ''}
        </div>
        <div class="item-mobile-card-footer">
          <div class="item-mobile-card-cost">${Utils.formatCurrency(item.totalCost)}</div>
          <select class="sort-select item-status-select" data-item-id="${item.id}" style="height:28px;font-size:11px">
            ${MonitoringService.ITEM_STATUSES.map(s => `<option value="${s.value}" ${s.value === itemStatus ? 'selected' : ''}>${s.label}</option>`).join('')}
          </select>
        </div>
      `;
      mobileList.appendChild(mCard);
    });

    // Wire status select triggers
    container.querySelectorAll('.item-status-select').forEach(sel => {
      sel.addEventListener('change', e => {
        const itemId = sel.dataset.itemId;
        _handleItemStatusChange(itemId, e.target.value);
      });
    });
  }

  function _renderTimelineTab(container) {
    const list = _record.timeline || [];
    if (list.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-title">No timeline records found.</div></div>`;
      return;
    }

    const tc = document.createElement('div');
    tc.className = 'timeline-container';
    tc.innerHTML = `<div class="timeline-line"></div>`;

    list.forEach(ev => {
      const event = document.createElement('div');
      event.className = 'timeline-event';
      event.innerHTML = `
        <div class="timeline-badge">⏱</div>
        <div class="timeline-content">
          <div class="timeline-header">
            <span class="timeline-title">${Utils.escapeHtml(ev.action)}</span>
            <span class="timeline-date">${Utils.formatRelativeTime(ev.timestamp)}</span>
          </div>
          <div class="timeline-meta">
            <span>By: <strong>${Utils.escapeHtml(ev.user)}</strong></span>
            <span>Device: <em>${Utils.escapeHtml(ev.device)}</em></span>
          </div>
          ${ev.notes ? `<div class="timeline-notes">${Utils.escapeHtml(ev.notes)}</div>` : ''}
        </div>
      `;
      tc.appendChild(event);
    });

    container.appendChild(tc);
  }

  function _renderNotesTab(container) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:grid;grid-template-columns:1fr;gap:var(--space-6);';

    // ── Notes ──
    const notesSec = document.createElement('div');
    notesSec.className = 'review-block';
    notesSec.style.margin = '0';
    notesSec.innerHTML = `
      <div class="review-block-title">Internal Notes</div>
      <div class="notes-input-wrap">
        <input class="form-control" id="new-note-text" placeholder="Type a new tracking note..." autocomplete="off">
        <button class="btn btn-primary" id="btn-add-note">Add</button>
      </div>
      <div class="notes-list" id="v-notes-list"></div>
    `;
    wrap.appendChild(notesSec);

    // ── Attachments ──
    const attachSec = document.createElement('div');
    attachSec.className = 'review-block';
    attachSec.style.margin = '0';
    attachSec.innerHTML = `
      <div class="review-block-title" style="display:flex;justify-content:space-between;align-items:center;">
        <span>Attached Files (Metadata Prep)</span>
        <button class="btn btn-secondary btn-sm" id="btn-add-attach">+ Link File</button>
      </div>
      <p class="form-hint" style="margin-bottom:var(--space-3)">Associate manuals, warranties, or scanned receipts metadata to this record.</p>
      <div class="notes-list" id="v-attach-list"></div>
    `;
    wrap.appendChild(attachSec);
    container.appendChild(wrap);

    // Populate notes list
    const notesList = notesSec.querySelector('#v-notes-list');
    const notes = _record.notes || [];
    if (notes.length === 0) {
      notesList.innerHTML = `<p style="text-align:center;padding:var(--space-4);color:var(--color-text-tertiary);font-size:var(--font-size-xs)">No internal notes yet.</p>`;
    } else {
      notes.forEach(n => {
        const card = document.createElement('div');
        card.className = 'note-card';
        card.innerHTML = `
          <div class="note-card-header">
            <span>By supply office</span>
            <span>${Utils.formatRelativeTime(n.timestamp)}</span>
          </div>
          <div class="note-card-text">${Utils.escapeHtml(n.text)}</div>
          <div class="note-card-actions">
            <button class="btn btn-ghost btn-sm btn-icon btn-note-edit" data-id="${n.id}" title="Edit Note">${Components.icon('records')}</button>
            <button class="btn btn-ghost btn-sm btn-icon btn-note-del" data-id="${n.id}" style="color:var(--color-danger)" title="Delete Note">${Components.icon('close')}</button>
          </div>
        `;
        card.querySelector('.btn-note-edit').addEventListener('click', () => _editNote(n.id));
        card.querySelector('.btn-note-del').addEventListener('click', () => _deleteNote(n.id));
        notesList.appendChild(card);
      });
    }

    // Populate attachments list
    const attachList = attachSec.querySelector('#v-attach-list');
    const attachments = _record.attachments || [];
    if (attachments.length === 0) {
      attachList.innerHTML = `<p style="text-align:center;padding:var(--space-4);color:var(--color-text-tertiary);font-size:var(--font-size-xs)">No files linked yet.</p>`;
    } else {
      attachments.forEach(a => {
        const card = document.createElement('div');
        card.className = 'note-card';
        card.innerHTML = `
          <div class="note-card-header">
            <span>${Utils.escapeHtml(a.type)}</span>
            <span>Added: ${Utils.formatDate(a.dateAdded)}</span>
          </div>
          <div class="note-card-text" style="font-weight:600;display:flex;align-items:center;gap:4px">
            📎 ${Utils.escapeHtml(a.name)}
          </div>
          <div class="note-card-actions">
            <button class="btn btn-ghost btn-sm btn-icon btn-attach-del" data-id="${a.id}" style="color:var(--color-danger)" title="Remove Link">${Components.icon('close')}</button>
          </div>
        `;
        card.querySelector('.btn-attach-del').addEventListener('click', () => _deleteAttachment(a.id));
        attachList.appendChild(card);
      });
    }

    // Event listeners
    document.getElementById('btn-add-note').addEventListener('click', _addNote);
    document.getElementById('btn-add-attach').addEventListener('click', _addAttachment);
  }

  function _renderFormPreviewTab(container) {
    const fd = _record;

    const tableRows = (fd.items || []).map((item, idx) => `
      <tr>
        <td style="text-align:center">${idx + 1}</td>
        <td style="text-align:center">${item.quantity}</td>
        <td style="text-align:center">${Utils.escapeHtml(item.unit)}</td>
        <td>
          <strong>${Utils.escapeHtml(item.description)}</strong>
          ${item.serialNumber ? `<br>S/N: ${Utils.escapeHtml(item.serialNumber)}` : ''}
          ${item.remarks ? `<br>Remarks: ${Utils.escapeHtml(item.remarks)}` : ''}
        </td>
        <td>${Utils.escapeHtml(item.inventoryItemNumber) || '—'}</td>
        <td style="text-align:right">${item.unitCost.toFixed(2)}</td>
        <td style="text-align:right">${item.totalCost.toFixed(2)}</td>
        <td style="text-align:center">${Utils.escapeHtml(item.estimatedUsefulLife) || '—'}</td>
      </tr>
    `).join('');

    const totalCost = (fd.items || []).reduce((s, i) => s + i.totalCost, 0);

    container.innerHTML = `
      <div class="coa-preview-container">
        <div class="coa-preview-header">
          <div class="coa-annex-label">Appendix 59</div>
          <div style="font-size:14px;font-weight:bold;">INVENTORY CUSTODIAN SLIP</div>
        </div>

        <div class="coa-meta-grid">
          <div><strong>Entity Name:</strong></div><div>${Utils.escapeHtml(fd.entityName) || 'Department of Education'}</div>
          <div><strong>Fund Cluster:</strong></div><div>${Utils.escapeHtml(fd.fundCluster) || '01'}</div>
          <div><strong>ICS Number:</strong></div><div>${Utils.escapeHtml(fd.icsNumber) || 'Draft'}</div>
          <div><strong>Date Issued:</strong></div><div>${Utils.formatDate(fd.dateIssued)}</div>
        </div>

        <table class="coa-preview-table">
          <thead>
            <tr>
              <th style="width:30px">No.</th>
              <th style="width:40px">Qty</th>
              <th style="width:50px">Unit</th>
              <th>Description</th>
              <th>Inventory No.</th>
              <th>Unit Cost</th>
              <th>Amount</th>
              <th>Useful Life</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
            <tr>
              <td colspan="6" style="text-align:right;font-weight:bold">TOTAL AMOUNT:</td>
              <td style="text-align:right;font-weight:bold">${totalCost.toFixed(2)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>

        <div class="coa-signatories">
          <div class="coa-sig-col">
            <div class="coa-sig-label">Received from:</div>
            <div style="text-align:center;font-weight:bold;margin-top:24px;">
              ${Utils.escapeHtml(fd.issuedBy) || '—'}
            </div>
            <div class="coa-sig-line">Signature over Printed Name of Supply Officer / Property Custodian</div>
            <div style="margin-top:12px;text-align:center;">Date: ${Utils.formatDate(fd.dateIssued)}</div>
          </div>
          <div class="coa-sig-col">
            <div class="coa-sig-label">Received by:</div>
            <div style="text-align:center;font-weight:bold;margin-top:24px;">
              ${Utils.escapeHtml(fd.receivedBy)}
            </div>
            <div class="coa-sig-line">Signature over Printed Name of End-User</div>
            <div style="margin-top:12px;text-align:center;">Position: ${Utils.escapeHtml(fd.position) || '—'}</div>
            <div style="margin-top:4px;text-align:center;">Office: ${Utils.escapeHtml(fd.office) || '—'}</div>
            <div style="margin-top:4px;text-align:center;">Date: ${Utils.formatDate(fd.receivedDate)}</div>
          </div>
        </div>
      </div>
    `;
  }

  /* ----------------------------------------------------------
     DOM Rendering (Context Panel)
     ---------------------------------------------------------- */
  function _renderContextPanel() {
    if (!_contextBody) return;
    _contextBody.innerHTML = '';

    // ── 1. Status Dropdown Switcher ──
    const statusBox = document.createElement('div');
    statusBox.className = 'context-card';
    statusBox.style.marginBottom = 'var(--space-4)';
    statusBox.innerHTML = `
      <div class="context-card-title">Slips Status Tracking</div>
      <select class="sort-select" id="v-status-select" style="width:100%;height:38px;">
        ${MonitoringService.RECORD_STATUSES.map(s => `<option value="${s.value}" ${s.value === _record.status ? 'selected' : ''}>${s.label}</option>`).join('')}
      </select>
    `;
    _contextBody.appendChild(statusBox);

    // Wire status select change
    statusBox.querySelector('#v-status-select').addEventListener('change', e => {
      _handleRecordStatusChange(e.target.value);
    });

    // ── 2. Health Check score ──
    const health = HealthAnalyzer.analyze(_record, _allRecords);
    const hClass = { 'Excellent': 'h-excellent', 'Good': 'h-good', 'Needs Attention': 'h-warning', 'Critical': 'h-critical' }[health.label];

    const healthBox = document.createElement('div');
    healthBox.className = 'context-card';
    healthBox.style.marginBottom = 'var(--space-4)';
    healthBox.innerHTML = `
      <div class="context-card-title">Record Health Audit</div>
      <div class="health-score-container">
        <div class="health-score-circle ${hClass}">${health.score}</div>
        <div class="health-info">
          <div class="health-title">${health.label}</div>
          <div class="health-desc">${health.issues.length} audit issue(s) detected</div>
        </div>
      </div>
      <div class="issues-list" id="v-issues-list"></div>
    `;

    // Populate top 3 health issues
    const issuesList = healthBox.querySelector('#v-issues-list');
    if (health.issues.length === 0) {
      issuesList.innerHTML = `<p style="font-size:var(--font-size-xs);color:var(--color-success)">✓ No database schema conflicts or blank fields found.</p>`;
    } else {
      health.issues.slice(0, 3).forEach(issue => {
        const item = document.createElement('div');
        item.className = `health-issue-item i-${issue.severity}`;
        item.textContent = issue.message;
        issuesList.appendChild(item);
      });
      if (health.issues.length > 3) {
        const more = document.createElement('p');
        more.style.cssText = 'font-size:10px;color:var(--color-text-tertiary);margin-top:6px;text-align:right';
        more.textContent = `+ ${health.issues.length - 3} more issues`;
        issuesList.appendChild(more);
      }
    }
    _contextBody.appendChild(healthBox);

    // ── 3. Quick Actions ──
    const isArchived = _record.status === 'archived';
    const actionsBox = document.createElement('div');
    actionsBox.className = 'context-card';
    actionsBox.style.marginBottom = 'var(--space-4)';
    actionsBox.innerHTML = `
      <div class="context-card-title">Quick Actions</div>
      <div style="display:grid;grid-template-columns:1fr;gap:6px">
        <button class="btn btn-primary btn-sm" id="vact-edit">${Components.icon('records')} Edit Slip Details</button>
        <button class="btn btn-secondary btn-sm" id="vact-print">🖨️ Print Official Slip</button>
        <button class="btn btn-secondary btn-sm" id="vact-verify">${Components.icon('check')} Mark as Verified</button>
        <button class="btn btn-secondary btn-sm" id="vact-archive">${Components.icon('bell')} ${isArchived ? 'Restore Active' : 'Archive Record'}</button>
        <button class="btn btn-ghost btn-sm" id="vact-cancel" style="color:var(--color-danger)">✕ Cancel Record</button>
        <button class="btn btn-ghost btn-sm" id="vact-del" style="color:var(--color-danger)">🗑 Delete Record</button>
      </div>
    `;
    _contextBody.appendChild(actionsBox);

    // Wire actions
    actionsBox.querySelector('#vact-edit').addEventListener('click', _handleEdit);
    actionsBox.querySelector('#vact-print').addEventListener('click', () => {
      const container = document.createElement('div');
      _renderFormPreviewTab(container);
      PrintEngine.openPreview(container.innerHTML);
    });
    actionsBox.querySelector('#vact-verify').addEventListener('click', () => _handleRecordStatusChange('verified'));
    actionsBox.querySelector('#vact-archive').addEventListener('click', isArchived ? _handleRestore : _handleArchive);
    actionsBox.querySelector('#vact-cancel').addEventListener('click', () => _handleRecordStatusChange('cancelled'));
    actionsBox.querySelector('#vact-del').addEventListener('click', _handleDelete);

    // ── 4. Related Records links ──
    const related = RelationshipEngine.findRelated(_record, _allRecords);
    const relatedBox = document.createElement('div');
    relatedBox.className = 'context-card';
    relatedBox.innerHTML = `<div class="context-card-title">Related Slips (${related.length})</div>`;

    const rList = document.createElement('div');
    rList.className = 'related-list';
    relatedBox.appendChild(rList);

    if (related.length === 0) {
      rList.innerHTML = `<p style="font-size:var(--font-size-xs);color:var(--color-text-tertiary);">No linked recipient or office slips found.</p>`;
    } else {
      related.slice(0, 4).forEach(rel => {
        const item = document.createElement('div');
        item.className = 'related-item-card';
        item.innerHTML = `
          <div style="min-width:0;flex:1">
            <div style="font-weight:600;font-size:var(--font-size-xs);color:var(--color-text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
              ${Utils.escapeHtml(rel.record.icsNumber) || 'Draft'}
            </div>
            <div style="font-size:10px;color:var(--color-text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
              ${rel.reasons.join(', ')}
            </div>
          </div>
          <span class="badge badge-${_statusVariant(rel.record.status)}" style="font-size:9px;padding:1px 4px;margin-left:8px">${Utils.capitalise(rel.record.status)}</span>
        `;
        item.addEventListener('click', () => {
          Router.navigate(`#view?id=${rel.record.id}`);
        });
        rList.appendChild(item);
      });

      if (related.length > 4) {
        const more = document.createElement('p');
        more.style.cssText = 'font-size:10px;color:var(--color-text-tertiary);margin-top:6px;text-align:right';
        more.textContent = `+ ${related.length - 4} more related slips`;
        rList.appendChild(more);
      }
    }
    _contextBody.appendChild(relatedBox);
  }

  function _renderContextPanel() {
    if (!_contextBody) return;
    _contextBody.innerHTML = '';

    const health = HealthAnalyzer.analyze(_record, _allRecords);
    const related = RelationshipEngine.findRelated(_record, _allRecords);
    const isArchived = _record.status === 'archived';

    const summaryLead = Components.contextLead({
      eyebrow: 'Record Details',
      title: _record.icsNumber || 'Draft Record',
      desc: `${_record.receivedBy || 'No recipient yet'}${_record.office ? ` · ${_record.office}` : ''}`,
      iconName: 'records',
      badge: _statusLabel(_record.status),
      tier: 'hero'
    });
    summaryLead.appendChild(Components.contextKeyValueList([
      { key: 'Status', value: _statusLabel(_record.status) },
      { key: 'Items', value: String((_record.items || []).length) },
      { key: 'Issued', value: _record.dateIssued ? Utils.formatDate(_record.dateIssued) : 'Not set', empty: !_record.dateIssued }
    ]));
    _contextBody.appendChild(summaryLead);

    const statusCard = Components.contextCard({
      title: 'Status Tracking',
      iconName: 'check',
      tier: 'supporting'
    });
    statusCard.querySelector('.context-card-body').innerHTML = `
      <select class="sort-select" id="v-status-select" style="width:100%;height:38px;">
        ${MonitoringService.RECORD_STATUSES.map(s => `<option value="${s.value}" ${s.value === _record.status ? 'selected' : ''}>${s.label}</option>`).join('')}
      </select>
    `;
    statusCard.querySelector('#v-status-select').addEventListener('change', e => {
      _handleRecordStatusChange(e.target.value);
    });
    _contextBody.appendChild(statusCard);

    const healthCard = Components.contextCard({
      title: 'Health Audit',
      iconName: 'info',
      subtitle: `${health.issues.length} issue(s) detected in this record.`,
      tier: 'status'
    });
    const healthBody = healthCard.querySelector('.context-card-body');
    healthBody.appendChild(Components.contextList([{
      icon: Components.icon('check'),
      title: health.label,
      meta: 'Health score updates from schema completeness and data consistency checks.',
      trailing: `<span class="context-pill">${health.score}</span>`
    }], { compact: true }));
    if (health.issues.length) {
      healthBody.appendChild(Components.contextList(health.issues.slice(0, 3).map(issue => ({
        icon: Components.icon(issue.severity === 'critical' || issue.severity === 'high' ? 'alert' : 'info'),
        title: issue.message,
        meta: Utils.capitalise(issue.severity || 'info')
      })), { compact: true }));
    }
    _contextBody.appendChild(healthCard);

    const actionsCard = Components.contextCard({
      title: 'Quick Actions',
      iconName: 'edit',
      tier: 'action'
    });
    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-primary btn-sm';
    editBtn.innerHTML = `${Components.icon('records')}<span>Edit Slip Details</span>`;
    editBtn.addEventListener('click', _handleEdit);

    const printBtn = document.createElement('button');
    printBtn.className = 'btn btn-secondary btn-sm';
    printBtn.textContent = 'Print Official Slip';
    printBtn.addEventListener('click', () => {
      const container = document.createElement('div');
      _renderFormPreviewTab(container);
      PrintEngine.openPreview(container.innerHTML);
    });

    const verifyBtn = document.createElement('button');
    verifyBtn.className = 'btn btn-secondary btn-sm';
    verifyBtn.innerHTML = `${Components.icon('check')}<span>Mark as Verified</span>`;
    verifyBtn.addEventListener('click', () => _handleRecordStatusChange('verified'));

    const archiveBtn = document.createElement('button');
    archiveBtn.className = 'btn btn-secondary btn-sm';
    archiveBtn.textContent = isArchived ? 'Restore Active' : 'Archive Record';
    archiveBtn.addEventListener('click', isArchived ? _handleRestore : _handleArchive);

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-ghost btn-sm';
    cancelBtn.textContent = 'Cancel Record';
    cancelBtn.style.color = 'var(--color-danger)';
    cancelBtn.addEventListener('click', () => _handleRecordStatusChange('cancelled'));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-ghost btn-sm';
    deleteBtn.textContent = 'Delete Record';
    deleteBtn.style.color = 'var(--color-danger)';
    deleteBtn.addEventListener('click', _handleDelete);

    actionsCard.querySelector('.context-card-body').appendChild(
      Components.contextActionGroup([editBtn, printBtn, verifyBtn, archiveBtn, cancelBtn, deleteBtn])
    );
    _contextBody.appendChild(actionsCard);

    const relatedCard = Components.contextCard({
      title: `Related Slips (${related.length})`,
      iconName: 'link',
      subtitle: related.length ? 'Connected by recipient, office, or record relationships.' : 'No linked recipient or office slips found.',
      tier: 'supporting'
    });
    const relatedBody = relatedCard.querySelector('.context-card-body');
    if (related.length) {
      relatedBody.appendChild(Components.contextList(related.slice(0, 4).map(rel => ({
        clickable: true,
        icon: Components.icon('records'),
        title: rel.record.icsNumber || 'Draft',
        meta: rel.reasons.join(', '),
        trailing: `<span class="badge badge-${_statusVariant(rel.record.status)}" style="font-size:9px;padding:2px 6px;border-radius:999px;">${_statusLabel(rel.record.status)}</span>`,
        onClick: () => Router.navigate(`#view?id=${rel.record.id}`)
      })), { compact: true }));
    }
    _contextBody.appendChild(relatedCard);
  }

  /* ----------------------------------------------------------
     Helpers
     ---------------------------------------------------------- */
  function _statusVariant(s) {
    return { active: 'success', draft: 'warning', archived: 'neutral', cancelled: 'danger', verified: 'success', pending_verification: 'info' }[s] || 'neutral';
  }

  function _statusLabel(s) {
    return { pending_verification: 'Pending Verification' }[s] || Utils.capitalise(s || 'unknown');
  }

  /* ----------------------------------------------------------
     Key Events navigation handlers
     ---------------------------------------------------------- */
  function _setupKeyboard() {
    document.addEventListener('keydown', _keyHandler);
  }

  function _teardownKeyboard() {
    document.removeEventListener('keydown', _keyHandler);
  }

  function _keyHandler(e) {
    if (AppState.currentPage !== '#view') return;

    // Esc → Back to list
    if (e.key === 'Escape') {
      // Check if prompt or modal active
      const modal = document.getElementById('modal-overlay');
      if (modal && modal.classList.contains('modal-visible')) return;

      e.preventDefault();
      Router.navigate('#records');
    }

    // Left Arrow → Prev record
    if (e.key === 'ArrowLeft' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      _navigatePrev();
    }

    // Right Arrow → Next record
    if (e.key === 'ArrowRight' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      _navigateNext();
    }
  }

  /* ----------------------------------------------------------
     Page Life cycle Methods
     ---------------------------------------------------------- */
  function render(workspace, contextBody) {
    _contextBody = contextBody;
    _activeTab = 'details'; // reset tab

    // Setup listener
    _setupKeyboard();

    // Trigger loading record details
    _loadRecord();
  }

  function destroy() {
    _teardownKeyboard();
  }

  return { render, destroy };
})();
