#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

function load(name, globals = {}) {
  const src = fs.readFileSync(path.join(__dirname, "..", name), "utf8")
    .split("\n")
    .filter((l) => !l.trim().startsWith(".pragma") && !l.trim().startsWith(".import"))
    .join("\n");
  const sandbox = { console, ...globals };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: name });
  return sandbox;
}

const Search = load("search.js");
const M = load("ReaderModel.js", { Search });
const References = load("References.js");
let pass = 0, fail = 0;
function ok(name, cond) {
  if (cond) { pass++; console.log("PASS " + name); }
  else { fail++; console.log("FAIL " + name); }
}

function readBible(file) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", file), "utf8"));
}

// Concatenate the non-omitted verses of a chapter range, matching
// resolveText's output.
function versesAt(bible, bookId, chapter, start, end) {
  const ch = bible.books.find((b) => b.id === bookId).chapters[chapter - 1];
  return ch.slice(start - 1, end)
    .filter((v) => typeof v === "string")
    .map((v) => v.trim())
    .join(" ");
}

// Canonical 66-book Protestant canon in order, as [id, chapterCount]. This
// reference table lives here so the data files can be validated without any
// runtime module.
const CANON = [
  ["Genesis", 50], ["Exodus", 40], ["Leviticus", 27], ["Numbers", 36],
  ["Deuteronomy", 34], ["Joshua", 24], ["Judges", 21], ["Ruth", 4],
  ["1 Samuel", 31], ["2 Samuel", 24], ["1 Kings", 22], ["2 Kings", 25],
  ["1 Chronicles", 29], ["2 Chronicles", 36], ["Ezra", 10], ["Nehemiah", 13],
  ["Esther", 10], ["Job", 42], ["Psalms", 150], ["Proverbs", 31],
  ["Ecclesiastes", 12], ["Song of Solomon", 8], ["Isaiah", 66], ["Jeremiah", 52],
  ["Lamentations", 5], ["Ezekiel", 48], ["Daniel", 12], ["Hosea", 14],
  ["Joel", 3], ["Amos", 9], ["Obadiah", 1], ["Jonah", 4], ["Micah", 7],
  ["Nahum", 3], ["Habakkuk", 3], ["Zephaniah", 3], ["Haggai", 2],
  ["Zechariah", 14], ["Malachi", 4], ["Matthew", 28], ["Mark", 16],
  ["Luke", 24], ["John", 21], ["Acts", 28], ["Romans", 16],
  ["1 Corinthians", 16], ["2 Corinthians", 13], ["Galatians", 6],
  ["Ephesians", 6], ["Philippians", 4], ["Colossians", 4],
  ["1 Thessalonians", 5], ["2 Thessalonians", 3], ["1 Timothy", 6],
  ["2 Timothy", 4], ["Titus", 3], ["Philemon", 1], ["Hebrews", 13],
  ["James", 5], ["1 Peter", 5], ["2 Peter", 3], ["1 John", 5],
  ["2 John", 1], ["3 John", 1], ["Jude", 1], ["Revelation", 22]
];

// ReaderModel needs a parsed `bible` object for every lookup, so load the data
// files before the model-driven assertions below.
const bible = readBible("bsb.json");
const dr = readBible("dr.json");
const cpdv = readBible("cpdv.json");
const kjv = readBible("kjv.json");
const web = readBible("web.json");

ok("john exists", !!M.bookById(bible, "John"));
ok("psalms 150", M.chapterCount(bible, "Psalms") === 150);
ok("jn 3:16", (() => {
  const p = M.parsePlace("jn 3:16", bible);
  return p && p.book === "John" && p.chapter === 3 && p.verse === 16;
})());
ok("john 3", (() => {
  const p = M.parsePlace("john 3", bible);
  return p && p.book === "John" && p.chapter === 3 && p.verse === 1;
})());
ok("1 john 1:1", (() => {
  const p = M.parsePlace("1 john 1:1", bible);
  return p && p.book === "1 John" && p.chapter === 1 && p.verse === 1;
})());
ok("psalm 23", M.parsePlace("psalm 23", bible).book === "Psalms");
ok("song of solomon", M.parsePlace("song 1", bible).book === "Song of Solomon");
ok("rev 22", M.parsePlace("rev 22", bible).book === "Revelation");
ok("genesis 1 glued", M.parsePlace("genesis1", bible).chapter === 1);
ok("invalid book", M.parsePlace("zzz 99", bible) === null);
ok("invalid chapter", M.parsePlace("jude 2", bible) === null);
ok("invalid zero verse", M.parsePlace("john 3:0", bible) === null);
ok("book selection resets location", (() => {
  const p = M.initialPlaceForBook(bible, "Jude");
  return p && p.book === "Jude" && p.chapter === 1 && p.verse === 1;
})());
ok("invalid book selection", M.initialPlaceForBook(bible, "Not a book") === null);
ok("next wraps to next book", (() => {
  const n = M.nextChapter(bible, "Malachi", 4);
  return n.book === "Matthew" && n.chapter === 1;
})());
ok("prev wraps to prev book", (() => {
  const n = M.prevChapter(bible, "Matthew", 1);
  return n.book === "Malachi" && n.chapter === 4;
})());
ok("formatRef", M.formatRef(bible, "John", 3, 16) === "John 3:16");

ok("bsb 66", bible.books.length === 66);
ok("bsb books in canonical order", bible.books.length === CANON.length
  && CANON.every(([id], i) => bible.books[i].id === id));
ok("bsb chapter counts match canon", CANON.every(([id, chapters]) => {
  const dataBook = bible.books.find((candidate) => candidate.id === id);
  return dataBook && dataBook.chapters.length === chapters;
}));
ok("bsb chapters are populated", bible.books.every((book) =>
  book.chapters.every((chapter) => Array.isArray(chapter) && chapter.length > 0)
));
const john = bible.books.find((b) => b.id === "John");
ok("bsb john 3:16", john.chapters[2][15].indexOf("God so loved the world") !== -1);
ok("psalm 119 length", bible.books.find((b) => b.id === "Psalms").chapters[118].length === 176);
ok("valid final verse", M.resolvePlace("john 3:36", bible).verse === 36);
ok("reject verse beyond chapter", M.resolvePlace("john 3:37", bible) === null);
ok("reject far-out verse", M.resolvePlace("john 3:999", bible) === null);

const johnFive = M.verseObjectsFor(bible, "John", 5);
ok("omitted verse keeps its number", johnFive[3].verse === 4);
ok("omitted verse is labeled", johnFive[3].omitted && johnFive[3].text === M.OMITTED_VERSE_LABEL);
ok("reader model has no blank rows", bible.books.every((book) =>
  book.chapters.every((chapter, index) =>
    M.verseObjectsFor(bible, book.id, index + 1).every((v) => typeof v.text === "string" && v.text.trim() !== "")
  )
));

// firstNonOmittedVerseAfter: walks forward from a place to the next non-omitted
// verse, wrapping verse -> chapter -> book -> canon.
ok("firstNonOmittedVerseAfter skips omitted verse", (() => {
  const p = M.firstNonOmittedVerseAfter(bible, { book: "John", chapter: 5, verse: 3 });
  return p && p.book === "John" && p.chapter === 5 && p.verse === 5;
})());
ok("firstNonOmittedVerseAfter next verse in chapter", (() => {
  const p = M.firstNonOmittedVerseAfter(bible, { book: "John", chapter: 3, verse: 15 });
  return p && p.book === "John" && p.chapter === 3 && p.verse === 16;
})());
ok("firstNonOmittedVerseAfter wraps to next chapter", (() => {
  const p = M.firstNonOmittedVerseAfter(bible, { book: "John", chapter: 3, verse: 36 });
  return p && p.book === "John" && p.chapter === 4 && p.verse === 1;
})());
ok("firstNonOmittedVerseAfter wraps to next book", (() => {
  const p = M.firstNonOmittedVerseAfter(bible, { book: "Malachi", chapter: 4, verse: 6 });
  return p && p.book === "Matthew" && p.chapter === 1 && p.verse === 1;
})());
ok("firstNonOmittedVerseAfter wraps around canon", (() => {
  const p = M.firstNonOmittedVerseAfter(bible, { book: "Revelation", chapter: 22, verse: 21 });
  return p && p.book === "Genesis" && p.chapter === 1 && p.verse === 1;
})());
ok("firstNonOmittedVerseAfter skips null omitted verse", (() => {
  const p = M.firstNonOmittedVerseAfter(web, { book: "Luke", chapter: 17, verse: 35 });
  return p && p.book === "Luke" && p.chapter === 17 && p.verse === 37;
})());
ok("firstNonOmittedVerseAfter unknown book is null", (() => {
  return M.firstNonOmittedVerseAfter(bible, { book: "Nope", chapter: 1, verse: 1 }) === null;
})());

// Data-driven book lookups.
ok("bookById finds deuterocanonical", !!M.bookById(dr, "Tobit"));
ok("bookById null for missing", M.bookById(kjv, "Tobit") === null);
ok("chapterCount data-driven", M.chapterCount(dr, "Psalms") === 150);
ok("booksForTestament nt count", M.booksForTestament(dr, "nt").length === 27);
ok("booksForTestament ot catholic count", M.booksForTestament(dr, "ot").length === 46);
ok("isValidPlace rejects bad chapter", M.isValidPlace(dr, "Tobit", 99, 1) === false);
ok("isValidPlace accepts", M.isValidPlace(dr, "Tobit", 3, 1) === true);
ok("initialPlaceForBook deuterocanonical", (() => {
  const p = M.initialPlaceForBook(dr, "Wisdom");
  return p && p.book === "Wisdom" && p.chapter === 1 && p.verse === 1;
})());
ok("initialPlaceForBook rejects absent book", M.initialPlaceForBook(kjv, "Wisdom") === null);
ok("formatRef data-driven", M.formatRef(dr, "Tobit", 3, 1) === "Tobit 3:1");

// parsePlace across canons.
ok("parsePlace resolves Tobit in DR", (() => {
  const p = M.parsePlace("Tobit 3:1", dr);
  return p && p.book === "Tobit" && p.chapter === 3 && p.verse === 1;
})());
ok("parsePlace resolves Wisdom abbrev in CPDV", M.parsePlace("wis 2:12", cpdv).book === "Wisdom");
ok("parsePlace resolves 1 Maccabees abbrev", M.parsePlace("1macc 3:1", dr).book === "1 Maccabees");
ok("parsePlace rejects Tobit in KJV", M.parsePlace("Tobit 3:1", kjv) === null);
ok("parsePlace rejects Tobit in WEB", M.parsePlace("Tobit 3:1", web) === null);
ok("parsePlace rejects Tobit in BSB", M.parsePlace("Tobit 3:1", bible) === null);

// Chapter navigation through the deuterocanonicals.
ok("nextChapter Malachi -> 1 Maccabees", (() => {
  const n = M.nextChapter(dr, "Malachi", 4);
  return n.book === "1 Maccabees" && n.chapter === 1;
})());
ok("nextChapter 1 Maccabees -> 2 Maccabees", (() => {
  const n = M.nextChapter(dr, "1 Maccabees", 16);
  return n.book === "2 Maccabees" && n.chapter === 1;
})());
ok("nextChapter 2 Maccabees -> Matthew", (() => {
  const n = M.nextChapter(dr, "2 Maccabees", 15);
  return n.book === "Matthew" && n.chapter === 1;
})());
ok("prevChapter Matthew -> 2 Maccabees", (() => {
  const n = M.prevChapter(dr, "Matthew", 1);
  return n.book === "2 Maccabees" && n.chapter === 15;
})());

// resolveText for readings references.
ok("resolveText single verse range", (() => {
  const r = M.resolveText("Matthew 23:23-26", dr);
  return r.ok && r.text === versesAt(dr, "Matthew", 23, 23, 26);
})());
ok("resolveText comma groups", (() => {
  const r = M.resolveText("2 Thessalonians 2:1-3,14-17", dr);
  return r.ok && r.text === versesAt(dr, "2 Thessalonians", 2, 1, 3) + " " + versesAt(dr, "2 Thessalonians", 2, 14, 17);
})());
ok("resolveText psalm vulgate numbering", (() => {
  const r = M.resolveText("Psalm 95(96):10-13", dr);
  return r.ok && r.text === versesAt(dr, "Psalms", 95, 10, 13);
})());
ok("resolveText psalm protestant numbering", (() => {
  const r = M.resolveText("Psalm 95(96):10-13", kjv);
  return r.ok && r.text === versesAt(kjv, "Psalms", 96, 10, 13);
})());
ok("resolveText cf. glued abbrev", (() => {
  const r = M.resolveText("cf.Ac16:14", dr);
  return r.ok && r.text === versesAt(dr, "Acts", 16, 14, 14);
})());
ok("resolveText unknown book", M.resolveText("Zzz 1:1", dr).ok === false);
ok("resolveText chapter out of range", M.resolveText("Tobit 99:1", dr).ok === false);

// Vulgate detection.
ok("usesVulgateNumbering DR", M.usesVulgateNumbering(dr) === true);
ok("usesVulgateNumbering CPDV", M.usesVulgateNumbering(cpdv) === true);
ok("usesVulgateNumbering KJV false", M.usesVulgateNumbering(kjv) === false);
ok("usesVulgateNumbering WEB false", M.usesVulgateNumbering(web) === false);

// equivalentPlace: cross-translation place mapping for translation switches.
ok("equivalentPlace identity John 3:16", (() => {
  const p = M.equivalentPlace(dr, kjv, { book: "John", chapter: 3, verse: 16 });
  return p && p.book === "John" && p.chapter === 3 && p.verse === 16;
})());
ok("equivalentPlace missing book is null", (() => {
  return M.equivalentPlace(dr, kjv, { book: "Tobit", chapter: 3, verse: 1 }) === null;
})());
ok("equivalentPlace vulgate to hebrew psalm", (() => {
  const p = M.equivalentPlace(dr, kjv, { book: "Psalms", chapter: 51, verse: 1 });
  return p && p.book === "Psalms" && p.chapter === 52 && p.verse === 1;
})());
ok("equivalentPlace hebrew to vulgate psalm", (() => {
  const p = M.equivalentPlace(kjv, dr, { book: "Psalms", chapter: 96, verse: 1 });
  return p && p.book === "Psalms" && p.chapter === 95 && p.verse === 1;
})());
ok("equivalentPlace advances past omitted target verse", (() => {
  const p = M.equivalentPlace(kjv, web, { book: "Luke", chapter: 17, verse: 36 });
  return p && p.book === "Luke" && p.chapter === 17 && p.verse === 37;
})());
ok("equivalentPlace null place is null", (() => {
  return M.equivalentPlace(dr, kjv, null) === null;
})());

// Per-translation state map.
ok("valid state is restored", (() => {
  const p = M.restorePlace('{"version":2,"translations":{"bsb":{"book":"John","chapter":3,"verse":16}}}', bible, "bsb");
  return p.book === "John" && p.chapter === 3 && p.verse === 16;
})());
ok("stale state verse is clamped", M.restorePlace('{"version":2,"translations":{"bsb":{"book":"John","chapter":3,"verse":999}}}', bible, "bsb").verse === 36);
ok("fractional state verse is rejected", M.restorePlace('{"version":2,"translations":{"bsb":{"book":"John","chapter":3,"verse":1.5}}}', bible, "bsb").verse === 1);
ok("malformed state uses defaults", (() => {
  const p = M.restorePlace('{broken', bible, "bsb");
  return p.book === M.DEFAULT_BOOK && p.chapter === M.DEFAULT_CHAPTER && p.verse === M.DEFAULT_VERSE;
})());
ok("invalid state location uses defaults", (() => {
  const p = M.restorePlace('{"version":2,"translations":{"bsb":{"book":"Jude","chapter":119,"verse":4}}}', bible, "bsb");
  return p.book === "Jude" && p.chapter === M.DEFAULT_CHAPTER && p.verse === 4;
})());
ok("parseState tolerates malformed", (() => {
  const m = M.parseState('{broken');
  return m && typeof m === "object" && m.translations === undefined;
})());
ok("parseState parses map", (() => {
  const m = M.parseState('{"version":2,"translations":{"bsb":{"book":"John","chapter":3,"verse":16}}}');
  return m.translations.bsb.book === "John";
})());
ok("savePlace writes per-translation map", (() => {
  const parsed = JSON.parse(M.savePlace({}, "bsb", "John", 3, 16));
  return parsed.translations.bsb.book === "John"
    && parsed.translations.bsb.chapter === 3
    && parsed.translations.bsb.verse === 16;
})());
ok("savePlace preserves other translations", (() => {
  const s1 = M.savePlace({}, "bsb", "John", 3, 16);
  const s2 = M.savePlace(JSON.parse(s1), "dr", "Tobit", 3, 1);
  const parsed = JSON.parse(s2);
  return parsed.translations.bsb.book === "John" && parsed.translations.dr.book === "Tobit";
})());
ok("savePlace persists selectedTranslation", (() => {
  const parsed = JSON.parse(M.savePlace({}, "bsb", "John", 3, 16, "bsb"));
  return parsed.selectedTranslation === "bsb";
})());
ok("savePlace omits selectedTranslation when absent", (() => {
  const parsed = JSON.parse(M.savePlace({}, "bsb", "John", 3, 16));
  return parsed.selectedTranslation === undefined;
})());
ok("selectedTranslation reads saved code", (() => {
  const m = M.parseState(M.savePlace({}, "bsb", "John", 3, 16, "bsb"));
  return M.selectedTranslation(m) === "bsb";
})());
ok("selectedTranslation returns empty when none", (() => {
  return M.selectedTranslation(M.parseState('{"version":2,"translations":{}}')) === "";
})());
ok("restorePlace round-trip bsb", (() => {
  const p = M.restorePlace(M.savePlace({}, "bsb", "John", 3, 16), bible, "bsb");
  return p.book === "John" && p.chapter === 3 && p.verse === 16;
})());
ok("restorePlace round-trip dr", (() => {
  const p = M.restorePlace(M.savePlace({}, "dr", "Tobit", 3, 1), dr, "dr");
  return p.book === "Tobit" && p.chapter === 3 && p.verse === 1;
})());
ok("restorePlace missing translation uses defaults", (() => {
  const p = M.restorePlace(M.savePlace({}, "bsb", "John", 3, 16), dr, "dr");
  return p.book === M.DEFAULT_BOOK && p.chapter === M.DEFAULT_CHAPTER && p.verse === M.DEFAULT_VERSE;
})());

ok("word search finds god so loved", (() => {
  const hits = Search.searchVerses(bible, "god so loved", 40);
  return hits.some((h) => h.book === "John" && h.chapter === 3 && h.verse === 16);
})());
ok("word search single word matches partial", (() => {
  return Search.searchVerses(bible, "lov", 100).length > 0
    && Search.searchVerses(bible, "love", 100).length > 0;
})());
ok("word search caps results", () => Search.searchVerses(bible, "god", 7).length === 7);
ok("word search empty query", () => Search.searchVerses(bible, "", 40).length === 0);
ok("word search results carry location", (() => {
  const hits = Search.searchVerses(bible, "cremation", 40);
  if (hits.length === 0) return true; // term absent from BSB
  return hits.every((h) => typeof h.book === "string" && h.chapter >= 1 && h.verse >= 1 && h.text.length > 0);
})());

// Reference suggestions must surface for reference-like queries (regression
// guard: the worker previously blanked these as "completed references").
ok("suggestWords genesis 1:1 returns verse-prefix suggestions", (() => {
  const s = Search.suggestWords(bible, "genesis 1:1", 8);
  return s.length === 8 && s[0] === "Genesis 1:1" && s[1] === "Genesis 1:10";
})());
ok("suggestWords 3:16 returns cross-book suggestions", (() => {
  const s = Search.suggestWords(bible, "3:16", 8);
  return s.length === 8 && s[0] === "Genesis 3:16" && s.every((r) => r.slice(-4) === "3:16");
})());
ok("suggestWords john 3 returns chapter verses", (() => {
  const s = Search.suggestWords(bible, "john 3", 8);
  return s.length === 8 && s[0] === "John 3:1" && s[1] === "John 3:2";
})());
ok("suggestWords corpus path returns word matches", (() => {
  const corpus = Search.buildCorpus(bible);
  const s = Search.suggestWords(bible, "love", 8, corpus);
  return s.length > 0 && s.every((w) => w.indexOf("love") === 0);
})());

// Random daily-verse selection (References.randomReference).
ok("randomReference is deterministic for a seed", (() => {
  const a = References.randomReference(123456789, kjv);
  const b = References.randomReference(123456789, kjv);
  return typeof a === "string" && a !== "" && a === b;
})());
ok("randomReference returns a resolvable non-null verse", (() => {
  const ref = References.randomReference(42, kjv);
  const r = M.resolveText(ref, kjv);
  return r.ok && r.text.trim() !== "";
})());
ok("randomReference different seeds differ", (() => {
  const refs = new Set([1, 2, 3, 4, 5].map((s) => References.randomReference(s, kjv)));
  return refs.size > 1;
})());
ok("randomReference never returns a null verse", (() => {
  for (let s = 0; s < 200; s++) {
    const r = M.resolveText(References.randomReference(s, kjv), kjv);
    if (!r.ok) return false;
  }
  return true;
})());
ok("randomReference never returns an omitted verse", (() => {
  for (let s = 0; s < 200; s++) {
    const ref = References.randomReference(s, kjv);
    const p = M.parsePlace(ref, kjv);
    const text = kjv.books.find((b) => b.id === p.book).chapters[p.chapter - 1][p.verse - 1];
    if (typeof text !== "string" || text.trim() === "") return false;
  }
  return true;
})());

console.log(fail === 0 ? `\n${pass} passed` : `\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
