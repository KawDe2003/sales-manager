import * as XLSX from 'xlsx';

export const exportToCSV = (filename, rows) => {
  if (!rows || !rows.length) return false;
  
  const separator = ',';
  const keys = Object.keys(rows[0]);

  const formatHeader = (k) => {
    if (k.includes(' ')) return k;
    return k.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, str => str.toUpperCase());
  };
  
  const csvContent =
    keys.map(k => formatHeader(k)).join(separator) +
    '\n' +
    rows.map(row => {
      return keys.map(k => {
        let cell = row[k] === null || row[k] === undefined ? '' : row[k];
        cell = typeof cell === 'object' ? JSON.stringify(cell) : cell;
        cell = cell.toString().replace(/"/g, '""');
        if (cell.search(/("|,|\n|\r)/g) >= 0) {
          cell = `"${cell}"`;
        }
        return cell;
      }).join(separator);
    }).join('\n');

  // Add UTF-8 BOM (\uFEFF) so Excel opens UTF-8 characters and currency symbols cleanly
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  }
  return false;
};

export const exportToExcel = (filename, data, defaultSheetName = 'Sheet1') => {
  if (!data) return false;

  const workbook = XLSX.utils.book_new();

  // Multi-sheet support when data is an object mapping sheet names to row arrays
  if (!Array.isArray(data) && typeof data === 'object') {
    let sheetAdded = false;
    Object.keys(data).forEach(sName => {
      const rows = data[sName];
      if (Array.isArray(rows) && rows.length > 0) {
        const ws = XLSX.utils.json_to_sheet(rows);
        const colWidths = Object.keys(rows[0]).map(key => {
          const maxLen = rows.reduce((max, r) => Math.max(max, String(r[key] ?? '').length), key.length);
          return { wch: Math.min(Math.max(maxLen + 3, 10), 55) };
        });
        ws['!cols'] = colWidths;
        XLSX.utils.book_append_sheet(workbook, ws, sName.substring(0, 31));
        sheetAdded = true;
      }
    });
    if (!sheetAdded) return false;
  } else if (Array.isArray(data) && data.length > 0) {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const colWidths = Object.keys(data[0]).map(key => {
      const maxLen = data.reduce((max, r) => Math.max(max, String(r[key] ?? '').length), key.length);
      return { wch: Math.min(Math.max(maxLen + 3, 10), 55) };
    });
    worksheet['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(workbook, worksheet, defaultSheetName.substring(0, 31));
  } else {
    return false;
  }

  XLSX.writeFile(workbook, `${filename}.xlsx`);
  return true;
};
