#!/usr/bin/env python3
"""
fetch-bundes-sgk.py — holt die 3 neuesten Meldungen von
https://www.bundes-sgk.de/aktuell und schreibt sie nach
data/bundes-sgk.json (gleiche Grundstruktur wie data/aktuelles.json,
aber eigene Datei — kein Vermischen der beiden Quellen).

Läuft täglich per GitHub-Actions-Workflow
(.github/workflows/fetch-bundes-sgk.yml). Bei jedem Fehler (Netzwerk,
HTTP-Fehler, Seitenstruktur nicht gefunden, 0 auswertbare Einträge)
bricht das Skript mit Exit-Code 1 ab und schreibt NICHTS — die
bestehende data/bundes-sgk.json bleibt unangetastet. Der Workflow
committet ohnehin nur bei tatsächlicher Änderung.

HTML-Struktur der Quelle (Drupal, per curl geprüft am 01.09.2026,
nicht geraten):

  <div class="view-aktuelles ...">
    <div class="view-content">
      <div class="views-row ...">
        <article class="node node-artikel node-teaser ...">
          <header>
            <h2 class="node__title node-title">
              <a href="/artikel/...">Titel</a>
            </h2>
          </header>
          ...
          <div class="field field-name-field-date-article ...">
            <span class="date-display-single" property="dc:date"
                  datatype="xsd:dateTime"
                  content="2026-08-31T00:00:00+02:00">31.08.2026</span>
          </div>
          <div class="field field-name-body ...">
            <div class="field-item even" property="content:encoded">
              <p>Teaser-Text ...<a href="..." class="more-link">Weiterlesen</a></p>
            </div>
          </div>
        </article>
      </div>
      ...
    </div>
  </div>

Die Reihenfolge auf der Quellseite ist zum Zeitpunkt der Prüfung
chronologisch absteigend, wird hier aber trotzdem nicht blind
übernommen, sondern anhand des geparsten Datums selbst sortiert
(robuster gegen künftige "sticky"-Umsortierungen auf der Quellseite).
"""

import json
import re
import sys
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

URL = "https://www.bundes-sgk.de/aktuell"
OUT_PATH = Path(__file__).resolve().parent.parent / "data" / "bundes-sgk.json"
TIMEOUT = 20
MAX_EINTRAEGE = 3
TEASER_MAXLEN = 200

MONATE = [
    "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember",
]


def datum_anzeige(iso_datum):
    """'2026-08-31' -> '31. August 2026' (gleiches Format wie aktuelles.json)."""
    jahr, monat, tag = iso_datum.split("-")
    return "{0}. {1} {2}".format(int(tag), MONATE[int(monat) - 1], jahr)


def kuerze_teaser(text, maxlen=TEASER_MAXLEN):
    """Kürzt an einer Wortgrenze auf ca. maxlen Zeichen, mit „…“ falls gekürzt.
    Kein Volltext — nur ein Anriss, der Rest bleibt auf der Original-Seite."""
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= maxlen:
        return text
    gekuerzt = text[:maxlen]
    letztes_leerzeichen = gekuerzt.rfind(" ")
    if letztes_leerzeichen > 0:
        gekuerzt = gekuerzt[:letztes_leerzeichen]
    return gekuerzt.rstrip(".,;:—-") + "…"


def hole_eintraege():
    resp = requests.get(
        URL,
        timeout=TIMEOUT,
        headers={"User-Agent": "Mozilla/5.0 (compatible; SGK-Thueringen-Feed/1.0; +https://sgkthueringen.de)"},
    )
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    artikel = soup.select(".view-aktuelles article.node-teaser")
    if not artikel:
        raise RuntimeError(
            "Keine Artikel in .view-aktuelles gefunden — Seitenstruktur hat sich vermutlich geändert."
        )

    eintraege = []
    for art in artikel:
        titel_link = art.select_one("h2.node-title a")
        if not titel_link or not titel_link.get("href"):
            continue
        titel = titel_link.get_text(strip=True)
        url = urljoin(URL, titel_link["href"])

        datum_span = art.select_one(".field-name-field-date-article .date-display-single")
        if not datum_span or not datum_span.get("content"):
            continue
        # "2026-08-31T00:00:00+02:00" -> "2026-08-31"
        iso_datum = datum_span["content"][:10]

        # Ganzes field-item nehmen, nicht nur den ersten <p> darin: manche Artikel
        # gliedern den Teaser auf mehrere Absätze auf (z. B. Titel-Wiederholung +
        # eigentlicher Text + knapper Schlusssatz vor "Weiterlesen") — der jeweils
        # relevante Inhalt liegt nicht zuverlässig im ersten <p>. Bei curl-Prüfung
        # am 01.09.2026 an zwei von drei Artikeln beobachtet, siehe Kommentar oben.
        field_item = art.select_one(".field-name-body .field-item")
        if not field_item:
            continue
        # "Weiterlesen"-Link vor der Textextraktion entfernen, sonst landet er im Teaser
        mehr_link = field_item.select_one("a.more-link")
        if mehr_link:
            mehr_link.extract()
        text = kuerze_teaser(field_item.get_text(separator=" ", strip=True))

        if not (titel and url and iso_datum and text):
            continue

        eintraege.append({
            "titel": titel,
            "url": url,
            "datum": iso_datum,
            "datumAnzeige": datum_anzeige(iso_datum),
            "text": text,
        })

    if not eintraege:
        raise RuntimeError("Artikel-Elemente gefunden, aber keiner davon vollständig auswertbar.")

    eintraege.sort(key=lambda e: e["datum"], reverse=True)
    return eintraege[:MAX_EINTRAEGE]


def main():
    try:
        eintraege = hole_eintraege()
    except Exception as exc:  # noqa: BLE001 — bewusst breit: jeder Fehler -> kein Schreibvorgang
        print("Fehler beim Abruf/Parsen von {0}: {1}".format(URL, exc), file=sys.stderr)
        sys.exit(1)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUT_PATH.open("w", encoding="utf-8", newline="\n") as f:
        json.dump(eintraege, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print("{0} Einträge geschrieben nach {1}".format(len(eintraege), OUT_PATH))


if __name__ == "__main__":
    main()
