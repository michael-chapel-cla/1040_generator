import { PDFDocument, PDFForm, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown } from "pdf-lib";
import fs from "fs-extra";
import path from "path";
import { FormTemplate, FieldDefinition } from "../templates/schema";
import { FakeTaxpayer } from "../faker/taxpayer";
import { resolveField } from "../faker/resolver";
import { buildLineIndex } from "../templates/line-index";
import { evaluateFormula } from "./formula-evaluator";

const FORMS_DIR   = path.resolve(process.cwd(), "forms");
const OUTPUT_DIR  = path.resolve(process.cwd(), "output");

export interface FillResult {
  formId: string;
  outputPath: string;
  filledCount: number;
  skippedCount: number;
  calculatedCount: number;
  warnings: string[];
}

/**
 * Fills a single form PDF with data from `taxpayer`.
 *
 * Two-pass fill:
 *   Pass 1 — all non-calculated fields resolved via faker/taxpayer data
 *   Pass 2 — calculated fields evaluated from pass-1 values (retried up to 3× for dependency chains)
 *
 * @param template  The parsed form template (field definitions)
 * @param taxpayer  The fake taxpayer whose data populates the fields
 * @param runId     Optional suffix for output filename (e.g. run index for batch mode)
 */
export async function fillForm(
  template: FormTemplate,
  taxpayer: FakeTaxpayer,
  runId?: string | number
): Promise<FillResult> {
  await fs.ensureDir(OUTPUT_DIR);

  const pdfPath = path.join(FORMS_DIR, `${template.formId}.pdf`);
  if (!(await fs.pathExists(pdfPath))) {
    throw new Error(`PDF not found: ${pdfPath}. Run 'npm run download' first.`);
  }

  const bytes  = await fs.readFile(pdfPath);
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });

  let form: PDFForm;
  try {
    form = pdfDoc.getForm();
  } catch {
    throw new Error(`${template.formId}: Cannot get form fields (may be XFA-only PDF).`);
  }

  let filledCount     = 0;
  let skippedCount    = 0;
  let calculatedCount = 0;
  const warnings: string[] = [];

  // Numeric values of filled fields — used for formula evaluation
  const filledValues = new Map<string, number>();

  const lineIndex = buildLineIndex(template.fields);

  // ── Helper: apply one value to the PDF and record numeric value ─────────────
  function applyField(fieldDef: FieldDefinition, value: string): void {
    try {
      const field = form.getField(fieldDef.pdfFieldName);

      if (field instanceof PDFTextField) {
        const maxLen  = field.getMaxLength();
        const trimmed = maxLen ? value.slice(0, maxLen) : value;
        field.setText(trimmed);
        filledCount++;
        const num = parseFloat(value.replace(/,/g, ""));
        // Always record a numeric value for formula-referenceable fields so
        // downstream add_list/add_range operands don't defer when the value
        // is legitimately blank (e.g. taxpayer has no capital gains → 0).
        if (!isNaN(num)) {
          filledValues.set(fieldDef.pdfFieldName, num);
        } else if (fieldDef.lineNumber) {
          filledValues.set(fieldDef.pdfFieldName, 0);
        }

      } else if (field instanceof PDFCheckBox) {
        const shouldCheck = value !== "Off" && value !== "0" && value !== "false" && value !== "";
        shouldCheck ? field.check() : field.uncheck();
        filledCount++;

      } else if (field instanceof PDFRadioGroup) {
        const options = field.getOptions();
        const chosen  = options.includes(value) ? value : options[0];
        if (chosen) { field.select(chosen); filledCount++; }
        else skippedCount++;

      } else if (field instanceof PDFDropdown) {
        const options = field.getOptions();
        if (options.includes(value)) { field.select(value); filledCount++; }
        else skippedCount++;

      } else {
        skippedCount++;
      }
    } catch {
      skippedCount++;
    }
  }

  // ── Pass 1: fill all non-calculated fields ──────────────────────────────────
  const pending: FieldDefinition[] = [];

  for (const fieldDef of template.fields) {
    if (fieldDef.formula && fieldDef.formula.op.kind !== "unresolved") {
      pending.push(fieldDef);
      continue;
    }
    applyField(fieldDef, resolveField(fieldDef, taxpayer));
  }

  // ── Pass 2: evaluate calculated fields (retry up to 3× for dependency chains)
  let remaining = pending;
  for (let pass = 0; pass < 3 && remaining.length > 0; pass++) {
    const nextRound: FieldDefinition[] = [];
    for (const fieldDef of remaining) {
      const result = evaluateFormula(fieldDef.formula!, filledValues, lineIndex);
      if (result !== null) {
        const value = result.toFixed(2);
        applyField(fieldDef, value);
        calculatedCount++;
      } else {
        nextRound.push(fieldDef);
      }
    }
    remaining = nextRound;
  }

  // ── Fallback: any still-unresolved calculated fields get faker values ────────
  for (const fieldDef of remaining) {
    warnings.push(`Formula unresolved for ${fieldDef.pdfFieldName} ("${fieldDef.labelHint.slice(0, 60)}")`);
    applyField(fieldDef, resolveField(fieldDef, taxpayer));
  }

  // Flatten to lock in values
  form.flatten();

  const suffix      = runId !== undefined ? `_${runId}` : "";
  const outFileName = `${template.formId}_seed${taxpayer.seed}${suffix}.pdf`;
  const outPath     = path.join(OUTPUT_DIR, outFileName);
  await fs.writeFile(outPath, await pdfDoc.save());

  return { formId: template.formId, outputPath: outPath, filledCount, skippedCount, calculatedCount, warnings };
}
