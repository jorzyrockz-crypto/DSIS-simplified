/**
 * ICS Tracking & Monitoring Tool
 * Phase 5: Smart Search, Filters, Notifications — Global Command Palette UI
 */
'use strict';

const CommandPalette = (() => {
  let _paletteEl = null;
  let _isOpen = false;
  let _records = [];
  let _commands = [];
  let _highlightedIdx = 0;

  function init() {
    _commands = [
      { type: 'cmd', label: 'Go to Dashboard',            hash: '#dashboard', icon: 'records' },
      { type: 'cmd', label: 'Go to ICS Records Browser',   hash: '#records',   icon: 'list'    },
      { type: 'cmd', label: 'Create New ICS Record',      hash: '#new',       icon: 'newics'  },
      { type: 'cmd', label: 'View Alert Notifications',   hash: '#notifications', icon: 'bell'},
      { type: 'cmd', label: 'Go to Settings',             hash: '#settings',  icon: 'settings'},
    ];

    document.addEventListener('keydown', e => {
      // Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggle();
      }
    });
  }

  async function open() {
    if (_isOpen) return;
    _isOpen = true;

    try {
      _records = await RecordService.getAllRecords();
    } catch {
      _records = [];
    }

    _renderOverlay();
    _renderResults('');
    _paletteEl.querySelector('#cp-input').focus();
  }

  function close() {
    if (!_isOpen) return;
    _isOpen = false;
    if (_paletteEl) {
      _paletteEl.remove();
      _paletteEl = null;
    }
  }

  function toggle() {
    if (_isOpen) close();
    else open();
  }

  function _renderOverlay() {
    if (_paletteEl) return;

    _paletteEl = document.createElement('div');
    _paletteEl.className = 'cp-backdrop';
    _paletteEl.innerHTML = `
      <div class="cp-container">
        <div class="cp-search-wrap">
          <span class="cp-search-icon">🔍</span>
          <input type="text" class="cp-input" id="cp-input" placeholder="Type a command or search records..." autocomplete="off">
        </div>
        <div class="cp-results" id="cp-results"></div>
        <div class="cp-footer">
          <span>↑↓ to navigate</span>
          <span>↵ to select</span>
          <span>esc to close</span>
        </div>
      </div>
    `;

    document.body.appendChild(_paletteEl);

    // Event listener
    _paletteEl.addEventListener('click', e => {
      if (e.target === _paletteEl) close();
    });

    const input = _paletteEl.querySelector('#cp-input');
    input.addEventListener('input', () => {
      _renderResults(input.value.trim());
    });

    input.addEventListener('keydown', _handleKeydown);
  }

  function _renderResults(query) {
    const resultsContainer = _paletteEl.querySelector('#cp-results');
    resultsContainer.innerHTML = '';

    const list = _getMergedResults(query);
    _highlightedIdx = 0;

    if (list.length === 0) {
      resultsContainer.innerHTML = `<div class="cp-empty-state">No matching commands or records found.</div>`;
      return;
    }

    list.forEach((item, idx) => {
      const el = document.createElement('div');
      el.className = `cp-item ${idx === _highlightedIdx ? 'highlighted' : ''}`;
      el.dataset.index = idx;

      let icon = '📄';
      if (item.type === 'cmd') icon = '⚡';
      if (item.type === 'recent') icon = '⏱';

      el.innerHTML = `
        <span class="cp-item-icon">${icon}</span>
        <div class="cp-item-info">
          <div class="cp-item-label">${Utils.escapeHtml(item.label)}</div>
          ${item.desc ? `<div class="cp-item-desc">${Utils.escapeHtml(item.desc)}</div>` : ''}
        </div>
      `;

      el.addEventListener('click', () => {
        _triggerItem(item);
      });

      resultsContainer.appendChild(el);
    });
  }

  function _getMergedResults(query) {
    const q = query.toLowerCase().trim();

    // 1. If empty, return standard commands + recent views
    if (!q) {
      const recents = RecentActivity.get('viewed').slice(0, 5).map(r => ({
        type: 'recent',
        label: r.icsNumber || '(Draft)',
        desc: `Recently viewed recipient: ${r.receivedBy}`,
        hash: `#view?id=${r.id}`
      }));
      return [..._commands, ...recents];
    }

    const matches = [];

    // Commands matching
    _commands.forEach(cmd => {
      if (cmd.label.toLowerCase().includes(q)) {
        matches.push(cmd);
      }
    });

    // Records matching
    _records.forEach(r => {
      const ics = (r.icsNumber || '').toLowerCase();
      const rec = (r.receivedBy || '').toLowerCase();
      if (ics.includes(q) || rec.includes(q)) {
        matches.push({
          type: 'record',
          label: r.icsNumber || '(Draft)',
          desc: `Recipient: ${r.receivedBy} | Office: ${r.office || '—'}`,
          hash: `#view?id=${r.id}`
        });
      }
    });

    return matches.slice(0, 10); // Limit to top 10 matches
  }

  function _handleKeydown(e) {
    const resultsContainer = _paletteEl.querySelector('#cp-results');
    const items = resultsContainer.querySelectorAll('.cp-item');
    if (items.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[_highlightedIdx].classList.remove('highlighted');
      _highlightedIdx = (_highlightedIdx + 1) % items.length;
      items[_highlightedIdx].classList.add('highlighted');
      items[_highlightedIdx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[_highlightedIdx].classList.remove('highlighted');
      _highlightedIdx = (_highlightedIdx - 1 + items.length) % items.length;
      items[_highlightedIdx].classList.add('highlighted');
      items[_highlightedIdx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const activeQuery = _paletteEl.querySelector('#cp-input').value.trim();
      const list = _getMergedResults(activeQuery);
      const chosen = list[_highlightedIdx];
      if (chosen) {
        _triggerItem(chosen);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  }

  function _triggerItem(item) {
    close();
    if (item.hash) {
      Router.navigate(item.hash);
    }
  }

  return { init, open, close, toggle };
})();
