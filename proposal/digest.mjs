// The catalogue's digest: SHA-256 over canonical JSON — sorted keys, "," and ":" separators, no
// insignificant whitespace, raw UTF-8. The SAME definition as digest() in
// scripts/check-proposal-catalogue.py, which writes the published index.

// Python sorts keys by Unicode code point; JavaScript's default sort compares UTF-16 units.
export const byCodePoint = (a, b) => {
  const x = [...a], y = [...b];
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    const d = x[i].codePointAt(0) - y[i].codePointAt(0);
    if (d !== 0) return d;
  }
  return x.length - y.length;
};

export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value).sort(byCodePoint).map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

/** @returns {Promise<string>} "sha256:<hex>". Rejects when WebCrypto is unavailable: never "unchecked". */
export async function digest(value) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("digest-unavailable");
  const bytes = new TextEncoder().encode(canonical(value));
  const hash = new Uint8Array(await subtle.digest("SHA-256", bytes));
  return "sha256:" + Array.from(hash, (b) => b.toString(16).padStart(2, "0")).join("");
}
