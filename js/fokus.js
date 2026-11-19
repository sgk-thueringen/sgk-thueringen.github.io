/* =====================================================================
   fokus.js — Kachel "Im Fokus" auf der Startseite (#fokus-kachel), gerendert
   aus data/fokus.json. Pflege ohne HTML-Kenntnis: nur die JSON ändern.

   Felder:
     titel       Überschrift (Pflicht; fehlt sie, wird die Kachel ausgeblendet)
     wannAnzeige Wann, ausgeschrieben, z. B. "Preisverleihung am 20. November 2026"
                 (kein "heute"/"morgen": die Kachel bleibt stehen)
     ort         Wo, z. B. "Ilmenau". Wann und Wo erscheinen nur zusammen, als eigene
                 fette Zeile "Wann · Wo" (wie wannWoText() in aktuelles.js)
     text        ein Satz Text
     bild        lokaler Pfad unter /assets/ (optional, nur eigene Dateien)
     bildHinweis kurzer Hinweis im Bild, z. B. "Symbolbild (KI-generiert)"
     link        Ziel des Buttons: interner Pfad (/…) oder https://…
     buttonText  Beschriftung des Buttons (ohne Artikel/Possessivpronomen)

   Texte kommen per textContent in die Seite (kein innerHTML). Das Bild wird
   nur von der eigenen Domain geladen, Links nur intern oder https. Kein
   Framework, keine externen Requests (nur die eigene JSON).
   ===================================================================== */
(function () {
  "use strict";

  function lokalesBild(pfad) {
    return typeof pfad === "string" && /^\/assets\/[A-Za-z0-9_\-\/\.]+$/.test(pfad) && pfad.indexOf("..") < 0;
  }

  function sicherLink(url) {
    return typeof url === "string" && (/^\/(?!\/)/.test(url) || /^https:\/\//.test(url));
  }

  function el(tag, klasse, text) {
    var e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  var kachel = document.getElementById("fokus-kachel");
  var inhalt = document.getElementById("fokus-inhalt");
  if (!kachel || !inhalt) return;

  // Ohne verwertbare Daten: Kachel weg, die zweite Kachel geht über die volle Breite.
  function ausblenden() {
    kachel.hidden = true;
    if (kachel.parentNode) kachel.parentNode.classList.add("fokus__raster--eins");
  }

  fetch("/data/fokus.json")
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (f) {
      if (!f || typeof f.titel !== "string" || f.titel.trim() === "") { ausblenden(); return; }

      inhalt.innerHTML = "";
      inhalt.appendChild(el("h2", "fokus-kachel__titel", f.titel));
      if (typeof f.wannAnzeige === "string" && f.wannAnzeige.trim() !== "" && typeof f.ort === "string" && f.ort.trim() !== "") {
        inhalt.appendChild(el("p", "fokus-kachel__wannwo", f.wannAnzeige + " · " + f.ort));
      }
      if (typeof f.text === "string" && f.text.trim() !== "") {
        inhalt.appendChild(el("p", "fokus-kachel__text", f.text));
      }
      if (sicherLink(f.link) && typeof f.buttonText === "string" && f.buttonText.trim() !== "") {
        var aktion = el("p", "fokus-kachel__aktion");
        var a = el("a", "btn btn--invers", f.buttonText);
        a.href = f.link;
        aktion.appendChild(a);
        inhalt.appendChild(aktion);
      }

      // Bildfeld: Foto einsetzen; ohne (gültiges) Bild entfällt das Feld.
      // Oberhalb der Falz, daher kein loading="lazy".
      var medien = kachel.querySelector(".fokus-kachel__medien");
      if (medien) {
        if (lokalesBild(f.bild)) {
          var img = document.createElement("img");
          img.className = "fokus-kachel__bild";
          img.src = f.bild;
          img.alt = "";
          medien.appendChild(img);
          if (typeof f.bildHinweis === "string" && f.bildHinweis.trim() !== "") {
            medien.appendChild(el("span", "fokus-kachel__hinweis", f.bildHinweis));
          }
        } else {
          medien.parentNode.removeChild(medien);
        }
      }
    })
    .catch(ausblenden);
})();
