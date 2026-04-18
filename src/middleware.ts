import { fedifyMiddleware } from "@fedify/astro";
import federation from "./federation.ts";
import "./logging.ts";

export const onRequest = fedifyMiddleware(federation, (_context) => undefined);
