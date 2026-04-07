import fs from "fs-extra";
import path from "path";
import { FormTemplate } from "./schema";
import { AnalyzedForm } from "../analyzer/index";
import { FormEntry } from "../registry/forms";
import { parseFormula, extractLineNumber } from "./formula-parser";

const TEMPLATES_DIR = path.resolve(process.cwd(), "templates");

export async function saveTemplate(template: FormTemplate): Promise<string> {
  await fs.ensureDir(TEMPLATES_DIR);
  const filePath = path.join(TEMPLATES_DIR, `${template.formId}.json`);
  await fs.writeJson(filePath, template, { spaces: 2 });
  return filePath;
}

export async function loadTemplate(formId: string): Promise<FormTemplate> {
  const filePath = path.join(TEMPLATES_DIR, `${formId}.json`);
  if (!(await fs.pathExists(filePath))) {
    throw new Error(`No template found for ${formId}. Run 'npm run analyze' first.`);
  }
  return fs.readJson(filePath) as Promise<FormTemplate>;
}

export async function templateExists(formId: string): Promise<boolean> {
  return fs.pathExists(path.join(TEMPLATES_DIR, `${formId}.json`));
}

export async function listTemplates(): Promise<string[]> {
  await fs.ensureDir(TEMPLATES_DIR);
  const files = await fs.readdir(TEMPLATES_DIR);
  return files.filter((f) => f.endsWith(".json")).map((f) => f.replace(".json", ""));
}

export function buildTemplate(
  form: FormEntry,
  analyzed: AnalyzedForm,
  taxYear: number
): FormTemplate {
  // First pass: extract line numbers and formulas from labels
  const fields = analyzed.fields.map((f) => {
    const lineNumber = extractLineNumber(f.labelHint);
    const formula    = parseFormula(f.labelHint);
    return {
      pdfFieldName: f.name,
      fieldType:    f.fieldType,
      labelHint:    f.labelHint,
      lineNumber,
      required:     false,
      maxLength:    f.maxLength,
      options:      f.options ?? f.exportValues,
      ...(formula   ? { formula }    : {}),
    };
  });

  // Second pass: infer missing line numbers from adjacent fields
  // Case 1: field has lineNumber "N" and next field has "Nb" → rename "N" to "Na"
  // Case 2: field has no lineNumber and next field has "Nb"  → assign "Na"
  for (let i = 0; i < fields.length - 1; i++) {
    const next = fields[i + 1];
    if (!next.lineNumber) continue;
    const m = /^(\d+)b$/.exec(next.lineNumber);
    if (!m) continue;
    const base = m[1]; // e.g. "1" from "1b", "25" from "25b"
    const cur  = fields[i];
    if (!cur.lineNumber || cur.lineNumber === base) {
      cur.lineNumber = `${base}a`;
    }
  }

  // Strip undefined lineNumber to keep JSON clean
  return {
    formId: form.id,
    displayName: form.displayName,
    taxYear,
    sourceUrl: form.url,
    generatedAt: new Date().toISOString(),
    fields: fields.map((f) => {
      const { lineNumber, ...rest } = f;
      return lineNumber ? { ...rest, lineNumber } : rest;
    }),
  };
}
