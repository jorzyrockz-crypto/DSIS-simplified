# Changelog & Documentation Rule

**Trigger:** Whenever you implement a new feature, fix a bug, or make significant UI/UX enhancements in this workspace.

**Behavior:**
1. **Update Logs (Changelog):** You MUST automatically open `js/pages/settings.js` and modify `_renderUpdateLogsTab()`. Add a bullet point to the current version's timeline detailing your change. Use the format `<li><strong>[Type of Change]:</strong> [Description]</li>`. Example types: `Feature`, `Fix`, `Major Update`, `UX Enhancement`.
2. **Version Bump:** If you are the first one making a change on a new day or doing a large batch of changes, you MUST manually update the `APP_VERSION` and `BUILD_DATE` constants at the top of `js/pages/settings.js`, and align the version header in `_renderUpdateLogsTab()` to match.
3. **Help Center:** If your change introduces a new module, a new user workflow, or modifies how an existing feature works, you MUST automatically open `js/pages/settings.js` and add or update a help accordion in `_renderHelpTab()` explaining how the user should interact with the new flow.
