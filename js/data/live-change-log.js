'use strict';

/*
  Live change log for in-progress workspace edits.
  Append new entries here during active development sessions so the
  Settings > Update Logs page can surface recent fixes immediately,
  without waiting for a formal version release.

  Helper commands:
  node scripts/add-live-log.js --type "Fix" --text "Describe the change"
  node scripts/add-live-log.js --item "Fix: First change" --item "Feature: Second change"

  Promotion command:
  node scripts/promote-live-log.js --version "1.2.2-stable"
*/
window.LIVE_CHANGE_LOG_DATA = [
  {
    "version": "In Progress",
    "buildDate": "2026-07-08",
    "dateLabel": "July 9, 2026",
    "current": false,
    "live": true,
    "items": [
      {
        "type": "UX Enhancement",
        "text": "Added experimental full-width top navigation and v2 header styling toggles."
      },
      {
        "type": "UX Enhancement",
        "text": "Added an experimental Dashboard Landing Page v2 with a calmer landing layout and focus summary."
      },
      {
        "type": "Feature",
        "text": "Added persistent project notes for product and UI design decisions."
      },
      {
        "type": "Fix",
        "text": "Stopped demo data from loading automatically on app startup so sample data is only loaded from Developer database operations."
      }
    ]
  },
  {
    "version": "In Progress",
    "buildDate": "2026-07-07",
    "dateLabel": "July 8, 2026",
    "current": false,
    "live": true,
    "items": [
      {
        "type": "UX Enhancement",
        "text": "Redesigned ICS Records into denser workspace-style list and grid cards with clearer hierarchy and flatter utility treatment."
      },
      {
        "type": "Feature",
        "text": "Added visible View, Edit, and Print actions directly inside Records cards while moving secondary actions into overflow menus."
      },
      {
        "type": "Fix",
        "text": "Aligned Records list rows more closely to the reference pattern by reducing detached utility blocks and tightening the modified-time action rail."
      },
      {
        "type": "Fix",
        "text": "Hardened the live changelog helper with file locking so concurrent writes do not drop entries."
      },
      {
        "type": "Feature",
        "text": "Added batch item support so one command can append multiple changelog updates at once."
      },
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
