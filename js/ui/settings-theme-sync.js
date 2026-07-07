(function(){
  'use strict';

  // Sync Settings Appearance theme thumbnails with current SettingsManager.bgTheme
  function syncThumbs() {
    try {
      if (typeof SettingsManager === 'undefined') return;
      const s = SettingsManager.get();
      const liveTheme = document.documentElement.getAttribute('data-workspace-theme');
      const selected = liveTheme || ((s && s.bgTheme) ? s.bgTheme : 'default');

      document.querySelectorAll('.theme-thumb').forEach(t => {
        const id = t.getAttribute('data-theme-id');
        const preview = t.querySelector(`#theme-preview-${id}`);
        const isSel = id === selected;
        t.classList.toggle('active', isSel);
        if (preview) {
          preview.style.border = isSel ? '2px solid var(--color-primary)' : '2px solid transparent';
        }
      });
    } catch (e) {
      // no-op
    }
  }

  // Run after navigation to #settings (gives the settings page time to render)
  window.addEventListener('hashchange', () => {
    if (location.hash === '#settings') setTimeout(syncThumbs, 80);
  });

  // Run on initial load if already on settings
  if (location.hash === '#settings') setTimeout(syncThumbs, 80);

  // Observe DOM additions and sync when theme-thumb elements appear
  const observer = new MutationObserver((mutations) => {
    if (document.querySelector('.settings-content .theme-thumb')) {
      // debounce briefly
      setTimeout(syncThumbs, 40);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Expose API for manual sync
  window.syncSettingsThemeThumbs = syncThumbs;
})();
