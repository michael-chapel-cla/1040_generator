import { PDFDocument, PDFForm, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown } from "pdf-lib";
import fs from "fs-extra";
import path from "path";
import { FormTemplate } from "../templates/schema";
import { FakeTaxpayer } from "../faker/taxpayer";
import { resolveField } from "../faker/resolver";

const FORMS_DIR   = path.resolve(process.cwd(), "forms");
const OUTPUT_DIR  = path.resolve(process.cwd(), "output");

export interface FillResult {
  formId: string;
  outputPath: string;
  filledCount: number;
  skippedCount: number;
  warnings: string[];
}

/**
 * Fills a single form PDF with data from `taxpayer`.
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

  const bytes = await fs.readFile(pdfPath);
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });

  let form: PDFForm;
  try {
    form = pdfDoc.getForm();
  } catch {
    throw new Error(`${template.formId}: Cannot get form fields (may be XFA-only PDF).`);
  }

  let filledCount = 0;
  let skippedCount = 0;
  const warnings: string[] = [];

  for (const fieldDef of template.fields) {
    const value = resolveField(fieldDef, taxpayer);

    try {
      const field = form.getField(fieldDef.pdfFieldName);

      if (field instanceof PDFTextField) {
        const maxLen = field.getMaxLength();
        const trimmed = maxLen ? value.slice(0, maxLen) : value;
        field.setText(trimmed);
        filledCount++;

      } else if (field instanceof PDFCheckBox) {
        const shouldCheck = value !== "Off" && value !== "0" && value !== "false" && value !== "";
        shouldCheck ? field.check() : field.uncheck();
        filledCount++;

      } else if (field instanceof PDFRadioGroup) {
        const options = field.getOptions();
        if (options.includes(value)) {
          field.select(value);
          filledCount++;
        } else if (options.length > 0) {
          field.select(options[0]);
          filledCount++;
        }

      } else if (field instanceof PDFDropdown) {
        const options = field.getOptions();
        if (options.includes(value)) {
          field.select(value);
          filledCount++;
        } else {
          skippedCount++;
        }

      } else {
        skippedCount++;
      }
    } catch {
      // Field may not exist in this PDF version — not a hard error
      skippedCount++;
    }
  }

  // Flatten to lock in values (prevents accidental clearing in viewers)
  form.flatten();

  const suffix = runId !== undefined ? `_${runId}` : "";
  const outFileName = `${template.formId}_seed${taxpayer.seed}${suffix}.pdf`;
  const outPath = path.join(OUTPUT_DIR, outFileName);
  const filledBytes = await pdfDoc.save();
  await fs.writeFile(outPath, filledBytes);

  return { formId: template.formId, outputPath: outPath, filledCount, skippedCount, warnings };
}
