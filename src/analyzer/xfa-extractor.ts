/**
 * Extracts field labels from the XFA XML layer embedded in IRS PDF files.
 *
 * IRS PDFs store their form structure in a compressed XFA (XML Forms Architecture)
 * stream. pdf-lib strips this layer on load, but we can extract it from the raw
 * bytes before pdf-lib touches the file.
 *
 * The XFA XML uses an unusual serialisation where the closing `>` of each element
 * sits on its own line:
 *   <field name="f1_14" ...
 *   ><speak disable="1"
 *   >Your first name and middle initial.</speak
 *   >
 *
 * We normalise that before parsing.
 */

import zlib from "zlib";

export type XfaFieldMap = Map<string, string>; // partialName -> human label

/** Decompress every PDF stream and return the first that looks like XFA XML. */
function extractXfaXml(pdfBytes: Buffer): string | null {
  const delimiters = [Buffer.from("stream\n"), Buffer.from("stream\r\n")];
  let offset = 0;

  while (offset < pdfBytes.length - 10) {
    let best = -1, delimLen = 0;
    for (const d of delimiters) {
      const i = pdfBytes.indexOf(d, offset);
      if (i !== -1 && (best === -1 || i < best)) { best = i; delimLen = d.length; }
    }
    if (best === -1) break;

    const dataStart = best + delimLen;
    const streamEnd = pdfBytes.indexOf(Buffer.from("endstream"), dataStart);
    if (streamEnd === -1 || streamEnd - dataStart > 8_000_000) { offset = dataStart; continue; }

    const raw = pdfBytes.slice(dataStart, streamEnd);

    for (const decompress of [zlib.inflateSync, zlib.inflateRawSync]) {
      try {
        const dec = decompress(raw);
        if (dec.length > 50_000) {
          const head = dec.toString("utf8", 0, 100);
          if (/<field |xdp:|<template|<subform/.test(head)) {
            return dec.toString("utf8");
          }
        }
      } catch { /* not this compression */ }
    }

    offset = streamEnd + 9;
  }

  return null;
}

/** Parse an XFA XML string into a map of field partial-name → human label. */
function parseXfaFields(xml: string): XfaFieldMap {
  const map: XfaFieldMap = new Map();

  // Normalise IRS's "newline before >" style → standard XML
  const norm = xml.replace(/\n>/g, ">").replace(/\r\n>/g, ">");

  // Split on field declarations
  const blocks = norm.split(/<field name=/);
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];

    const nameMatch = /^"([^"]+)"/.exec(block);
    if (!nameMatch) continue;
    const rawName = nameMatch[1]; // e.g. "f1_14"

    // Prefer <speak> text — it's the most complete accessibility label
    const speakMatch = /<speak[^>]*>([\s\S]*?)<\/speak>/.exec(block);
    const speak = speakMatch ? speakMatch[1].replace(/\s+/g, " ").trim() : "";

    // Fallback: <caption><value><text>
    const captMatch = /<caption[\s\S]*?<text[^>]*>([\s\S]*?)<\/text>/.exec(block);
    const caption = captMatch ? captMatch[1].replace(/\s+/g, " ").trim() : "";

    const label = speak || caption;
    if (label) {
      map.set(rawName, label);
    }
  }

  return map;
}

/**
 * Given raw PDF bytes, returns a map of:
 *   field partial name (e.g. "f1_14")  →  human label (e.g. "Your first name and middle initial.")
 *
 * Returns an empty map if the PDF has no XFA layer or decompression fails.
 */
export function extractFieldLabels(pdfBytes: Buffer): XfaFieldMap {
  try {
    const xml = extractXfaXml(pdfBytes);
    if (!xml) return new Map();
    return parseXfaFields(xml);
  } catch {
    return new Map();
  }
}
