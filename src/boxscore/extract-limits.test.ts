import { it, expect, vi } from "vitest";
const mock = vi.hoisted(() => ({ document: null as unknown }));
vi.mock("unpdf", () => ({ getDocumentProxy: async () => mock.document }));
import {
  extractSupportedPdf,
  MAX_TEXT_ITEMS,
  MAX_TEXT_CHARACTERS,
} from "./extract";
const bytes = new TextEncoder().encode("%PDF-local-probe");
it("checks page limits before reading text and always destroys the loading task", async () => {
  const destroy = vi.fn(async () => {}),
    getPage = vi.fn();
  mock.document = { numPages: 5, getPage, loadingTask: { destroy } };
  await expect(
    extractSupportedPdf(bytes, "test.pdf", "application/pdf"),
  ).rejects.toMatchObject({ code: "BDB_PDF_PAGE_COUNT" });
  expect(getPage).not.toHaveBeenCalled();
  expect(destroy).toHaveBeenCalledOnce();
});
it("stops oversized extracted text and releases page and document resources", async () => {
  for (const items of [
    Array.from({ length: MAX_TEXT_ITEMS + 1 }, () => ({
      str: "x",
      transform: [1, 0, 0, 1, 0, 0],
      width: 1,
      height: 1,
    })),
    [
      {
        str: "x".repeat(MAX_TEXT_CHARACTERS + 1),
        transform: [1, 0, 0, 1, 0, 0],
        width: 1,
        height: 1,
      },
    ],
  ]) {
    const destroy = vi.fn(async () => {}),
      cleanup = vi.fn();
    mock.document = {
      numPages: 1,
      loadingTask: { destroy },
      getPage: async () => ({
        cleanup,
        streamTextContent: () =>
          new ReadableStream({
            start(c) {
              c.enqueue({ items });
              c.close();
            },
          }),
      }),
    };
    await expect(
      extractSupportedPdf(bytes, "test.pdf", "application/pdf"),
    ).rejects.toMatchObject({ code: "BDB_PDF_TEXT_LIMIT" });
    expect(cleanup).toHaveBeenCalledOnce();
    expect(destroy).toHaveBeenCalledOnce();
  }
});
