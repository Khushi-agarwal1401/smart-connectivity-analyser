const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const html = fs.readFileSync("index.html", "utf8");
const js = fs.readFileSync("js/script.js", "utf8");
test("one chart canvas and separate empty/error states exist", () => {
  assert.equal((html.match(/id=["']networkChart["']/g) || []).length, 1);
  assert.match(html, /id=["']historyEmptyState["']/);
  assert.match(html, /id=["']historyErrorState["']/);
});
test("history API failures do not display the empty-result state", () => {
  assert.match(js, /if \(errorState\) errorState\.hidden = true/);
  assert.match(js, /if \(errorState\) \{\s*errorState\.hidden = false;/);
});
