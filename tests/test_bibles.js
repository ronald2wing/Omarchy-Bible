// Unit tests for the generated Bible data files (BSB-style JSON).
// Run with: node tests/test_bibles.js
const assert = require("assert")
const fs = require("fs")
const path = require("path")

const DATA = path.join(__dirname, "..", "data")

function test(name, fn) {
  try { fn(); console.log("ok - " + name) }
  catch (e) { console.error("FAIL - " + name); console.error(e); process.exitCode = 1 }
}

function load(name) {
  return JSON.parse(fs.readFileSync(path.join(DATA, name), "utf8"))
}

const SPECS = [
  { file: "dr.json", translation: "dr", books: 73, ot: 46, nt: 27 },
  { file: "kjv.json", translation: "kjv", books: 66, ot: 39, nt: 27 },
  { file: "web.json", translation: "web", books: 66, ot: 39, nt: 27 },
  { file: "bsb.json", translation: "bsb", books: 66, ot: 39, nt: 27 },
  { file: "cpdv.json", translation: "cpdv", books: 73, ot: 46, nt: 27 }
]

const DEUTEROCANONICAL = ["Tobit", "Judith", "Wisdom", "Sirach", "Baruch", "1 Maccabees", "2 Maccabees"]

for (const spec of SPECS) {
  const bible = load(spec.file)
  const label = spec.file.replace(".json", "")

  test(label + " translation code", () => assert.strictEqual(bible.translation, spec.translation))
  test(label + " book count", () => assert.strictEqual(bible.books.length, spec.books))
  test(label + " testament split", () => {
    assert.strictEqual(bible.books.filter((b) => b.testament === "ot").length, spec.ot)
    assert.strictEqual(bible.books.filter((b) => b.testament === "nt").length, spec.nt)
  })

  test(label + " every book has id/name/testament/chapters", () => {
    for (const b of bible.books) {
      assert.strictEqual(typeof b.id, "string")
      assert.strictEqual(b.id, b.name)
      assert.ok(b.testament === "ot" || b.testament === "nt")
      assert.ok(Array.isArray(b.chapters))
    }
  })

  test(label + " chapter arrays are correctly indexed", () => {
    for (const b of bible.books) {
      for (let c = 0; c < b.chapters.length; c++) {
        const ch = b.chapters[c]
        assert.ok(Array.isArray(ch), b.id + " " + (c + 1) + " not an array")
        for (let v = 0; v < ch.length; v++) {
          // Omitted verses use null (dr/web/cpdv) or empty string (bsb).
          if (ch[v] === null || ch[v] === "") continue
          assert.strictEqual(typeof ch[v], "string", b.id + " " + (c + 1) + ":" + (v + 1) + " not a string")
          assert.ok(ch[v].trim() !== "", b.id + " " + (c + 1) + ":" + (v + 1) + " blank")
        }
      }
    }
  })

  test(label + " first verse of each non-empty chapter is at index 0", () => {
    for (const b of bible.books) {
      for (const ch of b.chapters) {
        if (ch.length === 0) continue
        assert.ok(ch[0] !== null, b.id + " has a chapter whose verse 1 is null")
      }
    }
  })
}

test("Genesis 1:1 differs across translations", () => {
  const verses = SPECS.map((s) => load(s.file).books.find((b) => b.id === "Genesis").chapters[0][0])
  assert.strictEqual(new Set(verses).size, SPECS.length)
})

test("John 3:16 matches known readings", () => {
  const readings = {
    dr: "God so loved the world",
    kjv: "whosoever believeth in him should not perish",
    web: "one and only Son",
    bsb: "everyone who believes",
    cpdv: "only-begotten Son"
  }
  for (const [key, needle] of Object.entries(readings)) {
    const text = load(key + ".json").books.find((b) => b.id === "John").chapters[2][15]
    assert.ok(text.indexOf(needle) !== -1, key + " John 3:16 mismatch: " + text)
  }
})

test("Psalms has 150 chapters everywhere", () => {
  for (const s of SPECS) {
    const psalms = load(s.file).books.find((b) => b.id === "Psalms")
    assert.strictEqual(psalms.chapters.length, 150, s.file)
  }
})

test("Catholic translations include the deuterocanonical books", () => {
  for (const file of ["dr.json", "cpdv.json"]) {
    const bible = load(file)
    for (const name of DEUTEROCANONICAL) {
      assert.ok(bible.books.some((b) => b.id === name), file + " missing " + name)
    }
  }
})

test("Protestant translations exclude the deuterocanonical books", () => {
  for (const file of ["kjv.json", "web.json", "bsb.json"]) {
    const bible = load(file)
    for (const name of DEUTEROCANONICAL) {
      assert.ok(!bible.books.some((b) => b.id === name), file + " unexpectedly has " + name)
    }
  }
})

test("Catholic Esther and Daniel carry the deuterocanonical additions", () => {
  for (const file of ["dr.json", "cpdv.json"]) {
    const bible = load(file)
    assert.strictEqual(bible.books.find((b) => b.id === "Esther").chapters.length, 16, file)
    assert.strictEqual(bible.books.find((b) => b.id === "Daniel").chapters.length, 14, file)
  }
})

console.log("done")
