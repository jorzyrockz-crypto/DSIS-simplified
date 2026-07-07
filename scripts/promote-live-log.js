'use strict';

const {
  formatDateLabel,
  readLiveLog,
  readReleaseNotes,
  withFileLock,
  writeLiveLog,
  writeReleaseNotes
} = require('./lib/changelog-io');

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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const now = new Date();
  const buildDate = args.buildDate || now.toISOString().slice(0, 10);
  const dateLabel = args.dateLabel || formatDateLabel(now);

  await withFileLock('release-notes', async () => {
    const liveLog = readLiveLog();
    const releaseNotes = readReleaseNotes();

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

    writeReleaseNotes(releaseNotes);
    writeLiveLog([]);

    console.log(`Promoted ${items.length} live changelog item(s) into release ${args.version.trim()}.`);
  });
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
