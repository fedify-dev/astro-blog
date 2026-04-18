import { fedifyMiddleware } from "@fedify/astro";
import type { MiddlewareHandler } from "astro";
import federation from "./federation.ts";
import { syncPosts } from "./lib/publish.ts";
import "./logging.ts";

let synced = false;

export const onRequest: MiddlewareHandler = (context, next) => {
  // Rewrite the request URL based on X-Forwarded-Proto / X-Forwarded-Host
  // when running behind a reverse proxy or tunnel (e.g. `fedify tunnel`).
  const proto = context.request.headers.get("x-forwarded-proto");
  const host = context.request.headers.get("x-forwarded-host");
  const url = new URL(context.request.url);
  if (proto != null && url.protocol !== `${proto}:`) url.protocol = proto;
  if (host != null && url.host !== host) url.host = host;
  if (proto != null || host != null) {
    context.request = new Request(url.toString(), context.request);
  }
  if (!synced) {
    synced = true;
    const origin = process.env.ORIGIN;
    const baseReq = origin
      ? new Request(new URL("/", origin).toString())
      : context.request;
    const ctx = federation.createContext(baseReq, undefined);
    syncPosts(ctx).catch((err) => {
      console.error("Failed to sync posts:", err);
    });
  }
  return fedifyMiddleware(federation, (_ctx) => undefined)(context, next);
};
