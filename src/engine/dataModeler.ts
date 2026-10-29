import { ColumnProfile, DataModel, TableSchema, Relationship } from '../types';

export function buildDataModel(
  mainTableName: string,
  columns: ColumnProfile[],
  rows: Record<string, any>[]
): DataModel {
  const tables: TableSchema[] = [];
  const relationships: Relationship[] = [];
  const validationWarnings: string[] = [];

  // Group columns into dimensions and facts
  const idColumns = columns.filter(c => c.isPrimaryKeyCandidate || c.isForeignKeyCandidate || c.name.toLowerCase().includes('id'));
  const numericMeasures = columns.filter(c => c.dataType === 'number' && !c.isPrimaryKeyCandidate && !c.name.toLowerCase().includes('id') && !c.name.toLowerCase().includes('zip'));
  const dateColumns = columns.filter(c => c.dataType === 'date' || /date|time|timestamp|period/i.test(c.name));
  const categoricalColumns = columns.filter(c => c.dataType === 'string' && !c.isPrimaryKeyCandidate && !c.name.toLowerCase().includes('id'));

  // If there are distinct dimension entities identifiable in denormalized data
  const customerCols = columns.filter(c => /customer|client|buyer|user|account/i.test(c.name));
  const productCols = columns.filter(c => /product|item|sku|service|offering/i.test(c.name));
  const regionCols = columns.filter(c => /region|country|city|state|territory|market|location/i.test(c.name));
  
  // Also identify general category / status dimensions if present
  const categoryCols = columns.filter(c => /category|type|genre|department|segment|channel|status|priority/i.test(c.name) && !customerCols.includes(c) && !productCols.includes(c) && !regionCols.includes(c));

  // Determine which dimension groups to extract
  const dimensionGroups: { name: string; cols: ColumnProfile[]; keyCol: ColumnProfile }[] = [];

  if (customerCols.length > 0) {
    const keyCol = customerCols.find(c => c.name.toLowerCase().includes('id') || c.name.toLowerCase().includes('key')) || customerCols[0];
    dimensionGroups.push({ name: 'Dim_Customer', cols: customerCols, keyCol });
  }

  if (productCols.length > 0) {
    const keyCol = productCols.find(c => c.name.toLowerCase().includes('id') || c.name.toLowerCase().includes('key') || c.name.toLowerCase().includes('sku')) || productCols[0];
    dimensionGroups.push({ name: 'Dim_Product', cols: productCols, keyCol });
  }

  if (regionCols.length > 0) {
    const keyCol = regionCols.find(c => c.name.toLowerCase().includes('id') || c.name.toLowerCase().includes('key') || c.name.toLowerCase().includes('code')) || regionCols[0];
    dimensionGroups.push({ name: 'Dim_Geography', cols: regionCols, keyCol });
  }

  // If we still have room and found other category columns with good cardinality (2..100)
  categoryCols.slice(0, 2).forEach(catCol => {
    if (dimensionGroups.length < 4 && !dimensionGroups.some(g => g.cols.some(c => c.name === catCol.name))) {
      const dimName = `Dim_${catCol.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
      dimensionGroups.push({
        name: dimName,
        cols: [catCol],
        keyCol: catCol
      });
    }
  });

  // If still no categorical dimension groups found, pick top string column with distinct count between 2 and 50
  if (dimensionGroups.length === 0 && categoricalColumns.length > 0) {
    const candidate = categoricalColumns.find(c => c.distinctCount >= 2 && c.distinctCount <= 50) || categoricalColumns[0];
    if (candidate) {
      const dimName = `Dim_${candidate.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
      dimensionGroups.push({
        name: dimName,
        cols: [candidate],
        keyCol: candidate
      });
    }
  }

  const factTableName = mainTableName.startsWith('Fact') ? mainTableName : `Fact_${mainTableName.replace(/[^a-zA-Z0-9_]/g, '_')}`;

  // 1. Fact Table
  const allDimCols = dimensionGroups.flatMap(g => g.cols);
  const factCols = columns.filter(c => 
    numericMeasures.includes(c) || 
    idColumns.includes(c) || 
    dateColumns.includes(c) ||
    dimensionGroups.some(g => g.keyCol.name === c.name) ||
    !allDimCols.includes(c)
  );

  const factData = rows.map(r => {
    const obj: Record<string, any> = {};
    factCols.forEach(c => { obj[c.name] = r[c.name]; });
    return obj;
  });

  const factFks: { column: string; targetTable: string; targetColumn: string }[] = [];

  // 2. Build Dimension Tables and Relationships
  dimensionGroups.forEach(group => {
    const keyCol = group.keyCol;
    const dataMap = new Map<any, Record<string, any>>();
    rows.forEach(r => {
      const keyVal = r[keyCol.name];
      if (keyVal !== null && keyVal !== undefined && keyVal !== '' && !dataMap.has(keyVal)) {
        const rec: Record<string, any> = {};
        group.cols.forEach(c => { rec[c.name] = r[c.name]; });
        dataMap.set(keyVal, rec);
      }
    });

    const dimData = Array.from(dataMap.values());
    if (dimData.length > 0) {
      tables.push({
        id: group.name,
        name: group.name,
        type: 'dimension',
        columns: group.cols,
        primaryKey: keyCol.name,
        foreignKeys: [],
        rowCount: dimData.length,
        data: dimData.slice(0, 100)
      });

      relationships.push({
        id: `rel-${group.name}-${factTableName}`,
        sourceTable: group.name,
        sourceColumn: keyCol.name,
        targetTable: factTableName,
        targetColumn: keyCol.name,
        cardinality: '1:N',
        crossFilterDirection: 'single',
        isValid: true,
        isActive: true,
        integrityScore: 100
      });

      factFks.push({
        column: keyCol.name,
        targetTable: group.name,
        targetColumn: keyCol.name
      });
    }
  });

  // 3. Dim_Date if date columns exist
  if (dateColumns.length > 0 && rows.length > 0) {
    const primaryDateCol = dateColumns[0];
    const dateSet = new Set<string>();
    rows.forEach(r => {
      const d = r[primaryDateCol.name];
      if (d) dateSet.add(String(d));
    });

    const sortedDates = Array.from(dateSet).sort();
    if (sortedDates.length > 0) {
      const dimDateData = sortedDates.map(dateStr => {
        const dt = new Date(dateStr);
        const isValidDate = !isNaN(dt.getTime());
        return {
          Date: dateStr,
          Year: isValidDate ? dt.getFullYear() : '2025',
          Quarter: isValidDate ? `Q${Math.floor(dt.getMonth() / 3) + 1}` : 'Q1',
          MonthName: isValidDate ? dt.toLocaleString('default', { month: 'short' }) : 'Jan',
          MonthNumber: isValidDate ? dt.getMonth() + 1 : 1,
          DayOfWeek: isValidDate ? dt.toLocaleString('default', { weekday: 'short' }) : 'Mon',
          DayOfMonth: isValidDate ? dt.getDate() : 1
        };
      });

      const dimDateCols: ColumnProfile[] = [
        { name: 'Date', originalName: 'Date', dataType: 'date', totalCount: dimDateData.length, nullCount: 0, nullPercentage: 0, distinctCount: dimDateData.length, uniquePercentage: 100, isPrimaryKeyCandidate: true, isForeignKeyCandidate: false, topValues: [], inconsistentFormatsCount: 0, outliersCount: 0 },
        { name: 'Year', originalName: 'Year', dataType: 'number', totalCount: dimDateData.length, nullCount: 0, nullPercentage: 0, distinctCount: 1, uniquePercentage: 10, isPrimaryKeyCandidate: false, isForeignKeyCandidate: false, topValues: [], inconsistentFormatsCount: 0, outliersCount: 0 },
        { name: 'Quarter', originalName: 'Quarter', dataType: 'string', totalCount: dimDateData.length, nullCount: 0, nullPercentage: 0, distinctCount: 4, uniquePercentage: 10, isPrimaryKeyCandidate: false, isForeignKeyCandidate: false, topValues: [], inconsistentFormatsCount: 0, outliersCount: 0 },
        { name: 'MonthName', originalName: 'MonthName', dataType: 'string', totalCount: dimDateData.length, nullCount: 0, nullPercentage: 0, distinctCount: 12, uniquePercentage: 10, isPrimaryKeyCandidate: false, isForeignKeyCandidate: false, topValues: [], inconsistentFormatsCount: 0, outliersCount: 0 }
      ];

      tables.push({
        id: 'Dim_Date',
        name: 'Dim_Date',
        type: 'dimension',
        columns: dimDateCols,
        primaryKey: 'Date',
        foreignKeys: [],
        rowCount: dimDateData.length,
        data: dimDateData.slice(0, 100)
      });

      relationships.push({
        id: `rel-Dim_Date-${factTableName}`,
        sourceTable: 'Dim_Date',
        sourceColumn: 'Date',
        targetTable: factTableName,
        targetColumn: primaryDateCol.name,
        cardinality: '1:N',
        crossFilterDirection: 'single',
        isValid: true,
        isActive: true,
        integrityScore: 100
      });

      factFks.push({
        column: primaryDateCol.name,
        targetTable: 'Dim_Date',
        targetColumn: 'Date'
      });
    }
  }

  // Push Fact Table
  tables.unshift({
    id: factTableName,
    name: factTableName,
    type: 'fact',
    columns: factCols,
    primaryKey: idColumns.find(c => c.isPrimaryKeyCandidate)?.name,
    foreignKeys: factFks,
    rowCount: factData.length,
    data: factData.slice(0, 100)
  });

  return {
    tables,
    relationships,
    schemaType: relationships.length > 0 ? 'star' : 'flat',
    validationWarnings
  };
}
