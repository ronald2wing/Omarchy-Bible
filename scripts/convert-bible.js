#!/usr/bin/env node
"use strict"

// convert-bible.js — converts Bible source data into the unified BSB-style
// JSON format used by data/bsb.json:
//
//   {
//     "format": 1,
//     "translation": "kjv",
//     "books": [
//       {
//         "id": "Genesis", "name": "Genesis", "testament": "ot",
//         "chapters": [["verse 1", "verse 2", null, "verse 4"], ...]
//       }
//     ]
//   }
//
// `chapters` is an array of chapters; each chapter is an array of verse
// strings indexed by (verseNumber - 1), with `null` for a missing verse.
// The `id` field equals `name` (matching data/bsb.json; ReaderModel.js looks
// books up by `id`).
//
// Usage:
//   node scripts/convert-bible.js scrollmapper --in KJV.json   --out data/kjv.json  --translation kjv
//   node scripts/convert-bible.js scrollmapper --in CPDV.json  --out data/cpdv.json --translation cpdv --catholic
//   node scripts/convert-bible.js web         --dir <tehshrike-json-dir> --out data/web.json --translation web

const fs = require("fs")
const path = require("path")

// --- canon order ----------------------------------------------------------
// Protestant 66-book canon (matches data/bsb.json order).
const PROTESTANT_ORDER = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua",
  "Judges", "Ruth", "1 Samuel", "2 Samuel", "1 Kings", "2 Kings",
  "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther", "Job",
  "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon", "Isaiah",
  "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos",
  "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai",
  "Zechariah", "Malachi", "Matthew", "Mark", "Luke", "John", "Acts", "Romans",
  "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians",
  "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy",
  "Titus", "Philemon", "Hebrews", "James", "1 Peter", "2 Peter", "1 John",
  "2 John", "3 John", "Jude", "Revelation"
]

// Catholic 73-book canon. Deuterocanonical books (Tobit, Judith, Wisdom,
// Sirach, Baruch, 1/2 Maccabees) are OT and sit before Matthew.
const CATHOLIC_ORDER = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua",
  "Judges", "Ruth", "1 Samuel", "2 Samuel", "1 Kings", "2 Kings",
  "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Tobit", "Judith",
  "Esther", "Job", "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon",
  "Wisdom", "Sirach", "Isaiah", "Jeremiah", "Lamentations", "Baruch",
  "Ezekiel", "Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah",
  "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi",
  "1 Maccabees", "2 Maccabees", "Matthew", "Mark", "Luke", "John", "Acts",
  "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians",
  "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians",
  "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James",
  "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation"
]

// Non-canonical appendix books present in scrollmapper's CPDV (Vulgate
// appendix) that are not part of the 73-book Catholic canon.
const CPDV_EXTRAS = new Set([
  "Prayer of Manasses", "1 Esdras", "2 Esdras", "Additional Psalm", "Laodiceans"
])

// --- name normalization ---------------------------------------------------

function normalizeName(raw) {
  let n = String(raw).trim()
    .replace(/^III\s+/, "3 ")
    .replace(/^II\s+/, "2 ")
    .replace(/^I\s+/, "1 ")
  if (n === "Revelation of John") n = "Revelation"
  if (n === "Song of Songs") n = "Song of Solomon"
  return n
}

function slug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "")
}

// --- omitted-verse normalization -----------------------------------------

// Some sources keep an omitted verse's number but give it empty text (e.g.
// WEB's Luke 17:36, CPDV's 3 John 1:15). Normalize those to `null` so every
// translation agrees with bsb.json's "null for omitted verses" convention.
function normalizeOmitted(data) {
  data.format = 1
  for (const book of data.books) {
    for (const chapter of book.chapters) {
      for (let v = 0; v < chapter.length; v++) {
        if (typeof chapter[v] === "string" && chapter[v].trim() === "") chapter[v] = null
      }
    }
  }
  return data
}

// --- testament ------------------------------------------------------------

// Everything before Matthew is OT; Matthew onward is NT. This holds for both
// the 66-book and 73-book canons because the deuterocanonical books all sit
// in the OT, before Matthew.
function assignTestaments(books) {
  let nt = false
  for (const b of books) {
    if (!nt && b.name === "Matthew") nt = true
    b.testament = nt ? "nt" : "ot"
  }
}

function makeBook(name, chapters) {
  return { id: name, name: name, testament: "ot", chapters: chapters }
}

// Assert the source produced the expected canon in the expected order, so a
// rename or reordering in the upstream data fails loudly instead of silently.
function verifyOrder(books, order) {
  const got = books.map((b) => b.name).join("\n")
  const want = order.join("\n")
  if (got !== want) {
    throw new Error("unexpected book order/canon; got " + books.length +
      " books but expected the " + order.length + "-book canon")
  }
}

// --- scrollmapper converter ----------------------------------------------
// {"translation":"...","books":[{"name":"Genesis","chapters":[{"chapter":1,"verses":[{"verse":1,"text":"..."}]}]}]}

function convertScrollmapper(data, opts) {
  const books = []
  for (const src of data.books) {
    const name = normalizeName(src.name)
    if (opts.catholic && CPDV_EXTRAS.has(name)) continue
    const chapters = src.chapters.map((ch) => {
      const arr = []
      for (const v of ch.verses) arr[v.verse - 1] = v.text.trim()
      return arr
    })
    books.push(makeBook(name, chapters))
  }
  assignTestaments(books)
  verifyOrder(books, opts.catholic ? CATHOLIC_ORDER : PROTESTANT_ORDER)
  return normalizeOmitted({ translation: opts.translation, books: books })
}

// --- TehShrike world-english-bible converter ------------------------------
// One JSON file per book (lowercased name, spaces removed); each file is a
// flat array whose verse text lives in "paragraph text" and "line text"
// entries keyed by (chapterNumber, verseNumber). Formatting entries
// ("header", "break", "stanza start/end", "line break") carry no verse text.

function convertWeb(dir, opts) {
  const books = []
  for (const name of PROTESTANT_ORDER) {
    const file = path.join(dir, slug(name) + ".json")
    if (!fs.existsSync(file)) {
      throw new Error("convert-bible: missing WEB file for " + name + " at " + file)
    }
    const entries = JSON.parse(fs.readFileSync(file, "utf8"))
    const chapters = []
    for (const o of entries) {
      if (o.type !== "paragraph text" && o.type !== "line text") continue
      const c = o.chapterNumber
      const v = o.verseNumber
      while (chapters.length < c) chapters.push([])
      const chArr = chapters[c - 1]
      while (chArr.length < v - 1) chArr.push(null)
      const frag = String(o.value || "").trim()
      chArr[v - 1] = chArr[v - 1] == null ? frag : chArr[v - 1] + " " + frag
    }
    books.push(makeBook(name, chapters))
  }
  assignTestaments(books)
  return normalizeOmitted({ translation: opts.translation, books: books })
}

// --- CLI ------------------------------------------------------------------

function argValue(args, flag) {
  const i = args.indexOf(flag)
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null
}

// Convert the source data for the given CLI mode into the unified JSON shape,
// throwing a clear error for a bad mode or a missing per-mode flag.
function convert(mode, args, opts) {
  if (mode === "scrollmapper") {
    const input = argValue(args, "--in")
    if (!input) throw new Error("scrollmapper mode needs --in")
    return convertScrollmapper(JSON.parse(fs.readFileSync(input, "utf8")), opts)
  }
  if (mode === "web") {
    const dir = argValue(args, "--dir")
    if (!dir) throw new Error("web mode needs --dir")
    return convertWeb(dir, opts)
  }
  throw new Error("unknown mode: " + mode + " (expected scrollmapper|web)")
}

function main(argv) {
  const args = argv.slice(2)
  const mode = args[0]
  const opts = {
    translation: (argValue(args, "--translation") || "???").toLowerCase(),
    catholic: args.indexOf("--catholic") >= 0,
    out: argValue(args, "--out")
  }

  const data = convert(mode, args, opts)

  const out = opts.out
  if (!out) {
    process.stdout.write(JSON.stringify(data))
    return
  }
  fs.writeFileSync(out, JSON.stringify(data))
  const ot = data.books.filter((b) => b.testament === "ot").length
  const nt = data.books.filter((b) => b.testament === "nt").length
  const bytes = fs.statSync(out).size
  console.log(`wrote ${out} — ${data.books.length} books (${ot} OT / ${nt} NT), ${bytes} bytes`)
}

try {
  main(process.argv)
} catch (e) {
  console.error("convert-bible:", e.message)
  process.exit(1)
}
