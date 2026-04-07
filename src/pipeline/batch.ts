import pLimit from "p-limit";
import { runForm } from "./runner";
import { createTaxpayer } from "../faker/factory";
import { FillResult } from "../filler/index";
import { FORM_REGISTRY, FormEntry, getForm } from "../registry/forms";

/** A form with an optional per-form submission count override. */
export interface FormSpec {
  formId: string;
  /** Overrides the global `count` for this form only. */
  count?: number;
}

export interface BatchOptions {
  /**
   * Forms to fill. Each entry is either a plain form ID string or a FormSpec
   * with an optional per-form count override.
   *
   * Examples:
   *   ["f1040", "fw2"]                       // use global count for all
   *   [{ formId: "f1040", count: 3 }, "fw2"] // 3 copies of 1040, global count for W-2
   */
  forms?: Array<string | FormSpec>;
  /** @deprecated Use `forms` instead. Kept for backward compatibility. */
  formIds?: string[];
  /** Global number of unique fake taxpayer submissions. Default: 1 */
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

/** Normalise the `forms` / `formIds` option into a list of FormSpecs. */
function resolveFormSpecs(opts: BatchOptions): FormSpec[] {
  // Prefer `forms` over deprecated `formIds`
  const raw = opts.forms ?? opts.formIds?.map((id) => ({ formId: id }));
  if (!raw) {
    // Default: all forms in the registry, each using global count
    return FORM_REGISTRY.map((f) => ({ formId: f.id }));
  }
  return raw.map((entry) =>
    typeof entry === "string" ? { formId: entry } : entry
  );
}

/**
 * Fills every requested form for every requested fake taxpayer in parallel.
 * Supports per-form count overrides via FormSpec entries.
 */
export async function runBatch(opts: BatchOptions = {}): Promise<BatchResult> {
  const {
    count: globalCount = 1,
    baseSeed,
    taxYear = 2024,
    concurrency = 3,
    forceReanalyze = false,
  } = opts;

  const formSpecs = resolveFormSpecs(opts);
  const limit = pLimit(concurrency);
  const results: BatchResult["results"] = [];
  const errors:  BatchResult["errors"]  = [];

  // Pre-generate a pool of taxpayers large enough for the largest per-form count
  const maxCount = Math.max(globalCount, ...formSpecs.map((s) => s.count ?? globalCount));
  const taxpayers = Array.from({ length: maxCount }, (_, i) => {
    const seed = baseSeed !== undefined ? baseSeed + i : undefined;
    return { index: i, taxpayer: createTaxpayer(seed, taxYear) };
  });

  const tasks: Array<Promise<void>> = [];

  for (const spec of formSpecs) {
    const formCount = spec.count ?? globalCount;
    let form: FormEntry;
    try { form = getForm(spec.formId); } catch (err) {
      // Unknown form ID — record error for all requested submissions and skip
      for (let i = 0; i < formCount; i++) {
        errors.push({ formId: spec.formId, submission: i, error: (err as Error).message });
      }
      continue;
    }

    for (let i = 0; i < formCount; i++) {
      const { index, taxpayer } = taxpayers[i];
      tasks.push(
        limit(async () => {
          try {
            const result = await runForm({
              formId: form.id,
              taxpayer,
              forceReanalyze: forceReanalyze && index === 0,
              runId: formCount > 1 ? index : undefined,
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

/**
 * Parse a comma-separated form string into FormSpecs.
 * Supports optional per-form count suffix with `:N`.
 *
 * Examples:
 *   "f1040,fw2"          → [{ formId: "f1040" }, { formId: "fw2" }]
 *   "f1040:3,fw2:5"      → [{ formId: "f1040", count: 3 }, { formId: "fw2", count: 5 }]
 *   "f1040:3,fw2"        → [{ formId: "f1040", count: 3 }, { formId: "fw2" }]
 */
export function parseFormSpecs(raw: string): FormSpec[] {
  return raw.split(",").map((token) => {
    const [formId, countStr] = token.trim().split(":");
    const count = countStr ? parseInt(countStr, 10) : undefined;
    return count !== undefined && !isNaN(count)
      ? { formId, count }
      : { formId };
  });
}
