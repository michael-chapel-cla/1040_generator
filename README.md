# 1040 Form Builder

A Node.js/TypeScript application that downloads IRS tax forms, analyzes their fields, and fills them with realistic fake data for testing, development, and dataset generation.

Covers **173 IRS and SSA forms** across 14 categories — from core 1040 returns to W-2s, 1099s, business returns, international filings, and payroll forms. Generated PDFs contain semantically correct data: names in name fields, SSNs in SSN fields, addresses in address fields, and calculated totals that satisfy IRS line formulas.

---

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [Option A: VS Code Dev Container (recommended)](#option-a-vs-code-dev-container-recommended)
  - [Option B: Local Development](#option-b-local-development)
- [npm Scripts](#npm-scripts)
- [Usage](#usage)
  - [Full Pipeline](#full-pipeline)
  - [Step-by-Step](#step-by-step)
  - [Fill Specific Forms](#fill-specific-forms)
  - [Per-Form Counts](#per-form-counts)
  - [Reproducible Output](#reproducible-output)
  - [Batch Generation](#batch-generation)
  - [Merging into One PDF](#merging-into-one-pdf)
- [CLI Reference](#cli-reference)
- [How It Works](#how-it-works)
  - [Phase 1 — Download](#phase-1--download)
  - [Phase 2 — Analyze](#phase-2--analyze)
  - [Phase 3 — Fill](#phase-3--fill)
  - [Formula Resolution](#formula-resolution)
- [Project Structure](#project-structure)
- [Supported Forms](#supported-forms)
- [Template Format](#template-format)
- [Output Files](#output-files)
- [Troubleshooting](#troubleshooting)

---

## Features

- **173 forms** — 1040, W-2, 1099 series, Schedules A–SE, business returns (1065, 1120), payroll (940/941), international (FBAR, 5471), and more
- **Realistic fake data** — context-aware field resolution: names, SSNs, EINs, addresses, dates, dollar amounts all look authentic
- **Formula-aware fills** — calculated fields (totals, subtractions, percentages) are computed from their source lines rather than filled randomly
- **Per-form counts** — generate a different number of copies per form type in a single command (`f1040:3,fw2:5`)
- **PDF bundling** — merge all generated PDFs into a single document with `--merge`
- **Seed-based reproducibility** — the same seed always produces the same PDFs
- **JSON templates** — each form's field structure is persisted so re-analysis is not needed on every run
- **Dev Container ready** — zero-config setup in VS Code

---

## Prerequisites

**Option A — Dev Container:** VS Code + Docker Desktop (no local Node.js required)

**Option B — Local:** Node.js 20+, npm 9+

---

## Getting Started

### Option A: VS Code Dev Container (recommended)

1. Install [VS Code](https://code.visualstudio.com/) and the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
2. Install and start [Docker Desktop](https://www.docker.com/products/docker-desktop/)
3. Open this repository in VS Code
4. When prompted **"Reopen in Container"**, click it — or run **Dev Containers: Reopen in Container** from the Command Palette
5. Wait for the container to build and `npm install` to complete
6. Open a terminal inside VS Code and run:

```bash
npm run dev
```

### Option B: Local Development

```bash
git clone <repo-url>
cd 1040FormBuilder
npm install
npm run dev
```

---

## npm Scripts

All functionality is available through `npm run` commands. Pass additional flags after `--`.

| Script | Description |
|---|---|
| `npm run dev` | Full pipeline: download → analyze → fill all forms (1 submission) |
| `npm run download` | Download PDFs from IRS/SSA into `/forms/` |
| `npm run analyze` | Parse PDFs and generate JSON templates in `/templates/` |
| `npm run fill` | Fill forms with fake data, output to `/output/` |
| `npm run fill:batch` | Fill all forms with 5 unique submissions |
| `npm run fill:common` | Fill the 10 most common forms (1040, W-2, Schedules A–SE, 1099s) |
| `npm run fill:merge` | Fill all forms and merge output into one PDF |
| `npm run forms` | List all available form IDs and display names |
| `npm run build` | Compile TypeScript to `/dist/` |
| `npm run start` | Run the compiled build |

**Passing flags:** append `--` then your flags to any script:

```bash
npm run fill -- --forms f1040,fw2 --count 3 --seed 42
npm run fill -- --forms "f1040:3,fw2:5" --merge --merge-name bundle.pdf
npm run download -- --forms fw2,f1099int
npm run analyze -- --forms f1040
npm run dev -- --forms f1040,fw2 --count 5 --seed 99
```

---

## Usage

### Full Pipeline

Downloads missing forms, builds templates if needed, then generates one filled submission for every supported form:

```bash
npm run dev
```

This runs: download → analyze → fill for all 173 forms.

---

### Step-by-Step

Run each phase independently for more control:

```bash
# Step 1: Download PDFs from IRS/SSA into /forms/
npm run download

# Step 2: Analyze each PDF and save field metadata to /templates/
npm run analyze

# Step 3: Fill forms with fake data, write PDFs to /output/
npm run fill
```

---

### Fill Specific Forms

Pass a comma-separated list of form IDs with `--forms`:

```bash
npm run fill -- --forms f1040,fw2,f1040sa,f1040sb
```

To see all available form IDs:

```bash
npm run forms
```

Common form IDs:

| ID | Form |
|---|---|
| `f1040` | Form 1040 — Individual Income Tax Return |
| `fw2` | Form W-2 — Wages and Tax Statement |
| `fw4` | Form W-4 — Employee's Withholding Certificate |
| `fw9` | Form W-9 — Request for Taxpayer Identification |
| `f1040sa` | Schedule A — Itemized Deductions |
| `f1040sb` | Schedule B — Interest and Ordinary Dividends |
| `f1040sc` | Schedule C — Profit or Loss from Business |
| `f1040sd` | Schedule D — Capital Gains and Losses |
| `f1040se` | Schedule E — Supplemental Income and Loss |
| `f1099int` | Form 1099-INT — Interest Income |
| `f1099div` | Form 1099-DIV — Dividends and Distributions |
| `f1099nec` | Form 1099-NEC — Nonemployee Compensation |
| `f1099msc` | Form 1099-MISC — Miscellaneous Information |
| `f1099r` | Form 1099-R — Retirement Distributions |
| `f1040x` | Form 1040-X — Amended Return |
| `f1040es` | Form 1040-ES — Estimated Tax |
| `f2441` | Form 2441 — Child and Dependent Care |
| `f8863` | Form 8863 — Education Credits |
| `f8949` | Form 8949 — Capital Asset Sales |
| `f4868` | Form 4868 — Extension of Time to File |

Or fill the 10 most common forms in one command:

```bash
npm run fill:common
```

---

### Per-Form Counts

Append `:N` to any form ID to generate exactly N copies of that form, independent of the global `--count`:

```bash
# 3 copies of 1040, 5 copies of W-2, 1 copy of Schedule A
npm run fill -- --forms "f1040:3,fw2:5,f1040sa:1" --seed 50
```

Mix per-form counts with plain IDs — plain IDs fall back to the global `--count`:

```bash
# f1040 gets 4 copies, fw2 uses global count (2)
npm run fill -- --forms "f1040:4,fw2" --count 2 --seed 10
```

---

### Reproducible Output

Use `--seed` to pin the random data. The same seed always produces identical PDFs:

```bash
npm run fill -- --forms f1040,fw2 --seed 42
# Produces f1040_seed42.pdf and fw2_seed42.pdf — identical on every run
```

---

### Batch Generation

Generate multiple unique submissions (each with a different taxpayer profile):

```bash
# 5 unique submissions for the top 10 forms
npm run fill:common -- --count 5 --seed 100

# Or manually specify forms and count
npm run fill -- --forms f1040,fw2,f1040sa --count 3 --seed 100
```

Shortcut for 5 submissions of all forms:

```bash
npm run fill:batch
```

---

### Merging into One PDF

Use `--merge` to combine all generated PDFs into a single multi-page document. Pages are ordered by form ID then submission index.

```bash
# Fill and bundle into one PDF
npm run fill -- --forms f1040,fw2,f1040sa --seed 77 --merge

# Give the bundle a specific name
npm run fill -- --forms f1040,fw2 --count 3 --merge --merge-name taxpayer_bundle.pdf

# Use the fill:merge shortcut (fills all forms, merges output)
npm run fill:merge
```

Combine per-form counts with merge for a fully custom bundle:

```bash
npm run fill -- --forms "f1040:2,fw2:3,f1040sa:1,f1099int:2" --seed 100 --merge --merge-name full_submission.pdf
```

---

## CLI Reference

All flags work the same way on `npm run dev` and `npm run fill`.

| Flag | Default | Description |
|---|---|---|
| `-c, --count <n>` | `1` | Global number of unique submissions per form |
| `-f, --forms <ids>` | all | Forms to fill. Use `id` or `id:N` for per-form counts |
| `-s, --seed <n>` | random | Base seed for reproducible output |
| `-y, --year <n>` | `2024` | Tax year |
| `-j, --concurrency <n>` | `3` | Max parallel operations |
| `-m, --merge` | off | Merge all generated PDFs into a single bundled PDF |
| `--merge-name <name>` | timestamped | Output filename for the merged PDF |
| `--download-only` | off | Download PDFs only; skip analyze and fill |
| `--analyze-only` | off | Download and build templates; skip fill |
| `--force-reanalyze` | off | Rebuild templates even if they already exist |

`npm run analyze` and `npm run download` accept a subset:

| Flag | Applies to | Description |
|---|---|---|
| `-f, --forms <ids>` | both | Comma-separated form IDs |
| `-y, --year <n>` | `analyze` | Tax year to stamp on templates |

---

## How It Works

### Phase 1 — Download

PDFs are fetched from `https://www.irs.gov/pub/irs-pdf/{slug}.pdf` (and `ssa.gov` for SSA-1099) with:

- **Caching** — forms are saved to `/cache/` and copied to `/forms/`; already-cached forms are not re-downloaded
- **Retry logic** — up to 3 retries with exponential backoff
- **Rate limiting** — 600ms stagger between requests to avoid IRS throttling

### Phase 2 — Analyze

Each PDF goes through a multi-step analysis:

1. **XFA extraction** — IRS PDFs embed their form structure in a compressed XFA (XML Forms Architecture) stream. Before pdf-lib loads the file (which strips XFA), the raw bytes are scanned for compressed streams. The XFA XML is decompressed with zlib and parsed to extract `<speak>` accessibility labels — the most accurate field descriptions available.

2. **Classification** — each AcroForm field is matched against 50+ regex rules using the XFA label as the primary signal. Fields are classified into semantic types: `first_name`, `last_name`, `ssn`, `dollar_amount`, `date`, `checkbox`, `signature`, etc.

3. **Formula detection** — XFA labels containing IRS calculation language ("Add lines 1a through 1h", "Subtract line 10 from line 9", "Multiply line 2 by 7.5%") are parsed into typed formula objects and stored in the template.

4. **Line number indexing** — IRS line numbers (e.g. `1a`, `11b`, `25d`) are extracted from labels using multiple patterns: direct prefix (`1b. text`), `Row:` prefix, `Page N.` / `Part I I.` / `Section B—` prefix stripping, bold `**Line N.**` format, `Caution:` prefix stripping, and a fallback scan for line numbers embedded mid-label. A secondary pass infers line numbers from the AcroForm field path (e.g. `.Line4b[`) for fields with generic labels, and a tertiary adjacency pass assigns `Xa` to fields immediately preceding an `Xb` field.

Results are saved as JSON templates in `/templates/{formId}.json`.

### Phase 3 — Fill

Filling uses a two-pass approach:

**Pass 1 — Non-calculated fields:** Every field without a formula is resolved using a context-aware resolver that uses the stored XFA label (`labelHint`) to pick the right value:

| Field type | Resolution logic |
|---|---|
| `first_name` | Spouse's name if label contains "spouse"; dependent's name if "Dependent N" |
| `ssn` | Spouse SSN or dependent SSN based on label context |
| `street_address` | Employer address if label mentions "employer"; apt number if "apt" |
| `dollar_amount` | Maps label keywords (wages, interest, dividends, capital gains) to taxpayer income totals |
| `employer_ein` | Returns second W-2's EIN if label says "employer 2" |
| `checkbox` | Always checked if `required`; 50% probability otherwise |

**Pass 2 — Calculated fields:** Formulas are evaluated against the values filled in Pass 1:

| Formula type | Example label |
|---|---|
| `add_range` | "Add lines 1a through 1h" |
| `add_list` | "Add lines 1z, 2b, 3b, 4b, 5b, 6b, 7a, and 8" |
| `subtract` | "Subtract line 10 from line 9" |
| `multiply` | "Multiply line 2 by 7.5% (0.075)" |
| `multiply_two_lines` | "Multiply line 3c by line 3f" |
| `divide_two_lines` | "Divide line 3d by line 3e" |
| `divide_const` | "Divide line 7 by 3.0" |
| `min_line_const` | "Enter the smaller of line 5d or $40,000" |
| `min_two_lines` | "Enter the smaller of line 6 or line 9" |
| `max_two_lines` | "Enter the larger of line 10a or line 10c" |
| `conditional_subtract` | "If line 33 is more than line 24, subtract line 24 from line 33" |
| `reference` | "Amount from line 11a" |

Pass 2 retries up to 3 times to handle dependency chains (e.g. line 15 depends on 11b which depends on 11a).

### Formula Resolution

Across all 173 forms, the system detects **1,435 calculated fields** with a **100% resolution and evaluation rate**. The formula engine handles every IRS calculation pattern found across the form library, including edge cases like skipped line numbers (lines absent from a form's AcroForm layer are treated as 0, matching IRS intent). The 12 supported formula types are:

| Formula type | Example label |
|---|---|
| `add_range` | "Add lines 1a through 1h" |
| `add_list` | "Add lines 1z, 2b, 3b, 4b, 5b, 6b, 7a, and 8" |
| `subtract` | "Subtract line 10 from line 9" |
| `multiply` | "Multiply line 2 by 7.5% (0.075)" |
| `multiply_two_lines` | "Multiply line 3c by line 3f" |
| `divide_two_lines` | "Divide line 3d by line 3e" |
| `divide_const` | "Divide line 7 by 3.0" |
| `min_line_const` | "Enter the smaller of line 5d or $40,000" |
| `min_two_lines` | "Enter the smaller of line 6 or line 9" |
| `max_two_lines` | "Enter the larger of line 10a or line 10c" |
| `conditional_subtract` | "If line 33 is more than line 24, subtract line 24 from line 33" |
| `reference` | "Amount from line 11a" |

Unresolvable formulas (where a referenced line number can't be found in the template) fall back to faker-generated values with a warning logged.

---

## Project Structure

```text
1040FormBuilder/
├── src/
│   ├── main.ts                    # Primary CLI entry point
│   ├── analyzer/
│   │   ├── index.ts               # PDF field extraction & classification
│   │   └── xfa-extractor.ts       # XFA XML decompression & label extraction
│   ├── downloader/
│   │   └── index.ts               # IRS/SSA PDF downloader with caching
│   ├── faker/
│   │   ├── taxpayer.ts            # FakeTaxpayer interface
│   │   ├── factory.ts             # createTaxpayer() — generates realistic fake data
│   │   └── resolver.ts            # Context-aware field value resolution
│   ├── filler/
│   │   ├── index.ts               # Two-pass PDF filler
│   │   └── formula-evaluator.ts   # IRS formula computation engine
│   ├── merger/
│   │   └── index.ts               # mergePdfs() — combines PDFs into one document
│   ├── pipeline/
│   │   ├── runner.ts              # Single-form pipeline orchestration
│   │   └── batch.ts               # Batch runner with FormSpec and parseFormSpecs
│   ├── registry/
│   │   └── forms.ts               # 173-form registry with URLs and categories
│   └── templates/
│       ├── classifier.ts          # Field type classification rules
│       ├── formula-parser.ts      # XFA label → formula object parser
│       ├── line-index.ts          # IRS line number ↔ PDF field name index
│       ├── schema.ts              # TypeScript types for templates and formulas
│       └── store.ts               # Template save/load/build
├── scripts/
│   ├── download.ts                # CLI: download forms
│   ├── analyze.ts                 # CLI: analyze PDFs → templates
│   ├── fill.ts                    # CLI: fill forms with fake data
│   └── download_missing.ts        # One-shot: download all missing forms
├── forms/                         # Downloaded IRS PDF files (not committed)
├── templates/                     # Generated JSON templates (173 files)
├── cache/                         # PDF download cache (not committed)
├── output/                        # Filled PDF output (not committed)
├── docs/
│   └── forms.md                   # Comprehensive form inventory reference
├── .devcontainer/                 # VS Code Dev Container configuration
├── package.json
└── tsconfig.json
```

---

## Supported Forms

173 forms across 14 categories:

| Category | Count | Examples |
|---|---|---|
| Core returns | 5 | 1040, 1040-SR, 1040-NR, 1040-X, 1040-ES |
| Schedules | 12 | A, B, C, D, E, F, H, J, SE, 1, 2, 3 |
| Supporting | 33 | 2106, 2210, 2441, 4562, 8283, 8863, 8949 |
| Information returns | 21 | 1099-INT, 1099-DIV, 1099-NEC, 1099-MISC, 1099-R |
| Schedule K-1 | 3 | K-1 (1065), K-1 (1120-S), K-1 (1041) |
| Business | 25 | 1065, 1120, 1120-S, 1125-A, 8594, 8886 |
| Fiduciary / Estate | 6 | 706, 709, 1041, 5227, 8971 |
| Exempt organizations | 8 | 990, 990-EZ, 990-PF, 1023, 4720, 8868 |
| Payroll | 16 | 940, 941, 944, W-2, W-3, W-4, W-9, W-7 |
| Retirement / ACA | 5 | 5498, 5500, 1094-B/C, 1095-A/B/C |
| International | 17 | 926, 1042, 3520, 5471, 8288, 8833, 8854, 8938 |
| Excise | 6 | 720, 730, 2290, 8027, 8611, 8849 |
| Admin / Practitioner | 13 | 2848, 3115, 7004, 8275, 8300, 8821, 8832, 8879 |
| ACA | 5 | 1094-B, 1094-C, 1095-A, 1095-B, 1095-C |

For the full list of form IDs: `npm run forms`

---

## Template Format

Each analyzed form produces a JSON template at `templates/{formId}.json`:

```json
{
  "formId": "f1040",
  "displayName": "Form 1040",
  "taxYear": 2024,
  "sourceUrl": "https://www.irs.gov/pub/irs-pdf/f1040.pdf",
  "generatedAt": "2026-04-07T00:00:00.000Z",
  "fields": [
    {
      "pdfFieldName": "topmostSubform[0].Page1[0].f1_47[0]",
      "fieldType": "dollar_amount",
      "labelHint": "Income. Attach Form(s) W-2 here...",
      "lineNumber": "1a",
      "required": false,
      "maxLength": 14
    },
    {
      "pdfFieldName": "topmostSubform[0].Page1[0].f1_57[0]",
      "fieldType": "dollar_amount",
      "labelHint": "1z. Add lines 1a through 1h.",
      "lineNumber": "1z",
      "required": false,
      "formula": {
        "op": { "kind": "add_range", "start": "1a", "end": "1h" },
        "floorAtZero": false,
        "rawLabel": "1z. Add lines 1a through 1h."
      }
    }
  ]
}
```

**Field types:** `first_name`, `last_name`, `full_name`, `ssn`, `ein`, `employer_ein`, `payer_tin`, `itin`, `ptin`, `ip_pin`, `street_address`, `city`, `state`, `zip_code`, `country`, `date`, `tax_year`, `dollar_amount`, `percentage`, `shares`, `phone_number`, `email`, `routing_number`, `account_number`, `filing_status`, `occupation`, `dependent_name`, `dependent_ssn`, `relationship`, `employer_name`, `payer_name`, `entity_name`, `business_name`, `checkbox`, `radio`, `signature`, `generic_number`, `generic_text`

**Formula types:** `add_range`, `add_list`, `subtract`, `multiply`, `multiply_two_lines`, `divide_two_lines`, `divide_const`, `min_line_const`, `min_two_lines`, `max_two_lines`, `conditional_subtract`, `reference`

---

## Output Files

Filled PDFs are written to `/output/` with the naming convention:

```text
{formId}_seed{seed}.pdf            # single submission
{formId}_seed{seed}_{index}.pdf    # batch submission (--count > 1)
merged_{timestamp}.pdf             # merged bundle (--merge)
```

The PDFs are **flattened** — form fields are rendered into the page content so values are visible in any PDF viewer without interactive form support.

---

## Troubleshooting

**`Error: PDF not found: forms/fXXXX.pdf`**
Run `npm run download` first, or use `npm run dev` which runs all phases automatically.

**`Error: No template found for fXXXX`**
Run `npm run analyze` to generate templates, or use `npm run dev` which runs all phases.

**Form has only generic numbers, not realistic data**
Re-run `npm run analyze` to regenerate templates with the latest classifier. Templates generated before XFA extraction was added won't have `labelHint` values.

**IRS download returns 403 or empty file**
A small number of IRS forms are not available as standalone PDFs (embedded in instruction booklets or require online submission). These are marked `pdfAvailable: false` in `src/registry/forms.ts` and skipped automatically.

**Calculated fields show wrong values**
Re-run `npm run analyze` to regenerate templates with the latest formula parser. Templates without `formula` or `lineNumber` fields will use faker for all values.

**Downloaded PDFs look correct but fields aren't filled**
Some IRS forms are XFA-only (no AcroForm layer). pdf-lib cannot write to these. The analyzer will report 0 fields and the filler will skip them.

**Container won't start**
Make sure Docker Desktop is running. On Apple Silicon, ensure the Docker image supports `linux/arm64` (the devcontainer Dockerfile uses `node:20-bookworm` which does).
