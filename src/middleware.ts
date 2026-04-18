import { fedifyMiddleware } from "@fedify/astro";
import type { MiddlewareHandler } from "astro";
import federation from "./federation.ts";
import "./logging.ts";

export const onRequest: MiddlewareHandler = (context, next) => {
  // Rewrite the request URL scheme based on X-Forwarded-Proto when running
  // behind a reverse proxy or tunnel (e.g. `fedify tunnel`).
  const proto = context.request.headers.get("x-forwarded-proto");
  const url = new URL(context.request.url);
  if (proto != null && url.protocol !== `${proto}:`) {
    url.protocol = proto;
    context.request = new Request(url.toString(), context.request);
  }
  return fedifyMiddleware(federation, (_ctx) => undefined)(context, next);
};
