/**
 * pdf.js, loaded on demand. The legacy build, which carries the polyfills
 * that older phones need (most partners open their letter from WhatsApp on
 * a phone). The worker is bundled and served from this site like any other
 * asset, so the CSP's worker-src 'self' covers it and nothing is fetched
 * from anywhere else.
 */
import type { PDFDocumentProxy } from "pdfjs-dist";

type Lib = typeof import("pdfjs-dist");

let lib: Promise<Lib> | null = null;

export function pdfjs(): Promise<Lib> {
  lib ??= Promise.all([import("pdfjs-dist/legacy/build/pdf.mjs"), import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url")]).then(([m, worker]) => {
    m.GlobalWorkerOptions.workerSrc = worker.default;
    return m as unknown as Lib;
  });
  return lib;
}

/**
 * Open a PDF from bytes. pdf.js takes ownership of the buffer (it is moved to
 * the worker), so pass a copy of anything still needed afterwards.
 */
export async function openPdf(bytes: Uint8Array): Promise<PDFDocumentProxy> {
  const m = await pdfjs();
  // pdf.js's data files, served from this site by the pdfjs-data plugin in
  // vite.config.ts: without them, JPEG 2000 and scanned (JBIG2, CCITT) images
  // draw blank, and fonts a PDF doesn't embed are only guessed at.
  const data = new URL(`/pdfjs/${m.version}/`, window.location.origin).href;
  return m.getDocument({
    data: bytes,
    verbosity: m.VerbosityLevel.ERRORS,
    enableXfa: false,
    wasmUrl: `${data}wasm/`,
    standardFontDataUrl: `${data}standard_fonts/`,
    cMapUrl: `${data}cmaps/`,
    iccUrl: `${data}iccs/`,
  }).promise;
}

/** The title in the PDF's own metadata, if it has a usable one. */
export async function pdfTitle(doc: PDFDocumentProxy): Promise<string> {
  try {
    const { info } = await doc.getMetadata();
    const t = (info as { Title?: unknown }).Title;
    return typeof t === "string" ? t.trim().slice(0, 140) : "";
  } catch {
    return "";
  }
}
