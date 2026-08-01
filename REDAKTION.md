# Redaktionsanleitung — Website SGK Thüringen

Diese Anleitung ist für dich, wenn du **ohne Technikhintergrund** Texte, Beiträge oder
Vorstandsdaten pflegst. Du brauchst nur einen Browser und ein GitHub-Konto mit Zugang zum
Repository. Nimm dir Zeit, arbeite in kleinen Schritten — **alles ist wiederherstellbar.**

---

## 1. Text ändern (GitHub-Web-Editor)

1. Öffne das Repository auf **github.com** (Ordner `sgk-thueringen.github.io`).
2. **Datei finden:** Klick dich durch die Ordner. Faustregel: Jede Seite liegt in einem
   Ordner mit einer Datei `index.html`. Beispiel: die Kontaktseite → Ordner `kontakt/` →
   `index.html`.
3. **Stift öffnen:** Oben rechts über der Datei auf das **Bleistift-Symbol** („Edit this
   file") klicken.
4. **Ändern:** Ändere nur den **sichtbaren Text** zwischen den spitzen Klammern.
   Beispiel — aus
   `<p>Alter Text.</p>` machst du `<p>Neuer Text.</p>`.
   Die Teile in `< >` (Tags) bleiben stehen.
5. **Commit-Feld ausfüllen:** Unten kurz beschreiben, was du geändert hast, z. B.
   „Kontakt: Öffnungszeiten aktualisiert". Option „Commit directly to the main branch".
6. **Speichern:** Auf **„Commit changes"** klicken.
7. **Ergebnis prüfen:** Nach 1–2 Minuten ist die Änderung live. Öffne die Seite und drücke
   **Strg + Shift + R** (siehe Abschnitt 6), damit du die neue Fassung siehst.

---

## 2. Einen Beitrag zu „Aktuelles" ergänzen

Die Beiträge stehen in **`data/aktuelles.json`**. Öffne die Datei mit dem Stift.
Füge einen neuen Block **oben** in die Liste ein (neueste zuerst). Kopiere diesen Block und
passe ihn an — **das Komma nach der schließenden `}` nicht vergessen**, wenn danach noch
ein Beitrag folgt:

```json
[
  {
    "slug": "kurzer-name-ohne-umlaute",
    "datum": "2026-08-15",
    "datumAnzeige": "15. August 2026",
    "titel": "Überschrift des Beitrags",
    "text": "Zwei bis vier Sätze Anriss. Was ist passiert und warum ist es wichtig.",
    "quelleLabel": "Mehr dazu bei der Bundes-SGK",
    "quelleUrl": "https://www.bundes-sgk.de/…"
  },
  {
    "…hier stehen die bisherigen Beiträge…": ""
  }
]
```

- `datum` immer im Format **JJJJ-MM-TT** (dafür sortiert die Seite richtig).
- Wenn es **keine Quelle** gibt, lass die beiden Zeilen `quelleLabel` und `quelleUrl` einfach
  weg (dann endet der Block nach der `text`-Zeile — **ohne** Komma nach `"…"`).
- **Diese eine Datei pflegt zwei Stellen:** Die drei neuesten Einträge erscheinen automatisch
  auch als kurzer Anriss auf der **Startseite** — dort wird **nichts** zusätzlich gepflegt.
  Ist die Liste leer, blendet die Startseite den Aktuelles-Block einfach aus.

## 3. Vorstandsdaten pflegen

Die Vorstandsliste steht in **`data/vorstand.json`**. Ein Eintrag sieht so aus:

```json
{
  "vorname": "Alexandra",
  "nachname": "Rieger",
  "funktion": "Stellvertretende Vorsitzende",
  "ort": "Nordhausen",
  "bild": "/assets/vorstand/rieger.svg",
  "text": ""
}
```

- **`ort`** nur eintragen, wenn er stimmt — sonst leer lassen (`""`).
- **`bild`** zeigt auf die Bilddatei (siehe Abschnitt 4). Solange kein Foto da ist, bleibt
  das Platzhalter-Bild stehen.
- Reihenfolge der Einträge = Reihenfolge auf der Seite.

---

## 4. Ein Porträtfoto beisteuern

**Wichtig: Du lädst kein fertiges Porträt hoch und schneidest nichts selbst zu.**
Porträts liegen als **`.webp`** in `assets/vorstand/` — quadratisch zugeschnitten
(Gesicht mittig), 800×800 px, unter 100 KB. Diese Umwandlung braucht Bildbearbeitung,
die im normalen Redaktionsalltag ohne Werkzeug nicht zuverlässig geht.

1. **Original an André übergeben** (z. B. per Mail oder Messenger) — möglichst
   scharf, gut belichtet, Gesicht nicht am Bildrand.
2. André (bzw. die technische Umsetzung) schneidet zu, wandelt nach `.webp` um und
   legt die Datei unter `assets/vorstand/nachname.webp` ab — Dateiname klein, ohne
   Umlaute (ae/oe/ue), ohne Leerzeichen.
3. Danach im JSON (Abschnitt 3) den `bild`-Pfad auf `/assets/vorstand/nachname.webp`
   setzen.
4. **Bildrechte müssen vorher geklärt sein** (Fotograf **und** abgebildete Person),
   bevor das Foto überhaupt weitergegeben wird.

Für **andere Bilder** (nicht Porträts, z. B. auf Unterseiten) gilt weiterhin: Zielordner
`assets/`, Dateiname klein/ohne Umlaute/ohne Leerzeichen, Format je nach Bildart (Fotos als
JPG, Kante max. ~1000 px, unter 300 KB). Hochladen im Zielordner oben über
**„Add file → Upload files"**, dann „Commit changes".

---

## 5. Die drei häufigsten Fehler

1. **Spitze Klammern gelöscht.** Wenn ein `<` oder `>` verschwindet, „zerfällt" die Seite.
   Ändere nur den Text **zwischen** den Klammern, nie die Klammern selbst.
2. **Anführungszeichen im JSON.** In `.json`-Dateien müssen es **gerade** Anführungszeichen
   sein (`"`), keine typografischen (`„ "`). Und: **Komma** zwischen zwei Einträgen, **kein**
   Komma hinter dem letzten. Fehlt eins oder ist eins zu viel, lädt die Liste nicht.
3. **Umlaute/Leerzeichen im Dateinamen.** `Grüße.png` oder `mein foto.jpg` funktionieren
   nicht zuverlässig. Immer `gruesse.png`, `mein-foto.jpg`.

---

## 6. Inhaltsregeln (kurz)

- **Keine** Geburtsdaten, Privatadressen oder privaten E-Mail-Adressen — auch nicht von
  Vorstandsmitgliedern. Öffentlich sind nur **Name, Funktion, Ort**.
- **Namen exakt** in Registerschreibweise: **Giesder** (nicht Giester), **Marko Wolfram**
  (nicht Marco), **Püchler**, **Grenzdörffer**.
- **Bildrechte** müssen geklärt sein (Fotograf **und** abgebildete Personen), bevor ein Bild
  online geht.
- **Keine Beitragszahlen** veröffentlichen, ohne dass der **Schatzmeister** sie bestätigt hat.
- **Nichts erfinden.** Wenn eine Angabe fehlt oder unsicher ist: **nicht** raten, sondern
  einen sichtbaren Hinweis („TODO: …") setzen und André fragen.

---

## 7. Browser-Cache

Nach einer Änderung zeigt dein Browser oft noch die **alte** Fassung. Lade die Seite mit
**Strg + Shift + R** neu (hartes Neuladen) — dann siehst du den aktuellen Stand.

---

**Wenn etwas kaputt aussieht — nichts weiter anfassen, André Bescheid sagen. Alles ist
wiederherstellbar.**
