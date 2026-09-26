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
  const dateColumns = columns.filter(c => c.dataType === 'date');
  const categoricalColumns = columns.filter(c => c.dataType === 'string' && !c.isPrimaryKeyCandidate && !c.name.toLowerCase().includes('id'));

  // If there are distinct dimension entities identifiable in denormalized data (e.g., Customer, Product, Region, Date)
  // we can create a star schema representation with DimCustomer, DimProduct, DimDate, and FactTable.
  const customerCols = columns.filter(c => /customer|client|buyer/i.test(c.name));
  const productCols = columns.filter(c => /product|item|sku/i.test(c.name));
  const regionCols = columns.filter(c => /region|country|city|state|territory/i.test(c.name));

  const hasDenormalizedDimensions = customerCols.length > 0 || productCols.length > 0 || regionCols.length > 0 || dateColumns.length > 0;

  if (hasDenormalizedDimensions && rows.length > 0) {
    // 1. Fact Table
    const factCols = columns.filter(c => 
      numericMeasures.includes(c) || 
      idColumns.includes(c) || 
      dateColumns.includes(c) ||
      (!customerCols.includes(c) && !productCols.includes(c) && !regionCols.includes(c))
    );
    const factTableName = mainTableName.startsWith('Fact') ? mainTableName : `Fact_${mainTableName}`;

    const factData = rows.map(r => {
      const obj: Record<string, any> = {};
      factCols.forEach(c => { obj[c.name] = r[c.name]; });
      return obj;
    });

    tables.push({
      id: factTableName,
      name: factTableName,
      type: 'fact',
      columns: factCols,
      foreignKeys: [],
      rowCount: factData.length,
      data: factData.slice(0, 100) // Sample for preview
    });

    // 2. Dim_Customer if relevant columns exist
    if (customerCols.length > 0) {
      const custKeyCol = customerCols.find(c => c.name.toLowerCase().includes('id') || c.name.toLowerCase().includes('key')) || customerCols[0];
      const custDataMap = new Map<any, Record<string, any>>();
      rows.forEach(r => {
        const keyVal = r[custKeyCol.name];
        if (keyVal !== null && keyVal !== undefined && !custDataMap.has(keyVal)) {
          const custRec: Record<string, any> = {};
          customerCols.forEach(c => { custRec[c.name] = r[c.name]; });
          custDataMap.set(keyVal, custRec);
        }
      });
      const dimCustData = Array.from(custDataMap.values());
      const dimCustName = 'Dim_Customer';

      tables.push({
        id: dimCustName,
        name: dimCustName,
        type: 'dimension',
        columns: customerCols,
        primaryKey: custKeyCol.name,
        foreignKeys: [],
        rowCount: dimCustData.length,
        data: dimCustData.slice(0, 100)
      });

      relationships.push({
        id: `rel-${dimCustName}-${factTableName}`,
        sourceTable: dimCustName,
        sourceColumn: custKeyCol.name,
        targetTable: factTableName,
        targetColumn: custKeyCol.name,
        cardinality: '1:N',
        crossFilterDirection: 'single',
        isValid: true
      });
    }

    // 3. Dim_Product if relevant columns exist
    if (productCols.length > 0) {
      const prodKeyCol = productCols.find(c => c.name.toLowerCase().includes('id') || c.name.toLowerCase().includes('key') || c.name.toLowerCase().includes('sku')) || productCols[0];
      const prodDataMap = new Map<any, Record<string, any>>();
      rows.forEach(r => {
        const keyVal = r[prodKeyCol.name];
        if (keyVal !== null && keyVal !== undefined && !prodDataMap.has(keyVal)) {
          const prodRec: Record<string, any> = {};
          productCols.forEach(c => { prodRec[c.name] = r[c.name]; });
          prodDataMap.set(keyVal, prodRec);
        }
      });
      const dimProdData = Array.from(prodDataMap.values());
      const dimProdName = 'Dim_Product';

      tables.push({
        id: dimProdName,
        name: dimProdName,
        type: 'dimension',
        columns: productCols,
        primaryKey: prodKeyCol.name,
        foreignKeys: [],
        rowCount: dimProdData.length,
        data: dimProdData.slice(0, 100)
      });

      relationships.push({
        id: `rel-${dimProdName}-${factTableName}`,
        sourceTable: dimProdName,
        sourceColumn: prodKeyCol.name,
        targetTable: factTableName,
        targetColumn: prodKeyCol.name,
        cardinality: '1:N',
        crossFilterDirection: 'single',
        isValid: true
      });
    }

    // 4. Dim_Date if date column exists
    if (dateColumns.length > 0) {
      const primaryDateCol = dateColumns[0];
      const dateSet = new Set<string>();
      rows.forEach(r => {
        const d = r[primaryDateCol.name];
        if (d) dateSet.add(String(d));
      });
      const sortedDates = Array.from(dateSet).sort();
      const dimDateData = sortedDates.map(dateStr => {
        const dt = new Date(dateStr);
        return {
          Date: dateStr,
          Year: dt.getFullYear(),
          Quarter: `Q${Math.floor(dt.getMonth() / 3) + 1}`,
          MonthName: dt.toLocaleString('default', { month: 'short' }),
          MonthNumber: dt.getMonth() + 1,
          DayOfWeek: dt.toLocaleString('default', { weekday: 'short' }),
          DayOfMonth: dt.getDate()
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
        isValid: true
      });
    }

    return {
      tables,
      relationships,
      schemaType: 'star',
      validationWarnings
    };
  }

  // Fallback to unified tabular model
  const primaryKey = idColumns.find(c => c.isPrimaryKeyCandidate)?.name;
  tables.push({
    id: mainTableName,
    name: mainTableName,
    type: 'fact',
    columns,
    primaryKey,
    foreignKeys: [],
    rowCount: rows.length,
    data: rows.slice(0, 100)
  });

  return {
    tables,
    relationships: [],
    schemaType: 'flat',
    validationWarnings: ['Flat tabular schema inferred. Consider separating entity dimensions for Star Schema optimization.']
  };
}
