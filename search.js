// Shared Bible text search and reference-parsing helpers. Locale- and Qt-free
// so they load via `import "search.js" as Search` in QML, `Qt.include` in the
// search worker, and `require`/vm in node tests.
//
// Canonical word-search, autocomplete, and reference-parsing implementations
// extracted from ReaderModel.js so the panel, the search worker, and the node
// tests all share one matching implementation.

// --- Generic helpers ------------------------------------------------------

// Strip a "file://" scheme and percent-decode the rest. Returns the input
// unchanged when the scheme is absent, and null when the %-escapes are
// malformed, so callers treat that result as "no usable path".
function fileUrlToPath(url) {
  var s = String(url || "")
  if (s.indexOf("file://") === 0) {
    s = s.substring(7)
    if (s.charAt(0) !== "/") s = "/" + s
    try {
      s = decodeURIComponent(s)
    } catch (e) {
      s = null // malformed %-escape: the path is unusable, so fail the lookup
    }
  }
  return s
}

// --- Reference parsing ----------------------------------------------------

function _collapse(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "")
}

function _ordinalPrefix(s) {
  return String(s || "")
    .replace(/^(first|1st|i)\s+/i, "1 ")
    .replace(/^(second|2nd|ii)\s+/i, "2 ")
    .replace(/^(third|3rd|iii)\s+/i, "3 ")
}

// Collapsed reference token -> canonical book id. Union of the full names of
// every book in the 73-book canon, the Protestant abbreviation aliases, and
// the deuterocanonical aliases.
var _BOOK_ALIASES = {
  // Full names (collapsed: "1 Maccabees" -> "1maccabees").
  "genesis": "Genesis",
  "exodus": "Exodus",
  "leviticus": "Leviticus",
  "numbers": "Numbers",
  "deuteronomy": "Deuteronomy",
  "joshua": "Joshua",
  "judges": "Judges",
  "ruth": "Ruth",
  "1samuel": "1 Samuel",
  "2samuel": "2 Samuel",
  "1kings": "1 Kings",
  "2kings": "2 Kings",
  "1chronicles": "1 Chronicles",
  "2chronicles": "2 Chronicles",
  "ezra": "Ezra",
  "nehemiah": "Nehemiah",
  "tobit": "Tobit",
  "judith": "Judith",
  "esther": "Esther",
  "job": "Job",
  "psalms": "Psalms",
  "proverbs": "Proverbs",
  "ecclesiastes": "Ecclesiastes",
  "songofsolomon": "Song of Solomon",
  "wisdom": "Wisdom",
  "sirach": "Sirach",
  "isaiah": "Isaiah",
  "jeremiah": "Jeremiah",
  "lamentations": "Lamentations",
  "baruch": "Baruch",
  "ezekiel": "Ezekiel",
  "daniel": "Daniel",
  "hosea": "Hosea",
  "joel": "Joel",
  "amos": "Amos",
  "obadiah": "Obadiah",
  "jonah": "Jonah",
  "micah": "Micah",
  "nahum": "Nahum",
  "habakkuk": "Habakkuk",
  "zephaniah": "Zephaniah",
  "haggai": "Haggai",
  "zechariah": "Zechariah",
  "malachi": "Malachi",
  "1maccabees": "1 Maccabees",
  "2maccabees": "2 Maccabees",
  "matthew": "Matthew",
  "mark": "Mark",
  "luke": "Luke",
  "john": "John",
  "acts": "Acts",
  "romans": "Romans",
  "1corinthians": "1 Corinthians",
  "2corinthians": "2 Corinthians",
  "galatians": "Galatians",
  "ephesians": "Ephesians",
  "philippians": "Philippians",
  "colossians": "Colossians",
  "1thessalonians": "1 Thessalonians",
  "2thessalonians": "2 Thessalonians",
  "1timothy": "1 Timothy",
  "2timothy": "2 Timothy",
  "titus": "Titus",
  "philemon": "Philemon",
  "hebrews": "Hebrews",
  "james": "James",
  "1peter": "1 Peter",
  "2peter": "2 Peter",
  "1john": "1 John",
  "2john": "2 John",
  "3john": "3 John",
  "jude": "Jude",
  "revelation": "Revelation",

  // Protestant abbreviation aliases.
  "gen": "Genesis", "ge": "Genesis", "gn": "Genesis",
  "ex": "Exodus", "exo": "Exodus", "exod": "Exodus",
  "lev": "Leviticus", "le": "Leviticus", "lv": "Leviticus",
  "num": "Numbers", "nu": "Numbers", "nm": "Numbers", "nb": "Numbers",
  "deut": "Deuteronomy", "de": "Deuteronomy", "dt": "Deuteronomy",
  "josh": "Joshua", "jos": "Joshua",
  "judg": "Judges", "jdg": "Judges", "jg": "Judges",
  "ru": "Ruth",
  "1sam": "1 Samuel", "1sa": "1 Samuel", "1sm": "1 Samuel",
  "2sam": "2 Samuel", "2sa": "2 Samuel", "2sm": "2 Samuel",
  "1kgs": "1 Kings", "1ki": "1 Kings", "1k": "1 Kings",
  "2kgs": "2 Kings", "2ki": "2 Kings", "2k": "2 Kings",
  "1chr": "1 Chronicles", "1ch": "1 Chronicles",
  "2chr": "2 Chronicles", "2ch": "2 Chronicles",
  "ezr": "Ezra",
  "neh": "Nehemiah", "ne": "Nehemiah",
  "esth": "Esther", "est": "Esther", "es": "Esther",
  "jb": "Job",
  "ps": "Psalms", "psa": "Psalms", "psalm": "Psalms", "pss": "Psalms",
  "prov": "Proverbs", "pro": "Proverbs", "prv": "Proverbs", "pr": "Proverbs",
  "eccl": "Ecclesiastes", "ecc": "Ecclesiastes", "ec": "Ecclesiastes", "qoh": "Ecclesiastes",
  "song": "Song of Solomon", "sos": "Song of Solomon", "so": "Song of Solomon",
  "ss": "Song of Solomon", "canticle": "Song of Solomon", "canticles": "Song of Solomon",
  "isa": "Isaiah", "is": "Isaiah",
  "jer": "Jeremiah", "je": "Jeremiah",
  "lam": "Lamentations", "la": "Lamentations",
  "ezek": "Ezekiel", "eze": "Ezekiel", "ezk": "Ezekiel",
  "dan": "Daniel", "da": "Daniel", "dn": "Daniel",
  "hos": "Hosea", "ho": "Hosea",
  "jl": "Joel",
  "am": "Amos",
  "obad": "Obadiah", "ob": "Obadiah",
  "jnh": "Jonah", "jon": "Jonah",
  "mic": "Micah", "mi": "Micah",
  "nah": "Nahum", "na": "Nahum",
  "hab": "Habakkuk",
  "zeph": "Zephaniah", "zep": "Zephaniah", "zp": "Zephaniah",
  "hag": "Haggai", "hg": "Haggai",
  "zech": "Zechariah", "zec": "Zechariah", "zc": "Zechariah",
  "mal": "Malachi",
  "matt": "Matthew", "mat": "Matthew", "mt": "Matthew",
  "mk": "Mark", "mr": "Mark", "mrk": "Mark",
  "lk": "Luke", "lu": "Luke",
  "jn": "John", "joh": "John",
  "act": "Acts",
  "rom": "Romans", "ro": "Romans", "rm": "Romans",
  "1cor": "1 Corinthians", "1co": "1 Corinthians",
  "2cor": "2 Corinthians", "2co": "2 Corinthians",
  "gal": "Galatians", "ga": "Galatians",
  "eph": "Ephesians",
  "phil": "Philippians", "php": "Philippians", "pp": "Philippians",
  "col": "Colossians",
  "1thess": "1 Thessalonians", "1thes": "1 Thessalonians", "1th": "1 Thessalonians",
  "2thess": "2 Thessalonians", "2thes": "2 Thessalonians", "2th": "2 Thessalonians",
  "1tim": "1 Timothy", "1ti": "1 Timothy",
  "2tim": "2 Timothy", "2ti": "2 Timothy",
  "tit": "Titus", "ti": "Titus",
  "phlm": "Philemon", "phm": "Philemon", "philem": "Philemon",
  "heb": "Hebrews",
  "jas": "James", "jam": "James", "jm": "James",
  "1pet": "1 Peter", "1pe": "1 Peter", "1pt": "1 Peter",
  "2pet": "2 Peter", "2pe": "2 Peter", "2pt": "2 Peter",
  "1jn": "1 John", "1joh": "1 John", "1jo": "1 John",
  "2jn": "2 John", "2joh": "2 John", "2jo": "2 John",
  "3jn": "3 John", "3joh": "3 John", "3jo": "3 John",
  "jud": "Jude", "jd": "Jude",
  "rev": "Revelation", "re": "Revelation", "apoc": "Revelation", "apocalypse": "Revelation",

  // Deuterocanonical aliases.
  "tob": "Tobit",
  "jdt": "Judith",
  "wis": "Wisdom", "bookofwisdom": "Wisdom",
  "sir": "Sirach", "ecclesiasticus": "Sirach",
  "bar": "Baruch",
  "1macc": "1 Maccabees", "1mac": "1 Maccabees",
  "2macc": "2 Maccabees", "2mac": "2 Maccabees",
  "ac": "Acts" // universalis uses "Ac" for Acts
}

// Find the book whose (possibly abbreviated) name resolves via _BOOK_ALIASES,
// or null if the name is unknown or the book is absent from the given bible.
function bookByName(bible, name) {
  if (!bible || !bible.books) return null
  var id = _BOOK_ALIASES[_collapse(name)]
  if (!id) return null
  for (var i = 0; i < bible.books.length; i++) {
    if (bible.books[i].id === id) return bible.books[i]
  }
  return null
}

// Parse a "book chapter[:verse]" (or "bookchapter" glued) string into a
// { book, chapter, verse } place, or null if the book/chapter/verse is invalid
// in the given bible. ReaderModel.parsePlace delegates here so the panel and
// the search worker share one parser.
function parsePlace(input, bible) {
  var raw = String(input || "").trim()
  if (!raw || !bible || !bible.books) return null
  raw = _ordinalPrefix(raw).replace(/[.]+/g, " ")
  var m = raw.match(/^(.+?)\s+(\d+)(?:\s*[:.]\s*(\d+))?$/)
  var bookPart = raw
  var chapter = 1
  var verse = 1
  if (m) {
    bookPart = m[1]
    chapter = parseInt(m[2], 10)
    verse = m[3] ? parseInt(m[3], 10) : 1
  } else {
    var glued = raw.match(/^(.+?)(\d+)$/)
    if (glued) {
      bookPart = glued[1]
      chapter = parseInt(glued[2], 10)
    }
  }
  var book = bookByName(bible, bookPart)
  if (!book) return null
  if (typeof chapter !== "number" || chapter < 1 || chapter > book.chapters.length || Math.floor(chapter) !== chapter)
    return null
  if (typeof verse !== "number" || verse < 1 || Math.floor(verse) !== verse)
    return null
  return { book: book.id, chapter: chapter, verse: verse }
}

// Parse a bare "chapter[:verse]" (no book name) into { chapter, verse }, with
// verse null when omitted or empty. Returns null for any other input. Shared by
// the panel's searchBible (resolving against the current book) and
// suggestReferences (shape 2) so their chapter/verse grammar cannot drift.
function parseBarePlace(input) {
  var m = String(input || "").trim().match(/^(\d+)(?:\s*[:.]\s*(\d*))?$/)
  if (!m) return null
  return { chapter: parseInt(m[1], 10), verse: m[2] ? parseInt(m[2], 10) : null }
}

// Match a single word as a substring (case-insensitive) so partial words
// match too — "lo" finds "love", "lord", etc. A phrase matches when it
// appears verbatim or every word appears as a substring.
function _textMatchesQuery(q, words, text) {
  if (words.length === 1) return text.indexOf(words[0]) !== -1
  if (text.indexOf(q) !== -1) return true
  for (var i = 0; i < words.length; i++) {
    if (text.indexOf(words[i]) === -1) return false
  }
  return true
}

// Walk every verse slot of a bible in book/chapter/verse order, calling
// cb(book, chapter, verse, text) with 1-based chapter/verse. cb may return
// false to stop the walk early. Non-string (omitted) slots are still visited;
// callers decide whether to skip them.
function forEachVerse(bible, cb) {
  if (!bible || !bible.books || typeof cb !== "function") return
  for (var i = 0; i < bible.books.length; i++) {
    var book = bible.books[i]
    for (var c = 0; c < book.chapters.length; c++) {
      var chapter = book.chapters[c]
      for (var v = 0; v < chapter.length; v++) {
        if (cb(book, c + 1, v + 1, chapter[v]) === false) return
      }
    }
  }
}

// "Book chapter:verse" string from a book object and 1-based chapter/verse.
// Shared by the search index and the reference suggestions so the format
// cannot drift between them.
function _formatRef(book, chapter, verse) {
  return book.name + " " + chapter + ":" + verse
}

// Memoized per-verse search index. For every non-omitted string verse the
// lowercased verse text and the lowercased "Book chapter:verse" reference are
// computed once per bible object, so searchVerses never re-lowercases the
// ~31k verse strings (nor rebuilds their references) on each query. A
// single-slot cache keyed by object identity keeps the index off the bible
// object (so it is not serialized to the search worker) while staying
// ES5-safe: the worker engine that loads this file via Qt.include lacks ES6
// map types. The worker holds exactly one bible at a time, so one slot is
// sufficient.
var _searchIndexCache = null
var _searchIndexCacheKey = null

function _searchIndex(bible) {
  if (!bible || !bible.books) return []
  if (_searchIndexCacheKey === bible) return _searchIndexCache
  var idx = []
  for (var i = 0; i < bible.books.length; i++) {
    var book = bible.books[i]
    for (var c = 0; c < book.chapters.length; c++) {
      var chapter = book.chapters[c]
      for (var v = 0; v < chapter.length; v++) {
        var text = chapter[v]
        if (typeof text !== "string") continue
        var trimmed = text.trim()
        if (trimmed === "") continue
        idx.push({
          chapter: c + 1,
          verse: v + 1,
          bookIndex: i,
          lowered: text.toLowerCase(),
          ref: _formatRef(book, c + 1, v + 1).toLowerCase()
        })
      }
    }
  }
  _searchIndexCacheKey = bible
  _searchIndexCache = idx
  return idx
}

function searchVerses(bible, query, maxResults) {
  var q = String(query || "").slice(0, 500).toLowerCase().trim()
  var max = typeof maxResults === "number" && maxResults > 0 ? maxResults : 40
  if (!q || !bible || !bible.books) return []
  var words = q.split(/\s+/)
  var idx = _searchIndex(bible)
  var out = []
  for (var i = 0; i < idx.length && out.length < max; i++) {
    var e = idx[i]
    if (_textMatchesQuery(q, words, e.lowered) || _textMatchesQuery(q, words, e.ref)) {
      var bookRef = bible.books[e.bookIndex]
      var text = bookRef ? (bookRef.chapters[e.chapter - 1] || [])[e.verse - 1] || "" : ""
      out.push({ book: bookRef ? bookRef.id : "", chapter: e.chapter, verse: e.verse, text: String(text).trim() })
    }
  }
  return out
}

// Reference-like suggestions: turn a "book chapter[:verse]" or "chapter[:verse]"
// query into formatted "BookName chapter:verse" strings. Used for numeric /
// reference queries, where the word-prefix autocomplete has nothing to offer.
function suggestReferences(bible, query, maxResults) {
  var q = String(query || "").slice(0, 500).toLowerCase().trim()
  var max = typeof maxResults === "number" && maxResults > 0 ? maxResults : 8
  if (q === "" || !bible || !bible.books) return []
  var out = []

  // Shape 1: "book chapter[:verse]" — resolve the book by full name or
  // abbreviation (via _BOOK_ALIASES), then suggest that chapter's verses.
  var m = q.match(/^([a-z][a-z\s]*)\s+(\d+)(?:\s*[:.]\s*(\d*))?$/)
  if (m) {
    var book = bookByName(bible, m[1].trim())
    if (!book) return out
    var chapter = parseInt(m[2], 10)
    var ch = book.chapters[chapter - 1]
    if (!ch) return out
    if (m[3]) {
      // Verse prefix given ("genesis 1:1") — suggest every verse in the
      // chapter whose number starts with the typed prefix (1:1, 1:10, 1:11…).
      var vp = m[3]
      for (var v = 0; v < ch.length && out.length < max; v++) {
        if (typeof ch[v] === "string" && String(v + 1).indexOf(vp) === 0) {
          out.push(_formatRef(book, chapter, v + 1))
        }
      }
    } else {
      for (var v = 0; v < ch.length && out.length < max; v++) {
        if (typeof ch[v] === "string") out.push(_formatRef(book, chapter, v + 1))
      }
    }
    return out
  }

  // Shape 2: "chapter[:verse]" with no book — suggest the matching reference
  // across every book that contains it.
  var bare = parseBarePlace(q)
  if (bare) {
    var c2 = bare.chapter
    var v2 = bare.verse === null ? 0 : bare.verse
    for (var b2 = 0; b2 < bible.books.length && out.length < max; b2++) {
      var book2 = bible.books[b2]
      var ch2 = book2.chapters[c2 - 1]
      if (!ch2) continue
      if (v2 > 0) {
        if (v2 <= ch2.length && typeof ch2[v2 - 1] === "string") {
          out.push(_formatRef(book2, c2, v2))
        }
      } else if (typeof ch2[0] === "string") {
        out.push(_formatRef(book2, c2, 1))
      }
    }
    return out
  }

  // Shape 3: bare book name ("genesis", "gen") — suggest that book's first
  // chapter verses. Resolves abbreviations via _BOOK_ALIASES and falls back to
  // prefix-matching the full name so partial typing still works.
  m = q.match(/^([a-z][a-z\s]*)$/)
  if (m) {
    var name3 = m[1].trim()
    var book3 = bookByName(bible, name3)
    if (!book3) {
      for (var b3 = 0; b3 < bible.books.length; b3++) {
        if (bible.books[b3].name.toLowerCase().indexOf(name3) === 0) { book3 = bible.books[b3]; break }
      }
    }
    if (book3) {
      var ch3 = book3.chapters[0]
      if (ch3) {
        for (var v3 = 0; v3 < ch3.length && out.length < max; v3++) {
          if (typeof ch3[v3] === "string") out.push(_formatRef(book3, 1, v3 + 1))
        }
      }
    }
    return out
  }

  return out
}

// Autocomplete over the whole bible. Reference-like queries ("john 3:16",
// "3:16") get reference suggestions; everything else delegates to the word
// prefix scanner over the prebuilt corpus (see buildCorpus), which the search
// worker supplies on every call.
function suggestWords(bible, prefix, maxResults, corpus) {
  var p = String(prefix || "").slice(0, 500).trim().toLowerCase()
  var max = typeof maxResults === "number" && maxResults > 0 ? maxResults : 8
  if (p === "" || !bible || !bible.books) return []
  // Reference-like queries (book name, book+chapter, chapter[:verse]) get
  // reference suggestions; fall back to word suggestions if none match.
  if (/^[a-z][a-z\s]*$/.test(p) || /^[a-z]+\s+\d+/.test(p) || /^\d+(\s*[:.]\s*\d*)?$/.test(p)) {
    var refs = suggestReferences(bible, p, max)
    if (refs.length > 0) return refs
  }
  return prefixMatches(corpus, p, max)
}

// Flatten an array of text strings into a distinct, lowercased word list in
// first-appearance order (min length 2). Non-string entries are skipped. This
// is the single tokenization used by the bible corpus (buildCorpus).
function buildWordCorpus(texts) {
  var out = []
  var seen = {}
  if (!texts) return out
  for (var i = 0; i < texts.length; i++) {
    var text = texts[i]
    if (typeof text !== "string") continue
    var words = text.toLowerCase().split(/[^a-z']+/)
    for (var w = 0; w < words.length; w++) {
      var word = words[w]
      if (word.length < 2 || seen[word]) continue
      seen[word] = true
      out.push(word)
    }
  }
  return out
}

// Flatten every verse in a bible into a distinct, lowercased word list in
// first-appearance order (min length 2). Built once per translation so the
// suggest path never re-flattens or re-lowercases the canon on each query.
// Built once per translation; the worker caches the result.
function buildCorpus(bible) {
  if (!bible || !bible.books) return []
  var texts = []
  forEachVerse(bible, function (book, chapter, verse, text) {
    if (typeof text === "string") texts.push(text)
  })
  return buildWordCorpus(texts)
}

// Prefix scan over a prebuilt corpus (distinct lowercased words in first-
// appearance order): return up to max words that start with prefix, sorted
// lexicographically. Shared by the bible suggest path (suggestWords).
function prefixMatches(corpus, prefix, maxResults) {
  var p = String(prefix || "").slice(0, 500).trim().toLowerCase()
  var max = typeof maxResults === "number" && maxResults > 0 ? maxResults : 8
  if (p === "" || !corpus) return []
  var out = []
  for (var i = 0; i < corpus.length && out.length < max; i++) {
    var word = corpus[i]
    if (word.indexOf(p) === 0) out.push(word)
  }
  out.sort()
  return out
}
