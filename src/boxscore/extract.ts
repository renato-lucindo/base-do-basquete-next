import { getDocumentProxy } from "unpdf";
import { parseFibaGeniusBoxscore } from "./parser";
import { parseBasketballSiteBoxscore } from "./site-parser";
import type { PositionedTextItem } from "./types";

export const MAX_PDF_BYTES = 10 * 1024 * 1024,
  MAX_PDF_PAGES = 4,
  MAX_TEXT_ITEMS = 20000,
  MAX_TEXT_CHARACTERS = 250000;
export class PdfFailure extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "PdfFailure";
  }
}
export function validatePdfBytes(
  bytes: Uint8Array,
  filename: string,
  mediaType: string,
) {
  if (bytes.byteLength < 5 || bytes.byteLength > MAX_PDF_BYTES)
    throw new PdfFailure("BDB_PDF_SIZE");
  if (
    mediaType !== "application/pdf" ||
    !filename.toLowerCase().endsWith(".pdf") ||
    filename.length > 160 ||
    /[\\/\u0000-\u001f\u007f]/u.test(filename)
  )
    throw new PdfFailure("BDB_PDF_TYPE");
  if (new TextDecoder("ascii").decode(bytes.subarray(0, 5)) !== "%PDF-")
    throw new PdfFailure("BDB_PDF_SIGNATURE");
}
export async function extractSupportedPdf(
  bytes: Uint8Array,
  filename: string,
  mediaType: string,
) {
  validatePdfBytes(bytes, filename, mediaType);
  const digest = await crypto.subtle.digest(
      "SHA-256",
      Uint8Array.from(bytes).buffer,
    ),
    sha256 = [...new Uint8Array(digest)]
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("");
  const pdf = await getDocumentProxy(Uint8Array.from(bytes), {
    maxImageSize: 16_777_216,
    stopAtErrors: true,
    disableFontFace: true,
    useWorkerFetch: false,
    isOffscreenCanvasSupported: false,
    enableXfa: false,
  });
  try {
    if (pdf.numPages < 1 || pdf.numPages > MAX_PDF_PAGES)
      throw new PdfFailure("BDB_PDF_PAGE_COUNT");
    const pages: PositionedTextItem[][] = [];
    let textItemCount = 0,
      textCharCount = 0;
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n),
        reader = page.streamTextContent().getReader(),
        items: PositionedTextItem[] = [];
      try {
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          for (const item of chunk.value.items) {
            if (!("str" in item)) continue;
            textItemCount++;
            textCharCount += item.str.length;
            if (
              textItemCount > MAX_TEXT_ITEMS ||
              textCharCount > MAX_TEXT_CHARACTERS
            )
              throw new PdfFailure("BDB_PDF_TEXT_LIMIT");
            const [, , , , x, y] = item.transform;
            if (![x, y, item.width, item.height].every(Number.isFinite))
              throw new PdfFailure("BDB_PDF_TEXT_INVALID");
            items.push({
              str: item.str,
              x,
              y,
              width: item.width,
              height: item.height,
            });
          }
        }
      } finally {
        await reader.cancel().catch(() => undefined);
        reader.releaseLock();
        page.cleanup();
      }
      pages.push(items);
    }
    const text = pages
      .flat()
      .map((i) => i.str)
      .join(" ");
    if (!text.trim()) throw new PdfFailure("BDB_PDF_NO_TEXT");
    const fiba = ["Box Score FIBA", "Arremessos", "Rebotes", "Não jogou"].every(
        (s) => text.includes(s),
      ),
      site = ["Ficha do Jogo", "Date / Time:"].every((s) => text.includes(s));
    if (fiba === site) throw new PdfFailure("BDB_PDF_UNSUPPORTED_FORMAT");
    const parsed = site
      ? parseBasketballSiteBoxscore(pages)
      : parseFibaGeniusBoxscore(pages);
    return {
      filename,
      sha256,
      pageCount: pdf.numPages,
      textItemCount,
      textCharCount,
      parsed,
    };
  } finally {
    await pdf.loadingTask.destroy();
  }
}
