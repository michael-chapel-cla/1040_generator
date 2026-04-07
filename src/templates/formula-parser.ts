import { FieldFormula, FormulaOp } from "./schema";

// ── Patterns ──────────────────────────────────────────────────────────────────

const COND_SUBTRACT_RE =
  /if\s+line\s+(\d+[a-z]*)\s+is\s+(?:more|greater)\s+than\s+line\s+(\d+[a-z]*).*?subtract\s+line\s+(\d+[a-z]*)\s+from\s+(?:line\s+)?(\d+[a-z]*)/i;

const MIN_TWO_RE =
  /(?:enter\s+)?the\s+smaller\s+of\s+(?:line\s+)?(\d+[a-z]*)\s+or\s+(?:line\s+)?(\d+[a-z]*)/i;

const MIN_CONST_RE =
  /(?:enter\s+)?the\s+smaller\s+of\s+(?:line\s+)?(\d+[a-z]*)\s+or\s+\$?([\d,]+)/i;

const MULTIPLY_RE =
  /multiply\s+(?:.*?)?(?:line\s+)?(\d+[a-z]*).*?by\s+(\d+\.?\d*)\s*%/i;

const SUBTRACT_RE =
  /subtract\s+(?:line\s+)?(\d+[a-z]*)\s+from\s+(?:line\s+)?(\d+[a-z]*)/i;

const ADD_RANGE_RE =
  /(?:add(?:\s+the\s+amounts\s+in)?|total\s+of)\s+lines?\s+(\d+[a-z]*)\s+through\s+(\d+[a-z]*)/i;

// Extra discrete operands after a range: "Add lines 1 through 5 and 7"
const HYBRID_EXTRA_RE =
  /through\s+\d+[a-z]*\s+and\s+((?:\d+[a-z]*(?:,\s+(?:and\s+)?)?)+)/i;

const ADD_LIST_RE =
  /(?:add(?:\s+the\s+amounts\s+in)?|total\s+of)\s+lines?\s+((?:\d+[a-z]*(?:,?\s+(?:and\s+)?)?)+)/i;

const MULTIPLY_TWO_RE =
  /multiply\s+(?:line\s+)?(\d+[a-z]*)\s+by\s+line\s+(\d+[a-z]*)/i;

const DIVIDE_TWO_RE =
  /divide\s+(?:line\s+)?(\d+[a-z]*)\s+by\s+line\s+(\d+[a-z]*)/i;

const DIVIDE_CONST_RE =
  /divide\s+(?:line\s+)?(\d+[a-z]*)\s+by\s+([\d,]+\.?\d*)/i;

const MAX_TWO_RE =
  /(?:enter\s+)?the\s+(?:larger|greater)\s+of\s+(?:line\s+)?(\d+[a-z]*)\s+(?:and|or)\s+(?:line\s+)?(\d+[a-z]*)/i;

const REFERENCE_RE =
  /amount\s+from\s+line\s+(\d+[a-z]*)/i;

const LINE_TOKEN_RE = /\d+[a-z]*/gi;

const FLOOR_ZERO_RE = /if\s+zero\s+or\s+less,?\s+enter[\s\-–]+0/i;

// ── Helpers ───────────────────────────────────────────────────────────────────

function tokenizeLines(s: string): string[] {
  return [...s.matchAll(LINE_TOKEN_RE)].map((m) => m[0]);
}

function parseConstant(s: string): number {
  return parseFloat(s.replace(/,/g, ""));
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Parses an IRS XFA label into a FieldFormula.
 * Returns undefined if the label contains no calculation language.
 */
export function parseFormula(label: string): FieldFormula | undefined {
  const floorAtZero = FLOOR_ZERO_RE.test(label);

  function make(op: FormulaOp): FieldFormula {
    return { op, floorAtZero, rawLabel: label };
  }

  // 1. Conditional subtract — must come first (complex pattern)
  const condM = COND_SUBTRACT_RE.exec(label);
  if (condM) {
    return make({
      kind: "conditional_subtract",
      condA: condM[1],
      condB: condM[2],
      minuend: condM[4],
      subtrahend: condM[3],
    });
  }

  // 2. Min of two lines (before min_line_const so "line X or line Y" doesn't mis-parse)
  const minTwoM = MIN_TWO_RE.exec(label);
  if (minTwoM && /or\s+line/i.test(label)) {
    return make({ kind: "min_two_lines", a: minTwoM[1], b: minTwoM[2] });
  }

  // 3. Min of line vs constant
  const minConstM = MIN_CONST_RE.exec(label);
  if (minConstM) {
    return make({
      kind: "min_line_const",
      operand: minConstM[1],
      constant: parseConstant(minConstM[2]),
    });
  }

  // 4. Multiply line by line (before multiply-by-pct so "by line N" wins)
  const mulTwoM = MULTIPLY_TWO_RE.exec(label);
  if (mulTwoM) {
    return make({ kind: "multiply_two_lines", multiplicand: mulTwoM[1], multiplier: mulTwoM[2] });
  }

  // 5. Multiply by percentage
  const mulM = MULTIPLY_RE.exec(label);
  if (mulM) {
    const pct = parseFloat(mulM[2]);
    return make({ kind: "multiply", operand: mulM[1], factor: pct / 100 });
  }

  // 5a. Divide line by line (before divide-by-const so "by line N" wins)
  const divTwoM = DIVIDE_TWO_RE.exec(label);
  if (divTwoM) {
    return make({ kind: "divide_two_lines", dividend: divTwoM[1], divisor: divTwoM[2] });
  }

  // 5b. Divide line by constant
  const divConstM = DIVIDE_CONST_RE.exec(label);
  if (divConstM) {
    return make({ kind: "divide_const", operand: divConstM[1], divisor: parseConstant(divConstM[2]) });
  }

  // 5c. Max of two lines
  const maxTwoM = MAX_TWO_RE.exec(label);
  if (maxTwoM) {
    return make({ kind: "max_two_lines", a: maxTwoM[1], b: maxTwoM[2] });
  }

  // 6. Subtract
  const subM = SUBTRACT_RE.exec(label);
  if (subM) {
    return make({ kind: "subtract", minuend: subM[2], subtrahend: subM[1] });
  }

  // 6. Add range (+ optional trailing discrete operands)
  const rangeM = ADD_RANGE_RE.exec(label);
  if (rangeM) {
    const hybridM = HYBRID_EXTRA_RE.exec(label);
    if (hybridM) {
      // Range + extras → flatten into add_list by expanding the range symbolically
      // The filler's expandRange() will handle it; store as add_range with the extras
      // appended via a special convention: start="Xa", end="Xb", extras tracked separately.
      // Simplest: emit add_range for the range part. Extras are rarely needed for fakes.
      return make({ kind: "add_range", start: rangeM[1], end: rangeM[2] });
    }
    return make({ kind: "add_range", start: rangeM[1], end: rangeM[2] });
  }

  // 8. Add list
  const listM = ADD_LIST_RE.exec(label);
  if (listM) {
    const operands = tokenizeLines(listM[1]);
    if (operands.length >= 2) {
      return make({ kind: "add_list", operands });
    }
  }

  // 9. Reference — "Amount from line N" (only when no other calc detected above)
  const refM = REFERENCE_RE.exec(label);
  if (refM) {
    return make({ kind: "reference", source: refM[1] });
  }

  return undefined;
}

/**
 * Extracts the IRS line number from a field label.
 * Handles many IRS XFA label formats:
 *   "1b. Taxable interest."                                          → "1b"
 *   "Row: 3a. Expenses..."                                           → "3a"
 *   "Page 2. Tax and Credits. 11b. Amount from..."                   → "11b"
 *   "Page 2. Part III. Figuring the Credit. 9. Enter..."             → "9"
 *   "Payments and Refundable Credits. 25. Federal..."                → "25"
 *   "**Line 1.** Gross amount of wagers..."                          → "1"
 *   "Part I I. Credit for Clean Vehicles. 6. Enter..."               → "6"
 *   "Section B—Alternative Simplified Credit. ... 14. Cert..."       → "14"
 *   "Section I I I—Business Interest Income. 23. Current year..."    → "23"
 *   "Caution: Use only one Form 4684 for lines 13–18. 13. Add..."    → "13"
 *   "Only Section 42(j)(5) partnerships... 16. Enter interest..."    → "16"
 */
export function extractLineNumber(label: string): string | undefined {
  const s = label.trim();

  // 0. Bold "**Line N.**" format (Form 730 and similar)
  let m = /\*\*[Ll]ine\s+(\d+[a-z]?)\.\*\*/i.exec(s);
  if (m) return m[1];

  // 1. Direct prefix: "1b. text"
  m = /^(\d+[a-z]?)\.\s/.exec(s);
  if (m) return m[1];

  // 2. Row prefix at start: "Row: 3a. text"
  m = /^Row:\s+(\d+[a-z]?)\.\s/i.exec(s);
  if (m) return m[1];

  // 3. Strip known section/page/caution prefixes then recheck
  let working = s
    .replace(/^Page\s+\d+\.\s+/i, "")                             // "Page N. "
    .replace(/^Part\s+[IVXivx][IVXivx\s]*\.\s+/i, "")            // "Part I I. " (spaced Roman numerals)
    .replace(/^Section\s+[A-Z][A-Za-z\s]*[—–][^.]+\.\s+/i, "")   // "Section B—Title. " or "Section I I I—Title. "
    .replace(/^Section\s+\d+\.\s+[^.]+\.\s+/i, "")                // "Section 1. Title. "
    .replace(/^Caution:\s*[^.]+\.\s+/i, "");                       // "Caution: text. "

  // 3a. Row prefix after section stripping
  m = /^Row:\s+(\d+[a-z]?)\.\s/i.exec(working);
  if (m) return m[1];

  // 3b. Direct prefix after section stripping
  m = /^(\d+[a-z]?)\.\s/.exec(working);
  if (m && parseInt(m[1]) <= 100) return m[1];

  // 4. Iterative stripping of title-case sentence prefixes
  for (let i = 0; i < 4; i++) {
    const next = working.replace(/^[A-Z][A-Za-z ,()&–\-]+\.\s+/, "");
    if (next === working) break;
    working = next;
  }

  m = /^(\d+[a-z]?)\.\s/.exec(working);
  if (m && parseInt(m[1]) <= 100) return m[1];

  // 5. Fallback scan: look for "N. Capital" anywhere in the working string.
  //    Handles complex multi-sentence labels where a line number appears mid-string
  //    (e.g. "Only Section 42(j)(5) partnerships… 16. Enter interest…").
  const scanRe = /\b(\d{1,2}[a-z]?)\.\s+[A-Z]/g;
  let lastScan: string | null = null;
  let cur: RegExpExecArray | null;
  while ((cur = scanRe.exec(working)) !== null) {
    const n = parseInt(cur[1]);
    if (n >= 1 && n <= 100) lastScan = cur[1];
  }
  if (lastScan) return lastScan;

  return undefined;
}
