import { expect, it, vi } from "vitest";
import { PDF_UPLOAD_LIMIT, pdfUploadMetadata, readPdfBody } from "./upload";
const origin = "https://app.example.test",
  id = "f8200000-0000-4000-8000-000000000001";
it("bounds an unknown-length byte stream and cancels it instead of trusting Content-Length", async () => {
  const cancel = vi.fn(),
    stream = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(new Uint8Array(PDF_UPLOAD_LIMIT));
        c.enqueue(new Uint8Array(1));
      },
      cancel,
    });
  const request = new Request(origin, {
    method: "POST",
    body: stream,
    duplex: "half",
  } as RequestInit);
  await expect(readPdfBody(request)).rejects.toMatchObject({ status: 413 });
  expect(cancel).toHaveBeenCalled();
});
it("keeps binary bytes unchanged across multiple chunks and rejects empty or truncated bodies", async () => {
  const input = new Uint8Array([37, 80, 68, 70, 45, 0, 13, 10, 255]),
    stream = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(input.subarray(0, 6));
        c.enqueue(input.subarray(6));
        c.close();
      },
    });
  expect(
    await readPdfBody(
      new Request(origin, {
        method: "POST",
        body: stream,
        duplex: "half",
      } as RequestInit),
    ),
  ).toEqual(input);
  await expect(
    readPdfBody(new Request(origin, { method: "POST", body: "1234" })),
  ).rejects.toMatchObject({ status: 400 });
  const cancelled = vi.fn();
  const broken = new ReadableStream<Uint8Array>({
    pull(c) {
      c.error(new Error("private transport details"));
    },
    cancel: cancelled,
  });
  await expect(
    readPdfBody(
      new Request(origin, {
        method: "POST",
        body: broken,
        duplex: "half",
      } as RequestInit),
    ),
  ).rejects.toMatchObject({ status: 400, code: "invalid_input" });
});
it("accepts encoded display filename while refusing unsigned or extra metadata before reading bytes", () => {
  const url =
    origin +
    "/api/pdf-sources?" +
    new URLSearchParams({
      commandId: id,
      sourceId: id,
      disputeId: id,
      filename: "Súmula 2026.pdf",
    });
  const request = new Request(url, {
    method: "POST",
    headers: { origin, "content-type": "application/pdf" },
    body: "%PDF-",
  });
  expect(pdfUploadMetadata(request, origin).filename).toBe("Súmula 2026.pdf");
  expect(request.bodyUsed).toBe(false);
  expect(() =>
    pdfUploadMetadata(
      new Request(url + "&actorId=" + id, {
        method: "POST",
        headers: request.headers,
        body: "%PDF-",
      }),
      origin,
    ),
  ).toThrowError();
  expect(() =>
    pdfUploadMetadata(
      new Request(url, {
        method: "POST",
        headers: {
          ...Object.fromEntries(request.headers),
          "sec-fetch-site": "cross-site",
        },
        body: "%PDF-",
      }),
      origin,
    ),
  ).toThrowError();
});
