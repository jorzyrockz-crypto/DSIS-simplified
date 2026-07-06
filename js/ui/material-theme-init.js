/**
 * Material Design Theme Initialization
 * Restores user's material theme preference on app startup
 */

(function() {
  'use strict';
  
  function initMaterialTheme() {
    try {
      const materialThemeEnabled = localStorage.getItem('ics-material-theme') === 'true';
      const isDarkMode = localStorage.getItem('ics-theme') === 'dark';
      
      if (materialThemeEnabled) {
        document.documentElement.classList.add('material-theme');
        if (isDarkMode) {
          document.documentElement.classList.add('dark');
        }
        
        // Initialize ripple effects
        if (typeof initRipples === 'function') {
          initRipples();
        }
      }
    } catch (e) {
      console.warn('Material theme initialization failed:', e);
    }
  }
  
  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMaterialTheme);
  } else {
    initMaterialTheme();
  }
})();
