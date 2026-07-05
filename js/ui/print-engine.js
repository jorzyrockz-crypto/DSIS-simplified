/**
 * ICS Tracking & Monitoring Tool
 * Phase 6: Reports, Printing & Data Management — Print Engine UI
 */
'use strict';

const PrintEngine = (() => {

  let _overlay = null;
  let _scale = 1.0;

  /**
   * Opens the print preview overlay with the specified A4 printable contents.
   * @param {string} printableHtml - The inner HTML to place in the A4 sheet frame.
   */
  function openPreview(printableHtml) {
    if (_overlay) _overlay.remove();

    _scale = 1.0;
    _overlay = document.createElement('div');
    _overlay.className = 'print-preview-backdrop';
    _overlay.innerHTML = `
      <div class="print-preview-dialog">
        <div class="print-preview-header">
          <h3 style="margin:0;font-size:var(--font-size-sm);font-weight:600;color:var(--color-text-primary)">
            Official Document Print Preview (A4 Layout)
          </h3>
          <div class="print-preview-actions">
            <button class="btn btn-secondary btn-sm" id="pv-zoom-out" title="Zoom Out">🔍−</button>
            <span style="font-size:var(--font-size-xs);color:var(--color-text-secondary);min-width:36px;text-align:center" id="pv-scale-lbl">100%</span>
            <button class="btn btn-secondary btn-sm" id="pv-zoom-in" title="Zoom In">🔍+</button>
            <div style="width:1px;height:20px;background:var(--color-border);margin:0 4px"></div>
            <button class="btn btn-secondary btn-sm" id="pv-fit-width">Fit Width</button>
            <button class="btn btn-secondary btn-sm" id="pv-fit-page">Fit Page</button>
            <div style="width:1px;height:20px;background:var(--color-border);margin:0 4px"></div>
            <button class="btn btn-primary btn-sm" id="pv-print">${Components.icon('download')} Print Document</button>
            <button class="btn btn-ghost btn-sm" id="pv-close" style="color:var(--color-danger)">Close</button>
          </div>
        </div>
        <div class="print-preview-viewport">
          <div class="print-preview-zoom-wrap" id="pv-sheet">
            ${printableHtml}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(_overlay);

    // Event listeners
    _overlay.querySelector('#pv-zoom-in').addEventListener('click', () => _adjustZoom(0.1));
    _overlay.querySelector('#pv-zoom-out').addEventListener('click', () => _adjustZoom(-0.1));
    _overlay.querySelector('#pv-fit-width').addEventListener('click', _fitWidth);
    _overlay.querySelector('#pv-fit-page').addEventListener('click', _fitPage);
    _overlay.querySelector('#pv-print').addEventListener('click', () => window.print());
    _overlay.querySelector('#pv-close').addEventListener('click', closePreview);

    // Handle Escape key to close
    document.addEventListener('keydown', _escHandler);

    _fitPage(); // Start with fit page by default
  }

  function closePreview() {
    if (_overlay) {
      _overlay.remove();
      _overlay = null;
    }
    document.removeEventListener('keydown', _escHandler);
  }

  function _escHandler(e) {
    if (e.key === 'Escape') {
      closePreview();
    }
  }

  function _adjustZoom(delta) {
    _scale = Math.max(0.4, Math.min(2.0, _scale + delta));
    _applyScale();
  }

  function _fitWidth() {
    const viewport = _overlay.querySelector('.print-preview-viewport');
    const width = viewport.clientWidth - 48; // padding margin offset
    _scale = width / 793.7; // 210mm in pixels at 96dpi (approx 793.7px)
    _applyScale();
  }

  function _fitPage() {
    const viewport = _overlay.querySelector('.print-preview-viewport');
    const height = viewport.clientHeight - 48;
    _scale = height / 1122.5; // 297mm in pixels at 96dpi (approx 1122.5px)
    _applyScale();
  }

  function _applyScale() {
    const sheet = _overlay.querySelector('#pv-sheet');
    const label = _overlay.querySelector('#pv-scale-lbl');
    if (sheet && label) {
      sheet.style.transform = `scale(${_scale})`;
      label.textContent = `${Math.round(_scale * 100)}%`;
    }
  }

  return { openPreview, closePreview };
})();
