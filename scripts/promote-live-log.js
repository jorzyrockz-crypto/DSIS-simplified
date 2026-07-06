'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const repoRoot = path.resolve(__dirname, '..');
const liveLogPath = path.join(repoRoot, 'js', 'data', 'live-change-log.js');
const releaseNotesPath = path.join(repoRoot, 'js', 'data', 'release-notes.js');

function parseArgs(argv) {
  const args = {
    version: '',
    buildDate: null,
    dateLabel: null
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--version' && argv[i + 1]) {
      args.version = argv[++i];
      continue;
    }

    if (arg === '--build-date' && argv[i + 1]) {
      args.buildDate = argv[++i];
      continue;
    }

    if (arg === '--date' && argv[i + 1]) {
      args.dateLabel = argv[++i];
      continue;
    }
  }

  if (!args.version.trim()) {
    throw new Error('Missing required --version "1.2.2-stable"');
  }

  return args;
}

function loadArrayAssignment(fileText, variableName) {
  const pattern = new RegExp(`${variableName}\\s*=\\s*(\\[[\\s\\S]*\\]);`);
  const match = fileText.match(pattern);
  if (!match) {
    throw new Error(`Could not find ${variableName} array assignment.`);
  }

  return vm.runInNewContext(match[1], {});
}

function formatDateLabel(date) {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

function buildReleaseNotesOutput(data) {
  return `'use strict';\n\nwindow.RELEASE_NOTES_DATA = ${JSON.stringify(data, null, 2)};\n`;
}

function buildLiveLogOutput(data) {
  return `'use strict';\n\n/*\n  Live change log for in-progress workspace edits.\n  Append new entries here during active development sessions so the\n  Settings > Update Logs page can surface recent fixes immediately,\n  without waiting for a formal version release.\n\n  Helper command:\n  node scripts/add-live-log.js --type "Fix" --text "Describe the change"\n\n  Promotion command:\n  node scripts/promote-live-log.js --version "1.2.2-stable"\n*/\nwindow.LIVE_CHANGE_LOG_DATA = ${JSON.stringify(data, null, 2)};\n`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const now = new Date();
  const buildDate = args.buildDate || now.toISOString().slice(0, 10);
  const dateLabel = args.dateLabel || formatDateLabel(now);

  const liveLogText = fs.readFileSync(liveLogPath, 'utf8');
  const releaseNotesText = fs.readFileSync(releaseNotesPath, 'utf8');

  const liveLog = loadArrayAssignment(liveLogText, 'window\\.LIVE_CHANGE_LOG_DATA');
  const releaseNotes = loadArrayAssignment(releaseNotesText, 'window\\.RELEASE_NOTES_DATA');

  const liveEntries = liveLog.filter(entry => entry && entry.live === true);
  if (!liveEntries.length) {
    throw new Error('No live changelog entries found to promote.');
  }

  const items = [];
  liveEntries.forEach(entry => {
    if (Array.isArray(entry.items)) {
      entry.items.forEach(item => items.push(item));
    }
  });

  if (!items.length) {
    throw new Error('Live changelog exists, but it has no items to promote.');
  }

  releaseNotes.forEach(entry => {
    entry.current = false;
  });

  releaseNotes.unshift({
    version: args.version.trim(),
    buildDate,
    dateLabel,
    current: true,
    items
  });

  fs.writeFileSync(releaseNotesPath, buildReleaseNotesOutput(releaseNotes), 'utf8');
  fs.writeFileSync(liveLogPath, buildLiveLogOutput([]), 'utf8');

  console.log(`Promoted ${items.length} live changelog item(s) into release ${args.version.trim()}.`);
}

main();
