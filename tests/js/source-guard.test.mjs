import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

// The spec's guardrails, executable: nothing persisted in the browser, nothing injected as markup,
// no network but the same-origin catalogue. A free text must only ever reach the DOM as text.
const FORBIDDEN = [
  [/\blocalStorage\b/, "localStorage"], [/\bsessionStorage\b/, "sessionStorage"], [/\bindexedDB\b/i, "IndexedDB"],
  [/\.innerHTML\b/, "innerHTML"], [/\.outerHTML\b/, "outerHTML"], [/insertAdjacentHTML/, "insertAdjacentHTML"],
  [/document\.write/, "document.write"], [/\beval\s*\(/, "eval"], [/new\s+Function\s*\(/, "new Function"],
  [/\bXMLHttpRequest\b/, "XMLHttpRequest"], [/\bsendBeacon\b/, "sendBeacon"], [/new\s+WebSocket/, "WebSocket"],
  [/\bimport\s*\(/, "dynamic import"],
  [/fetch\(\s*["'`]\s*(https?:)?\/\//, "fetch of a non-same-origin URL"],
];

export function violations(source) {
  return FORBIDDEN.filter(([pattern]) => pattern.test(source)).map(([, name]) => name);
}

const dir = new URL("../../proposal/", import.meta.url);
const sources = readdirSync(dir).filter((f) => f.endsWith(".mjs"));
const html = readFileSync(new URL("../../dossier.html", import.meta.url), "utf8");

test("the guard is not blind: every planted violation is caught", () => {
  for (const [, name] of FORBIDDEN) assert.equal(violations(PLANTED[name]).includes(name), true, name);
  assert.deepEqual(violations("const ok = document.createTextNode('x'); fetch(`catalogue/${v}.json`);"), []);
});

test("no module under proposal/ breaks a guardrail", () => {
  assert.ok(sources.length >= 6, "the modules are there to be checked");
  for (const f of sources) assert.deepEqual(violations(readFileSync(new URL(f, dir), "utf8")), [], f);
});

test("only page.mjs touches the DOM or the network", () => {
  for (const f of sources.filter((x) => x !== "page.mjs")) {
    const text = readFileSync(new URL(f, dir), "utf8");
    assert.doesNotMatch(text, /\bdocument\b|\bwindow\b|\bfetch\(/, `${f} must stay pure`);
  }
});

test("dossier.html carries no inline script and no third-party script", () => {
  const scripts = [...html.matchAll(/<script\b[^>]*>/g)].map((m) => m[0]);
  for (const s of scripts) assert.match(s, /\bsrc="(site\.js|proposal\/page\.mjs)"/, s);
});

const PLANTED = {
  localStorage: "localStorage.setItem('a','b')", sessionStorage: "sessionStorage.x", IndexedDB: "indexedDB.open('x')",
  innerHTML: "el.innerHTML = x", outerHTML: "el.outerHTML = x", insertAdjacentHTML: "el.insertAdjacentHTML('beforeend', x)",
  "document.write": "document.write(x)", eval: "eval(x)", "new Function": "new Function(x)",
  XMLHttpRequest: "new XMLHttpRequest()", sendBeacon: "navigator.sendBeacon(u)", WebSocket: "new WebSocket(u)",
  "dynamic import": "import('x')", "fetch of a non-same-origin URL": "fetch('https://x.example/y')",
};
