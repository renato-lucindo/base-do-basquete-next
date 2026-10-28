// Compatibility adapter for connector deployments; the application uses ASSETS.
export function createFoundationAssets(bundle) {
  return async (request) => {
    if (!["GET", "HEAD"].includes(request.method))
      return new Response(null, { status: 405 });
    const path = new URL(request.url).pathname;
    const file = Object.hasOwn(bundle, path) ? bundle[path] : undefined;
    if (!file) return new Response(null, { status: 404 });
    return new Response(
      request.method === "HEAD"
        ? null
        : Uint8Array.from(atob(file.base64), (char) => char.charCodeAt(0)),
      {
        headers: {
          "Content-Type": file.mime,
          "Content-Length": String(file.size),
          ETag: `"${file.hash}"`,
        },
      },
    );
  };
}
