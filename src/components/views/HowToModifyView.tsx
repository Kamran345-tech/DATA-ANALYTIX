import React from 'react';
import { 
  Wrench, 
  FileSpreadsheet, 
  PlusCircle, 
  RotateCw, 
  Network, 
  Code2, 
  FolderDown, 
  CheckCircle2,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';

export const HowToModifyView: React.FC = () => {
  const { project, brand } = usePlatform();

  const steps = [
    {
      step: '01',
      title: 'Update or Replace Source Data',
      desc: 'When next month or week arrives, open the exported Excel workbook in 03_Excel_Source/ or upload the new file into NexusBI. Paste new transaction rows directly into the "02_Clean_Data" sheet.',
      tip: 'Keep column header names in Row 1 identical to avoid breaking measure dependencies.'
    },
    {
      step: '02',
      title: 'Handling Newly Added Columns',
      desc: 'If new business dimensions are added (e.g. SalesChannel, DiscountCode), NexusBI automatically detects them, profiles their cardinality and type, and prompts whether to map them as a dimension or measure.',
      tip: 'In Power BI, open Advanced Editor and add the column type to PowerQuery_Transformations.m.'
    },
    {
      step: '03',
      title: 'One-Click Power Query Refresh',
      desc: 'In Power BI Desktop, click "Refresh Data". The parameter pSourceFilePath will dynamically reload all updated rows from your Excel source table.',
      tip: 'All connected pivot tables and visual charts will automatically re-aggregate.'
    },
    {
      step: '04',
      title: 'Updating DAX Measures & KPIs',
      desc: 'Use the DAX Lab in NexusBI or edit the .dax files in 05_DAX/. Because all measures use explicit syntax (e.g. Total Revenue = SUM(\'FactTable\'[Revenue])), they seamlessly reflect newly ingested periods.',
      tip: 'Time Intelligence formulas like TOTALYTD and SAMEPERIODLASTYEAR recalculate on the updated date dimension.'
    },
    {
      step: '05',
      title: 'Customizing Themes & Branding',
      desc: 'Change company name, logo, or theme colors in Settings. Download the generated Theme.json and apply it in Power BI (View -> Themes -> Browse for themes).',
      tip: 'Theme adjustments do not touch calculations, relationships, or SQL code.'
    },
    {
      step: '06',
      title: 'Exporting Next Version Package',
      desc: 'Click "DOWNLOAD COMPLETE PROJECT" in the Export Center. The system bumps the project version (e.g. v1.1.0) and generates an updated 14-folder archive with export_manifest.json.',
      tip: 'Original immutable raw data is always archived in 01_Original_Data/.'
    }
  ];

  return (
    <div className="space-y-8 pb-16 animate-fadeIn max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#21F1A8] font-mono">
            <Wrench className="w-4 h-4" /> Sovereign User Autonomy Manual
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-white tracking-wide uppercase">
            🔧 HOW TO MODIFY THIS PROJECT
          </h1>
          <p className="text-xs text-gray-400">
            Mandatory operating procedure for ongoing maintenance, monthly data refreshes, and independent developer handoff.
          </p>
        </div>
      </div>

      {/* Guide Steps */}
      <div className="space-y-4">
        {steps.map(s => (
          <div 
            key={s.step}
            className="p-6 rounded-2xl bg-[#1c1c1c] border border-[#2d2d2d] space-y-3 hover:border-[#21F1A8]/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-[#21F1A8]/10 text-[#21F1A8] font-heading text-lg font-bold flex items-center justify-center border border-[#21F1A8]/30">
                {s.step}
              </span>
              <h3 className="font-heading text-xl font-bold text-white uppercase tracking-wide">
                {s.title}
              </h3>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed pl-11">
              {s.desc}
            </p>

            <div className="ml-11 p-3 rounded-xl bg-[#141414] border border-[#262626] text-xs font-mono text-[#21F1A8] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Best Practice: {s.tip}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
