import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { allowsAutoplay, initCarousel, swipeDelta, wrapIndex } from "../../carousel.mjs";

const source = readFileSync(new URL("../../carousel.mjs", import.meta.url), "utf8");
const homepage = readFileSync(new URL("../../index.html", import.meta.url), "utf8");

test("carousel indices wrap in both directions", () => {
  assert.equal(wrapIndex(0, -1, 3), 2);
  assert.equal(wrapIndex(2, 1, 3), 0);
  for (let index = -9; index <= 9; index += 1) {
    assert.ok(wrapIndex(index, 1, 3) >= 0 && wrapIndex(index, 1, 3) < 3);
  }
});

test("a carousel with no slide is refused", () => {
  assert.throws(() => wrapIndex(0, 1, 0), RangeError);
});

test("swipes change one slide only after the 48 pixel threshold", () => {
  assert.equal(swipeDelta(100, 20), 1);
  assert.equal(swipeDelta(20, 100), -1);
  assert.equal(swipeDelta(50, 3), 0);
  assert.equal(swipeDelta(3, 50), 0);
  assert.equal(swipeDelta(60, 12), 1);
});

test("reduced motion disables autoplay", () => {
  assert.equal(allowsAutoplay(true), false);
  assert.equal(allowsAutoplay(false), true);
});

test("the carousel runtime is page-specific and exposes its initializer", () => {
  assert.equal(typeof initCarousel, "function");
  assert.match(homepage, /<script type="module" src="carousel\.mjs"><\/script>/);
  for (const page of ["essai.html", "offre.html", "architecture.html"]) {
    const html = readFileSync(new URL(`../../${page}`, import.meta.url), "utf8");
    assert.doesNotMatch(html, /carousel\.mjs/, page);
  }
});

test("the runtime honors motion, timing, keyboard, state and pointer contracts", () => {
  assert.match(source, /matchMedia\("\(prefers-reduced-motion: reduce\)"\)/);
  assert.match(source, /intervalMs = 8000/);
  assert.match(source, /setAttribute\("aria-current"/);
  assert.match(source, /ArrowLeft/);
  assert.match(source, /ArrowRight/);
  assert.match(source, /pointerdown/);
  assert.match(source, /pointerup/);
  assert.match(source, /mouseenter/);
  assert.match(source, /focusin/);
});
