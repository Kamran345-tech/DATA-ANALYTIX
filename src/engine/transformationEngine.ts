import { TransformationStep, DataType } from '../types';

export function applyTransformation(
  rows: Record<string, any>[],
  step: TransformationStep
): Record<string, any>[] {
  const { action, column, parameters } = step;

  switch (action) {
    case 'rename_column': {
      const oldCol = column!;
      const newCol = parameters.newName;
      return rows.map(r => {
        const copy = { ...r };
        if (copy[oldCol] !== undefined) {
          copy[newCol] = copy[oldCol];
          delete copy[oldCol];
        }
        return copy;
      });
    }

    case 'delete_column': {
      const targetCol = column!;
      return rows.map(r => {
        const copy = { ...r };
        delete copy[targetCol];
        return copy;
      });
    }

    case 'change_type': {
      const targetCol = column!;
      const targetType = parameters.targetType as DataType;
      return rows.map(r => {
        const copy = { ...r };
        const val = copy[targetCol];
        if (val === null || val === undefined || val === '') return copy;

        if (targetType === 'number') {
          const num = Number(String(val).replace(/[^0-9.-]+/g, ''));
          copy[targetCol] = isNaN(num) ? null : num;
        } else if (targetType === 'string') {
          copy[targetCol] = String(val);
        } else if (targetType === 'date') {
          const d = new Date(val);
          copy[targetCol] = isNaN(d.getTime()) ? String(val) : d.toISOString().split('T')[0];
        } else if (targetType === 'boolean') {
          copy[targetCol] = /^(true|1|yes)$/i.test(String(val).trim());
        }
        return copy;
      });
    }

    case 'fill_missing': {
      const targetCol = column!;
      const fillMethod = parameters.method; // 'value' | 'mean' | 'median' | 'mode' | 'zero' | 'unknown'
      const customValue = parameters.customValue;

      let replacement = customValue;
      if (fillMethod === 'zero') replacement = 0;
      if (fillMethod === 'unknown') replacement = 'Unknown';
      if (fillMethod === 'mean' || fillMethod === 'median') {
        const nums = rows
          .map(r => r[targetCol])
          .filter(v => typeof v === 'number' && !isNaN(v)) as number[];
        if (nums.length > 0) {
          if (fillMethod === 'mean') {
            replacement = Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100;
          } else {
            nums.sort((a, b) => a - b);
            const mid = Math.floor(nums.length / 2);
            replacement = nums.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
          }
        }
      }

      return rows.map(r => {
        const copy = { ...r };
        if (copy[targetCol] === null || copy[targetCol] === undefined || copy[targetCol] === '') {
          copy[targetCol] = replacement;
        }
        return copy;
      });
    }

    case 'remove_duplicates': {
      const seen = new Set<string>();
      return rows.filter(r => {
        const key = JSON.stringify(r);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    case 'trim_whitespace': {
      const targetCol = column;
      return rows.map(r => {
        const copy = { ...r };
        if (targetCol) {
          if (typeof copy[targetCol] === 'string') {
            copy[targetCol] = copy[targetCol].trim();
          }
        } else {
          Object.keys(copy).forEach(k => {
            if (typeof copy[k] === 'string') copy[k] = copy[k].trim();
          });
        }
        return copy;
      });
    }

    case 'standardize_text': {
      const targetCol = column!;
      const format = parameters.format; // 'uppercase' | 'lowercase' | 'titlecase'
      return rows.map(r => {
        const copy = { ...r };
        if (typeof copy[targetCol] === 'string') {
          const str = copy[targetCol].trim();
          if (format === 'uppercase') copy[targetCol] = str.toUpperCase();
          else if (format === 'lowercase') copy[targetCol] = str.toLowerCase();
          else if (format === 'titlecase') {
            copy[targetCol] = str.replace(/\w\S*/g, (txt: string) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
          }
        }
        return copy;
      });
    }

    case 'filter_rows': {
      const targetCol = column!;
      const operator = parameters.operator; // '>', '<', '=', '!=', 'contains'
      const val = parameters.value;

      return rows.filter(r => {
        const rowVal = r[targetCol];
        if (operator === '=') return String(rowVal) === String(val);
        if (operator === '!=') return String(rowVal) !== String(val);
        if (operator === '>') return Number(rowVal) > Number(val);
        if (operator === '<') return Number(rowVal) < Number(val);
        if (operator === 'contains') return String(rowVal).toLowerCase().includes(String(val).toLowerCase());
        return true;
      });
    }

    case 'replace_value': {
      const targetCol = column!;
      const findVal = parameters.findValue;
      const replaceVal = parameters.replaceValue;
      return rows.map(r => {
        const copy = { ...r };
        if (String(copy[targetCol]) === String(findVal)) {
          copy[targetCol] = replaceVal;
        }
        return copy;
      });
    }

    case 'calculated_column': {
      const newColName = parameters.name;
      const expression = parameters.expression; // e.g. "[Revenue] - [Cost]" or "[Col1] * [Col2]"
      return rows.map(r => {
        const copy = { ...r };
        try {
          // Safe evaluation for simple mathematical expressions
          let evalStr = expression;
          Object.keys(copy).forEach(k => {
            const regex = new RegExp(`\\[${k}\\]`, 'g');
            evalStr = evalStr.replace(regex, Number(copy[k]) || 0);
          });
          // Sanitize: allow only numbers, operators + - * / ( ) .
          if (/^[\d+\-*/(). ]+$/.test(evalStr)) {
            // eslint-disable-next-line no-eval
            copy[newColName] = Math.round(Function(`'use strict'; return (${evalStr})`)() * 100) / 100;
          } else {
            copy[newColName] = null;
          }
        } catch {
          copy[newColName] = null;
        }
        return copy;
      });
    }

    case 'clean_dirty_numbers': {
      const targetCol = column;
      return rows.map(r => {
        const copy = { ...r };
        const colsToClean = targetCol ? [targetCol] : Object.keys(copy);
        colsToClean.forEach(colName => {
          const raw = copy[colName];
          if (raw !== null && raw !== undefined && raw !== '') {
            const strVal = String(raw).trim();
            if (/[$,€£¥₹%]/.test(strVal) || (typeof raw === 'string' && /^[0-9,.]+$/.test(strVal))) {
              const cleanStr = strVal.replace(/[\$€£¥₹,\s%]/g, '');
              const num = Number(cleanStr);
              if (!isNaN(num) && cleanStr !== '') {
                copy[colName] = Math.round(num * 100) / 100;
              }
            }
          }
        });
        return copy;
      });
    }

    case 'cap_outliers': {
      const targetCol = column;
      const numCols = targetCol ? [targetCol] : Object.keys(rows[0] || {}).filter(k => typeof rows[0][k] === 'number');
      let result = [...rows];

      numCols.forEach(cName => {
        const nums = result.map(r => Number(r[cName])).filter(v => typeof v === 'number' && !isNaN(v));
        if (nums.length >= 4) {
          nums.sort((a, b) => a - b);
          const q1 = nums[Math.floor(nums.length * 0.25)];
          const q3 = nums[Math.floor(nums.length * 0.75)];
          const iqr = q3 - q1;
          const lower = q1 - 1.5 * iqr;
          const upper = q3 + 1.5 * iqr;

          result = result.map(r => {
            const copy = { ...r };
            const v = Number(copy[cName]);
            if (!isNaN(v)) {
              if (v < lower) copy[cName] = Math.round(lower * 100) / 100;
              else if (v > upper) copy[cName] = Math.round(upper * 100) / 100;
            }
            return copy;
          });
        }
      });
      return result;
    }

    case 'drop_null_rows': {
      const targetCol = column;
      return rows.filter(r => {
        if (targetCol) {
          const v = r[targetCol];
          return v !== null && v !== undefined && String(v).trim() !== '';
        }
        return Object.values(r).every(v => v !== null && v !== undefined && String(v).trim() !== '');
      });
    }

    case 'auto_clean_all': {
      // 1. Remove duplicate rows
      const seen = new Set<string>();
      const deduplicated = rows.filter(r => {
        const key = JSON.stringify(r);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // 2. Identify column types and patterns
      if (deduplicated.length === 0) return deduplicated;
      const sample = deduplicated[0];
      const allCols = Object.keys(sample);

      // 3. Trim all whitespace & clean dirty numbers
      let cleaned = deduplicated.map(r => {
        const copy = { ...r };
        allCols.forEach(col => {
          let val = copy[col];
          if (typeof val === 'string') {
            val = val.trim();
            // Check if dirty currency/number
            if (/^[\$€£¥₹\s]*[0-9]{1,3}(,[0-9]{3})*(\.[0-9]+)?[\s%]*$/.test(val) && /[$,€£¥₹%]/.test(val)) {
              const numStr = val.replace(/[\$€£¥₹,\s%]/g, '');
              const parsed = Number(numStr);
              if (!isNaN(parsed) && numStr !== '') {
                val = Math.round(parsed * 100) / 100;
              }
            } else if (!/id|code|date|email|url/i.test(col) && val.length > 0 && val.length < 50) {
              // Standardize text to Title Case
              val = val.replace(/\w\S*/g, (txt: string) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
            }
            copy[col] = val;
          }
        });
        return copy;
      });

      // 4. Impute missing values
      allCols.forEach(col => {
        const nums = cleaned.map(r => Number(r[col])).filter(v => typeof v === 'number' && !isNaN(v));
        const isNumeric = nums.length > cleaned.length * 0.5;

        if (isNumeric && nums.length > 0) {
          const mean = Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100;
          cleaned = cleaned.map(r => {
            const copy = { ...r };
            if (copy[col] === null || copy[col] === undefined || copy[col] === '' || isNaN(Number(copy[col]))) {
              copy[col] = mean;
            }
            return copy;
          });
        } else {
          cleaned = cleaned.map(r => {
            const copy = { ...r };
            if (copy[col] === null || copy[col] === undefined || String(copy[col]).trim() === '') {
              copy[col] = 'Unknown';
            }
            return copy;
          });
        }
      });

      return cleaned;
    }

    default:
      return rows;
  }
}

export function replayTransformations(
  originalRows: Record<string, any>[],
  steps: TransformationStep[]
): Record<string, any>[] {
  let current = JSON.parse(JSON.stringify(originalRows));
  for (const step of steps) {
    current = applyTransformation(current, step);
  }
  return current;
}
