/**
 * ICS Tracking & Monitoring Tool
 * Phase 2: ICS Database & Record Management — Modal & Toast UI
 */
'use strict';

const UIKit = (() => {

  /* ============================================================
     MODAL
     ============================================================ */
  let _modalOverlay = null;
  let _currentResolve = null;

  function _getOverlay() {
    if (!_modalOverlay) {
      _modalOverlay = document.createElement('div');
      _modalOverlay.id = 'modal-overlay';
      _modalOverlay.className = 'modal-overlay';
      _modalOverlay.setAttribute('role', 'presentation');
      document.body.appendChild(_modalOverlay);

      _modalOverlay.addEventListener('click', e => {
        if (e.target === _modalOverlay) _closeModal(null);
      });
    }
    return _modalOverlay;
  }

  function _closeModal(value) {
    const ov = _getOverlay();
    ov.classList.remove('modal-visible');
    ov.innerHTML = '';
    if (_currentResolve) { _currentResolve(value); _currentResolve = null; }
    document.removeEventListener('keydown', _escHandler);
  }

  function _escHandler(e) {
    if (e.key === 'Escape') _closeModal(null);
  }

  /**
   * Show a modal dialog.
   * @param {object} opts
   * @param {string}   opts.title
   * @param {string|HTMLElement} opts.body
   * @param {Array}    opts.actions  - [{ label, variant, value }]
   * @param {string}   opts.size     - 'sm' | 'md' | 'lg'
   * @returns {Promise<any>}   resolves with the clicked action's value
   */
  function modal({ title = '', body = '', actions = [], size = 'md' } = {}) {
    return new Promise(resolve => {
      _currentResolve = resolve;

      const ov = _getOverlay();
      ov.innerHTML = '';
      ov.classList.add('modal-visible');

      const dialog = document.createElement('div');
      dialog.className = `modal-dialog modal-${size}`;
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      dialog.setAttribute('aria-labelledby', 'modal-title-text');

      // Header
      const header = document.createElement('div');
      header.className = 'modal-header';
      header.innerHTML = `<h3 class="modal-title" id="modal-title-text">${Utils.escapeHtml(title)}</h3>`;

      const closeBtn = document.createElement('button');
      closeBtn.className = 'btn btn-ghost btn-icon btn-sm modal-close-btn';
      closeBtn.setAttribute('aria-label', 'Close dialog');
      closeBtn.innerHTML = Components.icon('close');
      closeBtn.addEventListener('click', () => _closeModal(null));
      header.appendChild(closeBtn);
      dialog.appendChild(header);

      // Body
      const bodyEl = document.createElement('div');
      bodyEl.className = 'modal-body';
      if (typeof body === 'string') bodyEl.innerHTML = body;
      else bodyEl.appendChild(body);
      dialog.appendChild(bodyEl);

      // Footer / Actions
      if (actions.length > 0) {
        const footer = document.createElement('div');
        footer.className = 'modal-footer';
        actions.forEach(action => {
          const btn = document.createElement('button');
          btn.className = `btn btn-${action.variant || 'secondary'}`;
          btn.textContent = action.label;
          btn.addEventListener('click', () => _closeModal(action.value));
          footer.appendChild(btn);
        });
        dialog.appendChild(footer);
      }

      ov.appendChild(dialog);

      // Focus first action button
      document.addEventListener('keydown', _escHandler);
      requestAnimationFrame(() => {
        const first = dialog.querySelector('.modal-footer .btn, .modal-close-btn');
        if (first) first.focus();
      });
    });
  }

  /** Shortcut: confirm dialog. Returns Promise<boolean>. */
  function confirm({
    title       = 'Confirm',
    message     = '',
    confirmText = 'Confirm',
    cancelText  = 'Cancel',
    variant     = 'danger',
  } = {}) {
    return modal({
      title,
      body: `<p class="modal-message">${Utils.escapeHtml(message)}</p>`,
      size: 'sm',
      actions: [
        { label: cancelText,  variant: 'secondary', value: false },
        { label: confirmText, variant,               value: true  },
      ],
    });
  }

  /* ============================================================
     TOAST
     ============================================================ */
  let _toastContainer = null;

  function _getToastContainer() {
    if (!_toastContainer) {
      _toastContainer = document.createElement('div');
      _toastContainer.id = 'toast-container';
      _toastContainer.className = 'toast-container';
      _toastContainer.setAttribute('aria-live', 'polite');
      _toastContainer.setAttribute('aria-atomic', 'false');
      document.body.appendChild(_toastContainer);
    }
    return _toastContainer;
  }

  /**
   * Show a toast notification.
   * @param {string} message
   * @param {'success'|'error'|'warning'|'info'} type
   * @param {number} duration  ms before auto-dismiss
   */
  function toast(message, type = 'success', duration = 3500) {
    const container = _getToastContainer();

    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.setAttribute('role', type === 'error' ? 'alert' : 'status');

    const iconMap = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    t.innerHTML = `
      <span class="toast-icon">${iconMap[type] || '•'}</span>
      <span class="toast-msg">${Utils.escapeHtml(message)}</span>
      <button class="toast-dismiss" aria-label="Dismiss">&times;</button>
    `;

    t.querySelector('.toast-dismiss').addEventListener('click', () => dismiss(t));
    container.appendChild(t);

    // Trigger animation next frame
    requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('toast-visible')));

    const timer = setTimeout(() => dismiss(t), duration);
    t._timer = timer;

    return t;
  }

  function dismiss(t) {
    if (!t || !t.parentNode) return;
    clearTimeout(t._timer);
    t.classList.remove('toast-visible');
    setTimeout(() => { if (t.parentNode) t.parentNode.removeChild(t); }, 300);
  }

  return { modal, confirm, toast };
})();
