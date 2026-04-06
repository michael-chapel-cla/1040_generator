/**
 * One-shot script: downloads every form not already in /forms, with concurrency.
 */
import fs from "fs-extra";
import path from "path";
import https from "https";
import http from "http";
import pLimit from "p-limit";
import { FORM_REGISTRY, FormEntry } from "../src/registry/forms";

const FORMS_DIR = path.resolve(process.cwd(), "forms");
const CACHE_DIR = path.resolve(process.cwd(), "cache");
const CONCURRENCY = 5;
const DELAY_MS    = 600; // ms between each request start

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
           "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function fetchBuffer(url: string, retries = 3): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const attempt = (n: number) => {
      const client = url.startsWith("https") ? https : http;
      // Follow one redirect manually
      const req = client.get(url, { headers: { "User-Agent": UA } }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchBuffer(res.headers.location, n).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end",  () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      });
      req.on("error", (err) => {
        if (n > 1) setTimeout(() => attempt(n - 1), 2000);
        else reject(err);
      });
    };
    attempt(retries);
  });
}

async function downloadOne(form: FormEntry, index: number, total: number): Promise<"ok" | "skip" | "fail"> {
  const dest  = path.join(FORMS_DIR, `${form.id}.pdf`);
  const cache = path.join(CACHE_DIR, `${form.id}.pdf`);

  if (await fs.pathExists(dest)) return "skip";

  // stagger start time slightly
  await new Promise((r) => setTimeout(r, index * DELAY_MS));

  try {
    let buf: Buffer;
    if (await fs.pathExists(cache)) {
      buf = await fs.readFile(cache);
    } else {
      buf = await fetchBuffer(form.url);
      await fs.writeFile(cache, buf);
    }
    await fs.writeFile(dest, buf);
    console.log(`  ✓ [${String(index + 1).padStart(3)}/${total}] ${form.id}`);
    return "ok";
  } catch (err) {
    console.error(`  ✗ [${String(index + 1).padStart(3)}/${total}] ${form.id}: ${(err as Error).message}`);
    return "fail";
  }
}

(async () => {
  await fs.ensureDir(FORMS_DIR);
  await fs.ensureDir(CACHE_DIR);

  const existing = new Set(
    (await fs.readdir(FORMS_DIR)).filter((f) => f.endsWith(".pdf")).map((f) => f.replace(".pdf", ""))
  );

  const missing = FORM_REGISTRY.filter((f) => !existing.has(f.id));
  console.log(`\nForms already downloaded : ${existing.size}`);
  console.log(`Forms to download        : ${missing.length}`);
  console.log(`Concurrency              : ${CONCURRENCY}\n`);

  if (missing.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  const limit = pLimit(CONCURRENCY);
  const tasks = missing.map((form, i) => limit(() => downloadOne(form, i, missing.length)));
  const results = await Promise.all(tasks);

  const ok   = results.filter((r) => r === "ok").length;
  const fail = results.filter((r) => r === "fail").length;

  console.log(`\nDone: ${ok} downloaded, ${fail} failed out of ${missing.length} attempted.`);
  console.log(`Total in /forms: ${existing.size + ok}\n`);
})();
