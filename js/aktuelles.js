/* =====================================================================
   aktuelles.js — rendert die Nachrichtenliste clientseitig aus
   data/aktuelles.json in #aktuelles-liste. Neueste zuerst.
   Einzige Datenquelle ist die JSON; Pflege ohne HTML-Kenntnis möglich.
   Jeder Beitrag ist ein eigenständiges <article> mit id=slug — so kann
   ein Beitrag später ohne Umbau auf eine Einzelseite /aktuelles/<slug>/
   umziehen. Kein Framework, keine externen Requests (nur eigene Datei).
   ===================================================================== */
(function () {
  "use strict";

  function beitrag(b) {
    var art = document.createElement("article");
    art.className = "beitrag";
    if (b.slug) art.id = b.slug;

    var datum = document.createElement("p");
    datum.className = "beitrag-datum";
    var t = document.createElement("time");
    if (b.datum) t.setAttribute("datetime", b.datum);
    t.textContent = b.datumAnzeige || b.datum || "";
    datum.appendChild(t);

    var titel = document.createElement("h2");
    titel.textContent = b.titel || "";

    var text = document.createElement("p");
    text.textContent = b.text || "";

    art.appendChild(titel);
    art.appendChild(datum);
    art.appendChild(text);

    // Quelle: fremde Seite -> Link (nicht hochladen), in neuem Tab
    if (b.quelleUrl && b.quelleLabel) {
      var q = document.createElement("p");
      q.className = "beitrag-quelle";
      var a = document.createElement("a");
      a.href = b.quelleUrl;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = b.quelleLabel;
      q.appendChild(a);
      art.appendChild(q);
    }
    return art;
  }

  function render() {
    var liste = document.getElementById("aktuelles-liste");
    if (!liste) return;
    fetch("/data/aktuelles.json")
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (beitraege) {
        // neueste zuerst (ISO-Datum sortiert chronologisch)
        beitraege.sort(function (a, b) { return (a.datum < b.datum) ? 1 : (a.datum > b.datum) ? -1 : 0; });
        var frag = document.createDocumentFragment();
        for (var i = 0; i < beitraege.length; i++) frag.appendChild(beitrag(beitraege[i]));
        liste.innerHTML = "";
        liste.appendChild(frag);
      })
      .catch(function () {
        // Fallback: statischer <noscript>-Hinweis bleibt bestehen (siehe HTML)
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
})();
