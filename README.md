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
- [Usage](#usage)
  - [Full Pipeline (download → analyze → fill)](#full-pipeline)
  - [Step-by-Step](#step-by-step)
  - [Fill Specific Forms](#fill-specific-forms)
  - [Reproducible Output](#reproducible-output)
  - [Batch Generation](#batch-generation)
- [CLI Reference](#cli-reference)
  - [Main Entry Point](#main-entry-point-npm-run-dev)
  - [scripts/fill.ts](#scriptsfillts)
  - [scripts/analyze.ts](#scriptsanalyzets)
  - [scripts/download.ts](#scriptsdownloadts)
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
- **Seed-based reproducibility** — the same seed always produces the same PDFs
- **Batch mode** — generate N unique taxpayer submissions per form in a single command
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

## Usage

### Full Pipeline

The simplest way to get filled PDFs. Downloads missing forms, builds templates if needed, then generates one filled submission for every supported form:

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

Pass a comma-separated list of form IDs:

```bash
npx ts-node scripts/fill.ts --forms f1040,fw2,f1040sa,f1040sb

# Common form IDs:
#   f1040        Form 1040 (individual income tax return)
#   fw2          Form W-2 (wages)
#   fw4          Form W-4 (withholding)
#   fw9          Form W-9 (request for TIN)
#   f1040sa      Schedule A (itemized deductions)
#   f1040sb      Schedule B (interest & dividends)
#   f1040sc      Schedule C (business income/loss)
#   f1040sd      Schedule D (capital gains)
#   f1040se      Schedule E (supplemental income)
#   f1099int     Form 1099-INT (interest income)
#   f1099div     Form 1099-DIV (dividends)
#   f1099nec     Form 1099-NEC (nonemployee compensation)
#   f1099msc     Form 1099-MISC (miscellaneous)
#   f1099r       Form 1099-R (retirement distributions)
#   f1040x       Form 1040-X (amended return)
#   f1040es      Form 1040-ES (estimated tax)
#   f2441        Form 2441 (child/dependent care)
#   f8863        Form 8863 (education credits)
#   f8949        Form 8949 (capital asset sales)
#   f1116        Form 1116 (foreign tax credit)
#   f4868        Form 4868 (extension)
```

To see all available form IDs:

```bash
npx ts-node -e "
import { FORMS } from './src/registry/forms';
FORMS.filter(f => f.pdfAvailable !== false).forEach(f => console.log(f.id.padEnd(16), f.displayName));
"
```

---

### Reproducible Output

Use `--seed` to pin the random data. The same seed always produces identical PDFs:

```bash
npx ts-node scripts/fill.ts --forms f1040,fw2 --seed 42
# Produces: f1040_seed42.pdf, fw2_seed42.pdf — identical on every run
```

---

### Batch Generation

Generate multiple unique submissions (different taxpayers) per form:

```bash
# 5 unique submissions for the top 10 forms
npx ts-node scripts/fill.ts \
  --forms f1040,fw2,f1040sa,f1040sb,f1040sc,f1040sd,f1040se,f1099int,f1099div,fw4 \
  --count 5 \
  --seed 100

# Output: f1040_seed100_0.pdf, f1040_seed101_1.pdf, ..., f1040_seed104_4.pdf
#         fw2_seed100_0.pdf,   fw2_seed101_1.pdf, ...
```

Shortcut for 5 submissions of all forms:

```bash
npm run fill:batch
```

---

## CLI Reference

### Main Entry Point (`npm run dev`)

```
npx ts-node src/main.ts [options]
```

| Flag | Default | Description |
|------|---------|-------------|
| `-c, --count <n>` | `1` | Number of unique taxpayer submissions to generate |
| `-f, --forms <ids>` | all | Comma-separated form IDs to process |
| `-s, --seed <n>` | random | Base seed for reproducible output |
| `-y, --year <n>` | `2024` | Tax year stamped on templates |
| `-j, --concurrency <n>` | `3` | Max parallel form operations |
| `--download-only` | — | Download PDFs only; skip analyze and fill |
| `--analyze-only` | — | Download + build templates; skip fill |
| `--force-reanalyze` | — | Rebuild templates even if they already exist |

**Examples:**

```bash
npm run dev -- --count 10
npm run dev -- --forms f1040,fw2 --seed 99 --count 3
npm run dev -- --download-only
npm run dev -- --analyze-only --year 2025
npm run dev -- --force-reanalyze
```

---

### `scripts/fill.ts`

Fill forms with fake data. Requires forms to already be downloaded and templates to exist.

```
npx ts-node scripts/fill.ts [options]
```

| Flag | Default | Description |
|------|---------|-------------|
| `-c, --count <n>` | `1` | Number of submissions |
| `-f, --forms <ids>` | all | Comma-separated form IDs |
| `-s, --seed <n>` | random | Base seed |
| `-y, --year <n>` | `2024` | Tax year |
| `-j, --concurrency <n>` | `3` | Parallel workers |

---

### `scripts/analyze.ts`

Parse downloaded PDFs and write JSON templates to `/templates/`. Re-run this after updating the classifier or formula parser.

```
npx ts-node scripts/analyze.ts [options]
```

| Flag | Default | Description |
|------|---------|-------------|
| `-f, --forms <ids>` | all | Comma-separated form IDs |
| `-y, --year <n>` | `2024` | Tax year to stamp on templates |

---

### `scripts/download.ts`

Download PDFs from IRS/SSA into `/forms/` (cached in `/cache/`).

```
npx ts-node scripts/download.ts [options]
```

| Flag | Default | Description |
|------|---------|-------------|
| `-f, --forms <ids>` | all | Comma-separated form IDs to download |

---

## How It Works

### Phase 1 — Download

PDFs are fetched from `https://www.irs.gov/pub/irs-pdf/{slug}.pdf` (and `ssa.gov` for SSA-1099) with:

- **Caching** — forms are saved to `/cache/` and copied to `/forms/`; already-cached forms are not re-downloaded
- **Retry logic** — up to 3 retries with exponential backoff
- **Rate limiting** — 600ms stagger between requests to avoid IRS throttling

### Phase 2 — Analyze

Each PDF goes through a two-step analysis:

1. **XFA extraction** — IRS PDFs embed their form structure in a compressed XFA (XML Forms Architecture) stream. Before pdf-lib loads the file (which strips XFA), the raw bytes are scanned for compressed streams. The XFA XML is decompressed with zlib and parsed to extract `<speak>` accessibility labels — the most accurate field descriptions available.

2. **Classification** — each AcroForm field is matched against 50+ regex rules using the XFA label as the primary signal. Fields are classified into semantic types: `first_name`, `last_name`, `ssn`, `dollar_amount`, `date`, `checkbox`, `signature`, etc.

3. **Formula detection** — XFA labels that contain IRS calculation language ("Add lines 1a through 1h", "Subtract line 10 from line 9", "Multiply line 2 by 7.5%") are parsed into typed formula objects and stored in the template.

4. **Line number indexing** — IRS line numbers (e.g. `1a`, `11b`, `25d`) are extracted from labels using multiple patterns to handle section prefixes, `Row:` prefixes, and `Page N.` prefixes.

Results are saved as JSON templates in `/templates/{formId}.json`.

### Phase 3 — Fill

Filling uses a two-pass approach:

**Pass 1 — Non-calculated fields:** Every field without a formula is resolved using a context-aware resolver. The resolver uses the stored XFA label (`labelHint`) to decide what to fill:

| Field type | Resolution example |
|------------|--------------------|
| `first_name` | Returns spouse's name if label contains "spouse"; dependent's name if label contains "Dependent N" |
| `ssn` | Returns spouse SSN or dependent SSN based on label context |
| `street_address` | Returns employer address if label mentions "employer"; apt number if it mentions "apt" |
| `dollar_amount` | Maps label keywords (wages, interest, dividends, capital gains) to real taxpayer income totals |
| `employer_ein` | Returns second W-2's EIN if label says "employer 2" |
| `checkbox` | Always checked if `required`; 50% probability otherwise |

**Pass 2 — Calculated fields:** Formulas are evaluated against the values filled in Pass 1. The evaluator supports:

| Formula type | Example label |
|-------------|---------------|
| `add_range` | "Add lines 1a through 1h" |
| `add_list` | "Add lines 1z, 2b, 3b, 4b, 5b, 6b, 7a, and 8" |
| `subtract` | "Subtract line 10 from line 9" |
| `multiply` | "Multiply line 2 by 7.5% (0.075)" |
| `min_line_const` | "Enter the smaller of line 5d or $40,000" |
| `min_two_lines` | "Enter the smaller of line 6 or line 9" |
| `conditional_subtract` | "If line 33 is more than line 24, subtract line 24 from line 33" |

Pass 2 retries up to 3 times to handle chains where a calculated field depends on another calculated field (e.g. line 15 depends on 11b which depends on 11a).

### Formula Resolution

Across the 20 most common forms, the system detects **89 calculated fields** with a **92% resolution rate** from XFA labels alone. Unresolvable formulas (where a referenced line number can't be found in the template) fall back to faker-generated values with a warning logged.

---

## Project Structure

```
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
│   ├── pipeline/
│   │   ├── runner.ts              # Single-form pipeline orchestration
│   │   └── batch.ts               # Multi-form, multi-submission batch runner
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
|----------|-------|---------|
| **Core returns** | 5 | 1040, 1040-SR, 1040-NR, 1040-X, 1040-ES |
| **Schedules** | 12 | A, B, C, D, E, F, H, J, SE, 1, 2, 3 |
| **Supporting** | 33 | 2106, 2210, 2441, 4562, 8283, 8863, 8949 |
| **Information returns** | 21 | 1099-INT, 1099-DIV, 1099-NEC, 1099-MISC, 1099-R, W-2G |
| **Schedule K-1** | 3 | K-1 (1065), K-1 (1120-S), K-1 (1041) |
| **Business** | 25 | 1065, 1120, 1120-S, 1125-A, 8594, 8886 |
| **Fiduciary / Estate** | 6 | 706, 709, 1041, 5227, 8971 |
| **Exempt organizations** | 8 | 990, 990-EZ, 990-PF, 1023, 4720, 8868 |
| **Payroll** | 16 | 940, 941, 944, W-2, W-3, W-4, W-9, W-7 |
| **Retirement / ACA** | 5 | 5498, 5500, 1094-B/C, 1095-A/B/C |
| **International** | 17 | 926, 1042, 3520, 5471, 8288, 8833, 8854, 8938 |
| **Excise** | 6 | 720, 730, 2290, 8027, 8611, 8849 |
| **Admin / Practitioner** | 13 | 2848, 3115, 7004, 8275, 8300, 8821, 8832, 8879 |
| **ACA** | 5 | 1094-B, 1094-C, 1095-A, 1095-B, 1095-C |

For the full list of form IDs, see `src/registry/forms.ts` or `docs/forms.md`.

---

## Template Format

Each analyzed form produces a JSON template at `templates/{formId}.json`:

```json
{
  "formId": "f1040",
  "displayName": "Form 1040",
  "taxYear": 2024,
  "sourceUrl": "https://www.irs.gov/pub/irs-pdf/f1040.pdf",
  "generatedAt": "2025-04-06T00:00:00.000Z",
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

**Formula types:** `add_range`, `add_list`, `subtract`, `multiply`, `min_line_const`, `min_two_lines`, `conditional_subtract`

---

## Output Files

Filled PDFs are written to `/output/` with the naming convention:

```
{formId}_seed{seed}.pdf               # single submission
{formId}_seed{seed}_{index}.pdf       # batch submission
```

Examples:
```
f1040_seed77.pdf
fw2_seed100_0.pdf
f1040sa_seed100_1.pdf
```

The PDFs are **flattened** — form fields are rendered into the page content so values are visible in any PDF viewer without interactive form support.

---

## Troubleshooting

**`Error: PDF not found: forms/fXXXX.pdf`**
Run `npm run download` first, or include `--download-only` in the main command.

**`Error: No template found for fXXXX`**
Run `npm run analyze` to generate templates, or use `npm run dev` which runs all phases.

**Form has only generic numbers, not realistic data**
Re-run `npm run analyze` to regenerate templates with the latest classifier. Templates generated before the XFA extractor was added won't have `labelHint` values.

**IRS download returns 403 or empty file**
A small number of IRS forms are not available as standalone PDFs (they're embedded in instruction booklets or require online submission). These are marked `pdfAvailable: false` in `src/registry/forms.ts` and skipped automatically.

**Calculated fields show wrong values**
Re-run `npm run analyze` to regenerate templates with the latest formula parser. Templates without `formula` or `lineNumber` fields will use faker for all values.

**Downloaded PDFs look correct but fields aren't filled**
Some IRS forms are XFA-only (no AcroForm layer). pdf-lib cannot write to these. The analyzer will report 0 fields and the filler will skip them.

**Container won't start**
Make sure Docker Desktop is running. On Apple Silicon, ensure the Docker image supports `linux/arm64` (the devcontainer Dockerfile uses `node:20-bookworm` which does).
