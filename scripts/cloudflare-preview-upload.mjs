// Executado no sandbox do plugin Cloudflare. Nenhuma credencial de conta sai dele.
export async function uploadPreview(payload) {
  const account = "16b4a5e0a99a031d28051ebadb4811cc";
  const name = "base-do-basquete-prototipo";
  const appId = "6f0540c1-e616-49e1-b6d9-2be806b5a9ee";
  if (payload.accountId !== account || payload.workerName !== name)
    throw new Error("Destino inesperado.");
  const base = `/accounts/${account}`;
  const app = (
    await cloudflare.request({
      method: "GET",
      path: `${base}/access/apps/${appId}`,
    })
  ).result;
  if (
    app.domain !== `${name}.renato-lucindo-jr.workers.dev` ||
    app.policies?.length !== 1 ||
    app.policies[0].decision !== "allow" ||
    app.policies[0].include?.length !== 1 ||
    app.policies[0].include[0].email?.email !== "renato.lucindo.jr@gmail.com"
  ) {
    throw new Error(
      "A proteção Access esperada não foi confirmada. Upload cancelado.",
    );
  }
  const session = await cloudflare.request({
    method: "POST",
    path: `${base}/workers/scripts/${name}/assets-upload-session`,
    body: { manifest: payload.manifest },
  });
  if (
    !session.success ||
    !session.result.jwt ||
    !Array.isArray(session.result.buckets)
  )
    throw new Error("Sessão de upload inválida.");
  const uploadJwt = session.result.jwt;
  let completionJwt = session.result.buckets.length ? null : uploadJwt;
  let uploadedBuckets = 0;
  for (const bucket of session.result.buckets) {
    const form = new FormData();
    for (const hash of bucket) {
      const file = payload.files[hash];
      if (!file)
        throw new Error("Asset solicitado não está no manifesto local.");
      form.append(hash, new Blob([file.base64], { type: file.mime }), hash);
    }
    const response = await fetch(
      `https://api.cloudflare.com/client/v4${base}/workers/assets/upload?base64=true`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${uploadJwt}` },
        body: form,
      },
    );
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(
        `Upload de assets rejeitado: HTTP ${response.status}; códigos ${(result.errors ?? []).map((e) => e.code).join(",")}.`,
      );
    }
    if (result.result?.jwt) completionJwt = result.result.jwt;
    uploadedBuckets++;
  }
  if (!completionJwt) throw new Error("Upload não produziu confirmação.");
  const metadata = {
    compatibility_date: "2026-10-22",
    assets: {
      jwt: completionJwt,
      config: {
        html_handling: "auto-trailing-slash",
        not_found_handling: "single-page-application",
        _headers: `/*\n  X-Robots-Tag: noindex, nofollow\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: same-origin\n  X-Prototype-Source: ${payload.applicationCommit}\n  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'\n`,
      },
    },
    annotations: {
      "workers/message": `Protótipo ${payload.applicationCommit.slice(0, 7)}; transporte ${payload.sourceCommit.slice(0, 7)}`,
      "workers/tag": `prototype-${payload.sourceCommit.slice(0, 12)}`,
    },
    tags: ["base-do-basquete-next", "prototype"],
  };
  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" }),
    "metadata.json",
  );
  const body = new Request("https://api.cloudflare.com", {
    method: "PUT",
    body: form,
  });
  const deployed = await cloudflare.request({
    method: "PUT",
    path: `${base}/workers/scripts/${name}`,
    rawBody: true,
    contentType: body.headers.get("content-type"),
    body: await body.text(),
  });
  return {
    success: deployed.success,
    status: deployed.status,
    worker: {
      id: deployed.result.id,
      etag: deployed.result.etag,
      deployment_id: deployed.result.deployment_id,
      modified_on: deployed.result.modified_on,
    },
    files: Object.keys(payload.manifest).length,
    uploadedBuckets,
    applicationCommit: payload.applicationCommit,
    sourceCommit: payload.sourceCommit,
  };
}
