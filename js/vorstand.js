/* =====================================================================
   vorstand.js — rendert den Landesvorstand clientseitig aus
   data/vorstand.json in das Raster #vorstand-grid.
   Einzige Datenquelle ist die JSON; Pflege ohne HTML-Kenntnis möglich.
   Kein Framework, keine externen Requests (nur eigene Datei).
   Fällt die JSON aus, bleibt der statische <noscript>/Fallback-Text
   samt Geschäftsstellen-Hinweis stehen.
   ===================================================================== */
(function () {
  "use strict";

  function karte(person) {
    var fig = document.createElement("figure");
    fig.className = "vorstand-card";

    var img = document.createElement("img");
    img.className = "vorstand-portrait";
    img.src = person.bild;
    img.width = 200;
    img.height = 200;
    img.loading = "lazy";
    img.alt = "Platzhalter-Porträt " + person.vorname + " " + person.nachname;
    fig.appendChild(img);

    var cap = document.createElement("figcaption");

    var name = document.createElement("span");
    name.className = "vorstand-name";
    name.textContent = person.vorname + " " + person.nachname;
    cap.appendChild(name);

    var funktion = document.createElement("span");
    funktion.className = "vorstand-funktion";
    funktion.textContent = person.funktion;
    cap.appendChild(funktion);

    // Ort nur anzeigen, wenn belegt (Registerbeleg vorhanden)
    if (person.ort) {
      var ort = document.createElement("span");
      ort.className = "vorstand-ort";
      ort.textContent = person.ort;
      cap.appendChild(ort);
    }

    fig.appendChild(cap);
    return fig;
  }

  function render() {
    var grid = document.getElementById("vorstand-grid");
    if (!grid) return;
    fetch("/data/vorstand.json")
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (liste) {
        var frag = document.createDocumentFragment();
        for (var i = 0; i < liste.length; i++) frag.appendChild(karte(liste[i]));
        grid.innerHTML = "";
        grid.appendChild(frag);
      })
      .catch(function () {
        // Fallback: statischer Hinweis bleibt bestehen (siehe HTML)
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
})();
