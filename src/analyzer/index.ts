import { PDFDocument, PDFForm, PDFField, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown } from "pdf-lib";
import fs from "fs-extra";
import { FieldType, classifyField } from "../templates/classifier";
import { extractFieldLabels } from "./xfa-extractor";

export interface RawField {
  name: string;
  type: "text" | "checkbox" | "radio" | "dropdown" | "unknown";
  maxLength?: number;
  options?: string[];
  exportValues?: string[];
}

export interface AnalyzedForm {
  formId: string;
  fieldCount: number;
  fields: Array<RawField & { fieldType: FieldType; labelHint: string }>;
}

export async function analyzeForm(formId: string, pdfPath: string): Promise<AnalyzedForm> {
  const bytes = await fs.readFile(pdfPath);

  // ── Step 1: Extract XFA field labels from raw bytes (before pdf-lib strips XFA) ──
  const xfaLabels = extractFieldLabels(bytes);

  // ── Step 2: Load via pdf-lib to enumerate AcroForm field names & types ──────────
  let pdfDoc: PDFDocument;
  try {
    pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  } catch {
    console.warn(`  ⚠ ${formId}: Could not parse PDF (may be XFA-only). Fields will be empty.`);
    return { formId, fieldCount: 0, fields: [] };
  }

  let form: PDFForm;
  try {
    form = pdfDoc.getForm();
  } catch {
    return { formId, fieldCount: 0, fields: [] };
  }

  const pdfFields = form.getFields();
  const rawFields: RawField[] = pdfFields.map((f: PDFField) => extractRaw(f));

  // ── Step 3: Classify each field using XFA label as the primary signal ────────────
  const analyzed = rawFields.map((raw) => {
    // Pull the partial name (last path segment without [n] index)
    // e.g. "topmostSubform[0].Page1[0].f1_14[0]" → "f1_14"
    const partial = raw.name.replace(/\[\d+\]$/, "").split(".").pop() ?? raw.name;

    const xfaLabel = xfaLabels.get(partial) ?? "";
    const { fieldType, labelHint } = classifyField(raw.name, raw.type, xfaLabel);

    return { ...raw, fieldType, labelHint };
  });

  return { formId, fieldCount: analyzed.length, fields: analyzed };
}

function extractRaw(field: PDFField): RawField {
  const name = field.getName();
  if (field instanceof PDFTextField) {
    return { name, type: "text", maxLength: field.getMaxLength() ?? undefined };
  }
  if (field instanceof PDFCheckBox) {
    return { name, type: "checkbox", exportValues: ["Yes", "Off"] };
  }
  if (field instanceof PDFRadioGroup) {
    return { name, type: "radio", options: field.getOptions() };
  }
  if (field instanceof PDFDropdown) {
    return { name, type: "dropdown", options: field.getOptions() };
  }
  return { name, type: "unknown" };
}
