#!/usr/bin/env ts-node
/**
 * scripts/download.ts — download all (or specific) IRS forms
 *
 * Usage:
 *   npx ts-node scripts/download.ts
 *   npx ts-node scripts/download.ts --forms f1040,fw2,f1099int
 */
import { Command } from "commander";
import chalk from "chalk";
import { FORM_REGISTRY } from "../src/registry/forms";
import { downloadForms } from "../src/downloader/index";

const program = new Command();
program
  .option("-f, --forms <ids>", "Comma-separated form IDs (default: all)")
  .parse(process.argv);

const opts = program.opts();
const targets = opts.forms
  ? FORM_REGISTRY.filter((f) => opts.forms.split(",").map((s: string) => s.trim()).includes(f.id))
  : FORM_REGISTRY;

console.log(chalk.blue(`Downloading ${targets.length} forms...`));
downloadForms(targets).then((results) => {
  console.log(chalk.green(`\nComplete. ${results.size} forms downloaded.`));
}).catch(console.error);
