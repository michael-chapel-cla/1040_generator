import fs from "fs-extra";
import path from "path";
import https from "https";
import http from "http";
import { FormEntry } from "../registry/forms";

const CACHE_DIR = path.resolve(process.cwd(), "cache");
const FORMS_DIR = path.resolve(process.cwd(), "forms");

// IRS blocks default Node.js UA — spoof a browser
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function fetchBuffer(url: string, retries = 3): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const attempt = (n: number) => {
      const client = url.startsWith("https") ? https : http;
      const req = client.get(url, { headers: { "User-Agent": USER_AGENT } }, (res) => {
        // Follow redirects
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return attempt(n); // retry with same count after redirect (location ignored here — use redirect-following)
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      });
      req.on("error", (err) => {
        if (n > 1) {
          console.warn(`  Retrying (${n - 1} left)...`);
          setTimeout(() => attempt(n - 1), 1500);
        } else {
          reject(err);
        }
      });
    };
    attempt(retries);
  });
}

export async function downloadForm(form: FormEntry): Promise<string> {
  if (form.pdfAvailable === false) {
    throw new Error(`${form.id}: no standalone PDF available (${form.description})`);
  }

  await fs.ensureDir(CACHE_DIR);
  await fs.ensureDir(FORMS_DIR);

  const cachePath = path.join(CACHE_DIR, `${form.id}.pdf`);
  const formPath = path.join(FORMS_DIR, `${form.id}.pdf`);

  // Use cache if available
  if (await fs.pathExists(cachePath)) {
    await fs.copy(cachePath, formPath, { overwrite: false });
    return formPath;
  }

  console.log(`  Downloading ${form.displayName} from ${form.url}`);
  const buffer = await fetchBuffer(form.url);

  await fs.writeFile(cachePath, buffer);
  await fs.writeFile(formPath, buffer);

  // Rate-limit to avoid throttling
  await new Promise((r) => setTimeout(r, 1200));

  return formPath;
}

export async function downloadForms(forms: FormEntry[]): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  for (const form of forms) {
    try {
      const p = await downloadForm(form);
      results.set(form.id, p);
      console.log(`  ✓ ${form.id} → ${p}`);
    } catch (err) {
      console.error(`  ✗ ${form.id}: ${(err as Error).message}`);
    }
  }
  return results;
}
