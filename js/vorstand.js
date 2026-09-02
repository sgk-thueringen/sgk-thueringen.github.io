/* =====================================================================
   vorstand.js — rendert den Landesvorstand clientseitig aus
   data/vorstand.json. Zwei Ausgabeorte, eine Datenquelle (wie bei
   aktuelles.js): das vollständige Raster #vorstand-grid auf
   /verein/vorstand/ (render()) und der horizontal scrollbare
   Startseiten-Teaser #home-vorstand-teaser (renderHomeTeaser()).
   Einzige Datenquelle ist die JSON; Pflege ohne HTML-Kenntnis möglich.
   Kein Framework, keine externen Requests (nur eigene Datei).
   Fällt die JSON aus, bleibt der statische <noscript>/Fallback-Text
   samt Geschäftsstellen-Hinweis stehen (render()) bzw. bleibt der
   Teaser-Streifen leer, der Link "Zum Vorstand" darunter bleibt
   bestehen (renderHomeTeaser()).
   ===================================================================== */
(function () {
  "use strict";

  // Dateinamen-Stamm aus dem bild-Feld (z. B. "/assets/vorstand/grenzdoerffer.webp"
  // -> "grenzdoerffer"). Dient als id fürs <figure> und als Sprungmarke
  // /verein/vorstand/#<id> im Startseiten-Teaser — kein zweites Namensschema,
  // der Dateiname ist bereits umlautfrei und eindeutig.
  function bildId(bild) {
    var m = /\/([^\/]+)\.[a-z0-9]+$/i.exec(bild || "");
    return m ? m[1] : "";
  }

  function karte(person) {
    var fig = document.createElement("figure");
    fig.className = "vorstand-card";
    var id = bildId(person.bild);
    if (id) fig.id = id;

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

  // ---- Startseiten-Teaser: horizontal scrollbarer Streifen (CSS scroll-
  //      snap, kein Auto-Karussell, kein Timer, kein Scroll-JS). Jede
  //      Kachel ist ein einzelner <a> (Bild + Name), verlinkt auf die
  //      Sprungmarke der Person auf /verein/vorstand/. Mitglieder "kraft
  //      Amtes" (§ 7 Abs. 1 Nr. 4, aktuell nur Lippert) werden herausge-
  //      filtert — dieselbe Gruppierung wie im Haupt-Grid dort, damit die
  //      Seite nicht zwei widersprüchliche Strukturen zeigt. Bild-Alt
  //      bewusst leer: der Name steht direkt daneben im selben Link,
  //      eine zweite Ansage würde nur doppelt vorlesen. ----
  function teaserKachel(person) {
    var a = document.createElement("a");
    a.className = "vorstand-teaser-karte";
    var id = bildId(person.bild);
    a.href = "/verein/vorstand/" + (id ? "#" + id : "");

    var img = document.createElement("img");
    img.className = "vorstand-teaser-portrait";
    img.src = person.bild;
    img.width = 120;
    img.height = 120;
    img.loading = "lazy";
    img.alt = "";
    a.appendChild(img);

    var name = document.createElement("span");
    name.className = "vorstand-teaser-name";
    name.textContent = person.vorname + " " + person.nachname;
    a.appendChild(name);

    return a;
  }

  function renderHomeTeaser() {
    var teaser = document.getElementById("home-vorstand-teaser");
    if (!teaser) return;
    fetch("/data/vorstand.json")
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (liste) {
        var frag = document.createDocumentFragment();
        for (var i = 0; i < liste.length; i++) {
          if (liste[i].gruppe === "kraft-amtes") continue;
          frag.appendChild(teaserKachel(liste[i]));
        }
        teaser.innerHTML = "";
        teaser.appendChild(frag);
      })
      .catch(function () {
        // Fallback: Streifen bleibt leer, Link "Zum Vorstand" darunter bleibt bestehen
      });
  }

  function init() {
    render();
    renderHomeTeaser();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
