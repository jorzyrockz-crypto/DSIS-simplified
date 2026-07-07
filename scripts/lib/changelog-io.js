'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const repoRoot = path.resolve(__dirname, '..', '..');
const liveLogPath = path.join(repoRoot, 'js', 'data', 'live-change-log.js');
const releaseNotesPath = path.join(repoRoot, 'js', 'data', 'release-notes.js');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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

function buildLiveLogOutput(data) {
  return `'use strict';\n\n/*\n  Live change log for in-progress workspace edits.\n  Append new entries here during active development sessions so the\n  Settings > Update Logs page can surface recent fixes immediately,\n  without waiting for a formal version release.\n\n  Helper commands:\n  node scripts/add-live-log.js --type "Fix" --text "Describe the change"\n  node scripts/add-live-log.js --item "Fix: First change" --item "Feature: Second change"\n\n  Promotion command:\n  node scripts/promote-live-log.js --version "1.2.2-stable"\n*/\nwindow.LIVE_CHANGE_LOG_DATA = ${JSON.stringify(data, null, 2)};\n`;
}

function buildReleaseNotesOutput(data) {
  return `'use strict';\n\nwindow.RELEASE_NOTES_DATA = ${JSON.stringify(data, null, 2)};\n`;
}

function readLiveLog() {
  const fileText = fs.readFileSync(liveLogPath, 'utf8');
  return loadArrayAssignment(fileText, 'window\\.LIVE_CHANGE_LOG_DATA');
}

function writeLiveLog(data) {
  fs.writeFileSync(liveLogPath, buildLiveLogOutput(data), 'utf8');
}

function readReleaseNotes() {
  const fileText = fs.readFileSync(releaseNotesPath, 'utf8');
  return loadArrayAssignment(fileText, 'window\\.RELEASE_NOTES_DATA');
}

function writeReleaseNotes(data) {
  fs.writeFileSync(releaseNotesPath, buildReleaseNotesOutput(data), 'utf8');
}

async function withFileLock(lockName, work, options = {}) {
  const attempts = options.attempts || 40;
  const retryMs = options.retryMs || 150;
  const lockPath = path.join(repoRoot, `${lockName}.lock`);

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let handle;
    try {
      handle = fs.openSync(lockPath, 'wx');
      fs.writeFileSync(handle, `${process.pid}`);
      try {
        return await work();
      } finally {
        fs.closeSync(handle);
        fs.unlinkSync(lockPath);
      }
    } catch (error) {
      if (handle) {
        try { fs.closeSync(handle); } catch {}
      }
      if (error && error.code !== 'EEXIST') {
        throw error;
      }
      if (attempt === attempts) {
        throw new Error(`Timed out waiting for changelog lock: ${lockName}`);
      }
      await sleep(retryMs);
    }
  }
}

function appendLiveLogItems(data, { version, buildDate, dateLabel, items }) {
  const liveEntry = data.find(entry =>
    entry &&
    entry.live === true &&
    entry.version === version &&
    entry.buildDate === buildDate
  );

  if (liveEntry) {
    liveEntry.items = Array.isArray(liveEntry.items) ? liveEntry.items : [];
    liveEntry.items.unshift(...items);
    liveEntry.dateLabel = dateLabel;
    return data;
  }

  data.unshift({
    version,
    buildDate,
    dateLabel,
    current: false,
    live: true,
    items: [...items]
  });

  return data;
}

module.exports = {
  formatDateLabel,
  liveLogPath,
  releaseNotesPath,
  readLiveLog,
  writeLiveLog,
  readReleaseNotes,
  writeReleaseNotes,
  withFileLock,
  appendLiveLogItems,
  buildLiveLogOutput,
  buildReleaseNotesOutput
};
