import pLimit from "p-limit";
import { runForm } from "./runner";
import { createTaxpayer } from "../faker/factory";
import { FillResult } from "../filler/index";
import { FORM_REGISTRY, FormEntry, getForm } from "../registry/forms";

export interface BatchOptions {
  /** Form IDs to fill. Defaults to ALL forms in registry. */
  formIds?: string[];
  /** How many unique fake taxpayer submissions to generate. Default: 1 */
  count?: number;
  /** Base seed. Each submission uses seed + index. Omit for random. */
  baseSeed?: number;
  /** Tax year for all generated returns. Default: 2024 */
  taxYear?: number;
  /** Max concurrent form-fill operations. Default: 3 */
  concurrency?: number;
  /** Re-analyze PDFs even if templates already exist. Default: false */
  forceReanalyze?: boolean;
}

export interface BatchResult {
  totalAttempted: number;
  totalSucceeded: number;
  totalFailed: number;
  results: Array<{ submission: number; seed: number } & FillResult>;
  errors: Array<{ formId: string; submission: number; error: string }>;
}

/**
 * Fills every requested form for every requested fake taxpayer in parallel.
 */
export async function runBatch(opts: BatchOptions = {}): Promise<BatchResult> {
  const {
    formIds,
    count = 1,
    baseSeed,
    taxYear = 2024,
    concurrency = 3,
    forceReanalyze = false,
  } = opts;

  const forms: FormEntry[] = formIds
    ? formIds.map((id) => getForm(id))
    : FORM_REGISTRY;

  const limit = pLimit(concurrency);
  const results: BatchResult["results"] = [];
  const errors:  BatchResult["errors"]  = [];

  // Build one taxpayer per submission
  const taxpayers = Array.from({ length: count }, (_, i) => {
    const seed = baseSeed !== undefined ? baseSeed + i : undefined;
    return { index: i, taxpayer: createTaxpayer(seed, taxYear) };
  });

  const tasks: Array<Promise<void>> = [];

  for (const { index, taxpayer } of taxpayers) {
    for (const form of forms) {
      tasks.push(
        limit(async () => {
          try {
            const result = await runForm({
              formId: form.id,
              taxpayer,
              forceReanalyze: forceReanalyze && index === 0, // only re-analyze once
              runId: count > 1 ? index : undefined,
            });
            results.push({ submission: index, seed: taxpayer.seed, ...result });
          } catch (err) {
            errors.push({
              formId: form.id,
              submission: index,
              error: (err as Error).message,
            });
          }
        })
      );
    }
  }

  await Promise.all(tasks);

  return {
    totalAttempted: tasks.length,
    totalSucceeded: results.length,
    totalFailed: errors.length,
    results,
    errors,
  };
}
