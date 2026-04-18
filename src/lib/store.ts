// In-memory store for key pairs and followers.
// Uses globalThis to persist across Astro module reloads in dev mode.
// This data is lost when the server restarts — we'll fix that in a later
// chapter when we introduce SQLite.

declare global {
  var _keyPairs: Map<string, CryptoKeyPair[]>; // eslint-disable-line no-var
  var _followers: Map<string, string>; // eslint-disable-line no-var
}

if (globalThis._keyPairs == null) globalThis._keyPairs = new Map();
if (globalThis._followers == null) globalThis._followers = new Map();

export const keyPairs: Map<string, CryptoKeyPair[]> = globalThis._keyPairs;
export const followers: Map<string, string> = globalThis._followers;
