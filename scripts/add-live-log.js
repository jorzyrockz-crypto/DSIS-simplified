'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const repoRoot = path.resolve(__dirname, '..');
const liveLogPath = path.join(repoRoot, 'js', 'data', 'live-change-log.js');

function parseArgs(argv) {
  const args = {
    type: 'Feature',
    text: '',
    version: 'In Progress',
    dateLabel: null,
    buildDate: null
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--type' && argv[i + 1]) {
      args.type = argv[++i];
      continue;
    }

    if (arg === '--text' && argv[i + 1]) {
      args.text = argv[++i];
      continue;
    }

    if (arg === '--version' && argv[i + 1]) {
      args.version = argv[++i];
      continue;
    }

    if (arg === '--date' && argv[i + 1]) {
      args.dateLabel = argv[++i];
      continue;
    }

    if (arg === '--build-date' && argv[i + 1]) {
      args.buildDate = argv[++i];
      continue;
    }
  }

  if (!args.text.trim()) {
    throw new Error('Missing required --text "Change description"');
  }

  return args;
}

function loadLiveLogData(fileText) {
  const match = fileText.match(/window\.LIVE_CHANGE_LOG_DATA\s*=\s*(\[[\s\S]*\]);/);
  if (!match) {
    throw new Error('Could not find LIVE_CHANGE_LOG_DATA array in live-change-log.js');
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

function buildOutput(data) {
  return `'use strict';\n\n/*\n  Live change log for in-progress workspace edits.\n  Append new entries here during active development sessions so the\n  Settings > Update Logs page can surface recent fixes immediately,\n  without waiting for a formal version release.\n\n  Helper command:\n  node scripts/add-live-log.js --type "Fix" --text "Describe the change"\n*/\nwindow.LIVE_CHANGE_LOG_DATA = ${JSON.stringify(data, null, 2)};\n`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const now = new Date();
  const buildDate = args.buildDate || now.toISOString().slice(0, 10);
  const dateLabel = args.dateLabel || formatDateLabel(now);

  const fileText = fs.readFileSync(liveLogPath, 'utf8');
  const data = loadLiveLogData(fileText);

  const liveEntry = data.find(entry =>
    entry &&
    entry.live === true &&
    entry.version === args.version &&
    entry.buildDate === buildDate
  );

  const newItem = {
    type: args.type,
    text: args.text.trim()
  };

  if (liveEntry) {
    liveEntry.items.unshift(newItem);
    liveEntry.dateLabel = dateLabel;
  } else {
    data.unshift({
      version: args.version,
      buildDate,
      dateLabel,
      current: false,
      live: true,
      items: [newItem]
    });
  }

  fs.writeFileSync(liveLogPath, buildOutput(data), 'utf8');
  console.log(`Added live changelog entry: [${args.type}] ${args.text.trim()}`);
}

main();
