import { pathToFileURL } from "node:url";
import { createApplicationServer } from "./server";

export function startApplicationServer(port = Number(process.env.PORT ?? 3000)) {
  const server = createApplicationServer();
  server.listen(port, "0.0.0.0");
  return server;
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  const port = Number(process.env.PORT ?? 3000);
  startApplicationServer(port);
  console.log(`application server listening on ${port}`);
}
