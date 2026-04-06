import { downloadForm } from "../downloader/index";
import { analyzeForm } from "../analyzer/index";
import { buildTemplate, saveTemplate, loadTemplate, templateExists } from "../templates/store";
import { fillForm, FillResult } from "../filler/index";
import { FakeTaxpayer } from "../faker/taxpayer";
import { getForm } from "../registry/forms";

export interface RunOptions {
  formId: string;
  taxpayer: FakeTaxpayer;
  forceReanalyze?: boolean;
  runId?: string | number;
}

/**
 * Full pipeline for one form:
 *   download (cached) → analyze → build/load template → fill → write output
 */
export async function runForm(opts: RunOptions): Promise<FillResult> {
  const { formId, taxpayer, forceReanalyze, runId } = opts;
  const formEntry = getForm(formId);

  // 1. Download (uses cache if available)
  const pdfPath = await downloadForm(formEntry);

  // 2. Analyze & build template (skip if already exists unless forced)
  const needsAnalysis = forceReanalyze || !(await templateExists(formId));
  if (needsAnalysis) {
    const analyzed = await analyzeForm(formId, pdfPath);
    const template = buildTemplate(formEntry, analyzed, taxpayer.taxYear);
    await saveTemplate(template);
  }

  // 3. Load template
  const template = await loadTemplate(formId);

  // 4. Fill
  return fillForm(template, taxpayer, runId);
}
