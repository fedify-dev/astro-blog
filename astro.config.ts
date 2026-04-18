import node from "@astrojs/node";
import { fedifyIntegration } from "@fedify/astro";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  integrations: [fedifyIntegration()],
  output: "server",
  adapter: node({ mode: "standalone" }),
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
