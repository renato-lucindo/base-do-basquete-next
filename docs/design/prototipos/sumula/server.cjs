const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const port = Number(process.env.PORT || 4187);
const allowed = new Set([
  "Sumula do jogo publicado.html",
  "index.html",
  "styles.css",
  "data.js",
  "app.js",
]);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};
http
  .createServer((req, res) => {
    let name;
    try {
      name =
        decodeURIComponent(new URL(req.url, "http://localhost").pathname).slice(
          1,
        ) || "Sumula do jogo publicado.html";
    } catch {
      res.writeHead(400);
      res.end();
      return;
    }
    if (!allowed.has(name)) {
      res.writeHead(404);
      res.end("Não encontrado");
      return;
    }
    res.writeHead(200, {
      "Content-Type": types[path.extname(name)],
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    fs.createReadStream(path.join(__dirname, name)).pipe(res);
  })
  .listen(port, "127.0.0.1", () =>
    console.log(`Local: http://127.0.0.1:${port}/`),
  );
