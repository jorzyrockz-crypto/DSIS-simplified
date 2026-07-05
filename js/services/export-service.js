/**
 * ICS Tracking & Monitoring Tool
 * Phase 6: Reports, Printing & Data Management — Export Service
 */
'use strict';

const ExportService = (() => {

  /**
   * Helper to trigger a file download in the browser.
   */
  function _downloadFile(content, mimeType, filename) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Export headers + rows data to a UTF-8 CSV file.
   */
  function exportToCSV(headers, rows, filename = 'export.csv') {
    const csvContent = [
      headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','),
      ...rows.map(row => row.map(cell => {
        const clean = String(cell === null || cell === undefined ? '' : cell);
        return `"${clean.replace(/"/g, '""')}"`;
      }).join(','))
    ].join('\r\n');

    // Add UTF-8 BOM
    const bom = '\ufeff';
    _downloadFile(bom + csvContent, 'text/csv;charset=utf-8;', filename);
  }

  /**
   * Export to HTML-based Excel format (opens natively in Excel).
   */
  function exportToExcel(headers, rows, sheetName = 'Report', filename = 'export.xls') {
    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="text/html; charset=UTF-8"/>
        <style>
          table { border-collapse: collapse; font-family: sans-serif; font-size: 12px; }
          th { background-color: #0F172A; color: #FFFFFF; font-weight: bold; border: 1px solid #94A3B8; padding: 8px; }
          td { border: 1px solid #CBD5E1; padding: 6px; }
          .number { mso-number-format:"\\#,##0.00"; text-align: right; }
        </style>
      </head>
      <body>
        <h2>${sheetName}</h2>
        <table>
          <thead>
            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${rows.map(row => `
              <tr>
                ${row.map(cell => {
                  const val = cell === null || cell === undefined ? '' : cell;
                  const isNum = typeof val === 'number' || (String(val).startsWith('₱') && !isNaN(parseFloat(String(val).replace(/[₱,]/g, ''))));
                  const cls = isNum ? ' class="number"' : '';
                  return `<td${cls}>${val}</td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    _downloadFile(html, 'application/vnd.ms-excel;charset=utf-8;', filename);
  }

  return { exportToCSV, exportToExcel };
})();
