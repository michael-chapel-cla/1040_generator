#!/usr/bin/env ts-node
/**
 * scripts/fill.ts — fill forms with fake taxpayer data
 *
 * Usage:
 *   npx ts-node scripts/fill.ts                         # fill all forms, 1 taxpayer
 *   npx ts-node scripts/fill.ts --count 10              # 10 unique submissions
 *   npx ts-node scripts/fill.ts --forms f1040,fw2       # specific forms only
 *   npx ts-node scripts/fill.ts --seed 42 --count 3    # reproducible batch
 */
import { Command } from "commander";
import chalk from "chalk";
import path from "path";
import { runBatch } from "../src/pipeline/batch";

const program = new Command();
program
  .option("-c, --count <n>",       "Number of unique submissions", "1")
  .option("-f, --forms <ids>",     "Comma-separated form IDs (default: all)")
  .option("-s, --seed <n>",        "Base seed for reproducible output")
  .option("-y, --year <n>",        "Tax year", "2024")
  .option("-j, --concurrency <n>", "Max parallel operations", "3")
  .parse(process.argv);

const opts = program.opts();

(async () => {
  const count       = parseInt(opts.count, 10);
  const taxYear     = parseInt(opts.year, 10);
  const concurrency = parseInt(opts.concurrency, 10);
  const baseSeed    = opts.seed ? parseInt(opts.seed, 10) : undefined;
  const formIds     = opts.forms
    ? opts.forms.split(",").map((s: string) => s.trim())
    : undefined;

  console.log(chalk.blue(`\nGenerating ${count} submission(s)...\n`));

  const result = await runBatch({ formIds, count, baseSeed, taxYear, concurrency });

  console.log(chalk.bold("\nSummary:"));
  console.log(chalk.green(`  ✓ ${result.totalSucceeded} PDFs filled`));
  if (result.totalFailed > 0) {
    console.log(chalk.red(`  ✗ ${result.totalFailed} failed`));
    result.errors.forEach((e) =>
      console.log(chalk.red(`    [sub ${e.submission}] ${e.formId}: ${e.error}`))
    );
  }
  console.log(chalk.gray(`\n  Output → ${path.resolve(process.cwd(), "output")}\n`));
})();
