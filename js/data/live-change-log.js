'use strict';

/*
  Live change log for in-progress workspace edits.
  Append new entries here during active development sessions so the
  Settings > Update Logs page can surface recent fixes immediately,
  without waiting for a formal version release.

  Helper command:
  node scripts/add-live-log.js --type "Fix" --text "Describe the change"
*/
window.LIVE_CHANGE_LOG_DATA = [
  {
    "version": "In Progress",
    "buildDate": "2026-07-07",
    "dateLabel": "July 7, 2026",
    "current": false,
    "live": true,
    "items": [
      {
        "type": "Fix",
        "text": "Unified sidebar, header, center panel, and right panel theme behavior so workspace surfaces respond consistently to the selected theme."
      },
      {
        "type": "Feature",
        "text": "Replaced the theme mode dropdown with a card-style Light and Dark selector to match the workspace background picker."
      },
      {
        "type": "UX Enhancement",
        "text": "Expanded workspace themes with distinct Office variants and calibrated them across light and dark mode."
      }
    ]
  }
];
