import { ColumnProfile, DAXMeasure, TableSchema } from '../types';

export function generateDAXMeasures(
  tableName: string,
  columns: ColumnProfile[],
  tables: TableSchema[] = []
): DAXMeasure[] {
  const measures: DAXMeasure[] = [];
  const numericCols = columns.filter(c => c.dataType === 'number' && !c.isPrimaryKeyCandidate && !c.name.toLowerCase().includes('id'));
  const dateCols = columns.filter(c => c.dataType === 'date');
  const primaryDateCol = dateCols[0]?.name;

  // Total Count measure
  measures.push({
    id: 'dax-total-rows',
    name: 'Total Transactions',
    table: tableName,
    category: 'Aggregation',
    formula: `Total Transactions = COUNTROWS('${tableName}')`,
    description: 'Counts the total number of transaction records in the fact table.',
    dependencies: [],
    sourceColumns: [`${tableName}`]
  });

  numericCols.forEach(col => {
    const isCurrency = /revenue|sales|profit|cost|price|income|amount/i.test(col.name);
    const prefix = isCurrency ? 'Total ' : 'Sum of ';
    const measureName = `${prefix}${col.name.replace(/_/g, ' ')}`;

    // 1. Base Sum Measure
    measures.push({
      id: `dax-sum-${col.name}`,
      name: measureName,
      table: tableName,
      category: 'Aggregation',
      formula: `${measureName} = \nSUM('${tableName}'[${col.name}])`,
      description: `Calculates the aggregate sum of ${col.name} across all active filter contexts.`,
      dependencies: [],
      sourceColumns: [`${tableName}[${col.name}]`]
    });

    // 2. Average Measure
    const avgName = `Avg ${col.name.replace(/_/g, ' ')}`;
    measures.push({
      id: `dax-avg-${col.name}`,
      name: avgName,
      table: tableName,
      category: 'Aggregation',
      formula: `${avgName} = \nAVERAGE('${tableName}'[${col.name}])`,
      description: `Calculates the arithmetic mean of ${col.name}.`,
      dependencies: [],
      sourceColumns: [`${tableName}[${col.name}]`]
    });

    // 3. Time Intelligence if date column exists
    if (primaryDateCol) {
      // YTD
      const ytdName = `${measureName} YTD`;
      measures.push({
        id: `dax-ytd-${col.name}`,
        name: ytdName,
        table: tableName,
        category: 'Time Intelligence',
        formula: `${ytdName} = \nTOTALYTD(\n    [${measureName}],\n    '${tableName}'[${primaryDateCol}]\n)`,
        description: `Evaluates year-to-date cumulative total for ${measureName}.`,
        dependencies: [measureName],
        sourceColumns: [`${tableName}[${col.name}]`, `${tableName}[${primaryDateCol}]`]
      });

      // Prior Year (YoY)
      const pyName = `${measureName} PY`;
      measures.push({
        id: `dax-py-${col.name}`,
        name: pyName,
        table: tableName,
        category: 'Time Intelligence',
        formula: `${pyName} = \nCALCULATE(\n    [${measureName}],\n    SAMEPERIODLASTYEAR('${tableName}'[${primaryDateCol}])\n)`,
        description: `Computes previous year comparative metric for YoY growth analysis.`,
        dependencies: [measureName],
        sourceColumns: [`${tableName}[${col.name}]`, `${tableName}[${primaryDateCol}]`]
      });

      // YoY Growth %
      const yoyGrowthName = `${measureName} YoY %`;
      measures.push({
        id: `dax-yoy-growth-${col.name}`,
        name: yoyGrowthName,
        table: tableName,
        category: 'Time Intelligence',
        formula: `${yoyGrowthName} = \nVAR CurrentVal = [${measureName}]\nVAR PriorVal = [${pyName}]\nRETURN\n    DIVIDE(CurrentVal - PriorVal, PriorVal, 0)`,
        description: `Calculates percentage variance between current period and prior year period.`,
        dependencies: [measureName, pyName],
        sourceColumns: [`${tableName}[${col.name}]`, `${tableName}[${primaryDateCol}]`]
      });
    }
  });

  // Margin measure if Revenue and Profit or Cost both exist
  const revCol = numericCols.find(c => /revenue|sales/i.test(c.name));
  const profCol = numericCols.find(c => /profit|margin/i.test(c.name));
  const costCol = numericCols.find(c => /cost|expense/i.test(c.name));

  if (revCol && profCol) {
    measures.push({
      id: 'dax-profit-margin-pct',
      name: 'Profit Margin %',
      table: tableName,
      category: 'Financial',
      formula: `Profit Margin % = \nDIVIDE(\n    SUM('${tableName}'[${profCol.name}]),\n    SUM('${tableName}'[${revCol.name}]),\n    0\n)`,
      description: 'Calculates the gross or net profit margin percentage.',
      dependencies: [],
      sourceColumns: [`${tableName}[${profCol.name}]`, `${tableName}[${revCol.name}]`]
    });
  } else if (revCol && costCol) {
    measures.push({
      id: 'dax-computed-margin-pct',
      name: 'Computed Margin %',
      table: tableName,
      category: 'Financial',
      formula: `Computed Margin % = \nVAR Rev = SUM('${tableName}'[${revCol.name}])\nVAR Cost = SUM('${tableName}'[${costCol.name}])\nRETURN\n    DIVIDE(Rev - Cost, Rev, 0)`,
      description: 'Calculates margin percentage derived from Revenue minus Cost.',
      dependencies: [],
      sourceColumns: [`${tableName}[${revCol.name}]`, `${tableName}[${costCol.name}]`]
    });
  }

  return measures;
}

export function generateDAXFromNaturalLanguage(
  prompt: string,
  tableName: string,
  columns: ColumnProfile[]
): { name: string; formula: string; explanation: string } {
  const lower = prompt.toLowerCase();
  const numeric = columns.filter(c => c.dataType === 'number');
  const matchedCol = numeric.find(c => lower.includes(c.name.toLowerCase())) || numeric[0];
  const colName = matchedCol ? matchedCol.name : 'Amount';

  if (lower.includes('running total') || lower.includes('cumulative')) {
    const dateCol = columns.find(c => c.dataType === 'date')?.name || 'Date';
    return {
      name: `Cumulative ${colName}`,
      formula: `Cumulative ${colName} = \nCALCULATE(\n    SUM('${tableName}'[${colName}]),\n    FILTER(\n        ALLSELECTED('${tableName}'),\n        '${tableName}'[${dateCol}] <= MAX('${tableName}'[${dateCol}])\n    )\n)`,
      explanation: `Calculates running cumulative total of ${colName} ordered by ${dateCol}.`
    };
  }

  if (lower.includes('rank') || lower.includes('top')) {
    const catCol = columns.find(c => c.dataType === 'string')?.name || 'Category';
    return {
      name: `${colName} Rank by ${catCol}`,
      formula: `${colName} Rank = \nRANKX(\n    ALLSELECTED('${tableName}'[${catCol}]),\n    CALCULATE(SUM('${tableName}'[${colName}])),\n    ,\n    DESC,\n    DENSE\n)`,
      explanation: `Ranks ${catCol} descending based on total sum of ${colName}.`
    };
  }

  if (lower.includes('percent of total') || lower.includes('share')) {
    return {
      name: `${colName} % of Total`,
      formula: `${colName} % of Total = \nDIVIDE(\n    SUM('${tableName}'[${colName}]),\n    CALCULATE(SUM('${tableName}'[${colName}]), ALLSELECTED('${tableName}')),\n    0\n)`,
      explanation: `Calculates what percentage the current slice represents of the overall total ${colName}.`
    };
  }

  // Default Sum/Aggregation
  return {
    name: `Total ${colName}`,
    formula: `Total ${colName} = \nSUM('${tableName}'[${colName}])`,
    explanation: `Computes standard aggregated sum of ${colName}.`
  };
}
