// SearchWorker.js — runs Bible word search off the UI thread.
// The bible object (and its suggestion corpus) is cached in this worker's
// global scope after the first message that carries it, so subsequent searches
// only send the query.

// WorkerScripts run in a separate JS context and cannot use QML `import` or
// the `.import` directive. Qt.include() is the one mechanism that copies
// another script's top-level functions into this script's namespace, so the
// canonical search/suggest implementations come from search.js (shared with
// ReaderModel and the node tests) instead of being duplicated here.
Qt.include("search.js")

var bible = null
var translation = ""
var corpus = null

WorkerScript.onMessage = function(msg) {
  try {
    if (msg.bible) {
      bible = msg.bible
      translation = msg.translation || ""
      corpus = buildCorpus(bible)
    }
    // Clamp the query for the search/suggest calls so a huge pasted query can't
    // fan out into unbounded work. The unclamped msg.query is echoed back so the
    // panel's stale-response guard (msg.query !== root.query) still matches.
    var q = String(msg.query || "").slice(0, 500)
    var results = searchVerses(bible, q, msg.maxResults)
    var suggestions = suggestWords(bible, q, 8, corpus)
    WorkerScript.sendMessage({
      results: results,
      query: msg.query,
      translation: translation,
      suggestions: suggestions
    })
  } catch (e) {
    // Always reply so the panel's bibleOutstanding decrement (which expects
    // exactly one reply per dispatch) can never wedge.
    WorkerScript.sendMessage({
      results: [],
      suggestions: [],
      query: msg.query,
      translation: translation
    })
  }
}
