/* =====================================================================
   mitglied-werden.js — digitaler Mitgliedsantrag in sechs Schritten.
   Funktion → Beitrag → Angaben → SEPA-Mandat → Prüfen und Absenden → Ergebnis.

   Das Frontend richtet sich exakt nach dem Backend (Repo mitgliedsantrag-server:
   README, antrag.php, lib/). Bei Abweichungen zum Auftrag gilt das Backend.
   Einziger externer Request: der POST beim Absenden an ENDPOINT. Beim Laden der
   Seite wird nichts angefragt. Keine Daten in localStorage/Cookies, kein Tracking.
   Texte werden nur per DOM-Methoden (textContent) eingesetzt, kein innerHTML.
   ===================================================================== */
(function () {
  "use strict";

  // ---- Konstanten ------------------------------------------------------
  // Endpunkt des Backends (eine Stelle, hier ändern).
  var ENDPOINT = "https://mitgliedsantrag.sgk-thueringen.de/antrag.php";

  var GLAEUBIGER_ID = "DE62ZZZ0000966525";

  // Kennung der angezeigten Mandatstext-Fassung (geht als sepa_text_version ans Backend; das Backend
  // kennt nur Kennungen aus Validator::SEPA_TEXT_VERSIONEN). Bei Änderung des Wortlauts hier UND im Backend
  // eine neue Kennung eintragen.
  var SEPA_TEXT_VERSION = "2026-11-19";

  // Grenzen laut Backend (lib/Beitrag.php). MAX_CENT: Obergrenze für frei gewählte Beiträge.
  var MAX_CENT = 100000;

  // Spiegel von Beitrag::MINDEST_CENT und Beitrag::BEZEICHNUNG im Backend (Beitragsordnung 23.03.2002,
  // Euro je Monat in Cent). Das Backend hat keine Abfrage-Schnittstelle für Beträge; der Server rechnet
  // selbst und lehnt abweichende Beträge ab. Bei Änderungen im Backend hier nachziehen.
  var KAT = {
    gemeinde_stadtrat:   { cent: 300,  label: "Gemeinderat/Stadtrat (Städte und Gemeinden)", bund: true },
    kreistag:            { cent: 350,  label: "Kreistag oder Stadtrat einer kreisfreien Stadt (Landkreise und kreisfreie Städte)", bund: true },
    wahlamt_gemeinde:    { cent: 600,  label: "Bürgermeister, VG-Vorsitz, Beigeordnete", bund: true },
    wahlamt_kreis:       { cent: 1000, label: "Landrat, Oberbürgermeister einer kreisfreien Stadt", bund: true },
    // TODO André: MdEP wird in der Beitragsordnung 2002 nicht genannt (nur MdB, MdL); Backend-Wert 10,00 € gilt vorläufig.
    abgeordnete:         { cent: 1000, label: "Abgeordnete (MdL, MdB, MdEP)", bund: true },
    // TODO André: Beitrag für Bedienstete ist vorläufig (Entscheidung 19.11.2026); Backend-Wert 3,00 €.
    bedienstete:         { cent: 300,  label: "Kommunale Bedienstete", bund: true },
    ortsteil:            { cent: 300,  label: "Ortsteilrat/Ortsbeirat", bund: true },
    sachkundig:          { cent: 300,  label: "Sachkundige Bürgerin / sachkundiger Bürger", bund: true },
    unternehmensgremium: { cent: 300,  label: "Gremium eines kommunalen Unternehmens", bund: true },
    uebrige:             { cent: 300,  label: "Übrige ordentliche Mitglieder (z. B. Ortsteilrat, sachkundige Bürger:innen)", bund: true },
    foerdernd:           { cent: 750,  label: "Fördernde Mitgliedschaft", bund: false },
    junior:              { cent: 150,  label: "Juniormitgliedschaft (NachwuchsAkademie)", bund: false }
  };

  // Kategorie-Schlüssel für „übrige ordentliche Mitglieder“ (eigener Schlüssel im Backend seit 19.11.2026).
  var UEBRIGE_KEY = "uebrige";

  // Adresse zerlegt, damit sie nicht als vollständiger String im Quelltext steht.
  var KONTAKT = "info" + "@" + "sgk-thueringen.de";

  // Wortlaut des SEPA-Lastschriftmandats, übernommen aus dem Papierantrag Seite 2 (nicht ändern).
  var MANDATSTEXT = [
    "Ich ermächtige die Sozialdemokratische Gemeinschaft für Kommunalpolitik im Freistaat Thüringen e. V., den Mitgliedsbeitrag quartalsweise im Voraus von meinem Konto mittels SEPA-Lastschrift einzuziehen. Zugleich weise ich mein Kreditinstitut an, die von der SGK Thüringen auf mein Konto gezogenen Lastschriften einzulösen.",
    "Ich kann innerhalb von acht Wochen, beginnend mit dem Belastungsdatum, die Erstattung des belasteten Betrages verlangen. Es gelten dabei die mit meinem Kreditinstitut vereinbarten Bedingungen. Die Höhe des Beitrags ergibt sich aus der Beitragsordnung der SGK Thüringen in der jeweils geltenden Fassung und der gewählten Kategorie. Ändert die Mitgliederversammlung die Beiträge, gilt dieses Mandat auch für den geänderten Betrag."
  ];

  // Wortlaut der Erklärung neben dem Pflicht-Häkchen auf Schritt 5, aus dem Papierantrag (nicht ändern).
  var GRUNDSAETZE_TEXT = "Ich fühle mich den sozialdemokratischen Grundsätzen in der Kommunalpolitik verbunden und beantrage die Aufnahme in die SGK Thüringen.";

  // Backend-Feldname → Schritt, auf dem das Feld steht (für Fehlermeldungen vom Server).
  var SCHRITT_VON_FELD = {
    kategorie: 1, funktion_detail: 3, beitrag_gewaehlt: 2, anrede: 3, titel: 3, volljaehrig: 3,
    vorname: 3, nachname: 3, strasse: 3, plz: 3, ort: 3, email: 3, telefon: 3, geburtsdatum: 3, kommune_gremium: 3,
    kontoinhaber: 4, iban: 4, sepa_zustimmung: 4, sepa_text_version: 4, pflichterklaerung: 5
  };

  var root = document.getElementById("assistent");
  if (!root) return;

  // Einstieg: Auswahl zwischen zwei Wegen. Der Assistent (#digital) erscheint erst nach dem Klick auf
  // "Antrag online starten"; "Zurück zur Auswahl" blendet ihn wieder aus. Ohne diese Elemente bleibt
  // der Assistent wie bisher sichtbar.
  var wege = document.getElementById("wege");
  var digital = document.getElementById("digital");
  var startBtn = document.getElementById("weg-digital");
  var zurueckBtn = document.getElementById("weg-zurueck");
  if (wege && digital && startBtn && zurueckBtn) {
    startBtn.hidden = false;
    startBtn.addEventListener("click", function () {
      wege.hidden = true;
      digital.hidden = false;
      var ziel = document.getElementById("mw-schritt-titel") || root;
      try { ziel.focus(); } catch (e) { /* kein Fokus möglich */ }
    });
    zurueckBtn.addEventListener("click", function () {
      digital.hidden = true;
      wege.hidden = false;
      startBtn.focus();
    });
  } else if (digital) {
    digital.hidden = false;
  }

  // ---- Zustand (nur im Arbeitsspeicher) --------------------------------
  var state;
  function neuerZustand() {
    return {
      schritt: 1, unter: null,
      kategorie: null, funktionDetail: "",
      d: {
        anrede: "", titel: "", beitrag_gewaehlt: "", vorname: "", nachname: "", strasse: "", plz: "", ort: "", email: "", telefon: "",
        kommune_gremium: "", geburtsdatum: "", volljaehrig: false,
        kontoinhaber: "", iban: "", sepa_zustimmung: false,
        pflichterklaerung: false, einladungen_email: false, hp: ""
      },
      fehler: {}, senden: false, ergebnis: null,
      startT: Date.now()       // Zeitfeld t: Formularstart (Millisekunden, das Backend erkennt ms und s)
    };
  }
  state = neuerZustand();

  // ---- Hilfsfunktionen -------------------------------------------------
  function h(tag, props, kids) {
    var e = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (k) {
        var v = props[k];
        if (v === false || v === null || v === undefined) return;
        if (k === "class") e.className = v;
        else if (k === "text") e.textContent = v;
        else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), v);
        else if (v === true) e.setAttribute(k, "");
        else e.setAttribute(k, v);
      });
    }
    (kids || []).forEach(function (c) {
      if (c === null || c === undefined) return;
      e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return e;
  }

  function euro(cent) { return (cent / 100).toFixed(2).replace(".", ",") + " €"; }

  function katInfo() { return state.kategorie ? KAT[state.kategorie] : null; }

  // Betrag aus Eingabe in Cent (wie Beitrag::parseEuroCent im Backend), null bei ungültigem Wert.
  function parseEuroCent(text) {
    var t = String(text).replace(/[€\s]/g, "");
    var m = /^(\d{1,5})(?:[.,](\d{1,2}))?$/.exec(t);
    if (!m) return null;
    var cent = parseInt(m[1], 10) * 100 + (m[2] ? parseInt((m[2] + "0").slice(0, 2), 10) : 0);
    return (cent > 0 && cent <= MAX_CENT) ? cent : null;
  }

  function gewaehlterCent() {
    var k = katInfo();
    if (!k) return 0;
    var c = state.d.beitrag_gewaehlt.trim() === "" ? null : parseEuroCent(state.d.beitrag_gewaehlt);
    return (c !== null && c >= k.cent) ? c : k.cent;
  }

  // IBAN: nur deutsche, 22 Stellen, Prüfsumme mod 97 (wie Iban::gueltigDe im Backend).
  function ibanNormal(s) { return String(s).replace(/\s+/g, "").toUpperCase(); }
  function ibanPruefung(s) {
    var i = ibanNormal(s);
    if (i === "") return { ok: false, text: "" };
    if (i.length >= 2 && i.slice(0, 2) !== "DE") return { ok: false, text: "Hier ist nur eine deutsche IBAN möglich. Sie beginnt mit DE." };
    if (!/^DE[0-9]*$/.test(i)) return { ok: false, text: "Nach DE folgen nur Ziffern." };
    if (i.length !== 22) return { ok: false, text: "Eine deutsche IBAN hat 22 Stellen. Du hast bisher " + i.length + " eingegeben.", unfertig: i.length < 22 };
    var um = i.slice(4) + i.slice(0, 4), zahl = "";
    for (var n = 0; n < um.length; n++) {
      var c = um.charAt(n);
      zahl += /\d/.test(c) ? c : String(c.charCodeAt(0) - 55);
    }
    var rest = 0;
    for (var p = 0; p < zahl.length; p += 7) { rest = parseInt(String(rest) + zahl.slice(p, p + 7), 10) % 97; }
    return rest === 1 ? { ok: true, text: "Die IBAN ist gültig." } : { ok: false, text: "Die Prüfsumme stimmt nicht. Bitte prüfe die Ziffern." };
  }

  function alter(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) return null;
    var j = +m[1], mo = +m[2], t = +m[3];
    var d = new Date(j, mo - 1, t);
    if (d.getFullYear() !== j || d.getMonth() !== mo - 1 || d.getDate() !== t) return null;
    var heute = new Date();
    var a = heute.getFullYear() - j;
    if (heute.getMonth() < mo - 1 || (heute.getMonth() === mo - 1 && heute.getDate() < t)) a--;
    return a < 0 ? null : a;
  }

  function heuteIso() {
    var d = new Date();
    function z(n) { return (n < 10 ? "0" : "") + n; }
    return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate());
  }

  // ---- Bausteine -------------------------------------------------------
  function fehlerId(name) { return "mw-" + name + "-fehler"; }

  function feldFehler(name) {
    return state.fehler[name] ? h("p", { class: "feld-fehler", id: fehlerId(name) }, [state.fehler[name]]) : null;
  }

  function beschreibung(name, extra) {
    var ids = [];
    if (extra) ids.push(extra);
    if (state.fehler[name]) ids.push(fehlerId(name));
    return ids.length ? ids.join(" ") : false;
  }

  function loescheFehler(name) {
    if (state.fehler[name]) {
      delete state.fehler[name];
      var e = document.getElementById(fehlerId(name));
      if (e && e.parentNode) e.parentNode.removeChild(e);
      var i = document.getElementById("mw-" + name);
      if (i) { i.removeAttribute("aria-invalid"); }
    }
  }

  function textFeld(name, label, o) {
    o = o || {};
    var id = "mw-" + name;
    var input = h("input", {
      id: id, name: name, type: o.type || "text", value: state.d[name],
      autocomplete: o.autocomplete || "off", inputmode: o.inputmode || false,
      maxlength: o.maxlength || false, max: o.max || false, spellcheck: o.spellcheck === false ? "false" : false,
      autocapitalize: o.autocapitalize || false,
      "aria-invalid": state.fehler[name] ? "true" : false,
      "aria-describedby": beschreibung(name, o.hilfeId),
      oninput: function (ev) { state.d[name] = ev.target.value; loescheFehler(name); if (o.live) o.live(ev); },
      onblur: o.blur || null
    });
    return h("div", { class: "feld" }, [
      h("label", { for: id }, [label + (o.frei ? " (freiwillig)" : "")]),
      o.hilfe ? h("p", { class: "feld-hinweis", id: o.hilfeId }, [o.hilfe]) : null,
      input,
      feldFehler(name)
    ]);
  }

  function haken(name, inhalt, o) {
    o = o || {};
    var id = "mw-" + name;
    return h("div", { class: "feld feld-check" }, [
      h("input", {
        id: id, name: name, type: "checkbox", checked: state.d[name] ? true : false,
        "aria-invalid": state.fehler[name] ? "true" : false,
        "aria-describedby": beschreibung(name),
        onchange: function (ev) { state.d[name] = ev.target.checked; loescheFehler(name); }
      }),
      h("label", { for: id }, inhalt),
      feldFehler(name)
    ]);
  }

  // Auswahlgruppe (Optionsfelder). Das erste Feld trägt die ID "mw-<name>" (Ziel für Fehlerlinks).
  function radioFeld(name, legende, werte) {
    var fs = h("fieldset", { class: "feld feld-radio", "aria-describedby": beschreibung(name) }, [h("legend", null, [legende])]);
    werte.forEach(function (w, i) {
      var id = i === 0 ? "mw-" + name : "mw-" + name + "-" + (i + 1);
      fs.appendChild(h("div", { class: "radio-zeile" }, [
        h("input", {
          id: id, type: "radio", name: name, value: w, checked: state.d[name] === w ? true : false,
          "aria-invalid": state.fehler[name] ? "true" : false,
          onchange: function (ev) { if (ev.target.checked) { state.d[name] = w; loescheFehler(name); } }
        }),
        h("label", { for: id }, [w])
      ]));
    });
    var f = feldFehler(name);
    if (f) fs.appendChild(f);
    return fs;
  }

  function platzhalter(text) { return h("p", { class: "platzhalter-inline" }, [text]); }

  function kontaktLink() {
    return h("a", { href: "mailto:" + KONTAKT }, [KONTAKT]);
  }

  function schrittKopf(n, titel) {
    return [
      h("p", { class: "assistent-progress" }, ["Schritt " + n + " von 6"]),
      h("h2", { class: "frage", id: "mw-schritt-titel", tabindex: "-1" }, [titel])
    ];
  }

  function fehlerUebersicht() {
    var namen = Object.keys(state.fehler);
    if (!namen.length) return null;
    return h("div", { class: "fehler-uebersicht", role: "alert", id: "mw-fehler-uebersicht", tabindex: "-1" }, [
      h("p", { class: "fehler-uebersicht__titel" }, ["Bitte prüfe deine Angaben:"]),
      h("ul", null, namen.map(function (n) {
        var link = h("a", { href: "#mw-" + n, onclick: function (ev) {
          var z = document.getElementById("mw-" + n);
          if (z) { ev.preventDefault(); z.focus(); }
        } }, [state.fehler[n]]);
        return h("li", null, [link]);
      }))
    ]);
  }

  function navi(weiterText, weiter, zurueck) {
    var zeile = h("div", { class: "schritt-navi" }, []);
    if (weiter) zeile.appendChild(h("button", { type: "submit", class: "btn" }, [weiterText]));
    if (zurueck) zeile.appendChild(h("button", { type: "button", class: "assistent-back", onclick: zurueck }, ["Zurück"]));
    return zeile;
  }

  // ---- Rendern ---------------------------------------------------------
  var fokusZiel = null;   // "fehler" = Fehlerübersicht fokussieren, sonst die Überschrift
  var ersterAufbau = true; // beim ersten Laden der Seite keinen Fokus setzen (kein Springen)
  function render() {
    while (root.firstChild) root.removeChild(root.firstChild);
    var s = state.schritt;
    if (s === 1) renderFunktion();
    else if (s === 2) renderBeitrag();
    else if (s === 3) renderAngaben();
    else if (s === 4) renderSepa();
    else if (s === 5) renderPruefen();
    else renderErgebnis();
    if (ersterAufbau) { ersterAufbau = false; return; }
    var ziel = null;
    if (fokusZiel === "fehler" || (Object.keys(state.fehler).length && s !== 6)) {
      ziel = document.getElementById("mw-fehler-uebersicht");
    }
    if (!ziel) ziel = document.getElementById("mw-schritt-titel") || root;
    if (ziel) { try { ziel.focus({ preventScroll: false }); } catch (e) { ziel.focus(); } }
    fokusZiel = null;
  }

  function weiter(zu) { state.schritt = zu; state.fehler = {}; render(); }

  // Schritt 1: Funktion
  function waehle(key, detail) {
    state.kategorie = key; state.funktionDetail = detail; state.unter = null; state.fehler = {};
    state.schritt = 2; render();
  }

  function optionen(liste) {
    return h("div", { class: "optionen" }, liste.map(function (o) {
      return h("button", { type: "button", class: "option", onclick: o.aktion }, [o.text]);
    }));
  }

  function renderFunktion() {
    var u = state.unter;
    var zurueckZuStart = function () { state.unter = null; render(); };
    var kopf, liste, zurueck = null;
    if (u === null) {
      kopf = schrittKopf(1, "Welche Funktion hast du?");
      liste = [
        { text: "Rat in Gemeinde oder Stadt", aktion: function () { waehle("gemeinde_stadtrat", "Rat in Gemeinde oder Stadt"); } },
        { text: "Kreistag oder Stadtrat einer kreisfreien Stadt", aktion: function () { waehle("kreistag", "Kreistag oder Stadtrat einer kreisfreien Stadt"); } },
        { text: "Hauptamtliches Wahlamt", aktion: function () { state.unter = "wahlamt"; render(); } },
        { text: "Abgeordnete (MdL, MdB, MdEP)", aktion: function () { waehle("abgeordnete", "Abgeordnete (MdL, MdB, MdEP)"); } },
        { text: "Kommunale Bedienstete", aktion: function () { waehle("bedienstete", "Kommunale Bedienstete"); } },
        { text: "Ortsteilrat, sachkundige Bürger und Übrige", aktion: function () { state.unter = "ortsteil"; render(); } },
        { text: "Etwas anderes", aktion: function () { state.unter = "anderes"; render(); } }
      ];
    } else if (u === "wahlamt") {
      kopf = schrittKopf(1, "In welcher Verwaltung?");
      liste = [
        { text: "Gemeinde, Stadt oder Verwaltungsgemeinschaft (Bürgermeister, VG-Vorsitz, Beigeordnete)", aktion: function () { waehle("wahlamt_gemeinde", "Hauptamtliches Wahlamt: Gemeinde, Stadt oder Verwaltungsgemeinschaft"); } },
        { text: "Landkreis oder kreisfreie Stadt (Landrat, Oberbürgermeister)", aktion: function () { waehle("wahlamt_kreis", "Hauptamtliches Wahlamt: Landkreis oder kreisfreie Stadt"); } }
      ];
      zurueck = zurueckZuStart;
    } else if (u === "ortsteil") {
      kopf = schrittKopf(1, "Welche Funktion genau?");
      liste = [
        { text: "Ortsteilrat oder Ortsbeirat", aktion: function () { waehle("ortsteil", "Ortsteilrat/Ortsbeirat"); } },
        { text: "Sachkundige Bürgerin oder sachkundiger Bürger", aktion: function () { waehle("sachkundig", "Sachkundige Bürgerin/sachkundiger Bürger"); } },
        { text: "Gremium eines kommunalen Unternehmens", aktion: function () { waehle("unternehmensgremium", "Gremium eines kommunalen Unternehmens"); } },
        { text: "Andere ordentliche Mitgliedschaft", aktion: function () { waehle(UEBRIGE_KEY, "Übrige ordentliche Mitgliedschaft"); } }
      ];
      zurueck = zurueckZuStart;
    } else if (u === "anderes") {
      kopf = schrittKopf(1, "Bist du jünger als 35 Jahre?");
      liste = [
        { text: "Ja, ich bin jünger als 35", aktion: function () { waehle("junior", "Juniormitgliedschaft"); } },
        { text: "Nein, ich bin 35 oder älter", aktion: function () { state.unter = "anderes-alt"; render(); } }
      ];
      zurueck = zurueckZuStart;
    } else {
      kopf = schrittKopf(1, "Welche Mitgliedschaft möchtest du?");
      liste = [
        { text: "Übrige ordentliche Mitgliedschaft", aktion: function () { waehle(UEBRIGE_KEY, "Übrige ordentliche Mitgliedschaft"); } },
        { text: "Fördernde Mitgliedschaft (als Einzelperson)", aktion: function () { waehle("foerdernd", "Fördernde Mitgliedschaft"); } }
      ];
      zurueck = function () { state.unter = "anderes"; render(); };
    }
    kopf.forEach(function (k) { root.appendChild(k); });
    if (u === null) {
      root.appendChild(h("p", { class: "frage-unter" }, ["Wähle die Funktion, die am besten passt. Die Geschäftsstelle ordnet dich danach genau zu."]));
    }
    root.appendChild(optionen(liste));
    if (zurueck) root.appendChild(h("button", { type: "button", class: "assistent-back", onclick: zurueck }, ["Zurück"]));
  }

  // Schritt 2: Beitrag
  function renderBeitrag() {
    var k = katInfo();
    var kopf = schrittKopf(2, "Dein Beitrag");
    var form = h("form", { novalidate: true, onsubmit: function (ev) {
      ev.preventDefault();
      var e = {};
      var roh = state.d.beitrag_gewaehlt.trim();
      if (roh !== "") {
        var c = parseEuroCent(roh);
        if (c === null) e.beitrag_gewaehlt = "Bitte gib den Beitrag als Betrag in Euro je Monat an, zum Beispiel 5,00.";
        else if (c < k.cent) e.beitrag_gewaehlt = "Der Beitrag muss mindestens " + euro(k.cent) + " je Monat betragen.";
      }
      if (Object.keys(e).length) { state.fehler = e; render(); return; }
      weiter(3);
    } }, []);
    kopf.forEach(function (n) { form.appendChild(n); });
    var fu = fehlerUebersicht(); if (fu) form.appendChild(fu);

    form.appendChild(h("p", { class: "ergebnis-funktion" }, [h("strong", null, ["Mitgliedschaft: "]), k.label]));
    form.appendChild(h("div", { class: "beitrag-karte" }, [
      h("p", { class: "beitrag-zahl" }, [euro(k.cent) + " pro Monat"]),
      h("p", { class: "beitrag-einzug" }, ["Einzug quartalsweise im Voraus: " + euro(k.cent * 3) + " je Quartal (3 × Monatsbeitrag)"]),
      h("p", { class: "beitrag-quelle" }, ["Mindestbeitrag laut ", h("a", { href: "/verein/beitragsordnung/" }, ["Beitragsordnung"]), " vom 23.03.2002"])
    ]));
    if (k.bund) {
      form.appendChild(h("div", { class: "hinweis hinweis-bund" }, [
        h("p", null, ["Mit ordentlicher Mitgliedschaft führt die SGK Thüringen einen Anteil an die Bundes-SGK ab."])
      ]));
    }
    var quartal = h("p", { class: "feld-hinweis", id: "mw-beitrag-quartal", "aria-live": "polite" }, []);
    function quartalTextSetzen() {
      var c = state.d.beitrag_gewaehlt.trim() === "" ? null : parseEuroCent(state.d.beitrag_gewaehlt);
      quartal.textContent = (c !== null && c >= k.cent) ? "Das ergibt " + euro(c * 3) + " je Quartal, quartalsweise im Voraus." : "";
    }
    form.appendChild(textFeld("beitrag_gewaehlt", "Höherer Monatsbeitrag in Euro", {
      frei: true, inputmode: "decimal", hilfeId: "mw-beitrag-hilfe",
      hilfe: "Du kannst freiwillig mehr zahlen als den Mindestbeitrag, höchstens " + euro(MAX_CENT) + " je Monat.",
      live: quartalTextSetzen
    }));
    form.appendChild(quartal);
    quartalTextSetzen();
    form.appendChild(navi("Weiter", true, function () { state.schritt = 1; state.fehler = {}; render(); }));
    root.appendChild(form);
  }

  // Schritt 3: Angaben
  function renderAngaben() {
    var kopf = schrittKopf(3, "Deine Angaben");
    var istJunior = state.kategorie === "junior";
    var form = h("form", { novalidate: true, onsubmit: function (ev) {
      ev.preventDefault();
      var d = state.d, e = {};
      if (!d.anrede) e.anrede = "Bitte wähle eine Anrede aus: Frau, Herr oder ohne Angabe.";
      if (d.titel.trim().length > 40) e.titel = "Der Titel darf höchstens 40 Zeichen lang sein.";
      if (!d.vorname.trim()) e.vorname = "Bitte gib deinen Vornamen an.";
      if (!d.nachname.trim()) e.nachname = "Bitte gib deinen Nachnamen an.";
      if (!d.strasse.trim()) e.strasse = "Bitte gib deine Straße und Hausnummer an.";
      if (!/^\d{5}$/.test(d.plz.trim())) e.plz = "Bitte gib eine fünfstellige Postleitzahl an.";
      if (!d.ort.trim()) e.ort = "Bitte gib deinen Ort an.";
      if (!/^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/.test(d.email.trim())) e.email = "Bitte gib eine gültige E-Mail-Adresse an.";
      if (d.telefon.trim() && !/^[0-9+()\/ .-]{3,40}$/.test(d.telefon.trim())) e.telefon = "Bitte gib eine gültige Telefonnummer an oder lass das Feld leer.";
      if (istJunior) {
        var a = alter(d.geburtsdatum.trim());
        if (a === null) e.geburtsdatum = "Bitte gib dein Geburtsdatum an (Tag, Monat und Jahr).";
        else if (a < 18) e.geburtsdatum = "Die Mitgliedschaft ist ab 18 Jahren möglich. Schreibe uns gern an " + KONTAKT + ".";
        else if (a >= 35) e.geburtsdatum = "Die Juniormitgliedschaft ist für Personen unter 35 Jahren. Bitte gehe zurück und wähle eine andere Mitgliedschaft.";
      }
      if (!d.volljaehrig) e.volljaehrig = "Die Mitgliedschaft ist ab 18 Jahren möglich. Bitte bestätige, dass du volljährig bist, oder schreibe uns an " + KONTAKT + ".";
      if (Object.keys(e).length) { state.fehler = e; render(); return; }
      weiter(4);
    } }, []);
    kopf.forEach(function (n) { form.appendChild(n); });
    form.appendChild(h("p", { class: "frage-unter" }, ["Felder ohne den Zusatz „freiwillig“ sind Pflichtfelder."]));
    var fu = fehlerUebersicht(); if (fu) form.appendChild(fu);

    form.appendChild(radioFeld("anrede", "Anrede", ["Frau", "Herr", "ohne Angabe"]));
    form.appendChild(textFeld("titel", "Titel", { frei: true, maxlength: 40, autocomplete: "honorific-prefix", hilfeId: "mw-titel-hilfe", hilfe: "Zum Beispiel Dr." }));
    form.appendChild(textFeld("vorname", "Vorname", { autocomplete: "given-name", maxlength: 80 }));
    form.appendChild(textFeld("nachname", "Nachname", { autocomplete: "family-name", maxlength: 80 }));
    form.appendChild(textFeld("strasse", "Straße und Hausnummer", { autocomplete: "street-address", maxlength: 120 }));
    form.appendChild(textFeld("plz", "Postleitzahl", { autocomplete: "postal-code", inputmode: "numeric", maxlength: 5 }));
    form.appendChild(textFeld("ort", "Ort", { autocomplete: "address-level2", maxlength: 80 }));
    form.appendChild(textFeld("email", "E-Mail-Adresse", { type: "email", autocomplete: "email", maxlength: 254, hilfeId: "mw-email-hilfe", hilfe: "An diese Adresse schicken wir die Eingangsbestätigung." }));
    form.appendChild(textFeld("telefon", "Telefon", { type: "tel", autocomplete: "tel", frei: true, maxlength: 40 }));
    form.appendChild(textFeld("kommune_gremium", "Kommune oder Gremium", { frei: true, maxlength: 200, hilfeId: "mw-kommune-hilfe", hilfe: "Zum Beispiel die Gemeinde oder der Landkreis, in dem du kommunalpolitisch aktiv bist." }));
    if (istJunior) {
      form.appendChild(textFeld("geburtsdatum", "Geburtsdatum", { type: "date", autocomplete: "bday", max: heuteIso(), hilfeId: "mw-geb-hilfe", hilfe: "Für die Juniormitgliedschaft (unter 35 Jahren). Format: Tag, Monat, Jahr." }));
    }
    form.appendChild(haken("volljaehrig", ["Ich bin volljährig (mindestens 18 Jahre alt)."]));
    form.appendChild(navi("Weiter", true, function () { state.schritt = 2; state.fehler = {}; render(); }));
    root.appendChild(form);
  }

  // Schritt 4: SEPA-Mandat
  function renderSepa() {
    var kopf = schrittKopf(4, "SEPA-Lastschriftmandat");
    var ibanStatus = h("p", { class: "iban-status", id: "mw-iban-status", "aria-live": "polite" }, []);
    function statusSetzen(final) {
      var p = ibanPruefung(state.d.iban);
      ibanStatus.className = "iban-status" + (p.ok ? " iban-status--ok" : "");
      if (p.ok || final || (p.text && !p.unfertig)) ibanStatus.textContent = p.text;
      else ibanStatus.textContent = "";
    }
    var form = h("form", { novalidate: true, onsubmit: function (ev) {
      ev.preventDefault();
      var e = {};
      var p = ibanPruefung(state.d.iban);
      if (!p.ok) e.iban = p.text || "Bitte gib deine IBAN an.";
      if (!state.d.sepa_zustimmung) e.sepa_zustimmung = "Bitte stimme dem SEPA-Lastschriftmandat zu.";
      if (Object.keys(e).length) { state.fehler = e; render(); return; }
      weiter(5);
    } }, []);
    kopf.forEach(function (n) { form.appendChild(n); });
    var fu = fehlerUebersicht(); if (fu) form.appendChild(fu);

    form.appendChild(textFeld("kontoinhaber", "Kontoinhaber:in, falls abweichend", {
      frei: true, maxlength: 100, autocomplete: "off", hilfeId: "mw-kontoinhaber-hilfe",
      hilfe: "Wenn du das Feld leer lässt, nehmen wir deinen Namen."
    }));
    var ibanFeld = textFeld("iban", "IBAN", {
      autocomplete: "off", spellcheck: false, autocapitalize: "characters", hilfeId: "mw-iban-hilfe",
      hilfe: "Eine deutsche IBAN (22 Stellen), Leerzeichen sind erlaubt.",
      live: function () { statusSetzen(false); },
      blur: function () { statusSetzen(true); }
    });
    form.appendChild(ibanFeld);
    form.appendChild(ibanStatus);
    statusSetzen(false);

    var mandat = h("div", { class: "mandat" }, [h("h3", null, ["Mandatstext"])]);
    if (MANDATSTEXT.length) MANDATSTEXT.forEach(function (a) { mandat.appendChild(h("p", null, [a])); });
    else mandat.appendChild(platzhalter("TODO André: Wortlaut des SEPA-Lastschriftmandats aus dem Papierantrag, Seite 2, fehlt noch (Datei liegt nicht im Projekt)."));
    form.appendChild(mandat);
    form.appendChild(h("dl", { class: "mandat-daten" }, [
      h("dt", null, ["Gläubiger-ID"]), h("dd", null, [GLAEUBIGER_ID]),
      h("dt", null, ["Mandatsreferenz"]), h("dd", null, ["wird nach der Aufnahme mitgeteilt"]),
      h("dt", null, ["Zahlungsart"]), h("dd", null, ["wiederkehrend, quartalsweise im Voraus"])
    ]));
    form.appendChild(haken("sepa_zustimmung", ["Ich stimme dem SEPA-Lastschriftmandat zu."]));
    form.appendChild(navi("Weiter", true, function () { state.schritt = 3; state.fehler = {}; render(); }));
    root.appendChild(form);
  }

  // Schritt 5: Prüfen und Absenden
  function renderPruefen() {
    var k = katInfo(), d = state.d;
    var kopf = schrittKopf(5, "Prüfen und absenden");
    var gew = gewaehlterCent();
    var form = h("form", { novalidate: true, onsubmit: function (ev) {
      ev.preventDefault();
      if (state.senden) return;
      if (!state.d.pflichterklaerung) {
        state.fehler = { pflichterklaerung: "Bitte bestätige die Erklärung, um den Antrag abzuschicken." };
        render(); return;
      }
      absenden();
    } }, []);
    kopf.forEach(function (n) { form.appendChild(n); });
    var fu = fehlerUebersicht(); if (fu) form.appendChild(fu);

    var zeilen = [
      ["Mitgliedschaft", k.label],
      ["Beitrag", euro(gew) + " pro Monat" + (gew > k.cent ? " (höher gewählt)" : " (Mindestbeitrag)")],
      ["Einzug", euro(gew * 3) + " je Quartal, quartalsweise im Voraus"],
      ["Name", [d.anrede && d.anrede !== "ohne Angabe" ? d.anrede : "", d.titel.trim(), d.vorname.trim(), d.nachname.trim()].filter(Boolean).join(" ")],
      ["Anschrift", d.strasse.trim() + ", " + d.plz.trim() + " " + d.ort.trim()],
      ["E-Mail", d.email.trim()]
    ];
    if (d.telefon.trim()) zeilen.push(["Telefon", d.telefon.trim()]);
    if (d.kommune_gremium.trim()) zeilen.push(["Kommune oder Gremium", d.kommune_gremium.trim()]);
    if (state.kategorie === "junior") zeilen.push(["Geburtsdatum", d.geburtsdatum.slice(8, 10) + "." + d.geburtsdatum.slice(5, 7) + "." + d.geburtsdatum.slice(0, 4)]);
    zeilen.push(["Kontoinhaber:in", d.kontoinhaber.trim() || (d.vorname.trim() + " " + d.nachname.trim())]);
    zeilen.push(["IBAN", "endet auf " + ibanNormal(d.iban).slice(-4)]);
    var dl = h("dl", { class: "zusammenfassung" }, []);
    zeilen.forEach(function (z) { dl.appendChild(h("dt", null, [z[0]])); dl.appendChild(h("dd", null, [z[1]])); });
    form.appendChild(dl);

    // Erklärung zu Grundsätzen/Aufnahmeantrag (Pflicht)
    var erklaerung = [];
    if (GRUNDSAETZE_TEXT) erklaerung.push(GRUNDSAETZE_TEXT);
    else erklaerung.push("[TODO André: Wortlaut der Erklärung aus dem Papierantrag fehlt noch] Ich erkenne die Grundsätze an und stelle den Antrag auf Aufnahme.");
    form.appendChild(haken("pflichterklaerung", erklaerung));

    // Datenschutz-Kurztext (Wortlaut: datenschutz-text-2026-11-19.md, "Kurztext für Formular und Papierantrag";
    // nur der letzte Satz verweist hier auf /datenschutz/#mitgliedsantrag). Zwei Absätze, je höchstens drei Sätze.
    form.appendChild(h("p", { class: "feld-hinweis" }, [
      "Die SGK Thüringen verarbeitet die Angaben im Antrag zur Bearbeitung des Aufnahmeantrags, zur Mitgliederverwaltung und zum Einzug der Beiträge per SEPA-Lastschrift (Art. 6 Abs. 1 lit. b DSGVO). Bei ordentlicher Mitgliedschaft wird der Antrag auf Beitritt zur Bundes-SGK an diese weitergeleitet (§ 3 Abs. 3 der Satzung)."
    ]));
    form.appendChild(h("p", { class: "feld-hinweis" }, [
      "Einladungen zu Veranstaltungen per E-Mail erfolgen nur mit Einwilligung, die jederzeit widerrufen werden kann. Weitere Informationen stehen in der ",
      h("a", { href: "/datenschutz/#mitgliedsantrag" }, ["Datenschutzerklärung"]), "."
    ]));
    form.appendChild(haken("einladungen_email", ["Ich bin einverstanden, Einladungen zu Veranstaltungen per E-Mail zu erhalten."]));
    form.appendChild(h("p", { class: "feld-hinweis" }, ["Dieses Häkchen ist freiwillig."]));

    form.appendChild(h("div", { class: "hinweis" }, [
      h("p", null, ["Über die Aufnahme entscheidet der Vorstand (§ 3 Abs. 2 Satzung). Die Mitgliedschaft entsteht erst mit diesem Beschluss."])
    ]));
    form.appendChild(h("div", { class: "hinweis" }, [
      h("p", null, ["Der Erstbeitrag wird voraussichtlich für das Quartal nach dem Eintritt fällig. Eintritt ist der Tag der Aufnahme."])
    ]));
    form.appendChild(h("div", { class: "hinweis" }, [
      h("p", null, ["Der Austritt ist schriftlich möglich, mit einer Frist von sechs Monaten zum Jahresende (§ 3 Abs. 6 Satzung)."])
    ]));

    // Honeypot: Menschen sehen und erreichen das Feld nicht, Bots füllen es aus.
    form.appendChild(h("div", { class: "mw-hp", "aria-hidden": "true" }, [
      h("label", { for: "mw-hp" }, ["Bitte leer lassen"]),
      h("input", { id: "mw-hp", name: "hp", type: "text", tabindex: "-1", autocomplete: "off", value: state.d.hp,
        oninput: function (ev) { state.d.hp = ev.target.value; } })
    ]));

    form.appendChild(h("div", { class: "schritt-navi" }, [
      h("button", { type: "submit", class: "btn", id: "mw-absenden" }, ["Antrag stellen"]),
      h("button", { type: "button", class: "assistent-back", onclick: function () { state.schritt = 4; state.fehler = {}; render(); } }, ["Zurück"])
    ]));
    root.appendChild(form);
  }

  // ---- Absenden --------------------------------------------------------
  function payload() {
    var d = state.d, k = katInfo();
    var p = {
      kategorie: state.kategorie,
      funktion_detail: state.funktionDetail,
      anrede: d.anrede,
      titel: d.titel.trim(),
      volljaehrig: d.volljaehrig === true,
      vorname: d.vorname.trim(), nachname: d.nachname.trim(),
      email: d.email.trim(), strasse: d.strasse.trim(), plz: d.plz.trim(), ort: d.ort.trim(),
      telefon: d.telefon.trim(),
      kommune_gremium: d.kommune_gremium.trim(),
      iban: ibanNormal(d.iban),
      kontoinhaber: d.kontoinhaber.trim() || (d.vorname.trim() + " " + d.nachname.trim()),
      sepa_zustimmung: d.sepa_zustimmung === true,
      pflichterklaerung: d.pflichterklaerung === true,
      einladungen_email: d.einladungen_email === true,
      sepa_text_version: SEPA_TEXT_VERSION,
      hp: d.hp,
      t: state.startT
    };
    if (state.kategorie === "junior") p.geburtsdatum = d.geburtsdatum.trim();
    var gew = gewaehlterCent();
    if (gew > k.cent) p.beitrag_gewaehlt = (gew / 100).toFixed(2);
    return p;
  }

  function ergebnisFehler(titel, text, zurueckZu) {
    state.ergebnis = { art: "fehler", titel: titel, text: text, zurueck: zurueckZu || 5 };
    state.senden = false; state.schritt = 6; render();
  }

  function absenden() {
    state.senden = true;
    state.ergebnis = { art: "senden" };
    state.schritt = 6; render();

    var ctrl = typeof AbortController === "function" ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 20000) : null;
    var status = 0;
    fetch(ENDPOINT, {
      method: "POST", mode: "cors", credentials: "omit", cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload()),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      status = res.status;
      return res.json().catch(function () { return null; });
    }).then(function (body) {
      if (timer) clearTimeout(timer);
      verarbeiteAntwort(status, body);
    }).catch(function () {
      if (timer) clearTimeout(timer);
      ergebnisFehler("Das hat leider nicht geklappt",
        "Die Verbindung zum Server ist fehlgeschlagen. Deine Eingaben sind noch da. Bitte versuche es gleich noch einmal oder schreibe an " + KONTAKT + ".");
    });
  }

  function verarbeiteAntwort(status, body) {
    if (body && body.ok === true) {
      var id = body.id;
      state = neuerZustand();                       // alle Eingaben löschen
      state.schritt = 6;
      state.ergebnis = { art: "ok", id: (typeof id === "number" && id > 0) ? id : null };
      render();
      return;
    }
    var fehler = body && body.fehler && typeof body.fehler === "object" ? body.fehler : null;
    var allgemein = fehler && typeof fehler._allgemein === "string" ? fehler._allgemein : "";
    var felder = fehler ? Object.keys(fehler).filter(function (n) { return n !== "_allgemein"; }) : [];

    if (felder.length) {
      // Feldfehler: zum ersten betroffenen Schritt springen und dort anzeigen.
      var kleinster = 6;
      felder.forEach(function (n) { kleinster = Math.min(kleinster, SCHRITT_VON_FELD[n] || 5); });
      state.fehler = {};
      felder.forEach(function (n) {
        if ((SCHRITT_VON_FELD[n] || 5) === kleinster && typeof fehler[n] === "string") state.fehler[n] = fehler[n];
      });
      if (!Object.keys(state.fehler).length) state.fehler.pflichterklaerung = "Bitte prüfe deine Angaben.";
      state.senden = false; state.ergebnis = null; state.schritt = kleinster; fokusZiel = "fehler"; render();
      return;
    }
    // Allgemeiner Fehler (z. B. zu schnell, zu viele Anfragen, Serverfehler): Text vom Server, sonst Standardtext.
    var text = allgemein;
    if (!text) {
      if (status === 429) text = "Es gab sehr viele Anfragen. Bitte versuche es später noch einmal.";
      else text = "Dein Antrag konnte gerade nicht verarbeitet werden. Bitte versuche es später noch einmal oder schreibe an " + KONTAKT + ".";
    }
    ergebnisFehler("Das hat leider nicht geklappt", text);
  }

  // Schritt 6: Ergebnis
  function renderErgebnis() {
    var r = state.ergebnis || { art: "senden" };
    if (r.art === "senden") {
      root.appendChild(h("p", { class: "assistent-progress" }, ["Schritt 6 von 6"]));
      root.appendChild(h("h2", { class: "frage", id: "mw-schritt-titel", tabindex: "-1", role: "status" }, ["Dein Antrag wird gesendet …"]));
      root.appendChild(h("p", null, ["Bitte warte einen Moment und lade die Seite nicht neu."]));
    } else if (r.art === "ok") {
      root.appendChild(h("p", { class: "assistent-progress" }, ["Schritt 6 von 6"]));
      root.appendChild(h("h2", { class: "frage", id: "mw-schritt-titel", tabindex: "-1" }, ["Dein Antrag ist eingegangen"]));
      root.appendChild(h("p", null, ["Vielen Dank! Die Bestätigung kommt in Kürze per E-Mail."]));
      root.appendChild(h("p", null, ["Über die Aufnahme entscheidet der Vorstand. Mandatsreferenz und Einzugstermine teilen wir dir mit der Aufnahmebestätigung mit."]));
      if (r.id) root.appendChild(h("p", { class: "feld-hinweis" }, ["Deine Antragsnummer: " + r.id]));
      root.appendChild(h("p", null, [h("a", { class: "btn", href: "/" }, ["Zur Startseite"])]));
    } else {
      root.appendChild(h("p", { class: "assistent-progress" }, ["Schritt 6 von 6"]));
      root.appendChild(h("h2", { class: "frage", id: "mw-schritt-titel", tabindex: "-1" }, [r.titel]));
      root.appendChild(h("p", { role: "alert" }, [r.text]));
      root.appendChild(h("p", null, ["Kontakt: ", kontaktLink()]));
      root.appendChild(h("div", { class: "schritt-navi" }, [
        h("button", { type: "button", class: "btn", onclick: function () { state.ergebnis = null; state.schritt = r.zurueck; state.fehler = {}; render(); } }, ["Zurück zum Antrag"])
      ]));
    }
  }

  render();
})();
