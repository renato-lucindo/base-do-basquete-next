const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const server = http.createServer((request, response) => {
  if (request.method !== "GET" || !["/", "/index.html"].includes(request.url)) {
    response.writeHead(404);
    response.end();
    return;
  }
  response.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(fs.readFileSync(path.join(__dirname, "Piloto UIUX.html")));
});
server.listen(4189, "127.0.0.1", () =>
  console.log("Piloto UI/UX: http://127.0.0.1:4189/"),
);
