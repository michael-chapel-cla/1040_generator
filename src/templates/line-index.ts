import { FieldDefinition } from "./schema";

export interface LineIndex {
  /** IRS line number (e.g. "11a") → pdfFieldName */
  byLine: Map<string, string>;
  /** pdfFieldName → index in the fields array */
  byField: Map<string, number>;
  /** ordered line keys, preserving fields-array order */
  orderedKeys: string[];
}

export function buildLineIndex(fields: FieldDefinition[]): LineIndex {
  const byLine      = new Map<string, string>();
  const byField     = new Map<string, number>();
  const orderedKeys: string[] = [];

  fields.forEach((f, i) => {
    byField.set(f.pdfFieldName, i);
    if (f.lineNumber && !byLine.has(f.lineNumber)) {
      byLine.set(f.lineNumber, f.pdfFieldName);
      orderedKeys.push(f.lineNumber);
    }
  });

  return { byLine, byField, orderedKeys };
}

/**
 * Returns all line keys in [start, end] (inclusive), preserving document order.
 * Returns null if either endpoint isn't in the index.
 */
export function expandRange(
  start: string,
  end: string,
  index: LineIndex
): string[] | null {
  const si = index.orderedKeys.indexOf(start);
  const ei = index.orderedKeys.indexOf(end);
  if (si === -1 || ei === -1) return null;
  return index.orderedKeys.slice(si, ei + 1);
}
