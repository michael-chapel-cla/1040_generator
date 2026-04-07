#!/usr/bin/env ts-node
/**
 * main.ts — CLI entry point
 *
 * Usage:
 *   npm run dev                           # fill all forms, 1 taxpayer
 *   npm run dev -- --count 5             # fill all forms, 5 taxpayers
 *   npm run dev -- --forms f1040,fw2     # fill specific forms
 *   npm run dev -- --seed 42 --count 3  # reproducible batch
 *   npm run dev -- --download-only       # just download PDFs
 *   npm run dev -- --analyze-only        # download + generate templates
 */

import { Command } from "commander";
import chalk from "chalk";
import { runBatch, parseFormSpecs } from "./pipeline/batch";
import { downloadForms } from "./downloader/index";
import { FORM_REGISTRY } from "./registry/forms";
import { analyzeForm } from "./analyzer/index";
import { buildTemplate, saveTemplate } from "./templates/store";
import { createTaxpayer } from "./faker/factory";
import { mergePdfs } from "./merger/index";
import path from "path";

const program = new Command();

program
  .name("1040-form-builder")
  .description("Downloads IRS tax forms and fills them with randomized fake data")
  .version("1.0.0")
  .option("-c, --count <n>",       "Global number of unique submissions per form (default: 1)", "1")
  .option("-f, --forms <ids>",     "Forms to fill. Use 'id' or 'id:N' for per-form counts (e.g. f1040:3,fw2:5)")
  .option("-s, --seed <n>",        "Base random seed for reproducible output")
  .option("-y, --year <n>",        "Tax year", "2024")
  .option("-j, --concurrency <n>", "Max parallel operations", "3")
  .option("-m, --merge",           "Merge all generated PDFs into a single bundled PDF")
  .option("--merge-name <name>",   "Output filename for the merged PDF")
  .option("--download-only",       "Only download PDFs, do not fill")
  .option("--analyze-only",        "Download PDFs and generate templates only")
  .option("--force-reanalyze",     "Regenerate templates even if they already exist")
  .parse(process.argv);

const opts = program.opts();

async function main() {
  const count       = parseInt(opts.count, 10);
  const taxYear     = parseInt(opts.year, 10);
  const concurrency = parseInt(opts.concurrency, 10);
  const baseSeed    = opts.seed ? parseInt(opts.seed, 10) : undefined;
  const formSpecs   = opts.forms ? parseFormSpecs(opts.forms as string) : undefined;
  const formIds     = formSpecs?.map((s) => s.formId);

  const targetForms = formIds
    ? FORM_REGISTRY.filter((f) => formIds.includes(f.id))
    : FORM_REGISTRY;

  console.log(chalk.bold.blue("\n🗂  1040 Form Builder"));
  console.log(chalk.gray(`   Forms: ${targetForms.length}  |  Submissions: ${count}  |  Tax year: ${taxYear}\n`));

  // ── Download ───────────────────────────────────────────────────────────────
  console.log(chalk.yellow("► Downloading forms..."));
  const downloaded = await downloadForms(targetForms);
  console.log(chalk.green(`  ${downloaded.size} forms downloaded/cached\n`));

  if (opts.downloadOnly) {
    console.log(chalk.green("Done (download-only mode)."));
    return;
  }

  // ── Analyze ────────────────────────────────────────────────────────────────
  console.log(chalk.yellow("► Analyzing form fields and building templates..."));
  let templatesBuilt = 0;
  const sampleTaxpayer = createTaxpayer(baseSeed, taxYear);

  for (const form of targetForms) {
    const pdfPath = path.resolve(process.cwd(), "forms", `${form.id}.pdf`);
    try {
      const analyzed = await analyzeForm(form.id, pdfPath);
      if (analyzed.fieldCount > 0 || opts.forceReanalyze) {
        const template = buildTemplate(form, analyzed, taxYear);
        await saveTemplate(template);
        templatesBuilt++;
      }
    } catch (err) {
      console.warn(chalk.red(`  ✗ ${form.id}: ${(err as Error).message}`));
    }
  }
  console.log(chalk.green(`  ${templatesBuilt} templates built\n`));

  if (opts.analyzeOnly) {
    console.log(chalk.green("Done (analyze-only mode)."));
    return;
  }

  // ── Fill ───────────────────────────────────────────────────────────────────
  console.log(chalk.yellow(`► Filling forms (${count} submission${count > 1 ? "s" : ""})...`));
  const batch = await runBatch({
    forms: formSpecs,
    count,
    baseSeed,
    taxYear,
    concurrency,
    forceReanalyze: opts.forceReanalyze ?? false,
  });

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log("\n" + chalk.bold("Results:"));
  console.log(chalk.green(`  ✓ ${batch.totalSucceeded} forms filled successfully`));
  if (batch.totalFailed > 0) {
    console.log(chalk.red(`  ✗ ${batch.totalFailed} failed`));
    batch.errors.forEach((e) =>
      console.log(chalk.red(`    [submission ${e.submission}] ${e.formId}: ${e.error}`))
    );
  }

  // ── Merge ──────────────────────────────────────────────────────────────────
  if (opts.merge && batch.results.length > 0) {
    const sorted = [...batch.results].sort((a, b) =>
      a.formId.localeCompare(b.formId) || a.submission - b.submission
    );
    console.log(chalk.yellow(`\n  Merging ${sorted.length} PDFs...`));
    try {
      const merged = await mergePdfs(sorted.map((r) => r.outputPath), opts.mergeName);
      console.log(chalk.green(`  ✓ Merged → ${path.basename(merged)}`));
    } catch (err) {
      console.log(chalk.red(`  ✗ Merge failed: ${(err as Error).message}`));
    }
  }

  console.log(chalk.gray(`\n  Output written to: ${path.resolve(process.cwd(), "output")}\n`));
}

main().catch((err) => {
  console.error(chalk.red("Fatal error:"), err);
  process.exit(1);
});
