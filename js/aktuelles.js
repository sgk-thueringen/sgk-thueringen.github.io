/* =====================================================================
   aktuelles.js — rendert clientseitig aus data/aktuelles.json:
   die Nachrichtenliste in #aktuelles-liste (/aktuelles/), den
   Kurz-Anriss der drei neuesten Beiträge in #home-aktuelles-liste
   (Startseite) und den Termin-Banner in #home-termin-banner
   (Startseite, direkt nach dem Hero — der zeitlich nächste anstehende
   Termin, falls einer existiert). Eine Quelle (data/aktuelles.json),
   drei Ausgabeorte. Einzige Datenquelle ist die JSON; Pflege ohne
   HTML-Kenntnis möglich. Jeder Beitrag ist ein eigenständiges <article>
   mit id=slug — so kann ein Beitrag später ohne Umbau auf eine
   Einzelseite /aktuelles/<slug>/ umziehen; der Termin-Banner verlinkt
   darüber auch dorthin (siehe renderTerminBanner()). Kein Framework,
   keine externen Requests (nur eigene Datei).
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

  // Ersten Satz aus dem Volltext schneiden (bis zum ersten ". ", sonst der
  // ganze Text) — der Banner ist ein Hinweis, kein Artikel, daher keine
  // Kürzung mit "…" mitten im Satz.
  function ersterSatz(text) {
    if (!text) return "";
    var i = text.indexOf(". ");
    return i === -1 ? text : text.slice(0, i + 1);
  }

  // Termin-Banner (Startseite, direkt nach dem Hero): zeigt den zeitlich
  // nächsten anstehenden Termin (datum > heute, ISO-String-Vergleich reicht
  // bei Format JJJJ-MM-TT). Existiert keiner, bleibt der Block ausgeblendet —
  // #home-termin-banner startet sichtbar mit Skelett (siehe HTML) und wird
  // hier bei Bedarf per hidden=true wieder versteckt, analog zu renderHome()
  // oben und render() in bundes-sgk.js.
  function renderTerminBanner() {
    var banner = document.getElementById("home-termin-banner");
    var inhalt = document.getElementById("home-termin-inhalt");
    if (!banner || !inhalt) return;
    fetch("/data/aktuelles.json")
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (beitraege) {
        var heute = new Date().toISOString().slice(0, 10);
        var kommende = beitraege.filter(function (b) { return b.datum && b.datum > heute; });
        // aufsteigend sortiert — der zeitlich nächste zuerst (Gegenrichtung zu
        // sortiertNeuesteZuerst() oben, die für Rückblick-Listen neueste zuerst will)
        kommende.sort(function (a, b) { return (a.datum < b.datum) ? -1 : (a.datum > b.datum) ? 1 : 0; });
        if (kommende.length === 0) { banner.hidden = true; return; }
        var termin = kommende[0];

        var datum = document.createElement("p");
        datum.className = "termin-banner__datum";
        var t = document.createElement("time");
        if (termin.datum) t.setAttribute("datetime", termin.datum);
        t.textContent = termin.datumAnzeige || termin.datum || "";
        datum.appendChild(t);

        var titel = document.createElement("h2");
        titel.className = "termin-banner__titel";
        titel.textContent = termin.titel || "";

        // Wann/Wo optisch abgesetzt direkt unter dem Titel — siehe REDAKTION.md
        // Abschnitt 2 ("Was/Wann/Wo auf den ersten Blick erkennbar"). Nur
        // rendern, wenn BEIDE Felder vorhanden sind; fehlt eins, einfach
        // weglassen statt eine unvollständige Zeile ("· Leonardo Hotel Weimar")
        // zu zeigen. "Was" (Titel) steht bereits als eigene h2 direkt darüber.
        var wannWo = null;
        if (termin.wannAnzeige && termin.ort) {
          wannWo = document.createElement("p");
          wannWo.className = "termin-banner__wannwo";
          wannWo.textContent = termin.wannAnzeige + " · " + termin.ort;
        }

        var text = document.createElement("p");
        text.className = "termin-banner__text";
        text.textContent = ersterSatz(termin.text);

        var aktionen = document.createElement("p");
        aktionen.className = "termin-banner__aktionen";
        // quelleUrl/quelleLabel wie bei beitrag() oben fremdes Ziel, eigener Tab —
        // Label hier aber bewusst fest "Jetzt anmelden" statt quelleLabel: der
        // Banner ist eine Einladung, quelleLabel ist für /aktuelles/ generischer
        // formuliert (z. B. "Erklärung im Wortlaut bei der Bundes-SGK").
        if (termin.quelleUrl) {
          var anmelden = document.createElement("a");
          anmelden.className = "btn btn--invers";
          anmelden.href = termin.quelleUrl;
          anmelden.target = "_blank";
          anmelden.rel = "noopener";
          anmelden.textContent = "Jetzt anmelden";
          aktionen.appendChild(anmelden);
        }
        // Verweis auf den vollen Beitrag: id=slug wird von beitrag() oben
        // gesetzt (render(), /aktuelles/) — hier wiederverwendet, nicht neu erfunden.
        if (termin.slug) {
          var mehr = document.createElement("a");
          mehr.className = "termin-banner__mehr";
          mehr.href = "/aktuelles/#" + termin.slug;
          mehr.textContent = "Mehr erfahren";
          aktionen.appendChild(mehr);
        }

        inhalt.innerHTML = "";
        inhalt.appendChild(datum);
        inhalt.appendChild(titel);
        if (wannWo) inhalt.appendChild(wannWo);
        inhalt.appendChild(text);
        inhalt.appendChild(aktionen);
      })
      .catch(function () {
        // Fallback: Skelett bleibt sichtbar (siehe HTML) — wie bei renderHome() oben
      });
  }

  function init() {
    render();
    renderHome();
    renderTerminBanner();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
