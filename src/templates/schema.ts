import { FieldType } from "./classifier";

// ── Formula types ─────────────────────────────────────────────────────────────

export type FormulaOp =
  | { kind: "add_range";            start: string; end: string }
  | { kind: "add_list";             operands: string[] }
  | { kind: "subtract";             minuend: string; subtrahend: string }
  | { kind: "multiply";             operand: string; factor: number }
  | { kind: "multiply_two_lines";   multiplicand: string; multiplier: string }
  | { kind: "divide_two_lines";     dividend: string; divisor: string }
  | { kind: "divide_const";         operand: string; divisor: number }
  | { kind: "min_line_const";       operand: string; constant: number }
  | { kind: "min_two_lines";        a: string; b: string }
  | { kind: "max_two_lines";        a: string; b: string }
  | { kind: "conditional_subtract"; condA: string; condB: string; minuend: string; subtrahend: string }
  | { kind: "reference";            source: string }
  | { kind: "unresolved" };

export interface FieldFormula {
  op: FormulaOp;
  floorAtZero: boolean;  // true when label says "If zero or less, enter 0"
  rawLabel: string;      // original label text for debugging
}

// ── Field and template types ──────────────────────────────────────────────────

export interface FieldDefinition {
  pdfFieldName: string;
  fieldType: FieldType;
  labelHint: string;
  lineNumber?: string;   // IRS line number, e.g. "1a", "11b", "25d"
  required: boolean;
  maxLength?: number;
  options?: string[];
  fakerOverride?: string;
  formula?: FieldFormula;
}

export interface FormTemplate {
  formId: string;
  displayName: string;
  taxYear: number;
  sourceUrl: string;
  generatedAt: string;
  fields: FieldDefinition[];
}
