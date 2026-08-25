# Data sources and attribution

This plugin bundles public-domain / freely-licensed Bible translations.
Everything is resolved locally — no network request is made at runtime.

## Douay-Rheims Bible (Challoner revision)

- Source: [scrollmapper/bible_databases](https://github.com/scrollmapper/bible_databases),
  `formats/json/DRC.json`.
- The Douay-Rheims Bible (Challoner revision) is in the public domain.
- The bundled `data/dr.json` contains the 73 books of the Catholic canon. The
  five apocryphal appendices present in the source (`Prayer of Manasses`,
  `1 Esdras`, `2 Esdras`, `Additional Psalm`, `Laodiceans`) are omitted so the
  index matches the Catholic canon.
- Psalm numbers follow the Douay-Rheims (Vulgate) numbering, which differs by
  one from the modern Hebrew numbering for many psalms (e.g. "The Lord is my
  shepherd" is Psalm 22 in the Douay-Rheims).
- The committed `data/dr.json` is the canonical bundled copy; regenerating it
  requires re-adding the source data.

## Berean Standard Bible

- The Holy Bible, Berean Standard Bible (BSB) is produced in cooperation with
  Bible Hub, Discovery Bible, OpenBible.com, and the Berean Bible Translation
  Committee.
- The BSB text was dedicated to the public domain (CC0 1.0) on 30 April 2023.
  See https://berean.bible/terms.htm
- The bundled `data/bsb.json` was converted from a public BSB verse dump
  (scrollmapper/bible_databases `formats/json/BSB.json`) for offline use.

## King James Version

- Source: [scrollmapper/bible_databases](https://github.com/scrollmapper/bible_databases),
  `formats/json/KJV.json`.
- The King James Version is in the public domain.

## Catholic Public Domain Version

- Source: [scrollmapper/bible_databases](https://github.com/scrollmapper/bible_databases),
  `formats/json/CPDV.json`.
- The Catholic Public Domain Version (CPDV) is a public-domain translation of
  the Vulgate. The five apocryphal appendices present in the source are omitted
  so the index matches the Catholic canon.

## World English Bible

- Source: [tehshrike/bible-json](https://github.com/tehshrike/bible-json).
- The World English Bible (WEB) is in the public domain.
