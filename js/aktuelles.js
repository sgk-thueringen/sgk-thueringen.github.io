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

    var titel = document.createElement("h2");
    titel.textContent = b.titel || "";

    // Wann/Wo — dieselben Felder wie im Termin-Banner (renderTerminBanner()),
    // aber dezenter Stil statt Banner-Optik (siehe .beitrag-wannwo, CSS).
    // wannWoText() liefert null, wenn eins der beiden Felder fehlt (z. B. bei
    // den Bundes-SGK-Meldungen) — dann einfach keine Zeile, kein Platzhalter.
    // Enthält wannWoText() bereits das Datum (wannAnzeige), entfällt die
    // separate .beitrag-datum-Zeile, damit das Datum nicht doppelt erscheint
    // (einmal kurz, einmal als Teil von Wann/Wo) — nur eine der beiden Zeilen
    // wird je Beitrag gerendert.
    var wannwoText = wannWoText(b);
    var datum = null;
    var wannwo = null;
    if (wannwoText) {
      wannwo = document.createElement("p");
      wannwo.className = "beitrag-wannwo";
      wannwo.textContent = wannwoText;
    } else {
      datum = document.createElement("p");
      datum.className = "beitrag-datum";
      var t = document.createElement("time");
      if (b.datum) t.setAttribute("datetime", b.datum);
      t.textContent = b.datumAnzeige || b.datum || "";
      datum.appendChild(t);
    }

    var text = document.createElement("p");
    text.textContent = b.text || "";

    art.appendChild(titel);
    if (datum) art.appendChild(datum);
    if (wannwo) art.appendChild(wannwo);
    art.appendChild(text);

    // Quelle: fremde Seite -> Link (nicht hochladen), in neuem Tab
    if (b.quelleUrl && b.quelleLabel) {
      var q = document.createElement("p");
      q.className = "beitrag-quelle";
      var a = document.createElement("a");
      a.href = b.quelleUrl;
      if (b.quelleUrl.charAt(0) !== "/") {   // interne Ziele im selben Tab
        a.target = "_blank";
        a.rel = "noopener";
      }
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

    // Wann/Wo wie in beitrag() oben — hier kompakter (siehe CSS-Scoping unter
    // #startseite-aktuelles), passend zur bestehenden Teaser-Kürze. Enthält
    // wannWoText() bereits das Datum, entfällt die separate .beitrag-datum-
    // Zeile (siehe beitrag() oben) — auch hier nur eine Datumszeile pro Beitrag.
    var wannwoText = wannWoText(b);
    var datum = null;
    var wannwo = null;
    if (wannwoText) {
      wannwo = document.createElement("p");
      wannwo.className = "beitrag-wannwo";
      wannwo.textContent = wannwoText;
    } else {
      datum = document.createElement("p");
      datum.className = "beitrag-datum";
      var t = document.createElement("time");
      if (b.datum) t.setAttribute("datetime", b.datum);
      t.textContent = b.datumAnzeige || b.datum || "";
      datum.appendChild(t);
    }

    var text = document.createElement("p");
    text.textContent = b.text || "";

    art.appendChild(titel);
    if (datum) art.appendChild(datum);
    if (wannwo) art.appendChild(wannwo);
    art.appendChild(text);
    return art;
  }

  // Wann/Wo als ein zusammengesetzter Text — von beitrag(), teaser() und
  // renderTerminBanner() gemeinsam genutzt, damit die Regel "nur rendern,
  // wenn BEIDE Felder vorhanden sind" nur an einer Stelle steht. Liefert
  // null, wenn wannAnzeige oder ort fehlt (z. B. Bundes-SGK-Meldungen ohne
  // Termin-Charakter) — dann zeigt keiner der drei Ausgabeorte eine Zeile.
  function wannWoText(b) {
    return (b.wannAnzeige && b.ort) ? (b.wannAnzeige + " · " + b.ort) : null;
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

  // Heutiges Datum lokal (nicht UTC) als JJJJ-MM-TT.
  function heuteLokal() {
    var d = new Date();
    function z(n) { return (n < 10 ? "0" : "") + n; }
    return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate());
  }

  var MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli",
    "August", "September", "Oktober", "November", "Dezember"];
  function datumLang(iso) {
    var t = iso.split("-");
    return parseInt(t[2], 10) + ". " + MONATE[parseInt(t[1], 10) - 1] + " " + t[0];
  }

  // JET-Band (Startseite, unter dem Termin-Banner), gesteuert aus data/jet.json.
  // Das Band wird NIE ausgeblendet. Vier Phasen, Tagesvergleich per ISO-String,
  // Schlusstage jeweils inklusive:
  //   Phase 1: heute <= bewerbungsschluss        Bewerbung läuft
  //   Phase 2: heute <= verleihung               Bewerbungsphase beendet, Verleihung steht an
  //   Phase 3: nach der Verleihung, "preistraeger" leer
  //                                              "verliehen, Preisträger folgen" (Symbolbild bleibt)
  //   Phase 4: ab dem Verleihungstag, "preistraeger" gefüllt
  //                                              "Das sind die Preisträger" (Foto/Icon-Platzhalter je Eintrag)
  // Vor dem Verleihungstag wird eine gefüllte Liste ignoriert (kein Vorab-Zeigen).
  // Das Symbolbild steht im HTML AUSSERHALB von #home-jet-inhalt (wird hier nicht
  // überschrieben); in Phase 4 blendet .jet-band--preistraeger es aus.
  // Datenfelder je Preisträger: platz (1–3), name, ort, kurztext, text (nur JET-Seite),
  // bild (lokaler Pfad unter /assets/, optional), bildAlt, bildrechte. Texte werden
  // per textContent eingesetzt (kein innerHTML); Bilder nur von der eigenen Domain.
  var MEDAILLE = { 1: "🥇", 2: "🥈", 3: "🥉" };

  function preistraegerListe(j) {
    var roh = Array.isArray(j.preistraeger) ? j.preistraeger : [];
    return roh.filter(function (e) {
      return e && typeof e.name === "string" && e.name.trim() !== "";
    }).sort(function (a, b) { return (a.platz || 99) - (b.platz || 99); });
  }

  function lokalesBild(pfad) {
    return typeof pfad === "string" && /^\/assets\/[A-Za-z0-9_\-\/\.]+$/.test(pfad) && pfad.indexOf("..") < 0;
  }

  function renderJetBand() {
    var band = document.getElementById("home-jet-band");
    var inhalt = document.getElementById("home-jet-inhalt");
    if (!band || !inhalt) return;
    fetch("/data/jet.json")
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) {
        var heute = heuteLokal();
        var liste = preistraegerListe(j);
        var phase4 = heute >= j.verleihung && liste.length > 0;
        var phase1 = !phase4 && heute <= j.bewerbungsschluss;
        var phase3 = !phase4 && heute > j.verleihung;
        band.classList.toggle("jet-band--preistraeger", phase4);

        function el(tag, klasse, text) {
          var e = document.createElement(tag);
          if (klasse) e.className = klasse;
          if (text !== undefined) e.textContent = text;
          return e;
        }
        var verl = datumLang(j.verleihung);

        var titel = el("h2", "jet-band__titel",
          phase4 ? "Das sind die Preisträger " + j.verleihung.slice(0, 4)
                 : "Förderpreis Junges Engagement Thüringen – für Kinder- und Jugendbeteiligung");
        // Düsenjet-Icon als Akzent beim Titel (dekorativ, alt=""). Größe über
        // width/height gesetzt, damit es keinen Layout-Sprung gibt; Darstellung
        // über .jet-icon-inline (css/style.css).
        // Bildrechte: KI-generiert mit Google Gemini im Auftrag der SGK Thüringen (September 2026), Originale im Google-Drive-Ordner ‚JET - Jugendpreis‘.
        var icon = document.createElement("img");
        icon.className = "jet-icon-inline";
        icon.src = "/assets/jet-foerderpreis/jet-emblem-icon.png";
        icon.width = 160;
        icon.height = 160;
        icon.alt = "";
        titel.appendChild(document.createTextNode(" "));
        titel.appendChild(icon);

        var aktionen = el("p", "jet-band__aktionen");
        if (phase1) {
          var b = el("a", "btn", "Jetzt bewerben");
          b.href = "/jet-foerderpreis/#bewerben";
          aktionen.appendChild(b);
        }
        if (phase4) {
          var pb = el("a", "btn", "Projekte ansehen");
          pb.href = "/jet-foerderpreis/#preistraeger";
          aktionen.appendChild(pb);
        } else {
          var alle = el("a", null, "Alle Infos");
          alle.href = "/jet-foerderpreis/";
          aktionen.appendChild(alle);
        }

        inhalt.innerHTML = "";
        inhalt.appendChild(titel);

        if (phase4) {
          var ul = el("ul", "jet-preistraeger");
          liste.forEach(function (e) {
            var li = el("li", "jet-preis");
            var bildBox = el("div", "jet-preis__bild");
            var img = document.createElement("img");
            img.loading = "lazy";
            if (lokalesBild(e.bild)) {
              img.src = e.bild;
              img.alt = typeof e.bildAlt === "string" ? e.bildAlt : "";
            } else {
              // Platzhalter ohne Foto: Düsenjet-Icon
              bildBox.className += " jet-preis__bild--platzhalter";
              img.src = "/assets/jet-foerderpreis/jet-emblem-icon.png";
              img.alt = "";
            }
            bildBox.appendChild(img);
            li.appendChild(bildBox);

            var text = el("div", "jet-preis__text");
            var platz = el("p", "jet-preis__platz");
            var med = el("span", null, MEDAILLE[e.platz] || "");
            med.setAttribute("aria-hidden", "true");
            platz.appendChild(med);
            platz.appendChild(document.createTextNode((MEDAILLE[e.platz] ? " " : "") + (e.platz ? e.platz + ". Platz" : "Preisträger")));
            text.appendChild(platz);
            text.appendChild(el("h3", "jet-preis__name", e.name));
            if (e.ort) text.appendChild(el("p", "jet-preis__ort", e.ort));
            if (e.kurztext) text.appendChild(el("p", "jet-preis__kurz", e.kurztext));
            if (e.bildrechte && lokalesBild(e.bild)) text.appendChild(el("p", "jet-preis__credit", e.bildrechte));
            li.appendChild(text);
            ul.appendChild(li);
          });
          inhalt.appendChild(ul);
        } else if (phase3) {
          inhalt.appendChild(el("p", "jet-band__text",
            "Die Preise wurden am " + verl + " in Ilmenau verliehen – die Preisträger stellen wir hier in Kürze vor."));
        } else {
          var wann = "Bewerbung bis " + datumLang(j.bewerbungsschluss) + " · Verleihung " + verl;
          var wo = "Verleihung in Ilmenau";
          if (!phase1) { wann = "Bewerbungsphase beendet · Preisverleihung " + verl; wo = "Ilmenau"; }
          inhalt.appendChild(el("p", "jet-band__wannwo", wann));
          inhalt.appendChild(el("p", "jet-band__wannwo", wo));
          if (phase1) inhalt.appendChild(el("p", "jet-band__preise", "Preisgelder: 1.500 € · 1.000 € · 500 €"));
        }
        inhalt.appendChild(aktionen);
      })
      .catch(function () {
        // Fallback: Skelett bleibt sichtbar (siehe HTML) — wie bei renderTerminBanner()
      });
  }

  // Termin-Banner (Startseite, direkt nach dem Hero): zeigt den zeitlich
  // nächsten anstehenden Termin (datum >= heute, ISO-String-Vergleich reicht
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
        // >= : am Veranstaltungstag selbst bleibt der Banner stehen
        var heute = heuteLokal();
        // nur echte Termine (wannAnzeige UND ort); normale Meldungen mit datum = heute
        // gehören nicht in den Banner
        var kommende = beitraege.filter(function (b) {
          return b.datum && b.datum >= heute && wannWoText(b);
        });
        // aufsteigend sortiert — der zeitlich nächste zuerst (Gegenrichtung zu
        // sortiertNeuesteZuerst() oben, die für Rückblick-Listen neueste zuerst will)
        kommende.sort(function (a, b) { return (a.datum < b.datum) ? -1 : (a.datum > b.datum) ? 1 : 0; });
        if (kommende.length === 0) { banner.hidden = true; return; }
        var termin = kommende[0];

        var titel = document.createElement("h2");
        titel.className = "termin-banner__titel";
        titel.textContent = termin.titel || "";

        // Wann/Wo optisch abgesetzt direkt unter dem Titel — Redaktionsregel
        // ("Was/Wann/Wo auf den ersten Blick erkennbar"). Dieselbe
        // wannWoText()-Regel (beide Felder nötig) wie bei beitrag()/teaser()
        // unten — hier nur mit eigener Banner-Klasse statt .beitrag-wannwo.
        // "Was" (Titel) steht bereits als eigene h2 direkt darüber. Enthält
        // wannWoText() bereits das Datum (wannAnzeige), entfällt die separate
        // .termin-banner__datum-Zeile — sonst erschiene das Datum doppelt
        // (einmal kurz, einmal als Teil von Wann/Wo).
        var wannWoInhalt = wannWoText(termin);
        var datum = null;
        var wannWo = null;
        if (wannWoInhalt) {
          wannWo = document.createElement("p");
          wannWo.className = "termin-banner__wannwo";
          wannWo.textContent = wannWoInhalt;
        } else {
          datum = document.createElement("p");
          datum.className = "termin-banner__datum";
          var t = document.createElement("time");
          if (termin.datum) t.setAttribute("datetime", termin.datum);
          t.textContent = termin.datumAnzeige || termin.datum || "";
          datum.appendChild(t);
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
        if (datum) inhalt.appendChild(datum);
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
    renderJetBand();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
