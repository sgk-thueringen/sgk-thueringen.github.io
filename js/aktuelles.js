/* =====================================================================
   aktuelles.js — rendert die Nachrichtenliste clientseitig aus
   data/aktuelles.json in #aktuelles-liste (/aktuelles/) UND den
   Kurz-Anriss der drei neuesten Beiträge in #home-aktuelles-liste
   (Startseite). Eine Quelle (data/aktuelles.json), zwei Ausgabeorte.
   Neueste zuerst. Einzige Datenquelle ist die JSON; Pflege ohne
   HTML-Kenntnis möglich. Jeder Beitrag ist ein eigenständiges <article>
   mit id=slug — so kann ein Beitrag später ohne Umbau auf eine
   Einzelseite /aktuelles/<slug>/ umziehen. Kein Framework, keine
   externen Requests (nur eigene Datei).
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

  function teaser(b) {
    var art = document.createElement("article");
    art.className = "beitrag";

    var titel = document.createElement("h3");
    var link = document.createElement("a");
    link.href = b.slug ? "/aktuelles/#" + b.slug : "/aktuelles/";
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

  function sortiertNeuesteZuerst(beitraege) {
    // neueste zuerst (ISO-Datum sortiert chronologisch)
    beitraege.sort(function (a, b) { return (a.datum < b.datum) ? 1 : (a.datum > b.datum) ? -1 : 0; });
    return beitraege;
  }

  function render() {
    var liste = document.getElementById("aktuelles-liste");
    if (!liste) return;
    fetch("/data/aktuelles.json")
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (beitraege) {
        var frag = document.createDocumentFragment();
        beitraege = sortiertNeuesteZuerst(beitraege);
        for (var i = 0; i < beitraege.length; i++) frag.appendChild(beitrag(beitraege[i]));
        liste.innerHTML = "";
        liste.appendChild(frag);
      })
      .catch(function () {
        // Fallback: statischer <noscript>-Hinweis bleibt bestehen (siehe HTML)
      });
  }

  function renderHome() {
    var block = document.getElementById("startseite-aktuelles");
    var liste = document.getElementById("home-aktuelles-liste");
    if (!block || !liste) return;
    fetch("/data/aktuelles.json")
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (beitraege) {
        var top = sortiertNeuesteZuerst(beitraege).slice(0, 3);
        if (top.length === 0) { block.hidden = true; return; }
        var frag = document.createDocumentFragment();
        for (var i = 0; i < top.length; i++) frag.appendChild(teaser(top[i]));
        liste.innerHTML = "";
        liste.appendChild(frag);
      })
      .catch(function () {
        // Fallback: Skelett bleibt sichtbar (siehe HTML); Nav verweist zusätzlich auf /aktuelles/
      });
  }

  function init() {
    render();
    renderHome();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
