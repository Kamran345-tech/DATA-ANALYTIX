import alasql from 'alasql';
import { ColumnProfile, TableSchema } from '../types';

export interface SQLQueryResult {
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
  executionTimeMs: number;
  error?: string;
}

export function registerTablesInSQL(tables: { name: string; rows: Record<string, any>[] }[]) {
  tables.forEach(table => {
    try {
      alasql(`DROP TABLE IF EXISTS [${table.name}]`);
      alasql(`CREATE TABLE [${table.name}]`);
      alasql.tables[table.name].data = table.rows;
    } catch (e) {
      console.warn(`Could not register SQL table ${table.name}:`, e);
    }
  });
}

export function executeSQLQuery(query: string): SQLQueryResult {
  const startTime = performance.now();
  try {
    const rawResult = alasql(query);
    const executionTimeMs = Math.round((performance.now() - startTime) * 100) / 100;

    let rows: Record<string, any>[] = [];
    if (Array.isArray(rawResult)) {
      if (rawResult.length > 0 && typeof rawResult[0] === 'object' && rawResult[0] !== null) {
        rows = rawResult;
      } else if (rawResult.length > 0) {
        rows = rawResult.map((v, i) => ({ Result: v }));
      }
    } else if (typeof rawResult === 'object' && rawResult !== null) {
      rows = [rawResult];
    } else if (rawResult !== undefined) {
      rows = [{ Result: rawResult }];
    }

    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

    return {
      columns,
      rows,
      rowCount: rows.length,
      executionTimeMs
    };
  } catch (error: any) {
    const executionTimeMs = Math.round((performance.now() - startTime) * 100) / 100;
    return {
      columns: [],
      rows: [],
      rowCount: 0,
      executionTimeMs,
      error: error?.message || 'SQL execution failed.'
    };
  }
}

export function generateStarterSQLQueries(tableName: string, columns: ColumnProfile[]): { name: string; sql: string; description: string }[] {
  const numeric = columns.filter(c => c.dataType === 'number' && !c.name.toLowerCase().includes('id'));
  const categorical = columns.filter(c => c.dataType === 'string' && !c.name.toLowerCase().includes('id'));
  const dateCol = columns.find(c => c.dataType === 'date')?.name;

  const numA = numeric[0]?.name || 'Value';
  const numB = numeric[1]?.name;
  const catA = categorical[0]?.name || 'Category';

  const queries = [
    {
      name: '1. Executive Overview & Record Count',
      sql: `SELECT \n    COUNT(*) AS total_records,\n    ROUND(AVG([${numA}]), 2) AS avg_${numA.toLowerCase()},\n    ROUND(SUM([${numA}]), 2) AS total_${numA.toLowerCase()}\nFROM [${tableName}];`,
      description: 'Calculates high-level aggregated totals and row counts across the dataset.'
    },
    {
      name: `2. Top Performers by ${catA}`,
      sql: `SELECT \n    [${catA}],\n    COUNT(*) AS transaction_count,\n    ROUND(SUM([${numA}]), 2) AS total_${numA.toLowerCase()},\n    ROUND(AVG([${numA}]), 2) AS avg_${numA.toLowerCase()}\nFROM [${tableName}]\nGROUP BY [${catA}]\nORDER BY total_${numA.toLowerCase()} DESC\nLIMIT 10;`,
      description: `Ranks top segments in ${catA} descending by ${numA}.`
    }
  ];

  if (dateCol) {
    queries.push({
      name: '3. Chronological Trend Aggregation',
      sql: `SELECT \n    [${dateCol}],\n    ROUND(SUM([${numA}]), 2) AS daily_sum,\n    COUNT(*) AS volume\nFROM [${tableName}]\nGROUP BY [${dateCol}]\nORDER BY [${dateCol}] ASC\nLIMIT 20;`,
      description: `Aggregates ${numA} chronologically across dates.`
    });
  }

  if (numB) {
    queries.push({
      name: `4. Multi-Metric Correlation (${numA} vs ${numB})`,
      sql: `SELECT \n    [${catA}],\n    ROUND(SUM([${numA}]), 2) AS total_${numA.toLowerCase()},\n    ROUND(SUM([${numB}]), 2) AS total_${numB.toLowerCase()},\n    ROUND(SUM([${numA}]) / NULLIF(SUM([${numB}]), 0), 2) AS ratio\nFROM [${tableName}]\nGROUP BY [${catA}]\nORDER BY total_${numA.toLowerCase()} DESC;`,
      description: `Computes ratio and comparative sums of ${numA} vs ${numB}.`
    });
  }

  return queries;
}

export function translateNaturalLanguageToSQL(prompt: string, tableName: string, columns: ColumnProfile[]): string {
  const lower = prompt.toLowerCase();
  const numCol = columns.find(c => c.dataType === 'number' && lower.includes(c.name.toLowerCase()))?.name || columns.find(c => c.dataType === 'number')?.name || 'Amount';
  const catCol = columns.find(c => c.dataType === 'string' && lower.includes(c.name.toLowerCase()))?.name || columns.find(c => c.dataType === 'string')?.name || 'Category';

  if (lower.includes('top') || lower.includes('best') || lower.includes('highest')) {
    return `SELECT \n    [${catCol}],\n    ROUND(SUM([${numCol}]), 2) AS total_${numCol.toLowerCase()}\nFROM [${tableName}]\nGROUP BY [${catCol}]\nORDER BY total_${numCol.toLowerCase()} DESC\nLIMIT 5;`;
  }

  if (lower.includes('average') || lower.includes('mean')) {
    return `SELECT \n    [${catCol}],\n    ROUND(AVG([${numCol}]), 2) AS avg_${numCol.toLowerCase()}\nFROM [${tableName}]\nGROUP BY [${catCol}]\nORDER BY avg_${numCol.toLowerCase()} DESC;`;
  }

  if (lower.includes('count') || lower.includes('how many')) {
    return `SELECT \n    [${catCol}],\n    COUNT(*) AS record_count\nFROM [${tableName}]\nGROUP BY [${catCol}]\nORDER BY record_count DESC;`;
  }

  return `SELECT \n    [${catCol}],\n    COUNT(*) AS total_count,\n    ROUND(SUM([${numCol}]), 2) AS total_${numCol.toLowerCase()}\nFROM [${tableName}]\nGROUP BY [${catCol}]\nORDER BY total_${numCol.toLowerCase()} DESC\nLIMIT 10;`;
}
