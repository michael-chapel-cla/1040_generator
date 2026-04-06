#!/usr/bin/env ts-node
/**
 * scripts/analyze.ts — analyze form fields and generate JSON templates
 *
 * Usage:
 *   npx ts-node scripts/analyze.ts
 *   npx ts-node scripts/analyze.ts --forms f1040,fw2
 */
import { Command } from "commander";
import chalk from "chalk";
import path from "path";
import { FORM_REGISTRY } from "../src/registry/forms";
import { analyzeForm } from "../src/analyzer/index";
import { buildTemplate, saveTemplate } from "../src/templates/store";

const program = new Command();
program
  .option("-f, --forms <ids>", "Comma-separated form IDs (default: all)")
  .option("-y, --year <n>",    "Tax year to stamp on templates", "2024")
  .parse(process.argv);

const opts = program.opts();
const taxYear = parseInt(opts.year, 10);
const targets = opts.forms
  ? FORM_REGISTRY.filter((f) => opts.forms.split(",").map((s: string) => s.trim()).includes(f.id))
  : FORM_REGISTRY;

(async () => {
  console.log(chalk.blue(`Analyzing ${targets.length} forms...\n`));
  let ok = 0, fail = 0;

  for (const form of targets) {
    const pdfPath = path.resolve(process.cwd(), "forms", `${form.id}.pdf`);
    try {
      const analyzed = await analyzeForm(form.id, pdfPath);
      const template = buildTemplate(form, analyzed, taxYear);
      const saved    = await saveTemplate(template);
      console.log(chalk.green(`  ✓ ${form.id} — ${analyzed.fieldCount} fields → ${saved}`));
      ok++;
    } catch (err) {
      console.log(chalk.red(`  ✗ ${form.id}: ${(err as Error).message}`));
      fail++;
    }
  }
  console.log(`\nDone: ${ok} succeeded, ${fail} failed.`);
})();
