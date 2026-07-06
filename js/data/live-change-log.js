'use strict';

/*
  Live change log for in-progress workspace edits.
  Append new entries here during active development sessions so the
  Settings > Update Logs page can surface recent fixes immediately,
  without waiting for a formal version release.

  Helper command:
  node scripts/add-live-log.js --type "Fix" --text "Describe the change"

  Promotion command:
  node scripts/promote-live-log.js --version "1.2.2-stable"
*/
window.LIVE_CHANGE_LOG_DATA = [];
