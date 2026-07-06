@@
   function _getDevModeState() {
@@
   }
 
   function _setDevModeState(val) {
     localStorage.setItem('ics-dev-mode', String(val));
   }
+
+  // Material Theme helpers
+  function _getMaterialThemeState() {
+    try { return localStorage.getItem('ics-material-theme') === 'true'; } catch { return false; }
+  }
+
+  function _setMaterialThemeState(val) {
+    try { localStorage.setItem('ics-material-theme', String(val)); } catch {}
+  }
+
+  function _applyMaterialTheme(enabled) {
+    try { document.documentElement.classList.toggle('material-theme', !!enabled); } catch {}
+  }
@@
     container.appendChild(Components.contextCard({
       iconName: 'info',
       title:    'Production Environment',
       body:     'This tool compiles property custodian records offline. Backups are saved directly to your desktop Downloads folder.'
     }));
   }
@@
   function _renderDeveloperTab(container) {
@@
-    container.innerHTML = `
+    container.innerHTML = `
@@
-          <div style="background:var(--color-warning-light); color:var(--color-warning); padding:6px 12px; border-radius:var(--radius-md); font-size:12px; font-weight:600; border:1px solid var(--[...]
-            Staging Mode Active
-          </div>
+          <div style="background:var(--color-warning-light); color:var(--color-warning); padding:6px 12px; border-radius:var(--radius-md); font-size:12px; font-weight:600; border:1px solid var(--[...]
+            Staging Mode Active
+          </div>
+          <div style="margin-top:12px; display:flex; gap:12px; align-items:center">
+            <div style="flex:1">
+              <div style="font-weight:600">Material Theme (Developer preview)</div>
+              <div style="font-size:12px; color:var(--color-text-secondary)">Enable Material-like tokens, elevation and controls for visual testing.</div>
+            </div>
+            <div style="flex-shrink:0; display:flex; align-items:center; gap:8px">
+              <label style="display:flex; align-items:center; gap:8px; cursor:pointer">
+                <input type="checkbox" id="set-material-checkbox"${_getMaterialThemeState() ? ' checked' : ''}>
+                <span style="font-size:13px">Enable</span>
+              </label>
+            </div>
+          </div>
@@
-    container.querySelector('#btn-dev-populate').addEventListener('click', async () => {
+    // Ensure material theme is applied when rendering developer tab
+    _applyMaterialTheme(_getMaterialThemeState());
+
+    // Wire material checkbox
+    const matCheckbox = container.querySelector('#set-material-checkbox');
+    if (matCheckbox) {
+      matCheckbox.addEventListener('change', e => {
+        const enabled = !!e.target.checked;
+        _setMaterialThemeState(enabled);
+        _applyMaterialTheme(enabled);
+        UIKit.toast(`Material theme ${enabled ? 'enabled' : 'disabled'}.`, 'info');
+      });
+    }
+
+    container.querySelector('#btn-dev-populate').addEventListener('click', async () => {
@@
     container.querySelector('#btn-dev-wipe').addEventListener('click', async () => {
@@
   }
@@
   return { render, destroy };
 })();
