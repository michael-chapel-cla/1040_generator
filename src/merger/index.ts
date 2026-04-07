import { PDFDocument } from "pdf-lib";
import fs from "fs-extra";
import path from "path";

const OUTPUT_DIR = path.resolve(process.cwd(), "output");

/**
 * Merges multiple filled PDF files into a single multi-page PDF.
 *
 * @param inputPaths  Ordered list of PDF file paths to merge
 * @param outputName  Output filename (without path). Defaults to a timestamped name.
 * @returns           Absolute path to the merged PDF
 */
export async function mergePdfs(
  inputPaths: string[],
  outputName?: string
): Promise<string> {
  await fs.ensureDir(OUTPUT_DIR);

  const merged = await PDFDocument.create();

  for (const inputPath of inputPaths) {
    if (!(await fs.pathExists(inputPath))) {
      console.warn(`  merge: skipping missing file ${path.basename(inputPath)}`);
      continue;
    }
    const bytes = await fs.readFile(inputPath);
    let doc: PDFDocument;
    try {
      doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    } catch {
      console.warn(`  merge: could not load ${path.basename(inputPath)}, skipping`);
      continue;
    }
    const indices = doc.getPageIndices();
    if (indices.length === 0) continue;
    const pages = await merged.copyPages(doc, indices);
    pages.forEach((page) => merged.addPage(page));
  }

  const ts   = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const name = outputName ?? `merged_${ts}.pdf`;
  const outPath = path.join(OUTPUT_DIR, name);
  await fs.writeFile(outPath, await merged.save());
  return outPath;
}
