// Executado no sandbox do plugin Cloudflare. Nenhuma credencial de conta sai dele.
export async function uploadPreview(payload, handlerSource) {
  const account = "16b4a5e0a99a031d28051ebadb4811cc";
  const name = "base-do-basquete-prototipo";
  const appId = "6f0540c1-e616-49e1-b6d9-2be806b5a9ee";
  if (payload.accountId !== account || payload.workerName !== name)
    throw new Error("Destino inesperado.");
  const base = `/accounts/${account}`;
  const protection = await cloudflare.request({
    method: "GET",
    path: `${base}/access/apps/${appId}`,
  });
  const app = protection.result;
  if (
    !protection.success ||
    app.domain !== `${name}.renato-lucindo-jr.workers.dev` ||
    app.policies?.length !== 1 ||
    app.policies[0].decision !== "allow" ||
    app.policies[0].include?.length !== 1 ||
    app.policies[0].include[0].email?.email !== "renato.lucindo.jr@gmail.com"
  )
    throw new Error(
      "A proteção Access esperada não foi confirmada. Upload cancelado.",
    );
  const metadata = {
    main_module: "index.mjs",
    compatibility_date: "2026-10-22",
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
  const modules = {
    "index.mjs":
      'import bundle from "./assets.mjs"; import {createPreviewHandler} from "./preview-worker.mjs"; export default {fetch:createPreviewHandler(bundle)};',
    "assets.mjs": `export default ${JSON.stringify(payload)};`,
    "preview-worker.mjs": handlerSource,
  };
  for (const [filename, source] of Object.entries(modules))
    form.append(
      filename,
      new Blob([source], { type: "application/javascript+module" }),
      filename,
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
  if (!deployed.success)
    return { success: false, status: deployed.status, errors: deployed.errors };
  return {
    success: true,
    status: deployed.status,
    worker: {
      id: deployed.result.id,
      etag: deployed.result.etag,
      deployment_id: deployed.result.deployment_id,
      modified_on: deployed.result.modified_on,
    },
    files: Object.keys(payload.manifest).length,
    applicationCommit: payload.applicationCommit,
    sourceCommit: payload.sourceCommit,
  };
}
