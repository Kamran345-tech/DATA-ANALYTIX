import {
  buildSopFileName,
  buildSopMetadata,
  SOP_PRINT_PALETTE,
  SopExportMetadata,
} from '../config/designTokens';

/**
 * Hardened ExcelJS adapter (Alternative to SheetJS/xlsx).
 * Loads ExcelJS dynamically via import('exceljs') only when invoked.
 * Also applies DESIGN-SOP.md workbook styling (header fills, column widths,
 * number formats, frozen header row, and 00_Metadata provenance sheet).
 */
async function loadExcelJS() {
  const mod: any = await import('exceljs');
  return mod.default && mod.default.Workbook ? mod.default : mod;
}

export async function parseWorkbookWithExcelJS(file: File | ArrayBuffer): Promise<{
  sheets: { name: string; rowCount: number }[];
  data: Record<string, any>[];
  activeSheet: string;
}> {
  const ExcelJS = await loadExcelJS();
  const workbook = new ExcelJS.Workbook();
  const buffer = file instanceof File ? await file.arrayBuffer() : file;
  await workbook.xlsx.load(buffer);

  const sheets: { name: string; rowCount: number }[] = [];
  workbook.eachSheet((worksheet: any) => {
    sheets.push({
      name: worksheet.name,
      rowCount: worksheet.rowCount,
    });
  });

  const firstSheet = workbook.worksheets[0];
  if (!firstSheet) {
    return { sheets: [], data: [], activeSheet: '' };
  }

  const rows: Record<string, any>[] = [];
  const headers: string[] = [];

  firstSheet.eachRow((row: any, rowNumber: number) => {
    if (rowNumber === 1) {
      row.eachCell((cell: any, colNumber: number) => {
        headers[colNumber] = String(cell.value || `Column_${colNumber}`).trim();
      });
    } else {
      const rowObj: Record<string, any> = {};
      row.eachCell((cell: any, colNumber: number) => {
        const header = headers[colNumber];
        if (header) {
          let val = cell.value;
          if (typeof val === 'object' && val !== null && 'result' in val) {
            val = (val as any).result;
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
    activeSheet: firstSheet.name,
  };
}

export interface SopExcelWorkbookOptions {
  datasetName?: string;
  source?: string;
  rowCount?: number;
  columnCount?: number;
  metadata?: SopExportMetadata;
  triggerBrowserDownload?: boolean;
}

/**
 * Generates an SOP-compliant Excel workbook (.xlsx) using ExcelJS with:
 * - Dedicated `00_Metadata` sheet containing full provenance
 * - Header styling (#0F766E fill, white bold text)
 * - Auto-fitted column widths
 * - Explicit number formats ($#,##0.00, 0.0%, #,##0)
 * - Frozen top header row (ySplit: 1) on every worksheet
 */
export async function exportWorkbookWithExcelJS(
  sheetsData: Record<string, Record<string, any>[]>,
  fileName?: string,
  options: SopExcelWorkbookOptions = {}
): Promise<Blob> {
  const ExcelJS = await loadExcelJS();
  const workbook = new ExcelJS.Workbook();
  const meta =
    options.metadata ||
    buildSopMetadata({
      datasetName: options.datasetName || 'dataset',
      rowCount: options.rowCount ?? 0,
      columnCount: options.columnCount ?? 0,
      source: options.source || 'Data Analytix Sovereign Engine',
    });

  workbook.creator = meta.brand;
  workbook.lastModifiedBy = meta.brand;
  workbook.created = new Date(meta.generatedDate);

  // 1. Always add 00_Metadata provenance sheet first
  const metaSheet = workbook.addWorksheet('00_Metadata', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  metaSheet.columns = [
    { header: 'Property', key: 'property', width: 28 },
    { header: 'Value', key: 'value', width: 52 },
  ];
  metaSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  metaSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F766E' }, // SOP Print Accent #0F766E
  };
  const metaRows = [
    { property: 'Brand', value: meta.brand },
    { property: 'Application Version', value: meta.appVersion },
    { property: 'Generated Date (ISO)', value: meta.generatedDate },
    { property: 'Dataset Name', value: meta.datasetName },
    { property: 'Audited Row Count', value: meta.rowCount },
    { property: 'Column Count', value: meta.columnCount },
    { property: 'Provenance Source', value: meta.source },
  ];
  metaRows.forEach((mr) => metaSheet.addRow(mr));

  // 2. Add each data worksheet with frozen header row, column widths, and number formats
  for (const [sheetName, rows] of Object.entries(sheetsData)) {
    const safeName = sheetName.substring(0, 31) || 'Sheet';
    const worksheet = workbook.addWorksheet(safeName, {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    if (!rows || rows.length === 0) {
      worksheet.columns = [{ header: 'Note', key: 'Note', width: 40 }];
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F766E' },
      };
      worksheet.addRow({ Note: 'No records present in this table.' });
      continue;
    }

    const keys = Object.keys(rows[0]);
    const columns = keys.map((key) => {
      let maxLen = key.length;
      for (let i = 0; i < Math.min(rows.length, 100); i++) {
        const cellStr = rows[i]?.[key] !== null && rows[i]?.[key] !== undefined ? String(rows[i][key]) : '';
        if (cellStr.length > maxLen) maxLen = cellStr.length;
      }
      const isCurrency = /revenue|sales|profit|cost|amount|price|budget|spend/i.test(key);
      const isPercent = /percent|margin|rate|share|ratio|score/i.test(key);
      return {
        header: key,
        key,
        width: Math.min(44, Math.max(14, maxLen + 4)),
        style: isCurrency
          ? { numFmt: '$#,##0.00' }
          : isPercent
          ? { numFmt: '0.0%' }
          : undefined,
      };
    });

    worksheet.columns = columns;

    // Header styling per DESIGN-SOP.md (#0F766E fill, white bold text)
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F766E' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
    headerRow.height = 22;

    rows.forEach((r, idx) => {
      const added = worksheet.addRow(r);
      if (idx % 2 === 1) {
        added.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' },
        };
      }
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const resolvedFileName =
    fileName || buildSopFileName('workbook', options.datasetName || 'dataset', 'xlsx');

  if (
    options.triggerBrowserDownload !== false &&
    typeof window !== 'undefined' &&
    typeof document !== 'undefined'
  ) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = resolvedFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return blob;
}
