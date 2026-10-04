import { test } from "node:test";
import assert from "node:assert/strict";
import { scan } from "../../proposal/strict-json.mjs";
import { BS } from "./helpers.mjs";


test("a plain object has no duplicate", () => {
  assert.equal(scan('{"a":1,"b":{"a":2}}').duplicateKey, false);
});

test("a repeated key in one object is a duplicate, at the root or nested", () => {
  assert.equal(scan('{"a":1,"a":2}').duplicateKey, true);
  assert.equal(scan('{"x":{"a":1,"a":1}}').duplicateKey, true);
  assert.equal(scan('{"x":[{"a":1,"a":2}]}').duplicateKey, true);
});

test("keys are compared after every escape is decoded", () => {
  const escaped = `{"language":"fr","l${BS}u0061nguage":"en"}`;
  assert.equal(scan(escaped).duplicateKey, true);
  assert.equal(scan(`{"a${BS}nb":1,"a\nb":2}`).duplicateKey, true);
});

test("a string value that merely looks like a key is not a key", () => {
  assert.equal(scan('{"a":"\\"a\\": 1","b":2}').duplicateKey, false);
  assert.equal(scan('{"a":["a","a"],"b":"a"}').duplicateKey, false);
});

test("the same key in two sibling objects is not a duplicate", () => {
  assert.equal(scan('{"x":{"a":1},"y":{"a":1}}').duplicateKey, false);
});

test("numbers keep their original spelling and their path", () => {
  const { numbers } = scan('{"v":1.0,"w":[1,-0,2e3],"s":"1.5"}');
  assert.deepEqual(numbers, [
    { path: ["v"], lexeme: "1.0" },
    { path: ["w", 0], lexeme: "1" },
    { path: ["w", 1], lexeme: "-0" },
    { path: ["w", 2], lexeme: "2e3" },
  ]);
});

test("true, false, null, empty containers and whitespace are skipped cleanly", () => {
  const r = scan(' { "a" : [ ] , "b" : { } , "c" : true , "d" : false , "e" : null , "f" : 7 } ');
  assert.equal(r.duplicateKey, false);
  assert.deepEqual(r.numbers, [{ path: ["f"], lexeme: "7" }]);
});

test("nesting is capped at Jackson's 1000 levels, and refused with a RangeError, never a stack overflow", () => {
  const nest = (depth) => `{"x":${"[".repeat(depth)}${"]".repeat(depth)}}`;
  assert.doesNotThrow(() => scan(nest(999)));          // root object + 999 arrays = 1000 levels
  assert.throws(() => scan(nest(1000)), RangeError);   // 1001 levels
  assert.throws(() => scan(nest(100000)), RangeError);
});
