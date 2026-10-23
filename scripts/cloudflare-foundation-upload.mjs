// Executed only inside the authenticated Cloudflare plugin sandbox.
export async function uploadFoundation(payload, client = cloudflare) {
  const account = "16b4a5e0a99a031d28051ebadb4811cc";
  const name = "base-do-basquete-next-preview";
  const appId = "556be918-42ad-44e5-a85f-c2783f65b2ba";
  if (payload.accountId !== account || payload.workerName !== name)
    throw new Error("Unexpected target");
  const base = `/accounts/${account}`;
  const protection = await client.request({
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
    throw new Error("Expected owner-only Access protection not confirmed");
  const settings = await client.request({
    method: "GET",
    path: `${base}/workers/scripts/${name}/settings`,
  });
  const existing = settings.success;
  if (!existing && settings.status !== 404)
    throw new Error("Could not inspect Worker");
  if (existing && !settings.result.tags?.includes("foundation"))
    throw new Error("Refusing to replace an unrelated Worker");
  const bindings = [
    { name: "APP_ORIGIN", type: "plain_text", text: `https://${app.domain}` },
    {
      name: "SUPABASE_URL",
      type: "plain_text",
      text: "https://nizmasjddyrhmevvfviz.supabase.co",
    },
    {
      name: "SESSIONS",
      type: "durable_object_namespace",
      class_name: "SessionStore",
    },
    {
      name: "LOGIN_LIMITER",
      type: "ratelimit",
      namespace_id: "862073195184",
      simple: { limit: 10, period: 60 },
    },
  ];
  const metadata = {
    main_module: "index.mjs",
    compatibility_date: "2026-10-23",
    compatibility_flags: ["nodejs_compat"],
    bindings,
    keep_bindings: ["secret_text"],
    ...(!existing
      ? { migrations: { new_tag: "v1", new_sqlite_classes: ["SessionStore"] } }
      : {}),
    observability: {
      enabled: true,
      head_sampling_rate: 0.1,
      redact_query_string: true,
    },
    tags: ["base-do-basquete-next", "foundation"],
    annotations: {
      "workers/message": `Fundação ${payload.sourceCommit}`,
      "workers/tag": `foundation-${payload.sourceCommit.slice(0, 12)}`,
    },
  };
  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" }),
    "metadata.json",
  );
  for (const [filename, source] of Object.entries(payload.modules))
    form.append(
      filename,
      new Blob([source], { type: "application/javascript+module" }),
      filename,
    );
  const request = new Request("https://api.cloudflare.com", {
    method: "PUT",
    body: form,
  });
  const deployed = await client.request({
    method: "PUT",
    path: `${base}/workers/scripts/${name}`,
    rawBody: true,
    contentType: request.headers.get("content-type"),
    body: await request.text(),
  });
  return {
    success: deployed.success,
    status: deployed.status,
    errors: deployed.errors,
    worker: {
      id: deployed.result?.id,
      etag: deployed.result?.etag,
      deployment_id: deployed.result?.deployment_id,
      modified_on: deployed.result?.modified_on,
    },
    sourceCommit: payload.sourceCommit,
  };
}
