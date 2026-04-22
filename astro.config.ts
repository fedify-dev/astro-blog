import { fedifyIntegration } from "@fedify/astro";
import bun from "@nurodev/astro-bun";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  integrations: [fedifyIntegration()],
  output: "server",
  adapter: bun(),
  security: {
    // Trust any forwarded host so the server works correctly behind a
    // reverse proxy or tunnel (e.g. `fedify tunnel`, Cloudflare Tunnel).
    allowedDomains: [{}],
  },
  vite: {
    server: {
      allowedHosts: true,
    },
  },
});
