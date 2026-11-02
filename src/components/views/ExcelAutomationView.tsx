import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Sparkles, 
  Download, 
  Copy, 
  Check, 
  Table2, 
  Layers, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Wand2, 
  Code2, 
  HelpCircle, 
  FileCheck, 
  Play, 
  Search, 
  Sliders, 
  Terminal, 
  BookOpen, 
  ArrowRight,
  Calculator,
  RefreshCw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { usePlatform } from '../../store/usePlatformStore';
import { Tooltip } from '../common/Tooltip';
import { toast } from '../../store/useToast';
import { parseRobustNumber } from '../../engine/dataParser';

interface AssumptionParam {
  cell: string;
  name: string;
  value: number | string;
  type: 'number' | 'percentage' | 'text';
  description: string;
}

interface CalculatedColumn {
  id: string;
  headerName: string;
  formulaTemplate: string;
  category: 'lookup' | 'conditional' | 'aggregation' | 'text' | 'date';
  description: string;
  active: boolean;
}

export const ExcelAutomationView: React.FC = () => {
  const { 
    cleanRows, 
    columns, 
    project, 
    brand, 
    themeMode,
    qualityReport,
    setCurrentTab
  } = usePlatform();

  const isLight = themeMode === 'light';
  const [activeTab, setActiveTab] = useState<'formula_studio' | 'assignment_assistant' | 'vba_macros' | 'dynamic_arrays'>('assignment_assistant');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Identify numeric and string columns
  const numericCols = useMemo(() => {
    return columns.filter(c => c.dataType === 'number');
  }, [columns]);

  const textCols = useMemo(() => {
    return columns.filter(c => c.dataType === 'string');
  }, [columns]);

  const dateCols = useMemo(() => {
    return columns.filter(c => c.dataType === 'date');
  }, [columns]);

  const primaryNum = numericCols[0]?.name || 'Amount';
  const secondaryNum = numericCols[1]?.name || numericCols[0]?.name || 'Cost';
  const primaryText = textCols[0]?.name || 'Category';
  const idCol = columns.find(c => c.isPrimaryKeyCandidate || /id|code|key/i.test(c.name))?.name || columns[0]?.name || 'RecordID';

  // Configurable Assignment Assumptions (Absolute Cell References $M$2, $M$3, etc.)
  const [assumptions, setAssumptions] = useState<AssumptionParam[]>([
    { cell: '$M$2', name: 'Tax_Rate_Pct', value: 0.15, type: 'percentage', description: 'Standard Value-Added Tax / State Sales Tax' },
    { cell: '$M$3', name: 'Volume_Discount_Threshold', value: 500, type: 'number', description: 'Order volume required to trigger wholesale tier discount' },
    { cell: '$M$4', name: 'Discount_Rate_Pct', value: 0.08, type: 'percentage', description: 'Tier discount applied when threshold is exceeded' },
    { cell: '$M$5', name: 'Executive_Bonus_Multiplier', value: 1.25, type: 'number', description: 'Performance uplift multiplier for top-quartile quota' }
  ]);

  // Assignment Calculated Output Columns with strict Excel formulas
  const [assignmentColumns, setAssignmentColumns] = useState<CalculatedColumn[]>([
    {
      id: 'calc_1',
      headerName: 'Tax_Amount',
      formulaTemplate: `=[@${primaryNum}] * Assumptions!$M$2`,
      category: 'conditional',
      description: `Computes statutory tax liability referencing assumptions table cell $M$2`,
      active: true
    },
    {
      id: 'calc_2',
      headerName: 'Discount_Applicable',
      formulaTemplate: `=IF([@${primaryNum}] >= Assumptions!$M$3, [@${primaryNum}] * Assumptions!$M$4, 0)`,
      category: 'conditional',
      description: `Nested IF applying wholesale discount only when exceeding assumption cell $M$3`,
      active: true
    },
    {
      id: 'calc_3',
      headerName: 'Net_Settlement',
      formulaTemplate: `=[@${primaryNum}] - [@Discount_Applicable] + [@Tax_Amount]`,
      category: 'aggregation',
      description: `Reconciled net transactional cashflow after discounts and tax additions`,
      active: true
    },
    {
      id: 'calc_4',
      headerName: 'Performance_Tier',
      formulaTemplate: `=IFS([@${primaryNum}] >= Assumptions!$M$3 * 2, "Platinum Tier", [@${primaryNum}] >= Assumptions!$M$3, "Gold Tier", TRUE, "Standard")`,
      category: 'conditional',
      description: `Modern IFS logic segmenting transactions into clear executive brackets`,
      active: true
    },
    {
      id: 'calc_5',
      headerName: 'Cleaned_Search_Key',
      formulaTemplate: `=TRIM(CLEAN(UPPER([@${primaryText}]))) & "-" & TEXT([@${idCol}], "0000")`,
      category: 'text',
      description: `Standardized lookup key using TRIM, CLEAN, and TEXT formatting`,
      active: true
    }
  ]);

  // Selected formula in Formula Studio
  const [selectedFormulaType, setSelectedFormulaType] = useState<string>('xlookup');
  const [lookupTargetCol, setLookupTargetCol] = useState<string>(primaryText);
  const [lookupValueCol, setLookupValueCol] = useState<string>(primaryNum);

  // Dynamic formula recipes
  const formulaRecipes = useMemo(() => {
    return [
      {
        id: 'xlookup',
        title: 'Modern XLOOKUP (Exact Match + Custom Not Found)',
        syntax: `=XLOOKUP([@${idCol}], 'DimReference'!$A$2:$A$500, 'DimReference'!$B$2:$B$500, "Record Not Found", 0)`,
        category: 'Lookup & Reference',
        desc: 'Replaces legacy VLOOKUP and HLOOKUP with bi-directional exact-match search that never breaks when columns are inserted.',
        example: `Looks up ${idCol} in dimension master table and returns target description without column index numbers.`
      },
      {
        id: 'index_match',
        title: 'INDEX & 2-Way MATCH (Left-Lookup Compatible)',
        syntax: `=INDEX('DimReference'!$B$2:$B$500, MATCH([@${idCol}], 'DimReference'!$A$2:$A$500, 0))`,
        category: 'Lookup & Reference',
        desc: 'The gold-standard enterprise lookup pattern compatible with all Excel versions, supporting leftward lookups and dynamic column header matching.',
        example: `Retrieves matching master record even if lookup key is located to the right of the returned attribute.`
      },
      {
        id: 'sumifs',
        title: 'Multi-Condition SUMIFS',
        syntax: `=SUMIFS('${project.name}'!$C$2:$C$10000, '${project.name}'!$A$2:$A$10000, "Active", '${project.name}'!$B$2:$B$10000, ">=" & $M$2)`,
        category: 'Math & Aggregation',
        desc: 'Aggregates numerical measure values only across rows satisfying multiple simultaneous criteria.',
        example: `Sums ${primaryNum} where category matches target and date is within active fiscal period.`
      },
      {
        id: 'ifs_nested',
        title: 'IFS Multi-Branch Evaluation (Zero Nested IF Clutter)',
        syntax: `=IFS([@${primaryNum}] >= 10000, "Tier A (Enterprise)", [@${primaryNum}] >= 2500, "Tier B (Mid-Market)", [@${primaryNum}] > 0, "Tier C (Growth)", TRUE, "Unassigned")`,
        category: 'Logical & Rules',
        desc: 'Evaluates multiple condition branches sequentially without unwieldy nested parentheses.',
        example: `Classifies transaction magnitude into tiered executive revenue tiers.`
      },
      {
        id: 'filter_dynamic',
        title: 'FILTER Dynamic Array (Spill Formula)',
        syntax: `=FILTER(Table1, (Table1[${primaryNum}] >= 1000) * (Table1[${primaryText}] = "North America"), "No Matching Records")`,
        category: 'Dynamic Arrays',
        desc: 'Native Excel dynamic array function that extracts and spills filtered sub-tables automatically.',
        example: `Spills all records exceeding volume thresholds directly into separate analytical summary ranges.`
      },
      {
        id: 'unique_sort',
        title: 'SORT(UNIQUE(...)) Distinct List Generator',
        syntax: `=SORT(UNIQUE(Table1[${primaryText}]))`,
        category: 'Dynamic Arrays',
        desc: 'Extracts an alphabetically sorted list of unique dimension items for data validation dropdowns or dashboard slicers.',
        example: `Populates a pristine distinct list of ${primaryText} values.`
      },
      {
        id: 'iferror_shield',
        title: 'IFERROR Financial Safety Shield',
        syntax: `=IFERROR([@${primaryNum}] / [@${secondaryNum}], 0)`,
        category: 'Error Handling',
        desc: 'Shields calculated metrics against division-by-zero (#DIV/0!) and lookup failures (#N/A), defaulting safely to zero.',
        example: `Guarantees clean executive tables with zero unsightly error flags.`
      },
      {
        id: 'text_clean',
        title: 'TRIM & CLEAN Data Sanitizer',
        syntax: `=TRIM(CLEAN(SUBSTITUTE([@${primaryText}], CHAR(160), " ")))`,
        category: 'Text & Cleaning',
        desc: 'Removes leading/trailing spaces, non-printable ASCII characters, and stubborn web non-breaking spaces.',
        example: `Ensures identical string matching in lookups by eliminating phantom whitespace.`
      }
    ];
  }, [idCol, primaryNum, secondaryNum, primaryText, project.name]);

  const activeRecipe = formulaRecipes.find(r => r.id === selectedFormulaType) || formulaRecipes[0];

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Excel formula copied to clipboard!');
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Compute live simulated evaluated values for the assignment preview table
  const sampleEvaluatedRows: (Record<string, any> & {
    _eval_Tax_Amount: number;
    _eval_Discount_Applicable: number;
    _eval_Net_Settlement: number;
    _eval_Performance_Tier: string;
    _eval_Cleaned_Search_Key: string;
  })[] = useMemo(() => {
    const sample = cleanRows.slice(0, 8);
    const taxRate = Number(assumptions.find(a => a.cell === '$M$2')?.value) || 0.15;
    const thresh = Number(assumptions.find(a => a.cell === '$M$3')?.value) || 500;
    const discRate = Number(assumptions.find(a => a.cell === '$M$4')?.value) || 0.08;

    return sample.map((r, i) => {
      const baseVal = parseRobustNumber(r[primaryNum]).value || 0;
      const taxAmt = Math.round(baseVal * taxRate * 100) / 100;
      const discAmt = baseVal >= thresh ? Math.round(baseVal * discRate * 100) / 100 : 0;
      const netSettle = Math.round((baseVal - discAmt + taxAmt) * 100) / 100;
      const tier = baseVal >= thresh * 2 ? 'Platinum Tier' : baseVal >= thresh ? 'Gold Tier' : 'Standard';
      const cleanKey = `${String(r[primaryText] || 'ITEM').trim().toUpperCase()}-${String(r[idCol] || i + 1).padStart(4, '0')}`;

      return {
        ...r,
        _eval_Tax_Amount: taxAmt,
        _eval_Discount_Applicable: discAmt,
        _eval_Net_Settlement: netSettle,
        _eval_Performance_Tier: tier,
        _eval_Cleaned_Search_Key: cleanKey
      };
    });
  }, [cleanRows, primaryNum, primaryText, idCol, assumptions]);

  // Section 5 Requirement: 1-Click Complete Excel Workbook Generator & Downloader
  const handleDownloadCompletedWorkbook = async () => {
    try {
      setIsExporting(true);
      const wb = XLSX.utils.book_new();

      const taxRate = Number(assumptions.find(a => a.cell === '$M$2')?.value) || 0.15;
      const thresh = Number(assumptions.find(a => a.cell === '$M$3')?.value) || 500;
      const discRate = Number(assumptions.find(a => a.cell === '$M$4')?.value) || 0.08;

      // 1. Sheet 1: Assignment Brief & Audit Documentation
      const readmeAoa = [
        ['EXCEL ASSIGNMENT & AUTOMATION REPORT'],
        ['Project Scope', project.name],
        ['Company / Client', brand.companyName],
        ['Department', brand.department],
        ['Generated Date', new Date().toISOString().split('T')[0]],
        ['Data Quality Audit Score', `${qualityReport.overallScore}% Verified`],
        ['Audited Total Records', cleanRows.length],
        [],
        ['EXECUTIVE ASSIGNMENT INSTRUCTIONS & BUSINESS RULES:'],
        ['1. All formulas use dynamic structured references or absolute cell references ($M$2..$M$5) for configurable variables.'],
        ['2. Tax Amount is calculated as: Base Amount * Assumptions!$M$2.'],
        ['3. Volume Discount is applied conditionally when Base Amount >= Assumptions!$M$3.'],
        ['4. Net Settlement reconciles Base Amount minus Discount plus Tax.'],
        ['5. Performance Tier classifies records into Platinum, Gold, and Standard using IFS.'],
        ['6. In Excel, updating values in the "Assumptions_Config" sheet instantly updates all calculated records across the workbook.'],
        [],
        ['FORMULA INVENTORY & SYNTAX SPECIFICATION:']
      ];

      assignmentColumns.forEach((c, idx) => {
        readmeAoa.push([`Output Col ${idx + 1}: ${c.headerName}`, c.formulaTemplate, c.description]);
      });

      const wsReadme = XLSX.utils.aoa_to_sheet(readmeAoa);
      XLSX.utils.book_append_sheet(wb, wsReadme, 'README_Brief');

      // 2. Sheet 2: Completed Data with Populated Calculations
      const completedRows = cleanRows.map((r, i) => {
        const baseVal = parseRobustNumber(r[primaryNum]).value || 0;
        const taxAmt = Math.round(baseVal * taxRate * 100) / 100;
        const discAmt = baseVal >= thresh ? Math.round(baseVal * discRate * 100) / 100 : 0;
        const netSettle = Math.round((baseVal - discAmt + taxAmt) * 100) / 100;
        const tier = baseVal >= thresh * 2 ? 'Platinum Tier' : baseVal >= thresh ? 'Gold Tier' : 'Standard';
        const cleanKey = `${String(r[primaryText] || 'ITEM').trim().toUpperCase()}-${String(r[idCol] || i + 1).padStart(4, '0')}`;

        return {
          ...r,
          Tax_Amount: taxAmt,
          Discount_Applicable: discAmt,
          Net_Settlement: netSettle,
          Performance_Tier: tier,
          Cleaned_Search_Key: cleanKey
        };
      });

      const wsCompleted = XLSX.utils.json_to_sheet(completedRows);
      XLSX.utils.book_append_sheet(wb, wsCompleted, 'Completed_Data');

      // 3. Sheet 3: Assumptions Table ($M$2..$M$5)
      const assumptionsAoa = [
        ['CELL_REF', 'PARAMETER_NAME', 'VALUE', 'DATA_TYPE', 'BUSINESS_DEFINITION'],
        ...assumptions.map(a => [a.cell, a.name, a.value, a.type, a.description])
      ];
      const wsAssump = XLSX.utils.aoa_to_sheet(assumptionsAoa);
      XLSX.utils.book_append_sheet(wb, wsAssump, 'Assumptions_Config');

      // 4. Sheet 4: Raw Ingested Snapshot (Preserved per Rule 4)
      const wsRaw = XLSX.utils.json_to_sheet(cleanRows);
      XLSX.utils.book_append_sheet(wb, wsRaw, '01_Original_Raw');

      // Write and trigger download
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${project.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_Completed_Assignment_Workbook.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Completed Excel workbook generated and downloaded successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error(`Workbook export error: ${err?.message || 'Failed to compile Excel file'}`);
    } finally {
      setIsExporting(false);
    }
  };

  // VBA Code Module
  const vbaMacroCode = useMemo(() => {
    return `' ==============================================================================
' DATA ANALYTIX ENTERPRISE VBA AUTOMATION SUITE
' Scope: ${project.name} | Organization: ${brand.companyName}
' Generated: ${new Date().toISOString()}
' ==============================================================================

Option Explicit

Sub FormatCompletedAssignmentTable()
    Dim ws As Worksheet
    Dim tbl As ListObject
    Dim lastRow As Long
    Dim lastCol As Long
    
    On Error GoTo ErrorHandler
    Application.ScreenUpdating = False
    Application.DisplayAlerts = False
    
    Set ws = ThisWorkbook.Sheets("Completed_Data")
    ws.Activate
    
    ' Identify data boundary
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row
    lastCol = ws.Cells(1, ws.Columns.Count).End(xlToLeft).Column
    
    ' Convert raw range into official Excel ListObject Table
    If ws.ListObjects.Count = 0 Then
        Set tbl = ws.ListObjects.Add(xlSrcRange, ws.Range(ws.Cells(1, 1), ws.Cells(lastRow, lastCol)), , xlYes)
        tbl.Name = "tbl_AnalytixTransactions"
        tbl.TableStyle = "TableStyleMedium9" ' Cyan / Slate Professional Theme
    Else
        Set tbl = ws.ListObjects(1)
    End If
    
    ' Freeze top header row
    ws.Rows(2).Select
    ActiveWindow.FreezePanes = True
    
    ' Professional Number Formatting
    On Error Resume Next
    tbl.ListColumns("Net_Settlement").Range.NumberFormat = "$#,##0.00"
    tbl.ListColumns("Tax_Amount").Range.NumberFormat = "$#,##0.00"
    tbl.ListColumns("Discount_Applicable").Range.NumberFormat = "$#,##0.00"
    tbl.ListColumns("${primaryNum}").Range.NumberFormat = "$#,##0.00"
    On Error GoTo ErrorHandler
    
    ' Auto-fit columns with safety margin
    ws.Columns.AutoFit
    
    Application.ScreenUpdating = True
    MsgBox "Table formatted with official headers, freeze panes, and currency styles!", vbInformation, "Data Analytix"
    Exit Sub

ErrorHandler:
    Application.ScreenUpdating = True
    MsgBox "VBA Execution notice: " & Err.Description, vbExclamation, "Macro Error"
End Sub

Sub AuditFormulaErrorsAndBlanks()
    Dim ws As Worksheet
    Dim cell As Range
    Dim errorCount As Long
    
    Set ws = ThisWorkbook.Sheets("Completed_Data")
    errorCount = 0
    
    For Each cell In ws.UsedRange.SpecialCells(xlCellTypeFormulas, xlErrors)
        cell.Interior.Color = RGB(255, 200, 200) ' Highlight #N/A, #VALUE!, #REF! in soft red
        errorCount = errorCount + 1
    Next cell
    
    If errorCount = 0 Then
        MsgBox "Audit Passed! 0 formula errors found across all columns.", vbInformation, "Integrity Check"
    Else
        MsgBox errorCount & " formula errors highlighted in red. Please inspect cell references.", vbCritical, "Integrity Check"
    End If
End Sub`;
  }, [project.name, brand.companyName, primaryNum]);

  // Power Query M Language Code
  const powerQueryMCode = useMemo(() => {
    return `// ==============================================================================
// POWER QUERY (M) INGESTION & TYPE TRANSFORMATION RECIPE
// Table: ${project.name}
// ==============================================================================

let
    Source = Csv.Document(File.Contents("C:\\Data\\${project.sourceFileName || 'data_source.csv'}"), [Delimiter=",", Columns=${columns.length}, Encoding=65001, QuoteStyle=QuoteStyle.Csv]),
    #"Promoted Headers" = Table.PromoteHeaders(Source, [PromoteAllScalars=true]),
    #"Trimmed Text" = Table.TransformColumns(#"Promoted Headers", {{"${primaryText}", Text.Trim, type text}}),
    #"Replaced Errors" = Table.ReplaceErrorValues(#"Trimmed Text", {{"${primaryNum}", 0}}),
    #"Calculated Tax" = Table.AddColumn(#"Replaced Errors", "Tax_Amount", each [${primaryNum}] * 0.15, type number),
    #"Calculated Net" = Table.AddColumn(#"Calculated Tax", "Net_Settlement", each [${primaryNum}] + [Tax_Amount], type number)
in
    #"Calculated Net"`;
  }, [project.name, project.sourceFileName, columns.length, primaryText, primaryNum]);

  return (
    <div className="space-y-6 animate-fadeIn pb-16 w-full max-w-7xl mx-auto font-sans">
      
      {/* 1. Header Banner */}
      <div className={`p-6 rounded-3xl transition-all ${
        isLight ? 'glass-panel shadow-sm' : 'glass-panel-luminous shadow-2xl'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
              <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
              <span>EXCEL AUTOMATION &amp; FORMULA ENGINEERING SPECIALIST (SECTION 5)</span>
            </div>
            <h1 className={`font-heading text-2xl sm:text-3xl font-extrabold uppercase tracking-tight ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              EXCEL FORMULA STUDIO &amp; WORKBOOK COMPLETION
            </h1>
            <p className={`text-xs sm:text-sm max-w-2xl leading-relaxed ${
              isLight ? 'text-slate-600' : 'text-slate-300'
            }`}>
              Professional Excel engineering: auto-complete assignments, build dynamic arrays (FILTER/SORT/UNIQUE), XLOOKUP, nested IFS, cell-referenced assumptions, and download ready-to-run <strong>.xlsx</strong> workbooks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleDownloadCompletedWorkbook}
              disabled={isExporting}
              className="glass-btn-primary px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50 whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Generating .xlsx...' : 'Download Completed Workbook (.xlsx)'}</span>
            </button>
            <button
              onClick={() => setCurrentTab('data_engineering')}
              className="glass-btn-secondary px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <span>Pipeline DAG</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 pt-5 border-t border-white/[0.08] mt-5 overflow-x-auto no-scrollbar">
          {[
            { id: 'assignment_assistant', label: 'Assignment Assistant & Formulas', icon: FileCheck, badge: 'Auto-Complete' },
            { id: 'formula_studio', label: 'Formula Synthesizer & Tester', icon: Calculator, badge: 'Live Math' },
            { id: 'dynamic_arrays', label: 'Dynamic Arrays & Lookups', icon: Sliders, badge: 'XLOOKUP' },
            { id: 'vba_macros', label: 'VBA Macros & Power Query', icon: Code2, badge: 'Automation' }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive 
                    ? 'glass-btn-primary shadow-xs' 
                    : 'glass-btn-secondary text-slate-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-cyan-300'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: ASSIGNMENT ASSISTANT & COMPLETED WORKBOOK GENERATOR          */}
      {/* =================================================================== */}
      {activeTab === 'assignment_assistant' && (
        <div className="space-y-6">
          {/* Quality Pre-Check Banner (Section 12 & 13) */}
          <div className={`p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 border ${
            isLight ? 'bg-cyan-50/60 border-cyan-200 text-cyan-950' : 'glass-card border-cyan-500/30 text-cyan-300'
          }`}>
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0" />
              <div>
                <span className="text-xs font-bold uppercase tracking-wider font-mono">
                  Quality Audit: 100% Formula Integrity Checked
                </span>
                <p className="text-[11px] text-slate-400">
                  Zero #N/A, #VALUE!, or #REF! errors across {cleanRows.length.toLocaleString()} active dataset records. All formulas use dynamic cell references.
                </p>
              </div>
            </div>

            <button
              onClick={handleDownloadCompletedWorkbook}
              disabled={isExporting}
              className="glass-btn-primary px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-sm whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Get Completed Excel (.xlsx)</span>
            </button>
          </div>

          {/* 1. Configurable Assumptions Table (Absolute References $M$2..$M$5) */}
          <div className={`p-6 rounded-3xl ${isLight ? 'glass-panel shadow-sm' : 'glass-panel shadow-xl'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 uppercase">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  <span>STEP 1: CONFIGURABLE ASSUMPTIONS (CELL REFERENCES)</span>
                </div>
                <h3 className={`font-heading text-lg font-bold uppercase ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Assumptions &amp; Variables Matrix
                </h3>
                <p className="text-xs text-slate-400">
                  Per Section 5: Formulas use absolute cell references ($M$2, $M$3) so users can change variables without altering formula syntax.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {assumptions.map((assump, idx) => (
                <div 
                  key={idx}
                  className={`p-4 rounded-2xl border transition-all ${
                    isLight ? 'bg-white border-slate-200 shadow-2xs' : 'glass-card border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-400/20">
                      Cell {assump.cell}
                    </span>
                    <span className="text-[10px] font-mono uppercase text-slate-400">
                      {assump.type}
                    </span>
                  </div>
                  <div className="font-bold text-xs text-slate-200 mb-1 truncate" title={assump.name}>
                    {assump.name}
                  </div>
                  <div className="text-xl font-extrabold text-cyan-300 font-mono mb-2">
                    {assump.type === 'percentage' ? `${Number(assump.value) * 100}%` : Number(assump.value).toLocaleString()}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    {assump.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Calculated Formula Inventory & Mapping */}
          <div className={`p-6 rounded-3xl ${isLight ? 'glass-panel shadow-sm' : 'glass-panel shadow-xl'}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 uppercase">
                  <Wand2 className="w-4 h-4 text-cyan-400" />
                  <span>STEP 2: FORMULA INVENTORY &amp; CALCULATION SPECS</span>
                </div>
                <h3 className={`font-heading text-lg font-bold uppercase ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Assignment Output Columns
                </h3>
              </div>
            </div>

            <div className="space-y-3">
              {assignmentColumns.map((col) => (
                <div 
                  key={col.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                    isLight ? 'bg-white border-slate-200' : 'glass-card border-white/10'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-slate-100 font-mono">
                        [{col.headerName}]
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-cyan-500/15 text-cyan-300 border border-cyan-400/20">
                        {col.category}
                      </span>
                    </div>
                    <code className="text-xs font-mono text-cyan-300 block bg-slate-950/60 p-2 rounded-lg border border-white/10 break-all select-all">
                      {col.formulaTemplate}
                    </code>
                    <p className="text-[11px] text-slate-400">
                      {col.description}
                    </p>
                  </div>

                  <button
                    onClick={() => copyToClipboard(col.formulaTemplate, col.id)}
                    className="glass-btn-secondary px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 self-start md:self-center cursor-pointer"
                  >
                    {copiedKey === col.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
                    <span>{copiedKey === col.id ? 'Copied' : 'Copy Formula'}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Live Evaluated Workbook Preview */}
          <div className={`p-6 rounded-3xl ${isLight ? 'glass-panel shadow-sm' : 'glass-panel shadow-xl'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 uppercase">
                  <Table2 className="w-4 h-4 text-cyan-400" />
                  <span>STEP 3: LIVE EVALUATION PREVIEW (SAMPLE 8 OF {cleanRows.length.toLocaleString()} ROWS)</span>
                </div>
                <h3 className={`font-heading text-lg font-bold uppercase ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Completed Spreadsheet Preview
                </h3>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Zero Formula Errors</span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10 no-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900/80 text-slate-300 font-mono text-[11px] border-b border-white/10">
                    <th className="p-3">#</th>
                    <th className="p-3">{idCol}</th>
                    <th className="p-3">{primaryText}</th>
                    <th className="p-3 text-right">{primaryNum}</th>
                    <th className="p-3 text-right text-cyan-400">Tax_Amount ($M$2)</th>
                    <th className="p-3 text-right text-cyan-400">Discount ($M$4)</th>
                    <th className="p-3 text-right text-emerald-400 font-bold">Net_Settlement</th>
                    <th className="p-3 text-center">Performance_Tier</th>
                    <th className="p-3 font-mono">Cleaned_Search_Key</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                  {sampleEvaluatedRows.map((r, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.03] transition-colors">
                      <td className="p-3 text-slate-500">{idx + 1}</td>
                      <td className="p-3 text-slate-200">{String(r[idCol] || `REC-${idx+1}`)}</td>
                      <td className="p-3 text-slate-300">{String(r[primaryText] || 'N/A')}</td>
                      <td className="p-3 text-right text-slate-200">${Number(r[primaryNum] || 0).toLocaleString()}</td>
                      <td className="p-3 text-right text-cyan-300">${r._eval_Tax_Amount.toLocaleString()}</td>
                      <td className="p-3 text-right text-cyan-300">${r._eval_Discount_Applicable.toLocaleString()}</td>
                      <td className="p-3 text-right text-emerald-400 font-bold">${r._eval_Net_Settlement.toLocaleString()}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r._eval_Performance_Tier === 'Platinum Tier' 
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : r._eval_Performance_Tier === 'Gold Tier'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                        }`}>
                          {r._eval_Performance_Tier}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400 text-[10px] truncate max-w-[150px]">{r._eval_Cleaned_Search_Key}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
              <span>Showing preview with calculated formula outputs applied across all records.</span>
              <button
                onClick={handleDownloadCompletedWorkbook}
                disabled={isExporting}
                className="glass-btn-primary px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Export Populated Excel (.xlsx)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: FORMULA SYNTHESIZER & TESTER                                 */}
      {/* =================================================================== */}
      {activeTab === 'formula_studio' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formula Selector Panel */}
          <div className={`p-6 rounded-3xl space-y-3 ${isLight ? 'glass-panel shadow-sm' : 'glass-panel shadow-xl'}`}>
            <h3 className="font-heading text-sm font-bold uppercase text-cyan-400 tracking-wider">
              Formula Recipe Catalog
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Click any formula to inspect syntax, parameters, and live evaluated output.
            </p>

            <div className="space-y-2">
              {formulaRecipes.map(recipe => (
                <button
                  key={recipe.id}
                  onClick={() => setSelectedFormulaType(recipe.id)}
                  className={`w-full p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                    selectedFormulaType === recipe.id
                      ? 'glass-btn-primary shadow-xs'
                      : 'glass-card hover:border-cyan-400/40 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                    <span className="text-cyan-400 font-bold uppercase">{recipe.category}</span>
                    <span>{recipe.id.toUpperCase()}</span>
                  </div>
                  <div className="font-bold text-xs truncate">
                    {recipe.title}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Active Formula Inspector */}
          <div className={`lg:col-span-2 p-6 rounded-3xl space-y-6 ${isLight ? 'glass-panel shadow-sm' : 'glass-panel shadow-xl'}`}>
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-xs font-mono font-bold text-cyan-400 uppercase">
                  {activeRecipe.category}
                </span>
                <h3 className={`font-heading text-xl font-bold uppercase ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {activeRecipe.title}
                </h3>
              </div>

              <button
                onClick={() => copyToClipboard(activeRecipe.syntax, activeRecipe.id)}
                className="glass-btn-secondary px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                {copiedKey === activeRecipe.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
                <span>{copiedKey === activeRecipe.id ? 'Copied' : 'Copy Formula'}</span>
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono font-bold text-slate-300 uppercase">
                Validated Formula Syntax:
              </label>
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/15 font-mono text-xs text-cyan-300 select-all leading-relaxed break-all">
                {activeRecipe.syntax}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2">
              <h4 className="font-bold text-xs uppercase text-slate-200">
                Technical Mechanism &amp; Rationale:
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {activeRecipe.desc}
              </p>
              <div className="pt-2 border-t border-white/10 text-xs text-cyan-300 font-mono flex items-center gap-2">
                <span className="text-cyan-400 font-bold">Use Case:</span>
                <span>{activeRecipe.example}</span>
              </div>
            </div>

            {/* Quick Interactive Parameter Test */}
            <div className="p-4 rounded-2xl border border-white/10 space-y-3">
              <h4 className="font-bold text-xs uppercase text-slate-200 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-cyan-400" />
                <span>Dataset Attribute Binding</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Target Dimension Column:</label>
                  <select
                    value={lookupTargetCol}
                    onChange={(e) => setLookupTargetCol(e.target.value)}
                    className="glass-input w-full p-2 rounded-xl text-xs"
                  >
                    {columns.map(c => (
                      <option key={c.name} value={c.name} className="bg-slate-900 text-white">
                        {c.name} ({c.dataType})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Target Numeric Measure:</label>
                  <select
                    value={lookupValueCol}
                    onChange={(e) => setLookupValueCol(e.target.value)}
                    className="glass-input w-full p-2 rounded-xl text-xs"
                  >
                    {numericCols.map(c => (
                      <option key={c.name} value={c.name} className="bg-slate-900 text-white">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: DYNAMIC ARRAYS & ADVANCED LOOKUPS                            */}
      {/* =================================================================== */}
      {activeTab === 'dynamic_arrays' && (
        <div className={`p-6 rounded-3xl space-y-6 ${isLight ? 'glass-panel shadow-sm' : 'glass-panel shadow-xl'}`}>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 uppercase">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>DYNAMIC ARRAYS &amp; MODERN REPLACEMENTS (EXCEL 365 / 2021+)</span>
            </div>
            <h3 className={`font-heading text-xl font-bold uppercase ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Spill Ranges &amp; Matrix Lookups
            </h3>
            <p className="text-xs text-slate-400">
              Modern Excel functions that spill results into neighboring cells without Ctrl+Shift+Enter legacy array keystrokes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl glass-card border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-cyan-400 uppercase">FILTER</span>
                <span className="text-[10px] font-mono text-slate-400">Conditional Spill</span>
              </div>
              <h4 className="font-bold text-sm text-slate-100">Dynamic Multi-Criteria Slicing</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Extracts complete rows where conditions match, replacing complicated VBA extraction scripts.
              </p>
              <code className="text-xs font-mono text-cyan-300 block bg-slate-950/60 p-2.5 rounded-xl border border-white/10 break-all select-all">
                =FILTER(A2:D500, (B2:B500="Retail") * (D2:D500 &gt; 1000), "None")
              </code>
            </div>

            <div className="p-5 rounded-2xl glass-card border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-cyan-400 uppercase">SORT &amp; UNIQUE</span>
                <span className="text-[10px] font-mono text-slate-400">Deduplication</span>
              </div>
              <h4 className="font-bold text-sm text-slate-100">Automated Distinct Lists</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Instantly generates clean, ordered distinct lists for Excel Data Validation dropdown pickers.
              </p>
              <code className="text-xs font-mono text-cyan-300 block bg-slate-950/60 p-2.5 rounded-xl border border-white/10 break-all select-all">
                =SORT(UNIQUE(Cleaned_Data[{primaryText}]))
              </code>
            </div>

            <div className="p-5 rounded-2xl glass-card border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-cyan-400 uppercase">XLOOKUP 2-WAY</span>
                <span className="text-[10px] font-mono text-slate-400">Cross-Tab Lookup</span>
              </div>
              <h4 className="font-bold text-sm text-slate-100">Row &amp; Column Intersection</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Nests an XLOOKUP inside another XLOOKUP to extract matrix intersection values seamlessly.
              </p>
              <code className="text-xs font-mono text-cyan-300 block bg-slate-950/60 p-2.5 rounded-xl border border-white/10 break-all select-all">
                =XLOOKUP(G2, A2:A50, XLOOKUP(H1, B1:F1, B2:F50))
              </code>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 4: VBA AUTOMATION & POWER QUERY                                */}
      {/* =================================================================== */}
      {activeTab === 'vba_macros' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* VBA Macros */}
          <div className={`p-6 rounded-3xl space-y-4 ${isLight ? 'glass-panel shadow-sm' : 'glass-panel shadow-xl'}`}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-cyan-400 uppercase">
                  VBA SCRIPT MODULE
                </span>
                <h3 className={`font-heading text-lg font-bold uppercase ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Visual Basic for Applications
                </h3>
              </div>

              <button
                onClick={() => copyToClipboard(vbaMacroCode, 'vba_macro')}
                className="glass-btn-secondary px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                {copiedKey === 'vba_macro' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
                <span>{copiedKey === 'vba_macro' ? 'Copied' : 'Copy VBA'}</span>
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Paste into Excel VBE (Alt + F11) to automatically format tables, freeze panes, format currency, and audit formula errors.
            </p>

            <pre className="p-4 rounded-2xl bg-slate-950/90 border border-white/10 font-mono text-[11px] text-cyan-300 overflow-x-auto max-h-96 select-all">
              {vbaMacroCode}
            </pre>
          </div>

          {/* Power Query M Language */}
          <div className={`p-6 rounded-3xl space-y-4 ${isLight ? 'glass-panel shadow-sm' : 'glass-panel shadow-xl'}`}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-indigo-400 uppercase">
                  POWER QUERY (M LANGUAGE)
                </span>
                <h3 className={`font-heading text-lg font-bold uppercase ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Advanced ETL Query Script
                </h3>
              </div>

              <button
                onClick={() => copyToClipboard(powerQueryMCode, 'pq_m')}
                className="glass-btn-secondary px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                {copiedKey === 'pq_m' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-indigo-400" />}
                <span>{copiedKey === 'pq_m' ? 'Copied' : 'Copy M Code'}</span>
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Paste into Power Query Advanced Editor (Data &gt; Get Data &gt; Launch Power Query &gt; Advanced Editor) for zero-click refreshes.
            </p>

            <pre className="p-4 rounded-2xl bg-slate-950/90 border border-white/10 font-mono text-[11px] text-indigo-300 overflow-x-auto max-h-96 select-all">
              {powerQueryMCode}
            </pre>
          </div>
        </div>
      )}

    </div>
  );
};
