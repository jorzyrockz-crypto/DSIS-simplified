/**
 * ICS Tracking & Monitoring Tool
 * Phase 2: ICS Database & Record Management — Utilities
 */
'use strict';

const Utils = (() => {

  /* ----------------------------------------------------------
     UUID v4 Generator
     ---------------------------------------------------------- */
  function uuid() {
    if (crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  /* ----------------------------------------------------------
     Date & Time Formatting
     ---------------------------------------------------------- */
  function formatDate(dateStr) {
    if (!dateStr) return '—';
    // Append time to avoid timezone shift on date-only strings
    const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatDateTime(isoString) {
    if (!isoString) return '—';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-PH', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  function formatRelativeTime(isoString) {
    if (!isoString) return '—';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '—';
    const diff  = Date.now() - d.getTime();
    const sec   = Math.floor(diff / 1000);
    const min   = Math.floor(sec / 60);
    const hr    = Math.floor(min / 60);
    const day   = Math.floor(hr / 24);
    if (sec < 60)  return 'just now';
    if (min < 60)  return `${min}m ago`;
    if (hr  < 24)  return `${hr}h ago`;
    if (day < 7)   return `${day}d ago`;
    return formatDate(isoString);
  }

  /* ----------------------------------------------------------
     Currency
     ---------------------------------------------------------- */
  function formatCurrency(amount) {
    const n = parseFloat(amount) || 0;
    return '₱\u202F' + n.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  /* ----------------------------------------------------------
     Function Control
     ---------------------------------------------------------- */
  function debounce(fn, delay = 300) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function throttle(fn, limit = 150) {
    let last = 0;
    return function (...args) {
      const now = Date.now();
      if (now - last >= limit) { last = now; fn.apply(this, args); }
    };
  }

  /* ----------------------------------------------------------
     String Helpers
     ---------------------------------------------------------- */
  function truncate(str, max = 50) {
    if (!str) return '';
    return str.length > max ? str.substring(0, max) + '\u2026' : str;
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function capitalise(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function initials(name) {
    if (!name) return '??';
    return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().substring(0, 2);
  }

  /* ----------------------------------------------------------
     Number Helpers
     ---------------------------------------------------------- */
  function parseNumber(val) {
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  }

  /* ----------------------------------------------------------
     Date Helpers
     ---------------------------------------------------------- */
  function today() {
    return new Date().toISOString().split('T')[0];
  }

  function currentYear() {
    return new Date().getFullYear();
  }

  function getYear(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d.getFullYear();
  }

  /* ----------------------------------------------------------
     ICS Number Helpers
     ---------------------------------------------------------- */
  function suggestICSNumber(year, sequence) {
    return `ICS-${year}-${String(sequence).padStart(3, '0')}`;
  }

  /* ----------------------------------------------------------
     DOM Helpers
     ---------------------------------------------------------- */
  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'class') node.className = v;
      else if (k === 'style' && typeof v === 'object') {
        Object.assign(node.style, v);
      } else if (k.startsWith('on') && typeof v === 'function') {
        node.addEventListener(k.slice(2).toLowerCase(), v);
      } else {
        node.setAttribute(k, v);
      }
    });
    children.flat().forEach(child => {
      if (child == null) return;
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return node;
  }

  return {
    uuid, formatDate, formatDateTime, formatRelativeTime,
    formatCurrency, debounce, throttle,
    truncate, escapeHtml, capitalise, initials, parseNumber,
    today, currentYear, getYear, suggestICSNumber,
    el,
  };
})();
