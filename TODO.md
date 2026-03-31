# TODO — Publish as Standalone GitHub Project

## P0 — Critical

### Build-Pipeline + korrekte Exports
- [ ] Build-Script einrichten (z.B. `tsup`, `tsc`, `rollup`)
- [ ] `tsconfig.json`: `noEmit` entfernen, `declaration: true`, `outDir: "./dist"` setzen
- [ ] `package.json` Entry Points anpassen:
  - `"main": "./dist/index.cjs"` (CommonJS)
  - `"module": "./dist/index.mjs"` (ESM)
  - `"types": "./dist/index.d.ts"`
  - `"exports"` Feld für modernen Resolution
- [ ] `"scripts"` um `"build"` und `"prepublishOnly": "npm run build"` ergänzen

## P1 — Wichtig

### `package.json` Metadaten ergänzen
- [ ] `"repository"` — GitHub-URL
- [ ] `"homepage"` — GitHub-URL oder Docs-Seite
- [ ] `"bugs"` — GitHub Issues URL
- [ ] `"author"` — `"Norbert Huffschmid <depinus@gmx.de>"`
- [ ] `"keywords"` — z.B. `["midi", "musicxml", "converter", "music", "notation", "sheet-music"]`
- [ ] `"engines"` — z.B. `{ "node": ">=18" }`

### `files` Feld oder `.npmignore` erstellen
- [ ] `"files": ["dist", "LICENSE", "README.md"]` in `package.json` hinzufügen
- [ ] Damit werden `__tests__/`, `debug/`, `example/`, `.github/`, `analysis/`, `ARCHITECTURE.md` nicht mit-publiziert

### Doppelte Versionspflege eliminieren
- [ ] `VERSION.ts` entfernen oder im Build-Step automatisch aus `package.json` generieren
- [ ] Single Source of Truth: Version nur in `package.json`

## P2 — Wünschenswert

### README bereinigen
- [ ] „Project Structure" korrigieren: `render/` existiert nicht, entfernen
- [ ] „Known Bugs / Limitations": DEPINUS-Referenz entfernen/abschwächen für eigenständiges Projekt
- [ ] Badges hinzufügen (CI-Status, npm-Version, Lizenz)
- [ ] `CONTRIBUTING.md` erstellen oder Link darauf in README

### CHANGELOG-Format standardisieren
- [ ] [Keep a Changelog](https://keepachangelog.com/)-Format übernehmen
- [ ] Kategorien verwenden: `Added`, `Changed`, `Fixed`, `Removed`

### Leeren `validators/` Ordner entfernen
- [ ] `validators/index.ts` enthält nur auskommentierte Zeilen — entweder implementieren oder entfernen

### CI erweitern
- [ ] `tsc --noEmit` (Type-Check) als separaten Step in `ci.yml` hinzufügen

### `example/node_modules/` prüfen
- [ ] Sicherstellen, dass `example/node_modules/` in `.gitignore` steht und nicht eingecheckt ist

### Namenskonventionen vereinheitlichen
- [ ] Britisches Englisch (`analyseKey.ts`, `analyseTuplets.ts`) vs. Amerikanisches (`analyzeBeats.ts`, `analyzeComposer.ts`) — einheitlich auf eine Schreibweise umstellen
