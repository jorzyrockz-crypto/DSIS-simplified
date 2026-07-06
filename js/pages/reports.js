/**
 * ICS Tracking & Monitoring Tool
 * Phase 6: Reports & Outputs Center
 */
'use strict';

const ReportsPage = (() => {

  let _allRecords = [];
  let _activeReport = 'ics-register'; // 'ics-register' | 'property-recipient' | 'inventory-summary' | 'eul-expired' | 'eul-approaching'
  let _activeView = 'table'; // 'table' | 'card'
  let _contextBody = null;

  // Filter values
  let _filters = {
    year: '',
    month: '',
    fundCluster: '',
    recipient: '',
    office: '',
    entity: '',
    status: 'all',
    quickQuery: '',
    showAdvSearch: false
  };

  /* ----------------------------------------------------------
     Context Panel
     ---------------------------------------------------------- */
  function renderContext(container) {
    container.innerHTML = '';
    _contextBody = container;

    const title = document.createElement('p');
    title.className = 'text-xs font-semibold text-secondary';
    title.style.cssText = 'text-transform:uppercase;letter-spacing:.07em;margin-bottom:12px;';
    title.textContent = 'Report Quick Actions';
    container.appendChild(title);

    const exportCsvBtn = document.createElement('button');
    exportCsvBtn.className = 'btn btn-secondary';
    exportCsvBtn.style.cssText = 'width:100%;justify-content:flex-start;margin-bottom:var(--space-2);';
    exportCsvBtn.innerHTML = `📄 Export to CSV Spreadsheet`;
    exportCsvBtn.addEventListener('click', _handleExportCSV);
    container.appendChild(exportCsvBtn);

    const exportXlsBtn = document.createElement('button');
    exportXlsBtn.className = 'btn btn-secondary';
    exportXlsBtn.style.cssText = 'width:100%;justify-content:flex-start;margin-bottom:var(--space-2);';
    exportXlsBtn.innerHTML = `📊 Export to Microsoft Excel`;
    exportXlsBtn.addEventListener('click', _handleExportExcel);
    container.appendChild(exportXlsBtn);

    const printBtn = document.createElement('button');
    printBtn.className = 'btn btn-primary';
    printBtn.style.cssText = 'width:100%;justify-content:flex-start;margin-bottom:var(--space-2);';
    printBtn.innerHTML = `🖨️ Launch Print Preview`;
    printBtn.addEventListener('click', _handlePrintPreview);
    container.appendChild(printBtn);

    const div = document.createElement('div');
    div.className = 'divider';
    container.appendChild(div);

    container.appendChild(Components.contextCard({
      iconName: 'info',
      title: 'Reporting Guidelines',
      body: 'All reports are generated instantly from the local database records. Exports are fully encoded in UTF-8 formats for compatibility with spreadsheets.'
    }));
  }

  /* ----------------------------------------------------------
     Loader & Filter sync
     ---------------------------------------------------------- */
  async function _loadRecordsAndRender(workspace) {
    try {
      _allRecords = await RecordService.getAllRecords();
      _renderWorkspace(workspace);
      if (_contextBody) renderContext(_contextBody);
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
  }

  function _renderWorkspace(workspace) {
    workspace.innerHTML = '';

    // Page Header
    const header = document.createElement('div');
    header.className = 'page-header';
    header.innerHTML = `
      <div>
        <h1 class="page-title">Reports & Analytics</h1>
        <p class="page-subtitle">Compile accountability indices, registers, and EUL lifecycle charts</p>
      </div>
      <div class="flex gap-2">
        <button class="btn btn-secondary btn-sm" id="btn-rep-table" ${_activeView === 'table' ? 'disabled' : ''}>Grid View</button>
        <button class="btn btn-secondary btn-sm" id="btn-rep-card" ${_activeView === 'card' ? 'disabled' : ''}>Cards View</button>
      </div>
    `;
    workspace.appendChild(header);

    // Categories tabs row
    const catsRow = document.createElement('div');
    catsRow.className = 'viewer-tabs';
    catsRow.style.marginBottom = 'var(--space-4)';
    
    const tabIcons = {
      "ics-register": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>',
      "property-recipient": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
      "inventory-summary": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>',
      "eul-expired": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
      "eul-approaching": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>'
    };

    const cats = [
      { key: 'ics-register',         label: 'ICS Slips Register' },
      { key: 'property-recipient',    label: 'Accountability per Recipient' },
      { key: 'inventory-summary',    label: 'Inventory Summary' },
      { key: 'eul-expired',          label: 'Expired Assets' },
      { key: 'eul-approaching',      label: 'Approaching EUL' }
    ];
    cats.forEach(c => {
      const btn = document.createElement('button');
      btn.className = `viewer-tab-btn ${c.key === _activeReport ? 'active' : ''}`;
      
      const iconHTML = tabIcons[c.key] || '';
      btn.innerHTML = `${iconHTML}<span>${c.label}</span>`;
      
      btn.addEventListener('click', () => {
        _activeReport = c.key;
        _renderWorkspace(workspace);
      });
      catsRow.appendChild(btn);
    });
    workspace.appendChild(catsRow);

    // 2. Create the compact filter bar
    const filterBar = document.createElement('div');
    filterBar.id = 'compact-filter-bar';
    filterBar.style.cssText = 'display:flex;align-items:center;gap:12px;margin-bottom:16px;padding:0px;background-color:transparent;border:none;';

    // Add a Filter Button that toggles the drawer or panel
    const filterToggle = document.createElement('button');
    filterToggle.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
      <span>Filter</span>
    `;
    filterToggle.className = `btn ${_filters.showAdvSearch ? 'btn-primary' : 'btn-secondary'} btn-sm`;
    filterToggle.style.cssText = 'display:flex;align-items:center;height:32px;font-size:13px;padding:0 12px;';

    // Add a quick search/filter input for the current view
    const inlineSearch = document.createElement('input');
    inlineSearch.type = 'text';
    inlineSearch.placeholder = 'Quick filter results...';
    inlineSearch.value = _filters.quickQuery || '';
    inlineSearch.style.cssText = 'flex:1;height:32px;padding:0 12px;border:1px solid var(--color-border);background-color:var(--color-surface);color:var(--color-text-primary);border-radius:6px;font-size:13px;outline:none;box-shadow:rgba(0, 0, 0, 0.05) 0px 1px 2px 0px;';
    inlineSearch.addEventListener('input', (e) => {
      _filters.quickQuery = e.target.value;
      _renderDataGrid(workspace);
    });

    filterBar.appendChild(filterToggle);
    filterBar.appendChild(inlineSearch);
    workspace.appendChild(filterBar);

    // Filters Panel
    const filterPanel = document.createElement('div');
    filterPanel.className = 'adv-search-panel active';
    filterPanel.style.cssText = `margin-bottom:var(--space-4); display:${_filters.showAdvSearch ? 'flex' : 'none'};`;
    
    // Build filter fields based on report type
    if (_activeReport === 'property-recipient') {
      filterPanel.innerHTML = `
        <div class="form-group">
          <label class="form-label">Recipient Name</label>
          <input class="form-control" id="rep-filt-recipient" placeholder="Type name (e.g. Juan)..." value="${_filters.recipient}">
        </div>
      `;
    } else if (_activeReport === 'ics-register') {
      filterPanel.innerHTML = `
        <div class="form-group"><label class="form-label">Year</label><input class="form-control" id="rep-filt-year" type="number" placeholder="2026" value="${_filters.year}"></div>
        <div class="form-group"><label class="form-label">Month</label><input class="form-control" id="rep-filt-month" type="number" placeholder="1-12" value="${_filters.month}"></div>
        <div class="form-group"><label class="form-label">Fund Cluster</label><input class="form-control" id="rep-filt-fund" placeholder="01" value="${_filters.fundCluster}"></div>
        <div class="form-group"><label class="form-label">Recipient</label><input class="form-control" id="rep-filt-recip" placeholder="Name" value="${_filters.recipient}"></div>
        <div class="form-group"><label class="form-label">Office</label><input class="form-control" id="rep-filt-office" placeholder="Office" value="${_filters.office}"></div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="sort-select" id="rep-filt-status" style="width:100%;height:38px;">
            <option value="all" ${_filters.status === 'all' ? 'selected' : ''}>All Statuses</option>
            <option value="active" ${_filters.status === 'active' ? 'selected' : ''}>Active</option>
            <option value="draft" ${_filters.status === 'draft' ? 'selected' : ''}>Draft</option>
            <option value="archived" ${_filters.status === 'archived' ? 'selected' : ''}>Archived</option>
            <option value="cancelled" ${_filters.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </div>
      `;
    } else {
      filterPanel.innerHTML = `<p style="font-size:var(--font-size-xs);color:var(--color-text-secondary);margin:0">Filters not required for this analytics dataset.</p>`;
    }

    workspace.appendChild(filterPanel);

    // Toggle event listener
    filterToggle.addEventListener('click', () => {
      _filters.showAdvSearch = !_filters.showAdvSearch;
      filterPanel.style.display = _filters.showAdvSearch ? 'flex' : 'none';
      filterToggle.classList.toggle('btn-primary', _filters.showAdvSearch);
      filterToggle.classList.toggle('btn-secondary', !_filters.showAdvSearch);
    });

    // Bind filters input triggers
    filterPanel.querySelectorAll('input, select').forEach(input => {
      input.addEventListener('input', e => {
        const id = e.target.id;
        if (id === 'rep-filt-recipient' || id === 'rep-filt-recip') _filters.recipient = e.target.value;
        if (id === 'rep-filt-year') _filters.year = e.target.value;
        if (id === 'rep-filt-month') _filters.month = e.target.value;
        if (id === 'rep-filt-fund') _filters.fundCluster = e.target.value;
        if (id === 'rep-filt-office') _filters.office = e.target.value;
        if (id === 'rep-filt-status') _filters.status = e.target.value;

        _renderDataGrid(workspace);
      });
    });

    // Content Display Wrap
    const contentWrap = document.createElement('div');
    contentWrap.id = 'report-content-grid';
    workspace.appendChild(contentWrap);

    // Wire view buttons
    workspace.querySelector('#btn-rep-table').addEventListener('click', () => {
      _activeView = 'table';
      _renderWorkspace(workspace);
    });
    workspace.querySelector('#btn-rep-card').addEventListener('click', () => {
      _activeView = 'card';
      _renderWorkspace(workspace);
    });

    _renderDataGrid(workspace);
  }

  function _renderDataGrid(workspace) {
    const grid = workspace.querySelector('#report-content-grid');
    if (!grid) return;
    grid.innerHTML = '';

    let data = _compileActiveReportData();

    if (_filters.quickQuery) {
      const q = _filters.quickQuery.trim().toLowerCase();
      data = {
        headers: data.headers,
        rows: data.rows.filter(row => 
          row.some(cell => String(cell).toLowerCase().includes(q))
        )
      };
    }

    if (data.rows.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">${Components.icon('search')}</div>
          <div class="empty-title">No matching report rows</div>
          <div class="empty-desc">Adjust your filters or add records to populate this sheet.</div>
        </div>
      `;
      return;
    }

    if (_activeView === 'table') {
      const tableWrap = document.createElement('div');
      tableWrap.className = 'items-table-wrap';
      tableWrap.innerHTML = `
        <table class="items-table">
          <thead>
            <tr>${data.headers.map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${data.rows.map(row => `
              <tr>
                ${row.map(cell => `<td>${Utils.escapeHtml(String(cell))}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      grid.appendChild(tableWrap);
    } else {
      // Card View
      const cardsGrid = document.createElement('div');
      cardsGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:var(--space-4);';

      data.rows.forEach(row => {
        const card = document.createElement('div');
        card.style.cssText = 'background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:var(--space-4);';
        
        let detailsHtml = '';
        data.headers.forEach((h, idx) => {
          detailsHtml += `
            <div class="detail-row" style="margin-bottom:4px">
              <span class="detail-key">${h}</span>
              <span class="detail-val" style="font-weight:600">${Utils.escapeHtml(String(row[idx]))}</span>
            </div>
          `;
        });

        card.innerHTML = `
          <div style="font-size:var(--font-size-xs)">
            ${detailsHtml}
          </div>
        `;
        cardsGrid.appendChild(card);
      });
      grid.appendChild(cardsGrid);
    }
  }

  /* ----------------------------------------------------------
     Compiler & Exporter Actions
     ---------------------------------------------------------- */
  function _compileActiveReportData() {
    switch (_activeReport) {
      case 'ics-register':
        return ReportEngine.generateICSRegister(_allRecords, _filters);
      case 'property-recipient':
        return ReportEngine.generatePropertyPerRecipient(_allRecords, _filters.recipient || 'Juan');
      case 'inventory-summary':
        return ReportEngine.generateInventorySummary(_allRecords);
      case 'eul-expired':
        return ReportEngine.generateEULReport(_allRecords, 'expired');
      case 'eul-approaching':
        return ReportEngine.generateEULReport(_allRecords, 'approaching');
    }
  }

  function _handleExportCSV() {
    const data = _compileActiveReportData();
    ExportService.exportToCSV(data.headers, data.rows, `${_activeReport}_export.csv`);
    UIKit.toast('CSV spreadsheet downloaded.', 'success');
  }

  function _handleExportExcel() {
    const data = _compileActiveReportData();
    ExportService.exportToExcel(data.headers, data.rows, 'ICS Report Summary', `${_activeReport}_export.xls`);
    UIKit.toast('Excel spreadsheet downloaded.', 'success');
  }

  function _handlePrintPreview() {
    const data = _compileActiveReportData();
    const settings = SettingsManager.get();

    const tableRows = data.rows.map(row => `
      <tr>
        ${row.map(cell => `<td style="border:1px solid #CBD5E1;padding:6px;font-size:10px">${Utils.escapeHtml(String(cell))}</td>`).join('')}
      </tr>
    `).join('');

    const previewHtml = `
      <div class="coa-preview-container" style="font-family:sans-serif;color:#000;">
        <div style="text-align:center;margin-bottom:var(--space-6)">
          <div style="font-weight:bold;font-size:14px">${settings.entityName}</div>
          <div style="font-size:12px">${settings.schoolName}</div>
          <div style="font-size:12px;color:#555">${settings.office}</div>
          <h2 style="margin-top:var(--space-4);font-size:16px;text-transform:uppercase">${_activeReport.replace('-', ' ')} Summary Report</h2>
          <div style="font-size:10px;color:#777">Printed on: ${new Date().toLocaleDateString()}</div>
        </div>

        <table style="width:100%;border-collapse:collapse;margin-top:var(--space-4)">
          <thead>
            <tr style="background:#F1F5F9">
              ${data.headers.map(h => `<th style="border:1px solid #CBD5E1;padding:6px;font-size:10px;text-align:left">${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <div style="margin-top:60px;display:flex;justify-content:space-between">
          <div>
            <div style="font-size:10px;color:#777">Prepared By:</div>
            <div style="font-weight:bold;margin-top:16px;font-size:12px">${settings.propertyCustodian}</div>
            <div style="font-size:10px;border-top:1px solid #000;margin-top:2px;width:180px">Supply Officer / Custodian</div>
          </div>
          <div>
            <div style="font-size:10px;color:#777">Noted By:</div>
            <div style="font-weight:bold;margin-top:16px;font-size:12px">School Principal</div>
            <div style="font-size:10px;border-top:1px solid #000;margin-top:2px;width:180px">Default Signatory / Approver</div>
          </div>
        </div>
      </div>
    `;

    PrintEngine.openPreview(previewHtml);
  }

  function destroy() {}

  return { render, destroy };
})();
