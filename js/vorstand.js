/* =====================================================================
   vorstand.js — rendert den Landesvorstand clientseitig aus
   data/vorstand.json. Zwei Ausgabeorte, eine Datenquelle (wie bei
   aktuelles.js): das vollständige Raster #vorstand-grid auf
   /verein/vorstand/ (render()) und der Startseiten-Teaser
   #home-vorstand-teaser (renderHomeTeaser()).
   Einzige Datenquelle ist die JSON; Pflege ohne HTML-Kenntnis möglich.
   Kein Framework, keine externen Requests (nur eigene Datei).
   Fällt die JSON aus, bleibt der statische <noscript>/Fallback-Text
   samt Geschäftsstellen-Hinweis stehen (render()) bzw. bleibt der
   Teaser-Streifen leer, der Link "Zum Vorstand" darunter bleibt
   bestehen (renderHomeTeaser()).

   Der Teaser rückt automatisch alle 7 s um eine Kachel weiter
   (initTeaserRotation(), WCAG 2.2.2): manuelles Scrollen/Wischen/
   Klicken pausiert sofort und dauerhaft (kein Auto-Resume), zusätzlich
   gibt es einen sichtbaren, tastaturbedienbaren Pause/Play-Knopf. Bei
   prefers-reduced-motion:reduce startet der Timer erst gar nicht.
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

  // ---- Startseiten-Teaser: größere Kacheln, automatische Rotation mit
  //      Pflicht-Bedienelementen (WCAG 2.2.2). Jede Kachel ist ein
  //      einzelner <a>, verlinkt auf die Sprungmarke der Person auf
  //      /verein/vorstand/. Aufbau von oben nach unten: Funktion (kleine
  //      Beschriftung oberhalb des Bildes), Bild, Name (fett), Hauptmandat
  //      (person.text), Ort. Funktion/Text/Ort nutzen dieselben Klassen
  //      (.vorstand-funktion/-text/-ort) wie das Haupt-Grid dort — gleiche
  //      Typografie/Farbe, keine eigenen Teaser-Klassen dafür. Mitglieder
  //      "kraft Amtes" (§ 7 Abs. 1 Nr. 4, aktuell nur Lippert) werden
  //      herausgefiltert — dieselbe Gruppierung wie im Haupt-Grid dort,
  //      damit die Seite nicht zwei widersprüchliche Strukturen zeigt.
  //      Bild-Alt bewusst leer: der Name steht direkt daneben im selben
  //      Link, eine zweite Ansage würde nur doppelt vorlesen. ----
  var TEASER_INTERVALL_MS = 7000;

  function teaserKachel(person) {
    var a = document.createElement("a");
    a.className = "vorstand-teaser-karte";
    var id = bildId(person.bild);
    a.href = "/verein/vorstand/" + (id ? "#" + id : "");

    // Kurzfassung optional, nur im Teaser (schmale Kachel): funktionKurz
    // bevorzugt, falls im Datensatz vorhanden, sonst wie im Haupt-Grid
    // das volle funktion-Feld. Aktuell nur bei Merz gesetzt (siehe
    // data/vorstand.json). Steht hier bewusst VOR dem Bild.
    var funktion = document.createElement("span");
    funktion.className = "vorstand-funktion";
    funktion.textContent = person.funktionKurz || person.funktion;
    a.appendChild(funktion);

    var img = document.createElement("img");
    img.className = "vorstand-teaser-portrait";
    img.src = person.bild;
    img.width = 160;
    img.height = 160;
    img.loading = "lazy";
    img.alt = "";
    a.appendChild(img);

    var name = document.createElement("span");
    name.className = "vorstand-teaser-name";
    name.textContent = person.vorname + " " + person.nachname;
    a.appendChild(name);

    // Hauptmandat — im Teaser bislang nicht angezeigt, jetzt ergänzt.
    // textKurz analog zu funktionKurz bevorzugt, falls vorhanden (aktuell
    // nur bei Lenz gesetzt, siehe data/vorstand.json), sonst wie im
    // Haupt-Grid das volle text-Feld. Nur anzeigen, wenn vorhanden (keine
    // leere Zeile), wie im Haupt-Grid.
    var textInhalt = person.textKurz || person.text;
    if (textInhalt) {
      var text = document.createElement("span");
      text.className = "vorstand-text";
      text.textContent = textInhalt;
      a.appendChild(text);
    }

    // Ort nur anzeigen, wenn belegt (wie im Haupt-Grid, karte() oben) —
    // im Teaser kommt das aktuell nicht vor (alle bis auf den kraft Amtes
    // gefilterten Lippert haben einen Ort), Fallback trotzdem vorhanden.
    if (person.ort) {
      var ort = document.createElement("span");
      ort.className = "vorstand-ort";
      ort.textContent = person.ort;
      a.appendChild(ort);
    }

    return a;
  }

  function reduzierteBewegungGewuenscht() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  // Automatischer Wechsel alle 7 s, zyklisch (wrap am Ende zurück zum
  // Anfang). Pflicht-Bedienelemente nach WCAG 2.2.2 (Pause, Stop oder
  // Hide fuer automatisch bewegten Inhalt): sichtbarer, tastaturbedien-
  // barer Pause/Play-Knopf PLUS sofortiges, dauerhaftes Pausieren bei
  // jeder manuellen Interaktion mit dem Streifen selbst (scroll/
  // pointerdown, faengt per Event-Bubbling auch Klicks auf einzelne
  // Kacheln ab) — kein Auto-Resume danach, nur der Knopf startet wieder.
  // Zusaetzlich zwei sichtbare Vor-/Zurueck-Knoepfe: funktionieren
  // unabhaengig vom Pause-Zustand (auch waehrend die Automatik laeuft),
  // pausieren die Automatik aber bei jedem Klick zusaetzlich mit —
  // Nutzer sollen nicht gegen den naechsten Auto-Tick ankaempfen muessen.
  function initTeaserRotation(teaser) {
    var karten = Array.prototype.slice.call(teaser.querySelectorAll(".vorstand-teaser-karte"));
    if (karten.length < 2) return; // nichts zu rotieren, keine Steuerung noetig

    var steuerung = document.createElement("div");
    steuerung.className = "vorstand-teaser-steuerung";
    teaser.insertAdjacentElement("afterend", steuerung);

    var zurueckBtn = document.createElement("button");
    zurueckBtn.type = "button";
    zurueckBtn.className = "vorstand-teaser-nav";
    zurueckBtn.setAttribute("aria-label", "Vorherige Person");
    zurueckBtn.textContent = "‹";
    steuerung.appendChild(zurueckBtn);

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "vorstand-teaser-pause";
    steuerung.appendChild(btn);

    var weiterBtn = document.createElement("button");
    weiterBtn.type = "button";
    weiterBtn.className = "vorstand-teaser-nav";
    weiterBtn.setAttribute("aria-label", "Nächste Person");
    weiterBtn.textContent = "›";
    steuerung.appendChild(weiterBtn);

    var index = 0;
    var timerId = null;
    // Merkt sich den WUNSCH des Nutzers (Pause-Knopf, Zurueck/Weiter, manuelles
    // Scrollen) — unabhaengig davon, ob der Timer gerade laeuft. Wichtig fuer
    // den Sichtbarkeits-Fix unten: das automatische Anhalten/Fortsetzen beim
    // Verstecken/Zeigen des Tabs darf diesen Wunsch nicht veraendern, sonst
    // wuerde z. B. ein Tab-Wechsel wie ein Nutzer-Pause-Klick wirken.
    var nutzerHatPausiert = false;
    // scrollIntoView() unten loest selbst ein "scroll"-Event aus — ohne dieses Flag
    // wuerde der Scroll-Handler jeden automatischen Wechsel sofort als manuelle
    // Interaktion missverstehen und den Timer nach dem ersten Tick wieder anhalten.
    var eigenesScrollen = false;

    // schritt: +1 (weiter) oder -1 (zurueck), zyklisch mit Wrap in beide
    // Richtungen. Von weiter() (Auto-Tick) UND den beiden Knoepfen genutzt,
    // damit "index" immer den tatsaechlich sichtbaren Stand kennt — auch
    // nach manueller Navigation, falls die Automatik spaeter fortgesetzt wird.
    function gehe(schritt) {
      index = (index + schritt + karten.length) % karten.length;
      eigenesScrollen = true;
      karten[index].scrollIntoView({ inline: "start", block: "nearest" });
      // scroll-behavior:smooth (siehe CSS) animiert kurz nach; Flag erst danach
      // wieder loeschen, sonst wird das Ende der eigenen Animation als Nutzer-
      // Scroll gewertet.
      window.setTimeout(function () { eigenesScrollen = false; }, 700);
    }

    // timerStarten()/timerStoppen(): reine Timer-Kontrolle, OHNE Button-Anzeige
    // und OHNE nutzerHatPausiert anzufassen — genutzt sowohl von starten()/
    // anhalten() (Nutzer-Aktionen) als auch vom Sichtbarkeits-Handler unten
    // (rein technisches Anhalten/Fortsetzen, das der Nutzer nie zu sehen
    // bekommt). timerStarten() startet bewusst nicht, wenn der Tab gerade
    // unsichtbar ist — der visibilitychange-Handler holt das beim naechsten
    // Sichtbarwerden nach (siehe unten). Das ist der eigentliche Fix fuer den
    // gemeldeten Fehler (siehe Kommentar bei visibilitychange).
    function timerStarten() {
      if (timerId || document.hidden) return;
      timerId = window.setInterval(function () { gehe(1); }, TEASER_INTERVALL_MS);
    }
    function timerStoppen() {
      if (timerId) { window.clearInterval(timerId); timerId = null; }
    }

    function starten() {
      nutzerHatPausiert = false;
      timerStarten();
      btn.textContent = "Pause";
      btn.setAttribute("aria-label", "Automatischen Wechsel pausieren");
    }

    function anhalten() {
      nutzerHatPausiert = true;
      timerStoppen();
      btn.textContent = "Start";
      btn.setAttribute("aria-label", "Automatischen Wechsel fortsetzen");
    }

    btn.addEventListener("click", function () {
      if (timerId) anhalten(); else starten();
    });

    zurueckBtn.addEventListener("click", function () { gehe(-1); anhalten(); });
    weiterBtn.addEventListener("click", function () { gehe(1); anhalten(); });

    // Manuelle Interaktion pausiert sofort und dauerhaft (kein Auto-Resume).
    // Beim "scroll"-Event zaehlt der eigene programmatische Scroll (siehe
    // eigenesScrollen oben) ausdruecklich NICHT als manuelle Interaktion —
    // gilt fuer den Auto-Tick genauso wie fuer die beiden Knoepfe oben, die
    // sich unabhaengig davon selbst um anhalten() kuemmern.
    teaser.addEventListener("scroll", function () {
      if (eigenesScrollen) return;
      anhalten();
    }, { passive: true });
    teaser.addEventListener("pointerdown", anhalten, { passive: true });

    // Fix fuer gemeldeten Fehler ("mehrfach klicken, bis sich sichtbar etwas
    // bewegt", zunehmend nach laengerer Laufzeit): Diagnose ergab, dass
    // window.setInterval() in einem unsichtbaren Tab (document.hidden) ganz
    // normal weiterlaeuft und gehe(1) samt Index-Erhoehung korrekt ausfuehrt —
    // NICHT, wie zunaechst vermutet, dass anhalten()/clearInterval() die
    // falsche oder gar keine Timer-ID trifft (das wurde per echtem Klick +
    // Beobachtung >7 s widerlegt, siehe Bericht). Die eigentliche Ursache:
    // die CSS-scroll-behavior:smooth-Animation von scrollIntoView() haengt am
    // Compositor, der in einem unsichtbaren Tab pausiert — die sichtbare
    // Scroll-Position friert ein, waehrend "index" im Hintergrund pro Tick
    // brav weiterzaehlt. Kehrt der Nutzer zurueck, zielt der naechste Klick
    // auf den (durch die vielen unsichtbaren Ticks) weit vorausgeeilten Index,
    // der Sprung dorthin wirkt von der eingefrorenen Position aus aber winzig
    // bis unsichtbar — daher die mehreren Klicks, und mehr davon, je laenger
    // es im Hintergrund lief. Fix: Timer beim Verstecken anhalten (Index
    // friert synchron mit der Anzeige ein), beim Wiedersichtbarwerden nur
    // fortsetzen, wenn der Nutzer nicht selbst pausiert hatte und keine
    // reduzierte Bewegung gewuenscht ist. Button-Anzeige bleibt dabei
    // unveraendert (kein "Pause"/"Start"-Flackern durch bloßen Tab-Wechsel).
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        timerStoppen();
      } else if (!nutzerHatPausiert && !reduzierteBewegungGewuenscht()) {
        timerStarten();
      }
    });

    // Aufräumen beim Verlassen der Seite — hier unkritisch (der Browser
    // räumt beim Navigieren ohnehin auf), aber sauberer Stil.
    window.addEventListener("pagehide", timerStoppen);

    if (reduzierteBewegungGewuenscht()) {
      anhalten(); // startet gar nicht erst, Knopf zeigt den Play-Zustand
    } else {
      starten();
    }
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
        initTeaserRotation(teaser);
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
