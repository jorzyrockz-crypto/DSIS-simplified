/**
 * ICS Tracking & Monitoring Tool
 * Phase 1: Core Layout — UI Components
 *
 * Reusable component factory functions.
 * Each function returns an HTML string or DOM element.
 */

'use strict';

const Components = (() => {

  // ── SVG Icon Library ────────────────────────────────────────────────────
  // Small inline SVG set to avoid external dependencies (offline-first)
  const ICONS = {
    dashboard:     `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
    records:       `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
    newics:        `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`,
    notifications: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
    reports:       `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    settings:      `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>`,
    chevronLeft:   `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`,
    chevronRight:  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
    search:        `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    bell:          `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
    menu:          `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
    close:         `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    moreH:         `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>`,
    info:          `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    check:         `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    arrowUp:       `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>`,
    package:       `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
    alert:         `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    user:          `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    grid:          `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
    list:          `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
    filter:        `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>`,
    panelRight:    `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="15" y1="3" x2="15" y2="21"/></svg>`,
    wifi:          `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>`,
    wifiOff:       `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a11 11 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.56 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 16 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>`,
    star:          `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    box:           `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`,
    calendar:      `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    clock:         `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    cpu:           `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>`,
    moon:          `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
    palette:       `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8z"/></svg>`,
    link:          `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
    download:      `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    edit:          `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
    copy:          `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  };

  // ── Icon helper ──────────────────────────────────────────────────────────
  function icon(name) {
    return ICONS[name] || '';
  }

  // ── Search Box ───────────────────────────────────────────────────────────
  function searchBox({ id = 'global-search', placeholder = 'Search…', label = 'Search' } = {}) {
    const el = document.createElement('div');
    el.className = 'search-box';
    el.innerHTML = `
      <span class="search-icon">${icon('search')}</span>
      <input
        type="search"
        id="${id}"
        placeholder="${placeholder}"
        aria-label="${label}"
        autocomplete="off"
      />
      <span class="search-shortcut">⌘K</span>
    `;
    return el;
  }

  // ── Badge ────────────────────────────────────────────────────────────────
  function badge(text, variant = 'primary') {
    const span = document.createElement('span');
    span.className = `badge badge-${variant}`;
    span.textContent = text;
    return span;
  }

  // ── Button ───────────────────────────────────────────────────────────────
  function button({ text = '', variant = 'primary', size = '', iconName = '', id = '', attrs = {} } = {}) {
    const btn = document.createElement('button');
    btn.className = `btn btn-${variant}${size ? ' btn-' + size : ''}`;
    if (id) btn.id = id;
    Object.entries(attrs).forEach(([k, v]) => btn.setAttribute(k, v));
    btn.innerHTML = `${iconName ? icon(iconName) : ''}<span>${text}</span>`;
    return btn;
  }

  // ── Stat Card ────────────────────────────────────────────────────────────
  function statCard({ label, value, variant = 'primary', iconName = 'package', change = null } = {}) {
    const card = document.createElement('div');
    card.className = `stat-card ${variant}`;
    const changeHtml = change
      ? `<div class="stat-change up">${icon('arrowUp')} ${change}</div>`
      : '';
    card.innerHTML = `
      <div class="stat-icon">${icon(iconName)}</div>
      <div class="stat-info">
        <div class="stat-value">${value}</div>
        <div class="stat-label">${label}</div>
      </div>
      ${changeHtml}
    `;
    return card;
  }

  // ── Card ─────────────────────────────────────────────────────────────────
  function card({ title = '', subtitle = '', content = '', actions = '', interactive = false } = {}) {
    const el = document.createElement('div');
    el.className = `card${interactive ? ' interactive' : ''}`;
    el.innerHTML = `
      ${title ? `<div class="card-header">
        <div>
          <div class="card-title">${title}</div>
          ${subtitle ? `<div class="card-subtitle">${subtitle}</div>` : ''}
        </div>
        ${actions ? `<div class="card-actions">${actions}</div>` : ''}
      </div>` : ''}
      <div class="card-body">${content}</div>
    `;
    return el;
  }

  // ── Empty State ───────────────────────────────────────────────────────────
  function emptyState({ iconName = 'package', title = 'Nothing here yet', desc = '' } = {}) {
    const el = document.createElement('div');
    el.className = 'empty-state';
    el.innerHTML = `
      <div class="empty-icon">${icon(iconName)}</div>
      <div class="empty-title">${title}</div>
      ${desc ? `<div class="empty-desc">${desc}</div>` : ''}
    `;
    return el;
  }

  // ── Section Title ─────────────────────────────────────────────────────────
  function sectionTitle(text, subtitle = '') {
    const el = document.createElement('div');
    el.className = 'section-title';
    el.innerHTML = `
      <span>${text}</span>
      ${subtitle ? `<div class="section-subtitle">${subtitle}</div>` : ''}
    `;
    return el;
  }

  // ── Context Card (right panel) ────────────────────────────────────────────
  function contextCard({ title = '', body = '', iconName = '' } = {}) {
    const el = document.createElement('div');
    el.className = 'context-card';
    el.innerHTML = `
      <div class="context-card-title">
        ${iconName ? icon(iconName) : ''}
        ${title}
      </div>
      <div class="context-card-body">${body}</div>
    `;
    return el;
  }

  // ── ICS Record Card ───────────────────────────────────────────────────────
  function recordCard({ id = '', recipient = '', itemCount = 0, issuedDate = '', status = 'active' } = {}) {
    const el = document.createElement('div');
    el.className = 'record-card';
    const initials = recipient.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    const variantMap = { active: 'success', archived: 'neutral', pending: 'warning' };
    el.innerHTML = `
      <div class="record-avatar">${initials}</div>
      <div class="record-meta">
        <div class="record-id">${id}</div>
        <div class="record-name">${recipient}</div>
        <div class="record-footer">
          <span class="record-items">
            ${icon('box')}
            ${itemCount} Item${itemCount !== 1 ? 's' : ''}
          </span>
          <span class="text-xs text-tertiary">
            ${icon('calendar')} Issued ${issuedDate}
          </span>
        </div>
      </div>
      <span class="badge badge-${variantMap[status] || 'neutral'}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
    `;
    return el;
  }

  // ── Notification Card ──────────────────────────────────────────────────────
  function notifCard({ title = '', desc = '', type = 'info', time = '' } = {}) {
    const el = document.createElement('div');
    el.className = 'notif-card';
    const dotClass = { danger: 'danger', warning: 'warning', info: 'info', success: 'success' }[type] || 'info';
    el.innerHTML = `
      <div class="notif-dot ${dotClass}"></div>
      <div class="notif-content">
        <div class="notif-title">${title}</div>
        <div class="notif-desc">${desc}</div>
        <div class="notif-meta">
          ${icon('clock')}
          <span>${time}</span>
        </div>
      </div>
    `;
    return el;
  }

  // ── Report Card ────────────────────────────────────────────────────────────
  function reportCard({ title = '', desc = '', emoji = '📄', iconBg = '#EFF6FF' } = {}) {
    const el = document.createElement('div');
    el.className = 'report-card';
    el.innerHTML = `
      <div class="report-icon" style="background:${iconBg}">${emoji}</div>
      <div class="report-info">
        <div class="report-title">${title}</div>
        <div class="report-desc">${desc}</div>
      </div>
      <button class="btn btn-secondary btn-sm" aria-label="View ${title}">View</button>
    `;
    return el;
  }

  // ── Wizard Step ────────────────────────────────────────────────────────────
  function wizardStep({ stepNum = 1, label = '', desc = '', state = 'inactive' } = {}) {
    const el = document.createElement('div');
    el.className = `wizard-step ${state}`;
    const checkHtml = state === 'completed' ? icon('check') : stepNum;
    el.innerHTML = `
      <div class="step-num">${checkHtml}</div>
      <div class="step-info">
        <div class="step-label">${label}</div>
        ${desc ? `<div class="step-desc">${desc}</div>` : ''}
      </div>
    `;
    return el;
  }

  // ── Toggle (settings) ─────────────────────────────────────────────────────
  function toggle({ id, checked = false } = {}) {
    const label = document.createElement('label');
    label.className = 'toggle';
    label.setAttribute('for', id);
    label.innerHTML = `
      <input type="checkbox" id="${id}" ${checked ? 'checked' : ''}>
      <div class="toggle-track"></div>
    `;
    return label;
  }

  // ── Chip Group ─────────────────────────────────────────────────────────────
  function chipGroup(chips = []) {
    const el = document.createElement('div');
    el.className = 'chip-group';
    chips.forEach(({ label, active = false, id = '' }, i) => {
      const chip = document.createElement('button');
      chip.className = `chip${active ? ' active' : ''}`;
      chip.textContent = label;
      if (id) chip.id = id;
      chip.addEventListener('click', () => {
        el.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      });
      el.appendChild(chip);
    });
    return el;
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  return {
    icon,
    searchBox,
    badge,
    button,
    statCard,
    card,
    emptyState,
    sectionTitle,
    contextCard,
    recordCard,
    notifCard,
    reportCard,
    wizardStep,
    toggle,
    chipGroup,
    ICONS,
  };
})();
