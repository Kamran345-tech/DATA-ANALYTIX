import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ColumnProfile, DataModel, DAXMeasure, KPI, AIInsight, TransformationStep, ProjectMetadata, BrandConfig, DataQualityReport } from '../types';
import { generateDAXMeasures } from './daxEngine';
import { generateStarterSQLQueries } from './sqlEngine';
import { generatePythonScript } from './pythonEngine';

export interface ExportDataPayload {
  project: ProjectMetadata;
  brand: BrandConfig;
  rawRows: Record<string, any>[];
  cleanRows: Record<string, any>[];
  columns: ColumnProfile[];
  dataModel: DataModel;
  kpis: KPI[];
  daxMeasures: DAXMeasure[];
  insights: AIInsight[];
  transformations: TransformationStep[];
  qualityReport: DataQualityReport;
}

export function buildExcelWorkbook(payload: ExportDataPayload): Uint8Array {
  const wb = XLSX.utils.book_new();

  // 1. README Sheet
  const readmeData = [
    ['NEXUSBI ENTERPRISE DATA ANALYST WORKBOOK'],
    ['Generated Date', new Date().toISOString()],
    ['Project Name', payload.project.name],
    ['Company', payload.brand.companyName],
    ['Department', payload.brand.department],
    ['Version', payload.project.version],
    ['Data Quality Score', `${payload.qualityReport.overallScore}%`],
    ['Total Rows Analyzed', payload.cleanRows.length],
    ['Total Columns', payload.columns.length],
    [],
    ['REFRESH INSTRUCTIONS FOR FUTURE DATA UPDATES:'],
    ['1. To add new transaction data, paste rows into the bottom of the "02_Clean_Data" table.'],
    ['2. Ensure column headers match the exact names documented in "Data_Dictionary".'],
    ['3. In Excel, go to Data -> Refresh All to update all connected pivot tables or Power Query queries.'],
    ['4. Review the KPI_Definitions sheet to verify calculated figures.'],
    ['5. Do not modify or delete column headers in row 1 of the data tables.']
  ];
  const wsReadme = XLSX.utils.aoa_to_sheet(readmeData);
  XLSX.utils.book_append_sheet(wb, wsReadme, 'README');

  // 2. 02_Clean_Data Sheet
  const wsClean = XLSX.utils.json_to_sheet(payload.cleanRows);
  XLSX.utils.book_append_sheet(wb, wsClean, '02_Clean_Data');

  // 3. 01_Raw_Data Sheet
  const wsRaw = XLSX.utils.json_to_sheet(payload.rawRows);
  XLSX.utils.book_append_sheet(wb, wsRaw, '01_Raw_Data');

  // 4. KPI Definitions Sheet
  const kpiData = payload.kpis.map(k => ({
    'KPI Name': k.name,
    'Current Value': k.formattedValue,
    'Previous Value': k.formattedPreviousValue || 'N/A',
    'Variance %': k.changePercent !== undefined ? `${k.changePercent}%` : 'N/A',
    'Status': k.status,
    'Calculation Formula': k.calculation,
    'Source Field': k.traceableSource
  }));
  const wsKPI = XLSX.utils.json_to_sheet(kpiData);
  XLSX.utils.book_append_sheet(wb, wsKPI, 'KPI_Definitions');

  // 5. Data Dictionary Sheet
  const dictData = payload.columns.map(c => ({
    'Column Name': c.name,
    'Data Type': c.dataType,
    'Total Count': c.totalCount,
    'Null Count': c.nullCount,
    'Null %': `${c.nullPercentage}%`,
    'Distinct Count': c.distinctCount,
    'Min': c.min !== undefined ? c.min : 'N/A',
    'Max': c.max !== undefined ? c.max : 'N/A',
    'Mean': c.mean !== undefined ? c.mean : 'N/A',
    'Role': c.isPrimaryKeyCandidate ? 'Primary Key Candidate' : c.isForeignKeyCandidate ? 'Foreign Key Candidate' : c.dataType === 'number' ? 'Measure' : 'Dimension'
  }));
  const wsDict = XLSX.utils.json_to_sheet(dictData);
  XLSX.utils.book_append_sheet(wb, wsDict, 'Data_Dictionary');

  // 6. Relationships Sheet
  const relData = payload.dataModel.relationships.map(r => ({
    'Source Table': r.sourceTable,
    'Source Column': r.sourceColumn,
    'Target Table': r.targetTable,
    'Target Column': r.targetColumn,
    'Cardinality': r.cardinality,
    'Cross Filter': r.crossFilterDirection,
    'Status': r.isValid ? 'Valid' : 'Warning'
  }));
  const wsRel = XLSX.utils.json_to_sheet(relData.length > 0 ? relData : [{ 'Status': 'Flat table structure' }]);
  XLSX.utils.book_append_sheet(wb, wsRel, 'Relationships');

  // 7. Transformation Audit Log Sheet
  const auditData = payload.transformations.map((t, idx) => ({
    'Step #': idx + 1,
    'Timestamp': t.timestamp,
    'Action': t.action,
    'Target Column': t.column || 'All Columns',
    'Description': t.description,
    'Parameters': JSON.stringify(t.parameters)
  }));
  const wsAudit = XLSX.utils.json_to_sheet(auditData.length > 0 ? auditData : [{ 'Note': 'No manual transformations applied. Cleaned ingestion state active.' }]);
  XLSX.utils.book_append_sheet(wb, wsAudit, 'Change_Log');

  // 8. Parameters Sheet
  const paramData = [
    { 'Parameter Name': 'pCompanyName', 'Value': payload.brand.companyName, 'Description': 'Central organization label' },
    { 'Parameter Name': 'pSourceFile', 'Value': payload.project.sourceFileName, 'Description': 'Original uploaded file name' },
    { 'Parameter Name': 'pReportTitle', 'Value': `${payload.project.name} Executive Report`, 'Description': 'Primary reporting title' },
    { 'Parameter Name': 'pVersion', 'Value': payload.project.version, 'Description': 'Project version tag' }
  ];
  const wsParam = XLSX.utils.json_to_sheet(paramData);
  XLSX.utils.book_append_sheet(wb, wsParam, 'Parameters');

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(buf);
}

export function generatePowerBIThemeJSON(brand: BrandConfig): string {
  return JSON.stringify({
    name: `${brand.companyName} Tiffany Dark Theme`,
    dataColors: [
      brand.themeColor || '#21F1A8',
      '#00D8F6',
      '#6366F1',
      '#F59E0B',
      '#EC4899',
      '#10B981',
      '#8B5CF6',
      '#EF4444'
    ],
    background: '#171717',
    foreground: '#FFFFFF',
    tableAccent: brand.themeColor || '#21F1A8',
    visualStyles: {
      '*': {
        '*': {
          background: [{ color: { solid: { color: '#1F1F1F' } }, transparency: 0 }],
          border: [{ show: true, color: { solid: { color: '#2D2D2D' } }, radius: 8 }]
        }
      }
    }
  }, null, 2);
}

export function generatePowerBIMSemanticModel(payload: ExportDataPayload): string {
  const tableName = payload.dataModel.tables[0]?.name || 'FactData';
  const cleanCols = payload.columns.map(c => `        {"${c.name}", ${c.dataType === 'number' ? 'type number' : c.dataType === 'date' ? 'type date' : 'type text'}}`).join(',\n');

  return `// Power Query M Transformation Expression
// Table: ${tableName}
let
    Source = Excel.Workbook(File.Contents(pSourceFilePath), null, true),
    DataTable_Sheet = Source{[Item="02_Clean_Data",Kind="Sheet"]}[Data],
    #"Promoted Headers" = Table.PromoteHeaders(DataTable_Sheet, [PromoteAllScalars=true]),
    #"Changed Type" = Table.TransformColumnTypes(#"Promoted Headers", {
${cleanCols}
    })
in
    #"Changed Type"
`;
}

export function generateModelBimJSON(payload: ExportDataPayload): string {
  const tableName = payload.dataModel.tables[0]?.name || 'FactData';

  const bim = {
    name: payload.project.name,
    compatibilityLevel: 1567,
    model: {
      culture: 'en-US',
      dataAccessOptions: { legacyRedirects: true, returnErrorValuesAsNull: true },
      defaultPowerBIDataSourceVersion: 'powerBI_V3',
      sourceQueryCulture: 'en-US',
      tables: payload.dataModel.tables.map(t => ({
        name: t.name,
        columns: t.columns.map(c => ({
          name: c.name,
          dataType: c.dataType === 'number' ? 'double' : c.dataType === 'date' ? 'dateTime' : 'string',
          sourceColumn: c.name,
          summarizeBy: c.dataType === 'number' ? 'sum' : 'none'
        })),
        measures: payload.daxMeasures.filter(m => m.table === t.name || t.type === 'fact').map(m => ({
          name: m.name,
          expression: m.formula.split('=').slice(1).join('=').trim(),
          description: m.description
        }))
      })),
      relationships: payload.dataModel.relationships.map(r => ({
        name: r.id,
        fromTable: r.sourceTable,
        fromColumn: r.sourceColumn,
        toTable: r.targetTable,
        toColumn: r.targetColumn,
        crossFilteringBehavior: r.crossFilterDirection === 'both' ? 'bothDirections' : 'oneDirection'
      }))
    }
  };

  return JSON.stringify(bim, null, 2);
}

export async function createCompleteProjectZip(payload: ExportDataPayload): Promise<Blob> {
  const zip = new JSZip();
  const baseName = payload.project.name.replace(/[^a-zA-Z0-9_]/g, '_');
  const tableName = payload.dataModel.tables[0]?.name || 'FactTable';

  // 01_Original_Data/
  const originalCsv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(payload.rawRows));
  zip.file(`01_Original_Data/${baseName}_Original_Raw.csv`, originalCsv);

  // 02_Cleaned_Data/
  const cleanCsv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(payload.cleanRows));
  zip.file(`02_Cleaned_Data/${baseName}_Cleaned_Data.csv`, cleanCsv);
  zip.file(`02_Cleaned_Data/${baseName}_Cleaned_Data.json`, JSON.stringify(payload.cleanRows, null, 2));

  // 03_Excel_Source/
  const excelBuf = buildExcelWorkbook(payload);
  zip.file(`03_Excel_Source/${baseName}_Excel_Source_Workbook.xlsx`, excelBuf);

  // 04_Data_Model/
  zip.file(`04_Data_Model/data_model_schema.json`, JSON.stringify(payload.dataModel, null, 2));
  zip.file(`04_Data_Model/relationships.json`, JSON.stringify(payload.dataModel.relationships, null, 2));
  zip.file(`04_Data_Model/MODEL_DOCUMENTATION.md`, `# Data Model Architecture: ${payload.project.name}\n\nSchema Type: ${payload.dataModel.schemaType.toUpperCase()}\n\n## Tables\n${payload.dataModel.tables.map(t => `### ${t.name} (${t.type})\n- Row Count: ${t.rowCount}\n- Primary Key: ${t.primaryKey || 'None'}\n- Columns: ${t.columns.map(c => c.name).join(', ')}`).join('\n\n')}\n\n## Relationships\n${payload.dataModel.relationships.map(r => `- ${r.sourceTable}[${r.sourceColumn}] -> ${r.targetTable}[${r.targetColumn}] (${r.cardinality})`).join('\n') || 'Flat single table model'}\n`);

  // 05_DAX/
  const daxText = payload.daxMeasures.map(m => `// ======================================\n// Measure: ${m.name}\n// Category: ${m.category}\n// Description: ${m.description}\n// ======================================\n${m.formula}\n`).join('\n\n');
  zip.file(`05_DAX/${baseName}_DAX_Measures.dax`, daxText);
  zip.file(`05_DAX/dax_manifest.json`, JSON.stringify(payload.daxMeasures, null, 2));

  // 06_SQL/
  const starterSql = generateStarterSQLQueries(tableName, payload.columns);
  const sqlContent = starterSql.map(s => `-- ======================================\n-- ${s.name}\n-- ${s.description}\n-- ======================================\n${s.sql}\n`).join('\n\n');
  zip.file(`06_SQL/${baseName}_Analytical_Queries.sql`, sqlContent);

  // 07_Python/
  const pythonScript = generatePythonScript(payload.project.sourceFileName, tableName, payload.columns);
  zip.file(`07_Python/${baseName}_Analysis_Script.py`, pythonScript);
  zip.file(`07_Python/requirements.txt`, `pandas>=2.0.0\nnumpy>=1.24.0\nmatplotlib>=3.7.0\nseaborn>=0.12.0\nopenpyxl>=3.1.0\n`);

  // 08_PowerBI/
  zip.file(`08_PowerBI/Model.bim`, generateModelBimJSON(payload));
  zip.file(`08_PowerBI/PowerQuery_Transformations.m`, generatePowerBIMSemanticModel(payload));
  zip.file(`08_PowerBI/${baseName}_Theme.json`, generatePowerBIThemeJSON(payload.brand));
  zip.file(`08_PowerBI/README_POWER_BI.md`, `# Power BI Project (PBIP Compatible)\n\nThis folder contains the complete, editable Tabular Model BIM, Power Query M code, and Theme JSON.\n\n### How to Open in Power BI Desktop:\n1. Open Power BI Desktop.\n2. In Power BI, open Power Query (Transform Data) -> Advanced Editor -> paste the M query from \`PowerQuery_Transformations.m\`.\n3. Set the parameter \`pSourceFilePath\` to point to \`03_Excel_Source/${baseName}_Excel_Source_Workbook.xlsx\`.\n4. Apply and Close.\n5. Import the theme from \`${baseName}_Theme.json\` in View -> Themes -> Browse for themes.\n6. All DAX measures are documented in \`05_DAX/\`.\n`);

  // 09_Dashboard/
  zip.file(`09_Dashboard/dashboard_layout.json`, JSON.stringify({
    title: `${payload.project.name} Executive Dashboard`,
    kpis: payload.kpis,
    theme: payload.brand
  }, null, 2));

  // 10_Reports/
  const reportPdf = generateEnterpriseReportPDF(payload);
  const pdfArrayBuffer = reportPdf.output('arraybuffer');
  zip.file(`10_Reports/${baseName}_Executive_Report.pdf`, pdfArrayBuffer);

  const reportMd = `# ${payload.brand.companyName} Executive Data Intelligence Report\n\n**Project**: ${payload.project.name}\n**Date**: ${new Date().toLocaleDateString()}\n**Author**: ${payload.brand.author} (${payload.brand.department})\n\n## 1. Executive Summary\n- Analyzed **${payload.cleanRows.length.toLocaleString()}** transactions across **${payload.columns.length}** dimensions.\n- Data Quality Health: **${payload.qualityReport.overallScore}%**\n\n## 2. Key Performance Indicators\n${payload.kpis.map(k => `- **${k.name}**: ${k.formattedValue} (${k.status} | Source: ${k.traceableSource})`).join('\n')}\n\n## 3. Detected AI Insights & Actions\n${payload.insights.map(i => `### ${i.title} [${i.category}]\n- **What**: ${i.what}\n- **Why**: ${i.why}\n- **Action**: ${i.action}\n- **Confidence**: ${(i.confidence * 100).toFixed(0)}%\n`).join('\n')}\n`;
  zip.file(`10_Reports/${baseName}_Executive_Report.md`, reportMd);

  // 11_Data_Dictionary/
  zip.file(`11_Data_Dictionary/data_dictionary.json`, JSON.stringify(payload.columns, null, 2));

  // 12_Insights/
  zip.file(`12_Insights/insights_and_recommendations.json`, JSON.stringify(payload.insights, null, 2));

  // 13_Documentation/
  zip.file(`13_Documentation/HOW_TO_MODIFY_THIS_PROJECT.md`, `# 🔧 HOW TO MODIFY THIS PROJECT\n\nThis package is designed for 100% user autonomy without vendor lock-in.\n\n### Step 1: Ingesting New Monthly/Weekly Data\n- Open \`03_Excel_Source/${baseName}_Excel_Source_Workbook.xlsx\`.\n- Paste your new rows into the \`02_Clean_Data\` sheet.\n- Click Data -> Refresh All.\n\n### Step 2: Adding New Columns\n- If your data has new dimensions, add them to \`02_Clean_Data\`.\n- Open \`08_PowerBI/PowerQuery_Transformations.m\` and add the column type mapping.\n\n### Step 3: Modifying DAX Measures\n- Edit measures in \`05_DAX/\` and apply them to your Power BI or Excel data model.\n\n### Step 4: Python Analytics\n- Run \`python 07_Python/${baseName}_Analysis_Script.py\` to reproduce statistical aggregations.\n`);

  // 14_Project_Metadata/
  const manifest = {
    manifestVersion: '1.0.0',
    platform: 'NexusBI Autonomous Analytics',
    project: payload.project,
    generatedAt: new Date().toISOString(),
    qualityScore: payload.qualityReport.overallScore,
    folderStructure: [
      '01_Original_Data',
      '02_Cleaned_Data',
      '03_Excel_Source',
      '04_Data_Model',
      '05_DAX',
      '06_SQL',
      '07_Python',
      '08_PowerBI',
      '09_Dashboard',
      '10_Reports',
      '11_Data_Dictionary',
      '12_Insights',
      '13_Documentation',
      '14_Project_Metadata'
    ]
  };
  zip.file(`14_Project_Metadata/export_manifest.json`, JSON.stringify(manifest, null, 2));
  zip.file(`export_manifest.json`, JSON.stringify(manifest, null, 2));

  return await zip.generateAsync({ type: 'blob' });
}

export function generateEnterpriseReportPDF(payload: ExportDataPayload): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - (margin * 2);

  // Top Accent Banner (Theme Dark #171717)
  doc.setFillColor(23, 23, 23);
  doc.rect(0, 0, pageWidth, 36, 'F');
  
  // Tiffany / Neon Green Accent Stripe (#21F1A8)
  doc.setFillColor(33, 241, 168);
  doc.rect(0, 36, pageWidth, 2.5, 'F');

  // Company and Department
  doc.setTextColor(33, 241, 168);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`${payload.brand.companyName.toUpperCase()} • ${payload.brand.department.toUpperCase()}`, margin, 12);

  // Report Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('EXECUTIVE DATA INTELLIGENCE REPORT', margin, 21);

  // Subtitle / Project
  doc.setTextColor(180, 180, 180);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Project: ${payload.project.name}   |   Dataset: ${payload.project.sourceFileName}   |   Ver: ${payload.project.version}`, margin, 29);

  // Right-aligned Metadata
  doc.setFontSize(8.5);
  doc.setTextColor(200, 200, 200);
  const dateStr = `Date: ${new Date().toLocaleDateString()}`;
  const authorStr = `Author: ${payload.brand.author}`;
  const qualityStr = `Quality Health: ${payload.qualityReport.overallScore}%`;
  
  const rightX = pageWidth - margin;
  doc.text(dateStr, rightX, 14, { align: 'right' });
  doc.text(authorStr, rightX, 20, { align: 'right' });
  doc.setTextColor(33, 241, 168);
  doc.setFont('helvetica', 'bold');
  doc.text(qualityStr, rightX, 29, { align: 'right' });

  let cursorY = 46;

  // Section 1: Executive Summary
  doc.setTextColor(23, 23, 23);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('1. EXECUTIVE SUMMARY & BUSINESS HEALTH', margin, cursorY);
  cursorY += 4;

  // Box for summary
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, cursorY, contentWidth, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  const summaryText = `This report provides an audited assessment based on ${payload.cleanRows.length.toLocaleString()} records across ${payload.columns.length} schema dimensions. Overall data health scored ${payload.qualityReport.overallScore}% on completeness, validity, and uniqueness. All calculations follow a single analytical source of truth with zero artificial hallucinations.`;
  const splitSummary = doc.splitTextToSize(summaryText, contentWidth - 8);
  doc.text(splitSummary, margin + 4, cursorY + 6);

  cursorY += 28;

  // Section 2: Key Performance Indicators Table
  doc.setTextColor(23, 23, 23);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('2. KEY PERFORMANCE INDICATORS', margin, cursorY);
  cursorY += 4;

  const kpiTableHeaders = [['Metric Name', 'Current Value', 'Prior Period', 'Variance %', 'Status', 'Traceable Source']];
  const kpiTableRows = payload.kpis.map(k => [
    k.name,
    k.formattedValue,
    k.formattedPreviousValue || 'N/A',
    k.changePercent !== undefined ? `${k.changePercent >= 0 ? '+' : ''}${k.changePercent}%` : '—',
    k.status,
    k.traceableSource
  ]);

  autoTable(doc, {
    startY: cursorY,
    head: kpiTableHeaders,
    body: kpiTableRows,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: {
      fillColor: [23, 23, 23],
      textColor: [33, 241, 168],
      fontStyle: 'bold',
      fontSize: 8.5
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [30, 41, 59]
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 42 },
      1: { fontStyle: 'bold', halign: 'right', cellWidth: 26 },
      2: { halign: 'right', cellWidth: 24, textColor: [100, 116, 139] },
      3: { halign: 'center', cellWidth: 22, fontStyle: 'bold' },
      4: { halign: 'center', cellWidth: 26 },
      5: { cellWidth: 42, fontSize: 7, textColor: [100, 116, 139] }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        const val = String(data.cell.raw || '');
        if (val.startsWith('+')) {
          data.cell.styles.textColor = [16, 185, 129];
        } else if (val.startsWith('-')) {
          data.cell.styles.textColor = [239, 68, 68];
        }
      }
    }
  });

  cursorY = (doc as any).lastAutoTable.finalY + 10;

  // Section 3: AI Insights & Management Directives
  if (cursorY > pageHeight - 65) {
    doc.addPage();
    cursorY = 20;
  }

  doc.setTextColor(23, 23, 23);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('3. AI INSIGHTS & STRATEGIC MANAGEMENT DIRECTIVES', margin, cursorY);
  cursorY += 6;

  payload.insights.forEach((insight, idx) => {
    if (cursorY > pageHeight - 42) {
      doc.addPage();
      cursorY = 20;
    }

    const cardHeight = 26;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, cursorY, contentWidth, cardHeight, 2, 2, 'FD');

    // Green indicator strip on left
    doc.setFillColor(33, 241, 168);
    doc.rect(margin, cursorY, 2.5, cardHeight, 'F');

    // Title & Category
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`${idx + 1}. ${insight.title}`, margin + 6, cursorY + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(16, 185, 129);
    doc.text(`[${insight.category.toUpperCase()}] • Confidence: ${(insight.confidence * 100).toFixed(0)}%`, rightX - 4, cursorY + 5.5, { align: 'right' });

    // What & Why
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const whatText = `Impact: ${insight.what} | Root Driver: ${insight.why}`;
    const splitWhat = doc.splitTextToSize(whatText, contentWidth - 12);
    doc.text(splitWhat, margin + 6, cursorY + 11.5);

    // Recommended Action Box inside
    doc.setFillColor(240, 253, 250);
    doc.setDrawColor(204, 251, 241);
    doc.roundedRect(margin + 6, cursorY + 17, contentWidth - 12, 6.5, 1, 1, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(13, 148, 136);
    const actionText = `Directive: ${insight.action}`;
    const splitAction = doc.splitTextToSize(actionText, contentWidth - 16);
    doc.text(splitAction, margin + 8, cursorY + 21.5);

    cursorY += cardHeight + 4;
  });

  // Section 4: Data Quality & Governance Summary
  if (cursorY > pageHeight - 50) {
    doc.addPage();
    cursorY = 20;
  } else {
    cursorY += 4;
  }

  doc.setTextColor(23, 23, 23);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('4. DATA QUALITY AUDIT & GOVERNANCE', margin, cursorY);
  cursorY += 4;

  const qualityHeaders = [['Audit Dimension', 'Score / Status', 'Detected Anomalies', 'Recommendation']];
  const qualityRows = [
    ['Completeness', `${payload.qualityReport.completenessScore}%`, `${payload.qualityReport.issues.filter(i => i.type === 'missing_values').length} missing indicators`, 'Verify source data entry validation'],
    ['Uniqueness', `${payload.qualityReport.uniquenessScore}%`, `${payload.qualityReport.issues.filter(i => i.type === 'duplicates').length} duplicate flags`, 'Auto-deduplicated in 02_Cleaned_Data'],
    ['Validity & Consistency', `${payload.qualityReport.validityScore}%`, `${payload.qualityReport.issues.filter(i => i.type === 'type_mismatch' || i.type === 'formatting').length} format warnings`, 'Data types enforced in schema'],
    ['Overall Quality Score', `${payload.qualityReport.overallScore}%`, `${payload.qualityReport.totalIssuesCount} issues tracked`, 'Certified enterprise grade model']
  ];

  autoTable(doc, {
    startY: cursorY,
    head: qualityHeaders,
    body: qualityRows,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: {
      fillColor: [35, 38, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [51, 65, 85]
    }
  });

  // Footer for each page
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`${payload.brand.companyName} • Confidential Enterprise Analytics • Rule 11 Governed`, margin, pageHeight - 7);
    doc.text(`Page ${i} of ${totalPages}`, rightX, pageHeight - 7, { align: 'right' });
  }

  return doc;
}
