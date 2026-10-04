// A tokenizer over text that JSON.parse has ALREADY accepted — JSON.parse stays the authority on
// syntax. It recovers what JSON.parse throws away: whether an object repeats a key (after every
// escape is decoded) and how each number was spelled (1 is not 1.0).

const MAX_DEPTH = 1000; // Jackson's default nesting cap: a root object is level 1
const ESCAPES = { '"': '"', "\\": "\\", "/": "/", b: "\b", f: "\f", n: "\n", r: "\r", t: "\t" };
const NUMBER = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;

/** @returns {{duplicateKey: boolean, numbers: {path: (string|number)[], lexeme: string}[]}} */
export function scan(text) {
  let i = 0;
  let duplicateKey = false;
  const numbers = [];

  const skipSpace = () => {
    while (" \t\n\r".includes(text[i])) i++;
  };

  const string = () => {
    i++; // opening quote
    let out = "";
    for (;;) {
      const c = text[i++];
      if (c === '"') return out;
      if (c !== "\\") {
        out += c;
      } else if (text[i] === "u") {
        out += String.fromCharCode(parseInt(text.slice(i + 1, i + 5), 16));
        i += 5;
      } else {
        out += ESCAPES[text[i++]];
      }
    }
  };

  const value = (path) => {
    skipSpace();
    const c = text[i];
    if (c === "{" || c === "[") {
      if (path.length >= MAX_DEPTH) throw new RangeError("nested too deeply");
    }
    if (c === "{") {
      i++;
      const seen = new Set();
      skipSpace();
      if (text[i] === "}") { i++; return; }
      for (;;) {
        skipSpace();
        const key = string();
        skipSpace();
        i++; // the colon
        if (seen.has(key)) duplicateKey = true;
        seen.add(key);
        value([...path, key]);
        skipSpace();
        if (text[i++] === "}") return;
      }
    } else if (c === "[") {
      i++;
      skipSpace();
      if (text[i] === "]") { i++; return; }
      for (let n = 0; ; n++) {
        value([...path, n]);
        skipSpace();
        if (text[i++] === "]") return;
      }
    } else if (c === '"') {
      string();
    } else if (c === "t" || c === "n") {
      i += 4; // true, null
    } else if (c === "f") {
      i += 5; // false
    } else {
      NUMBER.lastIndex = i;
      const lexeme = NUMBER.exec(text)[0];
      i += lexeme.length;
      numbers.push({ path, lexeme });
    }
  };

  value([]);
  return { duplicateKey, numbers };
}
