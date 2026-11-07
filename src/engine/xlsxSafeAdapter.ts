import ExcelJS from 'exceljs';

/**
 * Hardened ExcelJS adapter (Alternative to SheetJS/xlsx).
 * Selected when feature flag `xlsxSafe` is active.
 * Classic SheetJS code remains unchanged and default.
 */
export async function parseWorkbookWithExcelJS(file: File | ArrayBuffer): Promise<{
  sheets: { name: string; rowCount: number }[];
  data: Record<string, any>[];
  activeSheet: string;
}> {
  const workbook = new ExcelJS.Workbook();
  const buffer = file instanceof File ? await file.arrayBuffer() : file;
  await workbook.xlsx.load(buffer);

  const sheets: { name: string; rowCount: number }[] = [];
  workbook.eachSheet((worksheet) => {
    sheets.push({
      name: worksheet.name,
      rowCount: worksheet.rowCount
    });
  });

  const firstSheet = workbook.worksheets[0];
  if (!firstSheet) {
    return { sheets: [], data: [], activeSheet: '' };
  }

  const rows: Record<string, any>[] = [];
  const headers: string[] = [];

  firstSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      row.eachCell((cell, colNumber) => {
        headers[colNumber] = String(cell.value || `Column_${colNumber}`).trim();
      });
    } else {
      const rowObj: Record<string, any> = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber];
        if (header) {
          // Sanitize cell values against formula injection (starts with =, +, -, @)
          let val = cell.value;
          if (typeof val === 'object' && val !== null && 'result' in val) {
            val = (val as any).result; // Calculated formula value
          }
          if (typeof val === 'string' && /^[=+\-@]/.test(val)) {
            val = `'${val}`;
          }
          rowObj[header] = val;
        }
      });
      if (Object.keys(rowObj).length > 0) {
        rows.push(rowObj);
      }
    }
  });

  return {
    sheets,
    data: rows,
    activeSheet: firstSheet.name
  };
}

export async function exportWorkbookWithExcelJS(
  sheetsData: Record<string, Record<string, any>[]>,
  fileName: string = 'DataAnalytix_Export.xlsx'
): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Data Analytix';
  workbook.lastModifiedBy = 'Data Analytix';
  workbook.created = new Date();

  for (const [sheetName, rows] of Object.entries(sheetsData)) {
    const worksheet = workbook.addWorksheet(sheetName.substring(0, 31)); // Excel 31-char sheet limit
    if (rows.length === 0) continue;

    const columns = Object.keys(rows[0]).map(key => ({
      header: key,
      key,
      width: Math.max(15, key.length + 4)
    }));

    worksheet.columns = columns;

    // Header styling
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' }
    };

    rows.forEach(r => {
      worksheet.addRow(r);
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  // Trigger download if running in browser
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return blob;
}
