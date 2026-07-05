/**
 * ICS Tracking & Monitoring Tool
 * Phase 2: ICS Database & Record Management — Record Service
 *
 * Core business logic layer. All UI code calls this service;
 * the service calls DB. Never call DB directly from UI modules.
 */
'use strict';

const RecordService = (() => {
  const STORE = 'records';

  /* ----------------------------------------------------------
     Internal: Build a canonical Item object
     ---------------------------------------------------------- */
  function _buildItem(raw = {}) {
    const qty      = Utils.parseNumber(raw.quantity);
    const unitCost = Utils.parseNumber(raw.unitCost);
    return {
      id:                  raw.id || Utils.uuid(),
      description:         String(raw.description         || '').trim(),
      inventoryItemNumber: String(raw.inventoryItemNumber || '').trim(),
      serialNumber:        String(raw.serialNumber        || '').trim(),
      quantity:            qty,
      unit:                String(raw.unit                || 'pc').trim(),
      unitCost,
      totalCost:           qty * unitCost,
      estimatedUsefulLife: String(raw.estimatedUsefulLife || '').trim(),
      remarks:             String(raw.remarks             || '').trim(),
    };
  }

  /* ----------------------------------------------------------
     Internal: Build a canonical Record object
     ---------------------------------------------------------- */
  function _buildRecord(raw = {}, existing = null) {
    const now   = new Date().toISOString();
    const items = (raw.items || []).map(_buildItem);

    const totalItems = items.reduce((s, i) => s + i.quantity, 0);
    const totalCost  = items.reduce((s, i) => s + i.totalCost, 0);

    const record = {
      // Identity
      id:           existing ? existing.id : (raw.id || Utils.uuid()),

      // Core fields
      icsNumber:    String(raw.icsNumber    || '').trim(),
      entityName:   String(raw.entityName   || '').trim(),
      fundCluster:  String(raw.fundCluster  || '').trim(),
      dateIssued:   raw.dateIssued          || Utils.today(),
      issuedBy:     String(raw.issuedBy     || '').trim(),
      receivedBy:   String(raw.receivedBy   || '').trim(),
      position:     String(raw.position     || '').trim(),
      office:       String(raw.office       || '').trim(),
      remarks:      String(raw.remarks      || '').trim(),

      // Step 2 specific fields (Phase 3)
      receivedDate: raw.receivedDate        || '',
      receivedContact: String(raw.receivedContact || '').trim(),
      recipientRemarks: String(raw.recipientRemarks || '').trim(),

      // Phase 4 Audit & Monitoring Fields
      isFavorite:   raw.isFavorite !== undefined ? !!raw.isFavorite : (existing ? !!existing.isFavorite : false),
      timeline:     raw.timeline || (existing ? existing.timeline : []),
      notes:        raw.notes || (existing ? existing.notes : []),
      tags:         raw.tags || (existing ? existing.tags : []),
      attachments:  raw.attachments || (existing ? existing.attachments : []),
      itemStatuses: raw.itemStatuses || (existing ? existing.itemStatuses : {}),

      // Status
      status:       raw.status || (existing ? existing.status : 'draft'),

      // Items
      items,
      totalItems,
      totalCost,

      // Timestamps & metadata
      createdDate:  existing ? existing.createdDate : (raw.createdDate || now),
      modifiedDate: now,
      createdBy:    existing ? existing.createdBy   : (raw.createdBy || 'system'),
      modifiedBy:   'system',
      version:      existing ? (existing.version || 0) + 1 : 1,
    };

    // Log default event if empty audit timeline
    if (record.timeline.length === 0) {
      if (record.status === 'draft') {
        TimelineService.logEvent(record, 'draft_saved', 'Draft created.');
      } else {
        TimelineService.logEvent(record, 'created', 'Slip published.');
      }
    }

    return record;
  }

  /* ----------------------------------------------------------
     CREATE
     ---------------------------------------------------------- */
  async function createRecord(data) {
    const record = _buildRecord(data);
    await DB.put(STORE, record);
    return record;
  }

  /* ----------------------------------------------------------
     READ — Single Record
     ---------------------------------------------------------- */
  async function getRecord(id) {
    return DB.get(STORE, id);
  }

  /* ----------------------------------------------------------
     READ — All (returns raw array; callers filter/sort/page)
     ---------------------------------------------------------- */
  async function getAllRecords() {
    return DB.getAll(STORE);
  }

  /* ----------------------------------------------------------
     READ — Paginated + Filtered + Searched
     ---------------------------------------------------------- */
  async function queryRecords({
    query     = '',
    filters   = {},
    sortBy    = 'modifiedDate',
    sortOrder = 'desc',
    page      = 0,
    pageSize  = 25,
  } = {}) {
    const all    = await DB.getAll(STORE);
    return SearchEngine.search(all, { query, filters, sortBy, sortOrder, page, pageSize });
  }

  /* ----------------------------------------------------------
     UPDATE
     ---------------------------------------------------------- */
  async function updateRecord(id, data) {
    const existing = await DB.get(STORE, id);
    if (!existing) throw new Error(`Record not found: ${id}`);
    const updated = _buildRecord({ ...existing, ...data }, existing);
    await DB.put(STORE, updated);
    return updated;
  }

  /* ----------------------------------------------------------
     DELETE (hard)
     ---------------------------------------------------------- */
  async function deleteRecord(id) {
    await DB.del(STORE, id);
    RecentRecords.removeFromAll(id);
  }

  /* ----------------------------------------------------------
     ARCHIVE (soft — changes status to 'archived')
     ---------------------------------------------------------- */
  async function archiveRecord(id) {
    return updateRecord(id, { status: 'archived' });
  }

  async function unarchiveRecord(id) {
    return updateRecord(id, { status: 'active' });
  }

  /* ----------------------------------------------------------
     DUPLICATE
     Creates a copy with a new ID, clears the ICS Number,
     resets to draft, and updates the created date.
     ---------------------------------------------------------- */
  async function duplicateRecord(id) {
    const original = await DB.get(STORE, id);
    if (!original) throw new Error(`Record not found: ${id}`);

    const copy = _buildRecord({
      ...original,
      id:        Utils.uuid(),   // new internal ID
      icsNumber: '',             // cleared — user must assign new number
      status:    'draft',
      items:     original.items.map(i => ({ ...i, id: undefined })), // new item IDs
    });

    await DB.put(STORE, copy);
    return copy;
  }

  /* ----------------------------------------------------------
     STATS (for Dashboard)
     ---------------------------------------------------------- */
  async function getStats() {
    const all = await DB.getAll(STORE);

    const active   = all.filter(r => r.status === 'active');
    const drafts   = all.filter(r => r.status === 'draft');
    const archived = all.filter(r => r.status === 'archived');

    const totalCost  = active.reduce((s, r) => s + (r.totalCost  || 0), 0);
    const totalItems = active.reduce((s, r) => s + (r.totalItems || 0), 0);

    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days
    const recentlyModified = [...all]
      .filter(r => new Date(r.modifiedDate).getTime() > cutoff)
      .sort((a, b) => new Date(b.modifiedDate) - new Date(a.modifiedDate))
      .slice(0, 10);

    return {
      total: all.length,
      active: active.length,
      drafts: drafts.length,
      archived: archived.length,
      totalCost,
      totalItems,
      recentlyModified,
    };
  }

  /* ----------------------------------------------------------
     FILTER OPTIONS (distinct values for dropdowns)
     ---------------------------------------------------------- */
  async function getFilterOptions() {
    const all = await DB.getAll(STORE);

    const years       = [...new Set(all.map(r => Utils.getYear(r.dateIssued)).filter(Boolean))].sort((a, b) => b - a);
    const fundClusters= [...new Set(all.map(r => r.fundCluster).filter(Boolean))].sort();
    const entities    = [...new Set(all.map(r => r.entityName).filter(Boolean))].sort();
    const recipients  = [...new Set(all.map(r => r.receivedBy).filter(Boolean))].sort();

    return { years, fundClusters, entities, recipients };
  }

  /* ----------------------------------------------------------
     ICS NUMBER HELPERS
     ---------------------------------------------------------- */
  async function getNextICSNumber() {
    const year  = Utils.currentYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const all   = await DB.getAll(STORE);

    const maxSeq = all.reduce((max, r) => {
      // Matches both YYYY-MM-### and legacy ICS-YYYY-NNN formats to be safe
      const mNew = (r.icsNumber || '').match(/^(\d{4})-(\d{2})-(\d+)$/);
      if (mNew && parseInt(mNew[1]) === year) return Math.max(max, parseInt(mNew[3]));

      const mOld = (r.icsNumber || '').match(/^ICS-(\d{4})-(\d+)$/i);
      if (mOld && parseInt(mOld[1]) === year) return Math.max(max, parseInt(mOld[2]));

      return max;
    }, 0);

    const seqStr = String(maxSeq + 1).padStart(3, '0');
    return `${year}-${month}-${seqStr}`;
  }

  async function isICSNumberUnique(icsNumber, excludeId = null) {
    if (!icsNumber || !icsNumber.trim()) return true; // blank is handled by validation
    const all = await DB.getAll(STORE);
    return !all.some(r =>
      r.icsNumber.trim().toLowerCase() === icsNumber.trim().toLowerCase() &&
      r.id !== excludeId
    );
  }

  /* ----------------------------------------------------------
     AUTOCOMPLETE & SUGGESTIONS HELPERS (Phase 3)
     ---------------------------------------------------------- */
  async function getDistinctRecipients() {
    const all = await DB.getAll(STORE);
    const sorted = all.sort((a, b) => new Date(b.modifiedDate) - new Date(a.modifiedDate));
    const seen = new Set();
    const list = [];
    sorted.forEach(r => {
      if (!r.receivedBy) return;
      const nameNorm = r.receivedBy.trim().toLowerCase();
      if (!seen.has(nameNorm)) {
        seen.add(nameNorm);
        list.push({
          receivedBy: r.receivedBy,
          position: r.position || '',
          office: r.office || '',
          receivedContact: r.receivedContact || '',
        });
      }
    });
    return list;
  }

  async function getInventorySuggestions(query) {
    if (!query) return [];
    const q = query.trim().toLowerCase();
    const all = await DB.getAll(STORE);
    const suggestions = [];
    const seen = new Set();

    all.forEach(r => {
      if (!r.items) return;
      r.items.forEach(item => {
        if (!item.description) return;
        const descNorm = item.description.trim().toLowerCase();
        if (descNorm.includes(q) && !seen.has(descNorm)) {
          seen.add(descNorm);
          suggestions.push({
            description: item.description,
            unit: item.unit || 'pc',
            estimatedUsefulLife: item.estimatedUsefulLife || '',
            unitCost: item.unitCost || 0
          });
        }
      });
    });

    return suggestions.slice(0, 10);
  }

  /* ----------------------------------------------------------
     SEED DEMO DATA (runs only when DB is empty)
     ---------------------------------------------------------- */
  async function seedDemoData(force = false) {
    if (!force && !(await DB.isEmpty(STORE))) return;

    const records = _buildSeedRecords();
    await DB.putBatch(STORE, records);
    console.log(`[RecordService] Seeded ${records.length} demo records.`);
  }

  function _buildSeedRecords() {
    const now = new Date().toISOString();

    function make({ icsNumber, receivedBy, position, office, dateIssued, entityName, fundCluster, status, items }) {
      const builtItems = items.map(i => {
        const qty  = i.qty  || 1;
        const cost = i.cost || 0;
        return {
          id: Utils.uuid(),
          description:         i.desc,
          inventoryItemNumber: i.inv    || '',
          serialNumber:        i.serial || '',
          quantity:            qty,
          unit:                i.unit   || 'pc',
          unitCost:            cost,
          totalCost:           qty * cost,
          estimatedUsefulLife: i.eul    || '5 years',
          remarks:             '',
        };
      });
      const totalItems = builtItems.reduce((s, i) => s + i.quantity, 0);
      const totalCost  = builtItems.reduce((s, i) => s + i.totalCost,  0);

      return {
        id:           Utils.uuid(),
        icsNumber, entityName, fundCluster, dateIssued,
        issuedBy:     'Property Custodian',
        receivedBy, position, office,
        remarks:      '',
        status,
        items: builtItems, totalItems, totalCost,
        createdDate:  now,
        modifiedDate: now,
        createdBy:    'system',
        modifiedBy:   'system',
        version:      1,
      };
    }

    return [
      make({
        icsNumber: 'ICS-2026-001', receivedBy: 'John Russell',
        position: 'ICT Coordinator', office: 'ICT Office',
        dateIssued: '2021-06-15', entityName: 'Department of Education', // 5 years ago
        fundCluster: '01', status: 'active',
        items: [
          { desc: 'Desktop Computer, Intel Core i5, 8GB RAM, 512GB SSD', inv: 'ICT-2026-001', serial: 'SN-PC-00241', qty: 1, cost: 45000, eul: '5 years' }, // EXPIRED
          { desc: 'Laser Printer, A4, Monochrome', inv: 'ICT-2026-002', serial: 'SN-PR-00119', qty: 1, cost: 12500, eul: '6 years' }, // HEALTHY
          { desc: 'UPS 650VA', inv: 'ICT-2026-003', serial: 'SN-UP-00334', qty: 2, cost: 3500, eul: '3 years' }, // EXPIRED
        ],
      }),
      make({
        icsNumber: 'ICS-2026-002', receivedBy: 'Maria Santos',
        position: 'Administrative Officer II', office: 'Administrative Division',
        dateIssued: '2016-07-20', entityName: 'Department of Education', // 10 years ago
        fundCluster: '01', status: 'active',
        items: [
          { desc: 'Office Chair, Ergonomic, High-Back', inv: 'FUR-2026-001', qty: 3, cost: 8500, unit: 'pc', eul: '10 years' }, // APPROACHING (If today is July 2026, it might be expired or approaching depending on exact date)
          { desc: 'Filing Cabinet, Steel, 4-Drawer', inv: 'FUR-2026-002', qty: 2, cost: 15000, unit: 'pc', eul: '10 years' },
          { desc: 'Office Desk, L-Shape, 160x140cm', inv: 'FUR-2026-003', qty: 1, cost: 18000, unit: 'pc', eul: '15 years' }, // HEALTHY
        ],
      }),
      make({
        icsNumber: 'ICS-2026-003', receivedBy: 'Carlos Reyes',
        position: 'Budget Officer I', office: 'Budget Division',
        dateIssued: '2023-08-01', entityName: 'Department of Education',
        fundCluster: '01', status: 'active',
        items: [
          { desc: 'Laptop Computer, Intel Core i7, 16GB RAM, 1TB SSD', inv: 'ICT-2026-010', serial: 'SN-LP-00781', qty: 1, cost: 75000, eul: '5 years' },
          { desc: 'External Hard Drive, 2TB, USB 3.0', inv: 'ICT-2026-011', serial: 'SN-HD-00456', qty: 1, cost: 4500, eul: '3 years' }, // APPROACHING
          { desc: 'Wireless Mouse and Keyboard Combo', inv: 'ICT-2026-012', qty: 1, cost: 2200, eul: '3 years' }, // APPROACHING
        ],
      }),
      make({
        icsNumber: 'ICS-2026-004', receivedBy: 'Ana Dela Cruz',
        position: 'Supply Officer III', office: 'Supply Division',
        dateIssued: '2026-06-15', entityName: 'Department of Education',
        fundCluster: '02', status: 'draft',
        items: [
          { desc: 'Air Conditioner, Split Type, 2.0HP, Inverter', qty: 2, cost: 38000, unit: 'unit', eul: '10 years' },
          { desc: 'Air Conditioner Remote Control', qty: 2, cost: 500, unit: 'pc', eul: '5 years' },
        ],
      }),
      make({
        icsNumber: 'ICS-2026-005', receivedBy: 'Benjamin Cruz',
        position: 'Engineer III', office: 'Engineering Division',
        dateIssued: '2026-04-22', entityName: 'Department of Public Works and Highways',
        fundCluster: '01', status: 'active',
        items: [
          { desc: 'Survey Equipment, Total Station', inv: 'ENG-2026-001', serial: 'SN-TS-00221', qty: 1, cost: 185000, eul: '10 years' },
          { desc: 'GPS Receiver, Handheld', inv: 'ENG-2026-002', serial: 'SN-GP-00112', qty: 2, cost: 28000, eul: '7 years' },
        ],
      }),
      make({
        icsNumber: 'ICS-2025-047', receivedBy: 'Robert Tan',
        position: 'Teacher III', office: 'Grade 10 – Section A',
        dateIssued: '2025-12-03', entityName: 'Department of Education',
        fundCluster: '01', status: 'active',
        items: [
          { desc: 'LCD Projector, 3500 Lumens, WXGA', inv: 'ICT-2025-050', serial: 'SN-PJ-00891', qty: 1, cost: 28000, eul: '5 years' },
          { desc: 'Projection Screen, 80-inch, Tripod', inv: 'ICT-2025-051', qty: 1, cost: 5500, eul: '10 years' },
          { desc: 'HDMI Cable, 10m, Braided', inv: 'ICT-2025-052', qty: 2, cost: 850, eul: '5 years' },
        ],
      }),
      make({
        icsNumber: 'ICS-2025-031', receivedBy: 'Liza Bautista',
        position: 'Librarian II', office: 'Library',
        dateIssued: '2025-08-14', entityName: 'Department of Education',
        fundCluster: '01', status: 'archived',
        items: [
          { desc: 'Library Shelf, Steel, 5-Tier, Double-Sided', inv: 'FUR-2025-020', qty: 5, cost: 9500, unit: 'pc', eul: '15 years' },
          { desc: 'Reading Table, 6-Seater', inv: 'FUR-2025-021', qty: 3, cost: 7500, unit: 'pc', eul: '10 years' },
          { desc: 'Library Chair, Plastic', inv: 'FUR-2025-022', qty: 18, cost: 1200, unit: 'pc', eul: '7 years' },
        ],
      }),
      make({
        icsNumber: 'ICS-2025-019', receivedBy: 'Pedro Villanueva',
        position: 'Guidance Counselor', office: 'Guidance Office',
        dateIssued: '2025-05-20', entityName: 'Department of Education',
        fundCluster: '01', status: 'active',
        items: [
          { desc: 'Laptop Computer, Intel Core i5, 8GB RAM', inv: 'ICT-2025-040', serial: 'SN-LP-00672', qty: 1, cost: 55000, eul: '5 years' },
          { desc: 'Webcam, Full HD 1080p', inv: 'ICT-2025-041', qty: 1, cost: 3500, eul: '3 years' },
        ],
      }),
    ];
  }

  /* ----------------------------------------------------------
     Public API
     ---------------------------------------------------------- */
  return {
    createRecord, getRecord, getAllRecords, queryRecords,
    updateRecord, deleteRecord,
    archiveRecord, unarchiveRecord,
    duplicateRecord,
    getStats, getFilterOptions,
    getNextICSNumber, isICSNumberUnique,
    getDistinctRecipients, getInventorySuggestions,
    seedDemoData,
  };
})();
