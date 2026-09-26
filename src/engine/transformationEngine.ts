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
