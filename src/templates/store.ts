import fs from "fs-extra";
import path from "path";
import { FormTemplate } from "./schema";
import { AnalyzedForm } from "../analyzer/index";
import { FormEntry } from "../registry/forms";

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
  return {
    formId: form.id,
    displayName: form.displayName,
    taxYear,
    sourceUrl: form.url,
    generatedAt: new Date().toISOString(),
    fields: analyzed.fields.map((f) => ({
      pdfFieldName: f.name,
      fieldType: f.fieldType,
      labelHint: f.labelHint,
      required: false,
      maxLength: f.maxLength,
      options: f.options ?? f.exportValues,
    })),
  };
}
