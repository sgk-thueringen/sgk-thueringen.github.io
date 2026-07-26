# Website SGK Thüringen e.V.

Website der **Sozialdemokratischen Gemeinschaft für Kommunalpolitik im Freistaat Thüringen
e.V.** (SGK Thüringen). Stufe 1: öffentliche Seite, gehostet über **GitHub Pages**.

## Für Redakteurinnen und Redakteure

Wie du Texte, Beiträge, Vorstandsdaten und Bilder pflegst, steht in der
**[Redaktionsanleitung → REDAKTION.md](REDAKTION.md)**. Kein Technikwissen nötig.

## Technik (Kurzüberblick)

- **Reines statisches HTML/CSS/JS, kein Build-System, kein Framework, kein Page Builder.**
- Header und Footer liegen einmal in `partials/` und werden clientseitig per
  `js/include.js` eingefügt (`fetch` + `innerHTML`).
- Inhalte teils **datengetrieben**: `data/aktuelles.json` (Nachrichten),
  `data/vorstand.json` (Vorstand) — pflegbar ohne HTML-Kenntnis.
- **Keine externen Requests im Frontend**: Schriften, Skripte und Bilder liegen lokal;
  kein Tracking, kein Cookie-Banner.
- `.nojekyll` sorgt dafür, dass GitHub Pages die Dateien unverändert ausliefert.

## Lokal ansehen

Über einen statischen Server öffnen (nicht per Datei-Doppelklick — sonst laden die
Partials nicht):

```bash
git clone https://github.com/sgk-thueringen/sgk-thueringen.github.io.git
cd sgk-thueringen.github.io
python -m http.server 8080
```

Dann `http://localhost:8080/` aufrufen.

## Livegang

Solange die Seite in Vorbereitung ist, sperrt `robots.txt` die Indexierung durch
Suchmaschinen. Diese Sperre wird **erst zum echten Livegang** auf der finalen Domain
entfernt.
