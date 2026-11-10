import {
  computeBarChartData,
  computeLineSeriesData,
  computeScatterPlotData,
  computeHistogramBins,
  computeStackedBarData,
  computeDonutChartData,
  computeHeatmapMatrixData,
  computeBoxplotSummary,
} from '../engine/chartRecommendationEngine';
import { buildSopFileName, DESIGN_TOKENS } from '../config/designTokens';

export interface PlottedCSVData {
  headers: string[];
  rows: (string | number)[][];
}

export function sanitizeExportFilename(raw: string, ext: 'csv' | 'png', datasetName?: string): string {
  const cleaned = (raw || 'chart')
    .replace(/\.(csv|png)$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (cleaned.startsWith('data-analytix-') && /\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return `${cleaned}.${ext}`;
  }
  return buildSopFileName(`chart-${cleaned || 'visual'}`, datasetName || 'dataset', ext);
}

export function formatCSVContent(headers: string[], rows: (string | number)[][]): string {
  const escapeCell = (val: string | number): string => {
    const str = val === null || val === undefined ? '' : String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [
    headers.map(escapeCell).join(','),
    ...rows.map(row => row.map(escapeCell).join(',')),
  ];
  return lines.join('\n');
}

export function buildGuideChartPlottedCSV(params: {
  chartType: string;
  rows: Record<string, any>[];
  categoryField: string;
  secondaryCategoryField?: string;
  valueField: string;
  secondaryValueField?: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'max' | 'min';
  fallbackItems?: { category: string; value: number; share: number }[];
}): PlottedCSVData {
  const {
    chartType,
    rows,
    categoryField,
    secondaryCategoryField,
    valueField,
    secondaryValueField,
    aggregation = 'sum',
    fallbackItems,
  } = params;

  switch (chartType) {
    case 'bar': {
      const res = computeBarChartData(rows, categoryField, valueField, aggregation, 10);
      return {
        headers: [categoryField || 'Category', `${aggregation.toUpperCase()}(${valueField || 'Value'})`, 'Share (%)', 'Row Count'],
        rows: res.items.map(it => [it.category, it.value, it.share, it.count]),
      };
    }
    case 'line': {
      const res = computeLineSeriesData(rows, categoryField, valueField, aggregation === 'avg' ? 'avg' : 'sum');
      return {
        headers: [categoryField || 'Date', valueField || 'Value', 'Row Count'],
        rows: res.points.map(pt => [pt.label, pt.value, pt.count]),
      };
    }
    case 'scatter': {
      const xField = valueField || 'X';
      const yField = secondaryValueField || valueField || 'Y';
      const res = computeScatterPlotData(rows, xField, yField, categoryField);
      return {
        headers: [xField, yField, categoryField || 'Label'],
        rows: res.points.map(pt => [pt.x, pt.y, pt.label]),
      };
    }
    case 'histogram': {
      const res = computeHistogramBins(rows, valueField);
      return {
        headers: ['Bin Range', 'Bin Start', 'Bin End', 'Count', 'Share (%)'],
        rows: res.bins.map(b => [b.label, b.x0, b.x1, b.count, b.frequencyPct]),
      };
    }
    case 'stacked_bar': {
      const secCat = secondaryCategoryField || categoryField;
      const res = computeStackedBarData(rows, categoryField, secCat, valueField, aggregation);
      return {
        headers: [categoryField || 'Category', ...res.seriesKeys, 'Total'],
        rows: res.categories.map(g => [
          g.category,
          ...res.seriesKeys.map(s => {
            const found = g.segments.find(seg => seg.key === s);
            return found ? found.value : 0;
          }),
          g.total,
        ]),
      };
    }
    case 'donut': {
      const res = computeDonutChartData(rows, categoryField, valueField, aggregation, 5);
      return {
        headers: [categoryField || 'Category', valueField || 'Value', 'Share (%)', 'Row Count'],
        rows: res.slices.map(s => [s.category, s.value, s.sharePct, s.count]),
      };
    }
    case 'heatmap': {
      const secCat = secondaryCategoryField || categoryField;
      const res = computeHeatmapMatrixData(rows, categoryField, secCat, valueField, aggregation === 'avg' ? 'avg' : 'sum');
      return {
        headers: [categoryField || 'Row Category', secCat || 'Column Category', valueField || 'Value', 'Row Count', 'Intensity (0-1)'],
        rows: res.cells.map(c => [c.rowKey, c.colKey, c.value, c.count, Number(c.intensity.toFixed(4))]),
      };
    }
    case 'boxplot': {
      const stats = computeBoxplotSummary(rows, categoryField, valueField);
      return {
        headers: [categoryField || 'Category', 'Min', 'Q1', 'Median', 'Mean', 'Q3', 'Max', 'IQR', 'Outlier Count', 'Sample Size'],
        rows: stats.map(s => [
          s.category,
          s.min,
          s.q1,
          s.median,
          s.mean,
          s.q3,
          s.max,
          s.iqr,
          s.outliers.length,
          s.count,
        ]),
      };
    }
    default: {
      if (fallbackItems && fallbackItems.length > 0) {
        return {
          headers: [categoryField || 'Category', valueField || 'Value', 'Share (%)'],
          rows: fallbackItems.map(it => [it.category, it.value, it.share]),
        };
      }
      const res = computeBarChartData(rows, categoryField, valueField, aggregation, 10);
      return {
        headers: [categoryField || 'Category', valueField || 'Value', 'Share (%)', 'Row Count'],
        rows: res.items.map(it => [it.category, it.value, it.share, it.count]),
      };
    }
  }
}

export function exportChartPlottedDataCSV(
  filename: string,
  headers: string[],
  rows: (string | number)[][]
): boolean {
  if (!headers.length) return false;
  const csv = formatCSVContent(headers, rows);
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return csv.length > 0;
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = sanitizeExportFilename(filename, 'csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

export async function exportChartContainerPNG(
  containerEl: HTMLElement | null,
  filename: string,
  title: string = 'Chart Export',
  isLight: boolean = false,
  plottedFallback?: PlottedCSVData
): Promise<boolean> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }

  const scale = 2;
  const width = Math.max(560, containerEl?.clientWidth || 640);
  const height = Math.max(340, (containerEl?.clientHeight || 280) + 72);

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  ctx.scale(scale, scale);

  const tokens = isLight ? DESIGN_TOKENS.light : DESIGN_TOKENS.dark;

  // Background
  ctx.fillStyle = tokens['--bg-card'];
  ctx.fillRect(0, 0, width, height);

  // Border
  ctx.strokeStyle = tokens['--border-strong'];
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

  // Header Brand + Title
  ctx.fillStyle = tokens['--accent'];
  ctx.font = 'bold 10px monospace';
  ctx.fillText(`DATA ANALYTIX • v${DESIGN_TOKENS.version} • ${new Date().toISOString().slice(0, 10)}`, 20, 22);

  ctx.fillStyle = tokens['--text-primary'];
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(title.slice(0, 65), 20, 42);

  const svgEl = containerEl?.querySelector('svg');
  let drewSvg = false;

  if (svgEl) {
    try {
      const cloned = svgEl.cloneNode(true) as SVGSVGElement;
      const svgRect = svgEl.getBoundingClientRect();
      const svgW = Math.max(300, svgRect.width || width - 40);
      const svgH = Math.max(160, svgRect.height || height - 80);
      cloned.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      cloned.setAttribute('width', String(svgW));
      cloned.setAttribute('height', String(svgH));

      const xml = new XMLSerializer().serializeToString(cloned);
      const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;

      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 20, 54, width - 40, height - 76);
          drewSvg = true;
          resolve();
        };
        img.onerror = () => reject(new Error('SVG image load failed'));
        img.src = svgDataUrl;
      });
    } catch {
      drewSvg = false;
    }
  }

  if (!drewSvg && plottedFallback && plottedFallback.rows.length > 0) {
    // Draw plotted bars / summary rows directly onto canvas
    const rowsToDraw = plottedFallback.rows.slice(0, 10);
    const numericVals = rowsToDraw.map(r => {
      const num = Number(r[1]);
      return Number.isFinite(num) ? Math.abs(num) : 0;
    });
    const maxV = Math.max(1, ...numericVals);
    const startY = 62;
    const rowH = Math.min(24, Math.floor((height - 82) / Math.max(1, rowsToDraw.length)));

    rowsToDraw.forEach((r, idx) => {
      const y = startY + idx * rowH;
      const label = String(r[0] ?? '').slice(0, 22);
      const val = Number(r[1]);
      const barMaxW = width - 240;
      const barW = Number.isFinite(val) ? Math.max(6, (Math.abs(val) / maxV) * barMaxW) : 12;

      ctx.fillStyle = tokens['--text-secondary'];
      ctx.font = '11px monospace';
      ctx.fillText(label, 20, y + 13);

      ctx.fillStyle =
        idx === 0 ? tokens['--chart-1'] : idx === 1 ? tokens['--chart-2'] : tokens['--chart-3'];
      ctx.fillRect(165, y + 3, barW, Math.max(10, rowH - 8));

      ctx.fillStyle = tokens['--text-primary'];
      ctx.font = 'bold 11px monospace';
      ctx.fillText(Number.isFinite(val) ? val.toLocaleString() : String(r[1] ?? ''), 172 + barW, y + 13);
    });
  }

  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = sanitizeExportFilename(filename, 'png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return true;
}
