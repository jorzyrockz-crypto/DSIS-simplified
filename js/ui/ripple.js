/**
 * Material Design Ripple Effect Implementation
 * Provides touch ripple feedback for interactive elements
 */

(function(global) {
  'use strict';
  
  const RIPPLE_CLASS = 'ripple';
  const RIPPLE_ACTIVE_CLASS = 'ripple--active';
  const RIPPLE_SELECTOR = '[data-ripple]';
  const RIPPLE_DURATION = 600; // ms
  
  function initRipples(root) {
    root = root || document;
    
    function createRipple(el, evt) {
      // Prevent multiple ripples
      if (el.__rippleInProgress) return;
      el.__rippleInProgress = true;
      
      const rect = el.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;
      const x = evt.clientX - rect.left - size / 2;
      const y = evt.clientY - rect.top - size / 2;
      
      const ripple = document.createElement('span');
      ripple.className = RIPPLE_CLASS;
      ripple.style.width = size + 'px';
      ripple.style.height = size + 'px';
      ripple.style.left = x + 'px';
      ripple.style.top = y + 'px';
      
      el.appendChild(ripple);
      
      // Trigger animation
      requestAnimationFrame(function() {
        ripple.classList.add(RIPPLE_ACTIVE_CLASS);
      });
      
      // Cleanup
      const cleanup = function() {
        ripple.classList.remove(RIPPLE_ACTIVE_CLASS);
        setTimeout(function() {
          try {
            ripple.remove();
          } catch (e) {
            // Silently fail if already removed
          }
          el.__rippleInProgress = false;
        }, RIPPLE_DURATION);
        
        el.removeEventListener('pointerup', cleanup);
        el.removeEventListener('pointercancel', cleanup);
        el.removeEventListener('pointerleave', cleanup);
      };
      
      el.addEventListener('pointerup', cleanup);
      el.addEventListener('pointercancel', cleanup);
      el.addEventListener('pointerleave', cleanup);
    }
    
    function bindRipple(el) {
      if (el.__rippleBound) return;
      el.__rippleBound = true;
      
      // Ensure proper positioning context
      const cs = getComputedStyle(el);
      if (cs.position === 'static' || !cs.position) {
        el.style.position = 'relative';
      }
      
      el.style.overflow = 'hidden';
      el.addEventListener('pointerdown', function(e) {
        createRipple(el, e);
      });
    }
    
    function initialize() {
      root.querySelectorAll(RIPPLE_SELECTOR).forEach(bindRipple);
    }
    
    // Watch for dynamically added elements
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.addedNodes.length) {
          mutation.addedNodes.forEach(function(node) {
            if (node.nodeType === 1) { // Element node
              if (node.matches(RIPPLE_SELECTOR)) {
                bindRipple(node);
              }
              node.querySelectorAll(RIPPLE_SELECTOR).forEach(bindRipple);
            }
          });
        }
      });
    });
    
    observer.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true
    });
    
    // Initial binding
    initialize();
  }
  
  // Export for module + global usage
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = initRipples;
  }
  if (typeof define === 'function' && define.amd) {
    define(function() { return initRipples; });
  }
  global.initRipples = initRipples;
})(typeof window !== 'undefined' ? window : global);
