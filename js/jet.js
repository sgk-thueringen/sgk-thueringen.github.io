/* Preisträger-Abschnitt der JET-Seite (#preistraeger), gerendert aus
   data/jet.json (Feld "preistraeger", dieselbe Quelle wie das Band auf der
   Startseite, siehe renderJetBand() in js/aktuelles.js).

   Der Abschnitt bleibt versteckt (hidden), solange die Liste leer ist. Wie im
   Band gilt: eine gefüllte Liste wird erst ab dem Verleihungstag angezeigt
   (Tagesvergleich per ISO-String, Schlusstag inklusive).

   Felder je Preisträger: platz (1–3), name, ort, kurztext, text (ausführlich;
   Absätze durch Leerzeile getrennt), bild (lokaler Pfad unter /assets/,
   optional), bildAlt, bildrechte. Texte werden per textContent eingesetzt
   (kein innerHTML), Bilder nur von der eigenen Domain. */
(function () {
  var MEDAILLE = { 1: "🥇", 2: "🥈", 3: "🥉" };

  function heuteLokal() {
    var d = new Date();
    function z(n) { return (n < 10 ? "0" : "") + n; }
    return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate());
  }

  function lokalesBild(pfad) {
    return typeof pfad === "string" && /^\/assets\/[A-Za-z0-9_\-\/\.]+$/.test(pfad) && pfad.indexOf("..") < 0;
  }

  function el(tag, klasse, text) {
    var e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  var sec = document.getElementById("preistraeger");
  if (!sec) return;

  fetch("/data/jet.json")
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (j) {
      var roh = Array.isArray(j.preistraeger) ? j.preistraeger : [];
      var liste = roh.filter(function (e) {
        return e && typeof e.name === "string" && e.name.trim() !== "";
      }).sort(function (a, b) { return (a.platz || 99) - (b.platz || 99); });
      if (liste.length === 0 || heuteLokal() < j.verleihung) return;

      var h = document.getElementById("preistraeger-titel");
      if (h) h.textContent = "Preisträger " + j.verleihung.slice(0, 4);

      liste.forEach(function (e) {
        var art = el("article", "preistraeger__eintrag");
        var h3 = el("h3");
        if (MEDAILLE[e.platz]) {
          var med = el("span", null, MEDAILLE[e.platz]);
          med.setAttribute("aria-hidden", "true");
          h3.appendChild(med);
          h3.appendChild(document.createTextNode(" "));
        }
        h3.appendChild(document.createTextNode((e.platz ? e.platz + ". Platz: " : "") + e.name));
        art.appendChild(h3);
        if (e.ort) art.appendChild(el("p", "preistraeger__ort", e.ort));

        if (lokalesBild(e.bild)) {
          var fig = el("figure", "content-bild content-bild--seite");
          var img = document.createElement("img");
          img.src = e.bild;
          img.alt = typeof e.bildAlt === "string" ? e.bildAlt : "";
          img.loading = "lazy";
          fig.appendChild(img);
          if (e.bildrechte) fig.appendChild(el("figcaption", null, e.bildrechte));
          art.appendChild(fig);
        }

        var text = e.text || e.kurztext || "";
        text.split(/\n\s*\n/).forEach(function (absatz) {
          if (absatz.trim() !== "") art.appendChild(el("p", null, absatz.trim()));
        });
        sec.appendChild(art);
      });
      sec.hidden = false;
      // Der Abschnitt ist beim Laden noch versteckt: Sprung zum Anker (z. B. vom
      // Startseiten-Band) nach dem Einblenden nachholen.
      if (location.hash === "#preistraeger") sec.scrollIntoView();
    })
    .catch(function () {
      // Fallback: Abschnitt bleibt versteckt.
    });
})();
