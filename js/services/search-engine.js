/**
 * ICS Tracking & Monitoring Tool
 * Phase 2: ICS Database & Record Management — Search Engine
 */
'use strict';

const SearchEngine = (() => {

  /* ----------------------------------------------------------
     Field weights (higher = more relevant)
     ---------------------------------------------------------- */
  const WEIGHTS = {
    icsNumber:           100,
    receivedBy:           80,
    entityName:           60,
    serialNumber:         75,  // item-level
    inventoryItemNumber:  70,  // item-level
    description:          50,  // item-level
    office:               40,
    position:             35,
    issuedBy:             30,
    fundCluster:          20,
    remarks:              10,
  };

  /* ----------------------------------------------------------
     Core Match Check
     Returns true if the record contains the query string anywhere
     in the indexed fields.
     ---------------------------------------------------------- */
  function matchesQuery(record, query) {
    if (!query || !query.trim()) return true;
    const q = query.toLowerCase().trim();

    // Top-level string fields
    const topFields = [
      record.icsNumber, record.receivedBy, record.entityName,
      record.office, record.position, record.issuedBy,
      record.fundCluster, record.remarks,
      String(Utils.getYear(record.dateIssued) ?? ''),
    ];
    if (topFields.some(f => f && String(f).toLowerCase().includes(q))) return true;

    // Item-level fields
    if (record.items && record.items.length) {
      return record.items.some(item =>
        [item.description, item.inventoryItemNumber, item.serialNumber, item.remarks]
          .some(f => f && String(f).toLowerCase().includes(q))
      );
    }

    return false;
  }

  /* ----------------------------------------------------------
     Relevance Scoring
     Returns a numeric score; higher = better match.
     ---------------------------------------------------------- */
  function score(record, query) {
    if (!query) return 0;
    const q = query.toLowerCase().trim();
    let total = 0;

    function check(value, weight) {
      if (!value) return;
      const s = String(value).toLowerCase();
      if (s === q) total += weight * 2;          // exact match bonus
      else if (s.startsWith(q)) total += weight * 1.5; // prefix match bonus
      else if (s.includes(q)) total += weight;
    }

    check(record.icsNumber,   WEIGHTS.icsNumber);
    check(record.receivedBy,  WEIGHTS.receivedBy);
    check(record.entityName,  WEIGHTS.entityName);
    check(record.office,      WEIGHTS.office);
    check(record.position,    WEIGHTS.position);
    check(record.issuedBy,    WEIGHTS.issuedBy);
    check(record.fundCluster, WEIGHTS.fundCluster);
    check(record.remarks,     WEIGHTS.remarks);

    if (record.items) {
      record.items.forEach(item => {
        check(item.description,          WEIGHTS.description);
        check(item.inventoryItemNumber,  WEIGHTS.inventoryItemNumber);
        check(item.serialNumber,         WEIGHTS.serialNumber);
        check(item.remarks,              WEIGHTS.remarks);
      });
    }

    return total;
  }

  /* ----------------------------------------------------------
     Client-Side Filter
     ---------------------------------------------------------- */
  function applyFilters(records, filters = {}) {
    return records.filter(r => {
      // 1. Core Status/Metadata
      if (filters.status && filters.status !== 'all' && r.status !== filters.status) return false;
      if (filters.year   && Utils.getYear(r.dateIssued) !== parseInt(filters.year)) return false;
      if (filters.fundCluster && filters.fundCluster !== 'all' && r.fundCluster !== filters.fundCluster) return false;
      if (filters.entityName  && filters.entityName !== 'all'  && r.entityName !== filters.entityName) return false;

      // 2. Favorite (Quick Filter)
      if (filters.isFavorite && !r.isFavorite) return false;

      // 3. Health check: Needs Attention (Quick Filter)
      if (filters.needsAttention) {
        const health = HealthAnalyzer.analyze(r);
        if (health.score >= 70) return false; // Only keep scores < 70
      }

      // 4. Advanced Fields
      if (filters.icsNumber && !r.icsNumber.toLowerCase().includes(filters.icsNumber.toLowerCase())) return false;
      if (filters.recipient && !r.receivedBy.toLowerCase().includes(filters.recipient.toLowerCase())) return false;
      if (filters.office    && !r.office.toLowerCase().includes(filters.office.toLowerCase())) return false;
      if (filters.position  && !r.position.toLowerCase().includes(filters.position.toLowerCase())) return false;
      if (filters.remarks   && !r.remarks.toLowerCase().includes(filters.remarks.toLowerCase())) return false;

      // 5. Date Ranges
      if (filters.dateStart && r.dateIssued < filters.dateStart) return false;
      if (filters.dateEnd   && r.dateIssued > filters.dateEnd) return false;

      // 6. Tags
      if (filters.tags && (!r.tags || !r.tags.some(t => t.toLowerCase().includes(filters.tags.toLowerCase())))) return false;

      // 7. Item-level Advanced Filters
      if (filters.inventoryNumber || filters.serialNumber || filters.description || filters.estimatedUsefulLife) {
        if (!r.items || r.items.length === 0) return false;
        const match = r.items.some(item => {
          if (filters.inventoryNumber && (!item.inventoryItemNumber || !item.inventoryItemNumber.toLowerCase().includes(filters.inventoryNumber.toLowerCase()))) return false;
          if (filters.serialNumber    && (!item.serialNumber || !item.serialNumber.toLowerCase().includes(filters.serialNumber.toLowerCase()))) return false;
          if (filters.description     && (!item.description || !item.description.toLowerCase().includes(filters.description.toLowerCase()))) return false;
          if (filters.estimatedUsefulLife && (!item.estimatedUsefulLife || !item.estimatedUsefulLife.toLowerCase().includes(filters.estimatedUsefulLife.toLowerCase()))) return false;
          return true;
        });
        if (!match) return false;
      }

      return true;
    });
  }

  /* ----------------------------------------------------------
     Sort
     ---------------------------------------------------------- */
  function applySort(records, sortBy = 'modifiedDate', sortOrder = 'desc') {
    const dir = sortOrder === 'asc' ? 1 : -1;

    return [...records].sort((a, b) => {
      let va = a[sortBy], vb = b[sortBy];

      // Timestamp fields → numeric comparison
      if (sortBy === 'modifiedDate' || sortBy === 'createdDate' || sortBy === 'dateIssued') {
        va = new Date(va).getTime() || 0;
        vb = new Date(vb).getTime() || 0;
        return (va - vb) * dir;
      }

      // String comparison
      va = String(va ?? '').toLowerCase();
      vb = String(vb ?? '').toLowerCase();
      if (va < vb) return -1 * dir;
      if (va > vb) return  1 * dir;
      return 0;
    });
  }

  /* ----------------------------------------------------------
     Full Search Pipeline
     Accepts all raw records; returns filtered, scored, sorted, paginated result.
     ---------------------------------------------------------- */
  function search(allRecords, {
    query    = '',
    filters  = {},
    sortBy   = 'modifiedDate',
    sortOrder= 'desc',
    page     = 0,
    pageSize = 25,
  } = {}) {
    // 1. Filter
    let results = applyFilters(allRecords, filters);

    // 2. Text search
    if (query && query.trim()) {
      const q = query.toLowerCase().trim();
      results = results.filter(r => matchesQuery(r, q));
      // Sort by relevance when there is a search query
      results = results.sort((a, b) => score(b, q) - score(a, q));
    } else {
      // Default sort when no query
      results = applySort(results, sortBy, sortOrder);
    }

    // 2.5 Pin favorites to the top
    results.sort((a, b) => {
      const favA = a.isFavorite ? 1 : 0;
      const favB = b.isFavorite ? 1 : 0;
      return favB - favA; // true (1) comes before false (0)
    });

    // 3. Pagination
    const total      = results.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage   = Math.min(page, totalPages - 1);
    const start      = safePage * pageSize;
    const paginated  = results.slice(start, start + pageSize);

    return {
      records: paginated,
      total,
      page: safePage,
      pageSize,
      totalPages,
    };
  }

  return { matchesQuery, score, applyFilters, applySort, search };
})();
