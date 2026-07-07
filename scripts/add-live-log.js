'use strict';

const {
  appendLiveLogItems,
  formatDateLabel,
  readLiveLog,
  withFileLock,
  writeLiveLog
} = require('./lib/changelog-io');

function parseArgs(argv) {
  const args = {
    type: 'Feature',
    text: '',
    version: 'In Progress',
    dateLabel: null,
    buildDate: null,
    items: []
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

    if (arg === '--item' && argv[i + 1]) {
      args.items.push(argv[++i]);
      continue;
    }
  }

  if (!args.items.length && !args.text.trim()) {
    throw new Error('Missing changelog entry. Use --text "Change description" or one or more --item "Type: Change description" arguments.');
  }

  return args;
}

function parseItems(args) {
  const items = [];

  if (args.text.trim()) {
    items.push({
      type: args.type,
      text: args.text.trim()
    });
  }

  args.items.forEach(rawItem => {
    const trimmed = rawItem.trim();
    if (!trimmed) return;

    const separatorIndex = trimmed.indexOf(':');
    if (separatorIndex === -1) {
      items.push({ type: args.type, text: trimmed });
      return;
    }

    const type = trimmed.slice(0, separatorIndex).trim() || args.type;
    const text = trimmed.slice(separatorIndex + 1).trim();
    if (!text) {
      throw new Error(`Invalid --item value "${rawItem}". Use "Type: Description".`);
    }

    items.push({ type, text });
  });

  if (!items.length) {
    throw new Error('No valid changelog items were parsed.');
  }

  return items;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const now = new Date();
  const buildDate = args.buildDate || now.toISOString().slice(0, 10);
  const dateLabel = args.dateLabel || formatDateLabel(now);
  const items = parseItems(args);

  await withFileLock('live-change-log', async () => {
    const data = readLiveLog();
    appendLiveLogItems(data, {
      version: args.version,
      buildDate,
      dateLabel,
      items
    });
    writeLiveLog(data);
  });

  console.log(`Added ${items.length} live changelog entr${items.length === 1 ? 'y' : 'ies'}.`);
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
