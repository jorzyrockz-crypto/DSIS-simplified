# Project Notes

This folder stores durable product, UI, workflow, and architecture notes for the ICS Tracker app.

Use these notes to keep important decisions out of chat-only context so they remain visible while the app evolves.

## Product Role Notes

### ICS Records vs Reports

- `ICS Records` is the operational workspace.
- It is used for browsing slips, searching, inspecting details, editing, selecting, and printing specific records.

- `Reports` is the aggregate and output workspace.
- It is used for summaries, grouped views, exports, management outputs, and printable multi-record reporting.

### Design Rule

- `ICS Records` and `Reports` must not feel like duplicate pages.
- They may use the same underlying data, but their purpose, layout, and interactions should stay clearly separated.

### Working Interpretation

- If a screen is about managing individual slips, it belongs closer to `ICS Records`.
- If a screen is about summarizing, exporting, monitoring, or printing aggregated outputs, it belongs closer to `Reports`.

## How To Use This Folder

- Add short decision notes when a product or UI direction is agreed upon.
- Prefer small, clear notes over long speculative writeups.
- Keep notes practical so they can guide future redesigns and refactors.
