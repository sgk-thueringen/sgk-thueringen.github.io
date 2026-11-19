#!/usr/bin/env python3
"""JET-Förderpreis 2026: Preisträger veröffentlichen.

Wird von .github/workflows/jet-preistraeger-publish.yml aufgerufen. Das Skript
ändert nur Dateien im Checkout (data/jet.json, data/fokus.json,
data/aktuelles.json); Commit und Push macht der Workflow.

Ablauf / Schutzmechanismen:
  1. Idempotenz: Ist data/jet.json -> "preistraeger" bereits gefüllt, passiert
     nichts (Exit 0).
  2. Datumssperre: Beim Cron-Lauf (schedule) wird erst ab dem Tag "verleihung"
     (data/jet.json, Zeitzone Europe/Berlin) veröffentlicht.
  3. Platzierung: kommt aus dem Repo-Secret JET_PLATZIERUNG (JSON
     {"Name": Platz}, Namen wie in jet-preistraeger.json) oder, wenn das Secret
     leer ist, aus den "platz"-Feldern in .github/scripts/jet-preistraeger.json.
     Verlangt: je einmal 1, 2, 3 und zweimal 4. Fehlt das, endet der Lauf mit
     Fehler (Exit 1, sichtbar/Benachrichtigung) und schreibt nichts.
     Platzierungen werden nie erfunden.
  4. Es wird erst geschrieben, wenn alle drei Dateien im Speicher fertig und
     konsistent sind.

DRY_RUN=1: Trockenlauf für den Test. Datumssperre aus, Platzierung nur zur
Darstellung als 1, 2, 3, 4, 4 in Dateireihenfolge angenommen (nie committen).
"""
import datetime
import json
import os
import sys
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[2]
DATEN = ROOT / ".github" / "scripts" / "jet-preistraeger.json"
JET = ROOT / "data" / "jet.json"
FOKUS = ROOT / "data" / "fokus.json"
AKTUELL = ROOT / "data" / "aktuelles.json"

TEASER_SLUG = "jet-jugendpreis-bewerbungen"
MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli",
          "August", "September", "Oktober", "November", "Dezember"]
PREISGELD = {1: "1.500", 2: "1.000", 3: "500"}


def laden(pfad):
    return json.loads(pfad.read_text(encoding="utf-8"))


def schreiben(pfad, obj):
    pfad.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8", newline="\n")


def fehler(msg):
    print("::error::" + msg)
    sys.exit(1)


def eroeffnung(platz, organisation):
    if platz in PREISGELD:
        return ("Herzlichen Glückwunsch %s – %d. Platz beim JET-Förderpreis 2026 "
                "und %s Euro Preisgeld!" % (organisation, platz, PREISGELD[platz]))
    return ("Herzlichen Glückwunsch %s – auch ohne Platz auf dem Treppchen hat die "
            "Bewerbung beim JET-Förderpreis 2026 die Jury überzeugt!" % organisation)


def datum_lang(iso):
    return "%d. %s %s" % (int(iso[8:10]), MONATE[int(iso[5:7]) - 1], iso[:4])


def main():
    dry = os.environ.get("DRY_RUN") == "1"
    ereignis = os.environ.get("GITHUB_EVENT_NAME", "")

    jet = laden(JET)
    if jet.get("preistraeger"):
        print("data/jet.json enthält bereits Preisträger – nichts zu tun.")
        return 0

    verleihung = jet.get("verleihung")
    if not isinstance(verleihung, str) or len(verleihung) != 10:
        fehler("data/jet.json: Feld \"verleihung\" fehlt oder ist kein ISO-Datum.")

    if ereignis == "schedule" and not dry:
        heute = datetime.datetime.now(ZoneInfo("Europe/Berlin")).date().isoformat()
        if heute < verleihung:
            print("Heute (%s) liegt vor der Verleihung (%s) – nichts zu tun." % (heute, verleihung))
            return 0

    eintraege = laden(DATEN)["eintraege"]
    if len(eintraege) != 5:
        fehler("jet-preistraeger.json: erwartet 5 Einträge, gefunden %d." % len(eintraege))

    # Platzierung aus dem Secret JET_PLATZIERUNG (JSON: {"Name": Platz, ...}).
    # Der Wert ist verschlüsselt hinterlegt, damit die Platzierung vor der
    # Verleihung nicht im öffentlichen Repo steht. Werte werden nie ausgegeben.
    # Ist das Secret leer, gelten die "platz"-Felder der Daten-Datei.
    geheim = os.environ.get("JET_PLATZIERUNG", "").strip()
    zuordnung = None
    if geheim:
        try:
            zuordnung = json.loads(geheim)
        except ValueError:
            fehler("Secret JET_PLATZIERUNG ist kein gültiges JSON (Wert wird nicht ausgegeben).")
        namen = [e["name"] for e in eintraege]
        if not isinstance(zuordnung, dict) or sorted(zuordnung) != sorted(namen):
            fehler("Secret JET_PLATZIERUNG: Namen passen nicht zu den fünf Einträgen in "
                   "jet-preistraeger.json (erwartet: %s)." % "; ".join(namen))
        if sorted(zuordnung.values()) != [1, 2, 3, 4, 4]:
            fehler("Secret JET_PLATZIERUNG: erwartet je einmal 1, 2, 3 und zweimal 4.")
        print("Secret JET_PLATZIERUNG gelesen und gültig.")

    if dry:
        # Die echte Platzierung wird im Trockenlauf bewusst nicht verwendet, denn
        # das Log ist öffentlich sichtbar.
        for e, p in zip(eintraege, [1, 2, 3, 4, 4]):
            e["platz"] = p
        print("TROCKENLAUF: Platzierungen nur zur Darstellung angenommen (1,2,3,4,4).")
    elif zuordnung is not None:
        for e in eintraege:
            e["platz"] = zuordnung[e["name"]]

    plaetze = [e.get("platz") for e in eintraege]
    if any(p is None for p in plaetze):
        fehler("Platzierung fehlt: In .github/scripts/jet-preistraeger.json ist bei "
               "mindestens einem Eintrag \"platz\" nicht gesetzt. Nichts veröffentlicht.")
    if sorted(plaetze) != [1, 2, 3, 4, 4]:
        fehler("Platzierung ungültig: erwartet je einmal 1, 2, 3 und zweimal 4, "
               "gefunden %s." % sorted(plaetze))

    # --- alles im Speicher vorbereiten, erst danach schreiben ---------------
    liste = []
    for e in sorted(eintraege, key=lambda x: x["platz"]):
        absaetze = [eroeffnung(e["platz"], e["organisation"]) + " " + e["absaetze"][0]]
        absaetze += e["absaetze"][1:]
        liste.append({"platz": e["platz"], "name": e["name"], "ort": e["ort"],
                      "text": "\n\n".join(absaetze)})
    jet["preistraeger"] = liste

    fokus = laden(FOKUS)
    for feld in ("titel", "text", "link", "buttonText"):
        if feld not in fokus:
            fehler("data/fokus.json: Feld \"%s\" fehlt." % feld)
    fokus["titel"] = "JET-Förderpreis 2026: Die Preisträger stehen fest"
    fokus["text"] = "Die Jury hat entschieden. Die ersten drei Plätze:"
    fokus["link"] = "/jet-foerderpreis/"
    fokus["buttonText"] = "Zu den Preisträgern"
    # Top 3 für die Kachel (js/fokus.js): nur Platz 1–3, gleiche Platzierung wie oben.
    fokus["preistraeger"] = [{"platz": x["platz"], "name": x["name"], "ort": x["ort"]}
                             for x in liste if x["platz"] <= 3]
    # wannAnzeige, ort, bild und bildHinweis bleiben unverändert.

    aktuell = laden(AKTUELL)
    treffer = [b for b in aktuell if b.get("slug") == TEASER_SLUG]
    if len(treffer) != 1:
        fehler("data/aktuelles.json: Teaser mit slug \"%s\" nicht eindeutig gefunden." % TEASER_SLUG)
    t = treffer[0]
    t["datum"] = verleihung
    t["datumAnzeige"] = datum_lang(verleihung)
    t["titel"] = "JET-Förderpreis 2026: Die Preisträger stehen fest"
    t["text"] = "Die Preisträger des JET-Förderpreises 2026 stehen fest – alle Platzierungen im Überblick."
    t["quelleLabel"] = "Zu den Preisträgern"
    t["quelleUrl"] = "/jet-foerderpreis/"

    schreiben(JET, jet)
    schreiben(FOKUS, fokus)
    schreiben(AKTUELL, aktuell)
    print("Preisträger eingetragen: " + ", ".join(
        "%d. %s" % (x["platz"], x["name"]) for x in liste))
    return 0


if __name__ == "__main__":
    sys.exit(main())
