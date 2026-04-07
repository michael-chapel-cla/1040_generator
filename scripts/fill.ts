#!/usr/bin/env ts-node
/**
 * scripts/fill.ts — fill forms with fake taxpayer data
 *
 * Usage:
 *   npx ts-node scripts/fill.ts                               # all forms, 1 submission
 *   npx ts-node scripts/fill.ts --count 5                     # 5 unique submissions, all forms
 *   npx ts-node scripts/fill.ts --forms f1040,fw2             # specific forms, 1 each
 *   npx ts-node scripts/fill.ts --forms f1040:3,fw2:5         # 3 copies of 1040, 5 of W-2
 *   npx ts-node scripts/fill.ts --seed 42 --count 3           # reproducible batch
 *   npx ts-node scripts/fill.ts --forms f1040,fw2 --merge     # merge all output into one PDF
 */
import { Command } from "commander";
import chalk from "chalk";
import path from "path";
import { runBatch, parseFormSpecs } from "../src/pipeline/batch";
import { mergePdfs } from "../src/merger/index";

const program = new Command();
program
  .option("-c, --count <n>",       "Number of unique submissions per form (default: 1)", "1")
  .option("-f, --forms <ids>",     "Forms to fill. Use 'id' or 'id:N' per-form count (e.g. f1040:3,fw2:5)")
  .option("-s, --seed <n>",        "Base seed for reproducible output")
  .option("-y, --year <n>",        "Tax year", "2024")
  .option("-j, --concurrency <n>", "Max parallel operations", "3")
  .option("-m, --merge",           "Merge all generated PDFs into a single bundled PDF")
  .option("--merge-name <name>",   "Output filename for the merged PDF (default: merged_<timestamp>.pdf)")
  .parse(process.argv);

const opts = program.opts();

(async () => {
  const count       = parseInt(opts.count, 10);
  const taxYear     = parseInt(opts.year, 10);
  const concurrency = parseInt(opts.concurrency, 10);
  const baseSeed    = opts.seed ? parseInt(opts.seed, 10) : undefined;
  const forms       = opts.forms ? parseFormSpecs(opts.forms) : undefined;

  const hasPerFormCounts = forms?.some((f) => f.count !== undefined);
  const desc = hasPerFormCounts
    ? forms!.map((f) => `${f.formId}×${f.count ?? count}`).join(", ")
    : `${count} submission(s)`;

  console.log(chalk.blue(`\nGenerating ${desc}...\n`));

  const result = await runBatch({ forms, count, baseSeed, taxYear, concurrency });

  console.log(chalk.bold("\nSummary:"));
  console.log(chalk.green(`  ✓ ${result.totalSucceeded} PDFs filled`));
  if (result.totalFailed > 0) {
    console.log(chalk.red(`  ✗ ${result.totalFailed} failed`));
    result.errors.forEach((e) =>
      console.log(chalk.red(`    [sub ${e.submission}] ${e.formId}: ${e.error}`))
    );
  }

  // ── Merge ──────────────────────────────────────────────────────────────────
  if (opts.merge && result.results.length > 0) {
    // Sort by form ID then submission index for a predictable page order
    const sorted = [...result.results].sort((a, b) =>
      a.formId.localeCompare(b.formId) || a.submission - b.submission
    );
    const paths = sorted.map((r) => r.outputPath);
    const name  = opts.mergeName ?? undefined;

    console.log(chalk.yellow(`\n  Merging ${paths.length} PDFs...`));
    try {
      const merged = await mergePdfs(paths, name);
      console.log(chalk.green(`  ✓ Merged → ${path.basename(merged)}`));
    } catch (err) {
      console.log(chalk.red(`  ✗ Merge failed: ${(err as Error).message}`));
    }
  }

  console.log(chalk.gray(`\n  Output → ${path.resolve(process.cwd(), "output")}\n`));
})();
