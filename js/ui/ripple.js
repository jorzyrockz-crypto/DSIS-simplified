// Minimal Material-like ripple helper (UMD-friendly)
(function(global){
  function initRipples(root) {
    root = root || document;
    const selector = '[data-ripple]';

    function createRipple(el, evt) {
      const rect = el.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      const size = Math.max(rect.width, rect.height) * 1.6;
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (evt.clientX - rect.left - size/2) + 'px';
      ripple.style.top = (evt.clientY - rect.top - size/2) + 'px';
      el.appendChild(ripple);
      requestAnimationFrame(function(){ ripple.classList.add('ripple--active'); });
      var cleanup = function(){
        ripple.classList.remove('ripple--active');
        setTimeout(function(){ try{ ripple.remove(); }catch(_){} }, 420);
        el.removeEventListener('pointerup', cleanup);
        el.removeEventListener('pointercancel', cleanup);
      };
      el.addEventListener('pointerup', cleanup);
      el.addEventListener('pointercancel', cleanup);
    }

    function bind(el) {
      if (el.__rippleBound) return;
      el.__rippleBound = true;
      var cs = getComputedStyle(el);
      if (cs.position === 'static' || !cs.position) {
        el.style.position = 'relative';
      }
      el.style.overflow = 'hidden';
      el.addEventListener('pointerdown', function(e){ createRipple(el, e); });
    }

    function initialize() {
      root.querySelectorAll(selector).forEach(bind);
    }

    var mo = new MutationObserver(initialize);
    mo.observe(document.documentElement || document.body, { childList: true, subtree: true });
    initialize();
  }

  // Export for module + global usage
  if (typeof module !== 'undefined' && module.exports) module.exports = initRipples;
  if (typeof define === 'function' && define.amd) define(function(){ return initRipples; });
  global.initRipples = initRipples;
})(this);