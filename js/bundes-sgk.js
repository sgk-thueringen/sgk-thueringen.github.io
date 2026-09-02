/* =====================================================================
   bundes-sgk.js — rendert bis zu drei Meldungen aus data/bundes-sgk.json
   in #bundes-sgk-liste (Startseite, Abschnitt "Aus dem Bundesverband").
   Die Datei wird täglich per GitHub-Actions-Workflow aus
   bundes-sgk.de/aktuell aktualisiert (scripts/fetch-bundes-sgk.py,
   .github/workflows/fetch-bundes-sgk.yml). Eigenständige Datenquelle,
   getrennt von data/aktuelles.json (eigene Meldungen der SGK
   Thüringen) — nicht vermischen. Kein Framework; der einzige Request
   vom Frontend aus ist der eigene, lokale fetch auf
   /data/bundes-sgk.json. Die Titel-Links selbst führen bewusst extern
   zum Original-Artikel (target="_blank" rel="noopener") — fremdes
   Dokument, wird verlinkt statt übernommen (siehe CLAUDE.md
   Abschnitt 2a).
   ===================================================================== */
(function () {
  "use strict";

  function beitrag(b) {
    var art = document.createElement("article");
    art.className = "beitrag";

    var titel = document.createElement("h3");
    var link = document.createElement("a");
    link.href = b.url;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = b.titel || "";
    titel.appendChild(link);

    var datum = document.createElement("p");
    datum.className = "beitrag-datum";
    var t = document.createElement("time");
    if (b.datum) t.setAttribute("datetime", b.datum);
    t.textContent = b.datumAnzeige || b.datum || "";
    datum.appendChild(t);

    var text = document.createElement("p");
    text.textContent = b.text || "";

    art.appendChild(titel);
    art.appendChild(datum);
    art.appendChild(text);
    return art;
  }

  function render() {
    var liste = document.getElementById("bundes-sgk-liste");
    if (!liste) return;
    var block = document.getElementById("startseite-bundes-sgk");
    fetch("/data/bundes-sgk.json")
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (beitraege) {
        if (!beitraege || beitraege.length === 0) {
          if (block) block.hidden = true;
          return;
        }
        var frag = document.createDocumentFragment();
        for (var i = 0; i < beitraege.length && i < 3; i++) frag.appendChild(beitrag(beitraege[i]));
        liste.innerHTML = "";
        liste.appendChild(frag);
      })
      .catch(function () {
        // Fallback: Skelett bleibt sichtbar (siehe HTML) — kein hartes Ausblenden bei
        // reinem Netzwerk-/Ladefehler, nur bei tatsächlich leerer Liste (siehe oben)
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
})();
