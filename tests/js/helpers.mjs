// Shared by the suites. Not a test itself: the runner's glob is tests/js/*.test.mjs.
import { readFileSync } from "node:fs";

/** The backslash, spelled so that no escape sequence is ever written literally in a test. */
export const BS = String.fromCharCode(92);

/** A file of the site, by its path from the repository root, as text. */
export const readSite = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

/** Runs `fn` with globalThis.crypto removed (a browser without WebCrypto), then puts it back. */
export async function withoutWebCrypto(fn) {
  const original = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  Object.defineProperty(globalThis, "crypto", { value: undefined, configurable: true });
  try {
    return await fn();
  } finally {
    Object.defineProperty(globalThis, "crypto", original);
  }
}
