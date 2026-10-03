import http from "node:http";

export async function startFakeEngine(platforms) {
  const requests = [];
  const server = http.createServer((request, response) => {
    requests.push(request.url);
    const match = request.url.match(/^\/internal\/platforms\/([^/]+)$/);
    const attributes = match && platforms[match[1]];
    if (attributes) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ data: { id: match[1], type: "platform", attributes } }));
    } else {
      response.writeHead(404);
      response.end();
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return {
    host: "127.0.0.1",
    port: server.address().port,
    requests,
    close: () => new Promise((resolve) => {
      server.close(resolve);
      server.closeAllConnections();
    })
  };
}
