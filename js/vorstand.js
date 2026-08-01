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

    var istPlatzhalter = /\.svg$/i.test(person.bild || "");

    var img = document.createElement("img");
    img.className = "vorstand-portrait";
    img.src = person.bild;
    img.width = 200;
    img.height = 200;
    img.loading = "lazy";
    img.alt = (istPlatzhalter ? "Platzhalter-Porträt " : "Porträt ") + person.vorname + " " + person.nachname;
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

    // Ort nur anzeigen, wenn belegt (Registerbeleg oder Selbstauskunft vorhanden)
    if (person.ort) {
      var ort = document.createElement("span");
      ort.className = "vorstand-ort";
      ort.textContent = person.ort;
      cap.appendChild(ort);
    }

    // Kurztext nur anzeigen, wenn vorhanden (keine leere Zeile)
    if (person.text) {
      var text = document.createElement("span");
      text.className = "vorstand-text";
      text.textContent = person.text;
      cap.appendChild(text);
    }

    fig.appendChild(cap);
    return fig;
  }

  function fuelle(grid, personen) {
    var frag = document.createDocumentFragment();
    for (var i = 0; i < personen.length; i++) frag.appendChild(karte(personen[i]));
    grid.innerHTML = "";
    grid.appendChild(frag);
  }

  function render() {
    var grid = document.getElementById("vorstand-grid");
    if (!grid) return;
    fetch("/data/vorstand.json")
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (liste) {
        // Mitglieder kraft Amtes (§ 7 Abs. 1 Nr. 4) als eigene, abgesetzte Gruppe
        var vorstand = [], amt = [];
        for (var i = 0; i < liste.length; i++) {
          if (liste[i].gruppe === "kraft-amtes") amt.push(liste[i]);
          else vorstand.push(liste[i]);
        }
        fuelle(grid, vorstand);

        var amtGrid = document.getElementById("vorstand-amt-grid");
        var amtBox = document.getElementById("vorstand-amt");
        if (amt.length && amtGrid && amtBox) {
          fuelle(amtGrid, amt);
          amtBox.hidden = false;
        }
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
