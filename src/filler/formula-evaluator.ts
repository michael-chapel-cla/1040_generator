import { FieldFormula } from "../templates/schema";
import { LineIndex, expandRange } from "../templates/line-index";

/**
 * Evaluates a field formula against already-filled numeric values.
 *
 * @param formula     The formula to evaluate
 * @param filled      Map of pdfFieldName → numeric value (from already-filled fields)
 * @param lineIndex   Index mapping IRS line numbers to pdfFieldNames
 * @returns           Computed number, or null if any required operand is unavailable
 */
export function evaluateFormula(
  formula: FieldFormula,
  filled: Map<string, number>,
  lineIndex: LineIndex
): number | null {
  const lookup = (lineKey: string): number | null => {
    const fieldName = lineIndex.byLine.get(lineKey);
    if (!fieldName) return null;
    const v = filled.get(fieldName);
    return v !== undefined ? v : null;
  };

  let result: number | null = null;

  switch (formula.op.kind) {
    case "add_list": {
      let sum = 0;
      for (const line of formula.op.operands) {
        const v = lookup(line);
        if (v === null) return null; // missing required operand → defer
        sum += v;
      }
      result = sum;
      break;
    }

    case "add_range": {
      const lines = expandRange(formula.op.start, formula.op.end, lineIndex);
      if (!lines) return null;
      let sum = 0;
      for (const line of lines) {
        const v = lookup(line);
        if (v !== null) sum += v; // range items may be legally absent
      }
      result = sum;
      break;
    }

    case "subtract": {
      const minuend    = lookup(formula.op.minuend);
      const subtrahend = lookup(formula.op.subtrahend);
      if (minuend === null || subtrahend === null) return null;
      result = minuend - subtrahend;
      break;
    }

    case "multiply": {
      const v = lookup(formula.op.operand);
      if (v === null) return null;
      result = v * formula.op.factor;
      break;
    }

    case "min_line_const": {
      const v = lookup(formula.op.operand);
      if (v === null) return null;
      result = Math.min(v, formula.op.constant);
      break;
    }

    case "min_two_lines": {
      const a = lookup(formula.op.a);
      const b = lookup(formula.op.b);
      if (a === null || b === null) return null;
      result = Math.min(a, b);
      break;
    }

    case "conditional_subtract": {
      const condA = lookup(formula.op.condA);
      const condB = lookup(formula.op.condB);
      if (condA === null || condB === null) return null;
      if (condA > condB) {
        const m = lookup(formula.op.minuend);
        const s = lookup(formula.op.subtrahend);
        if (m === null || s === null) return null;
        result = m - s;
      } else {
        result = 0;
      }
      break;
    }

    case "unresolved":
      return null;
  }

  if (result === null) return null;
  if (formula.floorAtZero && result < 0) result = 0;
  return Math.round(result * 100) / 100; // round to cents
}
