import type { IncomingMessage, ServerResponse } from "node:http";
import { createApplicationServer } from "./server";

const server = createApplicationServer();

/** Vercel Node entry. Neon is selected when DATABASE_URL is empty and NEON_DATABASE_URL is set. */
export default function handler(req: IncomingMessage, res: ServerResponse): void {
  server.emit("request", req, res);
}
