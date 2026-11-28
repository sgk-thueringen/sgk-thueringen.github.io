/* =====================================================================
   ablauf.js — abgelaufene Meldungen. Gemeinsame Hilfen für aktuelles.js
   (Startseite, /aktuelles/, Termin-Banner) und fokus.js (Kachel "Im Fokus").

   Optionale Felder je Eintrag (data/aktuelles.json, data/fokus.json):
     ende        "JJJJ-MM-TT" — letzter Tag, an dem der Handlungsaufruf gilt
     cta         { "text": "…", "url": "…" } — Knopf bis einschließlich "ende"
     rueckblick  { "text": "…", "url": "…" } — ab dem Tag danach als Link
                 "Rückblick lesen" (das Feld "text" wird nicht angezeigt)
   Ab dem Tag nach "ende" steht "Rückblick" vor dem Titel; ohne
   rueckblick.url entfällt der Knopf ersatzlos. "Heute" gilt in der Zeitzone
   Europe/Berlin, unabhängig vom Gerät. Muss vor aktuelles.js und fokus.js
   geladen werden. Keine externen Requests.
   ===================================================================== */
(function () {
  "use strict";

  function heute() {
    var teile = {};
    new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(new Date())
      .forEach(function (t) { teile[t.type] = t.value; });
    return teile.year + "-" + teile.month + "-" + teile.day;
  }

  // Nur ein gültiges Datum zählt; ISO-Text lässt sich direkt vergleichen.
  function abgelaufen(b) {
    return !!b && typeof b.ende === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.ende) && heute() > b.ende;
  }

  // Nur interne Pfade (/…) oder https.
  function sicher(url) {
    return typeof url === "string" && (/^\/(?!\/)/.test(url) || /^https:\/\//.test(url));
  }

  function link(url, text, klasse) {
    var a = document.createElement("a");
    if (klasse) a.className = klasse;
    a.href = url;
    if (url.charAt(0) !== "/") { a.target = "_blank"; a.rel = "noopener"; }
    a.textContent = text;
    return a;
  }

  function absatz(klasse, kind) {
    var p = document.createElement("p");
    p.className = klasse;
    p.appendChild(kind);
    return p;
  }

  window.sgkAblauf = {
    heute: heute,
    abgelaufen: abgelaufen,
    marke: function () {
      var p = document.createElement("p");
      p.className = "rueckblick-marke";
      p.textContent = "Rückblick";
      return p;
    },
    // Link "Rückblick lesen" oder null.
    rueckblickLink: function (b, klasse) {
      var r = b && b.rueckblick;
      if (!r || !sicher(r.url)) return null;
      return absatz(klasse + (klasse === "beitrag-quelle" ? "" : " beitrag-quelle"), link(r.url, "Rückblick lesen"));
    },
    // Knopf aus "cta" oder null.
    knopf: function (b) {
      var c = b && b.cta;
      if (!c || !sicher(c.url) || typeof c.text !== "string" || c.text.trim() === "") return null;
      return absatz("beitrag-aktion", link(c.url, c.text, "btn"));
    }
  };
})();
