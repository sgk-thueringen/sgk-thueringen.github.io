/* =====================================================================
   mitglied-werden.js — geführter Beitritt (Entscheidungsbaum, Variante B)
   Exakt nach FORMULAR-MITGLIED-WERDEN.md. Rein clientseitig, keine
   externen Requests. Absenden per mailto (Übergangslösung) + Kopieren.
   ===================================================================== */
(function () {
  "use strict";

  // Adresse zerlegt, damit sie nicht als vollständiger String im Quelltext steht
  // (Spam-Schutz, konsistent mit js/mailto.js). Zusammenbau erst zur Laufzeit.
  var MAILTO = "SGK-Thueringen" + "@" + "t-online.de";

  // Kategorien: Label, Satzungsstelle, Bundes-SGK-Kopplung, Ortsfeld-Label, Organisationsfeld
  var CATS = {
    "ordentlich": {
      label: "Ordentliche Mitgliedschaft", para: "§ 3 Abs. 1 Nr. 1–7",
      bund: true, org: false,
      ort: "Gemeinde/Stadt/Landkreis, in der/dem du kommunalpolitisch aktiv bist"
    },
    "junior": {
      label: "Juniormitgliedschaft", para: "§ 3 Abs. 1 Nr. 8",
      bund: false, org: false,
      ort: "Gemeinde/Stadt/Landkreis, in der/dem du kommunalpolitisch aktiv bist",
      note: "Wandelt sich mit Vollendung des 35. Lebensjahres automatisch in eine ordentliche Mitgliedschaft."
    },
    "foerdernd-org": {
      label: "Fördernde Mitgliedschaft (Organisation)", para: "§ 3 Abs. 4",
      bund: false, org: true, ort: "Sitz der Organisation"
    },
    "foerdernd-privat": {
      label: "Fördernde Mitgliedschaft", para: "§ 3 Abs. 4",
      bund: false, org: false, ort: "Wohnort"
    }
  };

  // Funktions-Buttons (Frage 2), abgeleitet aus § 3 Abs. 1 Nr. 1–7.
  // Alle führen zu ordentlicher Mitgliedschaft. fkt = gespeicherte Kurzbezeichnung.
  var FUNKTIONEN = [
    // Aufzählung bewusst NICHT abschließend ("z. B."): neben Gemeinde-, Stadt- und
    // Kreisebene kommen auch Ortschafts- und Ortsteilräte sowie Verbandsversammlungen
    // in Betracht. Der Oberbegriff "kommunale Vertretung" bleibt deshalb stehen.
    { fkt: "Mandat in kommunaler Vertretung", text: "Mandat in einer kommunalen Vertretung (z. B. Gemeinderat, Stadtrat, Kreistag, Ortschaftsrat)" },
    { fkt: "Ortsteil-/Ortschaftsebene", text: "Ortsteil-/Ortschaftsbürgermeister:in oder Mitglied eines Ortsteil-/Ortschaftsrats" },
    { fkt: "Sachkundige:r Bürger:in / Unternehmensgremium", text: "Sachkundige:r Bürger:in im Ausschuss oder Mitglied in einem kommunalen Unternehmensgremium" },
    { fkt: "Beschäftigung im kommunalen Bereich", text: "Beschäftigt bei einer Kommune, einem kommunalen Unternehmen oder Spitzenverband" },
    // Klammer bewusst am Wort "Fraktion": gemeint ist die PARLAMENTARISCHE Ebene
    // (§ 3 Abs. 1 Nr. 4). Ohne diesen Zusatz wuerden kommunale sachkundige Buerger:innen
    // — die ebenfalls der SPD-Fraktion im Rat angehoeren (Nr. 1, Button "Sachkundige:r
    // Buerger:in") — faelschlich hier landen. Regierung = Landes-/Bundesregierung (Nr. 5).
    { fkt: "SPD-Fraktion / -Regierung", text: "Mitglied einer SPD-Fraktion (Landtag, Bundestag, Europäisches Parlament) oder SPD-Mitglied in der Landes- oder Bundesregierung" },
    { fkt: "Kommunalpolitisch engagiert", text: "In der Kommunalpolitik besonders engagiert (ohne festes Mandat)" }
  ];

  var root;
  var state = { step: "q1", category: null, funktion: null, funktionDetail: "", data: {} };
  var hist = [];

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function go(step, category) {
    hist.push({ step: state.step, category: state.category });
    state.step = step;
    if (typeof category !== "undefined") state.category = category;
    render();
  }
  function back() {
    var p = hist.pop();
    if (p) { state.step = p.step; state.category = p.category; render(); }
  }

  function backBtn() {
    return hist.length
      ? '<button type="button" class="assistent-back" data-act="back">&larr; Zurück</button>'
      : "";
  }
  function progress(n) {
    return '<p class="assistent-progress">Schritt ' + n + ' von 3</p>';
  }

  // ---- Schritte ----
  function viewQ1() {
    return progress(1) +
      '<h2 class="frage" tabindex="-1">Möchtest du als Person beitreten oder für eine Organisation?</h2>' +
      '<div class="optionen">' +
        '<button type="button" class="option" data-act="go" data-step="q2">Als Person</button>' +
        '<button type="button" class="option" data-act="cat" data-cat="foerdernd-org">Für eine Organisation / ein Unternehmen</button>' +
      '</div>' + backBtn();
  }
  function viewQ2() {
    var opts = FUNKTIONEN.map(function (f) {
      return '<button type="button" class="option" data-act="funktion" data-fkt="' + esc(f.fkt) + '">' + esc(f.text) + '</button>';
    }).join("");
    return progress(2) +
      '<h2 class="frage" tabindex="-1">Was trifft auf dich zu?</h2>' +
      '<p class="frage-unter">Wähle deine kommunalpolitische Funktion — sie hilft uns bei der Zuordnung deiner Mitgliedschaft.</p>' +
      '<div class="optionen">' + opts +
        '<button type="button" class="option option-auffang" data-act="go" data-step="q3">Etwas anderes / ohne Funktion</button>' +
      '</div>' +
      '<div class="feld feld-optional">' +
        '<label for="fkt-detail">Genauere Bezeichnung <span class="pflicht">(freiwillig)</span></label>' +
        '<input id="fkt-detail" type="text" value="' + esc(state.funktionDetail || "") + '" autocomplete="off" ' +
        'placeholder="z. B. Ortsteilbürgermeisterin, Fraktionsvorsitzender">' +
        '<p class="feld-hinweis">Weitere Funktionen kannst du hier ergänzen.</p>' +
      '</div>' + backBtn();
  }
  function viewQ3() {
    return progress(3) +
      '<h2 class="frage" tabindex="-1">Bist du jünger als 35 Jahre?</h2>' +
      '<div class="optionen">' +
        '<button type="button" class="option" data-act="cat" data-cat="junior">Ja</button>' +
        '<button type="button" class="option" data-act="cat" data-cat="foerdernd-privat">Nein</button>' +
      '</div>' + backBtn();
  }

  function viewResult() {
    var c = CATS[state.category];
    var h = '<h2 class="ergebnis-titel" tabindex="-1">Deine Mitgliedschaft</h2>' +
      '<div class="ergebniskarte">' +
        '<p class="ergebnis-kat"><strong>' + esc(c.label) + '</strong> <span class="para">' + esc(c.para) + '</span></p>' +
        (c.note ? '<p class="ergebnis-note">' + esc(c.note) + '</p>' : "") +
        ((state.category === "ordentlich" && state.funktion)
          ? '<p class="ergebnis-funktion"><strong>Funktion:</strong> ' + esc(state.funktion) +
            (state.funktionDetail ? ' <span class="para">(' + esc(state.funktionDetail) + ')</span>' : "") + '</p>'
          : "") +
        '<p class="beitrag"><span class="beitrag-label">Beitrag:</span> <span class="platzhalter-inline">Beitrag wird derzeit bestätigt</span></p>';

    if (c.bund) {
      h += '<div class="hinweis hinweis-bund"><h3>Hinweis zur Bundes-SGK</h3>' +
        '<p>Mit der ordentlichen Mitgliedschaft ist der Antrag auf Beitritt zur Bundes-SGK ' +
        'verbunden (§ 3 Abs. 3 der Satzung). Dabei werden deine Angaben an die Bundes-SGK ' +
        '(Sitz Berlin) weitergegeben. Näheres regelt die ' +
        '<a href="/datenschutz/">Datenschutzerklärung</a>.</p></div>';
    }

    h += '<div class="hinweis hinweis-aufnahme"><h3>Aufnahme &amp; Beschwerderecht</h3>' +
      '<p>Über die Aufnahme entscheidet der Vorstand; diese Aufgabe kann dem ' +
      'geschäftsführenden Vorstand übertragen werden (§ 3 Abs. 2). Gegen eine ablehnende ' +
      'Entscheidung des geschäftsführenden Vorstandes kann Beschwerde eingelegt werden; ' +
      'darüber entscheidet der Vorstand.</p></div>';

    h += '<div class="optionen optionen-inline">' +
        '<button type="button" class="btn" data-act="go" data-step="form">Antrag stellen &rarr;</button>' +
      '</div>' +
    '</div>' + backBtn();
    return h;
  }

  function field(id, label, type, value) {
    return '<div class="feld">' +
      '<label for="' + id + '">' + esc(label) + ' <span class="pflicht">(Pflicht)</span></label>' +
      '<input id="' + id + '" name="' + id + '" type="' + type + '" value="' + esc(value || "") + '" ' +
      'autocomplete="' + (type === "email" ? "email" : "off") + '" required>' +
      '<p class="feld-fehler" id="' + id + '-fehler" hidden></p>' +
    '</div>';
  }

  function viewForm() {
    var c = CATS[state.category];
    var d = state.data;
    var h = '<h2 class="form-titel" tabindex="-1">Deine Angaben</h2>' +
      '<p class="form-kat">' + esc(c.label) + ' <span class="para">' + esc(c.para) + '</span></p>' +
      '<form id="antrag" novalidate>' +
        field("vorname", "Vorname", "text", d.vorname) +
        field("nachname", "Nachname", "text", d.nachname) +
        field("email", "E-Mail", "email", d.email) +
        field("ort", c.ort, "text", d.ort) +
        (c.org ? field("orgname", "Name der Organisation", "text", d.orgname) : "") +
        '<div class="hinweis hinweis-news">' +
          '<h3>Info-Brief</h3>' +
          '<p>Unseren Info-Brief kannst du <a href="/newsletter/">separat abonnieren</a>. ' +
          'Er ist nicht Teil dieses Antrags.</p>' +
        '</div>' +
        '<div class="absenden">' +
          '<button type="submit" class="btn" data-act="submit">Antrag als E-Mail vorbereiten</button>' +
          '<p class="absenden-hinweis">Es öffnet sich Ihr E-Mail-Programm — bitte senden Sie ' +
            'die vorbereitete Nachricht ab.</p>' +
          '<button type="button" class="btn btn-sekundaer" data-act="copy">Zusammenfassung kopieren</button>' +
          '<p class="kopiert" id="kopiert" hidden>Zusammenfassung kopiert.</p>' +
        '</div>' +
      '</form>' + backBtn();
    return h;
  }

  // ---- Zusammenfassung / mailto ----
  function collect() {
    var d = {};
    ["vorname", "nachname", "email", "ort", "orgname"].forEach(function (k) {
      var el = document.getElementById(k);
      if (el) d[k] = el.value.trim();
    });
    return d;
  }
  function validate(d) {
    var c = CATS[state.category], errors = {};
    if (!d.vorname) errors.vorname = "Bitte den Vornamen angeben.";
    if (!d.nachname) errors.nachname = "Bitte den Nachnamen angeben.";
    if (!d.email) errors.email = "Bitte eine E-Mail-Adresse angeben.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) errors.email = "Bitte eine gültige E-Mail-Adresse angeben.";
    if (!d.ort) errors.ort = "Bitte dieses Feld ausfüllen.";
    if (c.org && !d.orgname) errors.orgname = "Bitte den Namen der Organisation angeben.";
    return errors;
  }
  function showErrors(errors) {
    var first = null;
    ["vorname", "nachname", "email", "ort", "orgname"].forEach(function (k) {
      var inp = document.getElementById(k), msg = document.getElementById(k + "-fehler");
      if (!inp || !msg) return;
      if (errors[k]) {
        msg.textContent = errors[k]; msg.hidden = false;
        inp.setAttribute("aria-invalid", "true");
        inp.setAttribute("aria-describedby", k + "-fehler");
        if (!first) first = inp;
      } else {
        msg.hidden = true; inp.removeAttribute("aria-invalid"); inp.removeAttribute("aria-describedby");
      }
    });
    if (first) first.focus();
  }
  function summaryText(d) {
    var c = CATS[state.category];
    var lines = [
      "Mitgliedsantrag",
      "",
      "Gewünschte Mitgliedschaft: " + c.label + " (" + c.para + ")"
    ];
    if (state.category === "ordentlich" && state.funktion) {
      lines.push("Funktion: " + state.funktion);
      if (state.funktionDetail) lines.push("Genauere Bezeichnung: " + state.funktionDetail);
    }
    lines.push("Vorname: " + d.vorname);
    lines.push("Nachname: " + d.nachname);
    lines.push("E-Mail: " + d.email);
    lines.push(c.ort + ": " + d.ort);
    if (c.org) lines.push("Name der Organisation: " + d.orgname);
    lines.push("");
    lines.push("Hinweis: Über die Aufnahme entscheidet der Vorstand (§ 3 Abs. 2 der Satzung).");
    return lines.join("\r\n");
  }
  // Dynamischer Betreff; Fallback auf "Mitgliedsantrag", wenn ein Wert fehlt.
  function subjectText(d) {
    var s;
    if (state.category === "foerdernd-org") {
      if (d.orgname && d.ort) s = "Mitgliedsantrag " + d.orgname + ", " + d.ort;
    } else {
      if (d.vorname && d.nachname && d.ort) s = "Mitgliedsantrag " + d.vorname + " " + d.nachname + ", " + d.ort;
    }
    return s || "Mitgliedsantrag";
  }
  function openMailto(d) {
    var href = "mailto:" + MAILTO +
      "?subject=" + encodeURIComponent(subjectText(d)) +
      "&body=" + encodeURIComponent(summaryText(d));
    window.location.href = href;
  }
  function copySummary(d) {
    var text = summaryText(d), done = document.getElementById("kopiert");
    function ok() { if (done) { done.hidden = false; } }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok, function () { fallbackCopy(text, ok); });
    } else { fallbackCopy(text, ok); }
  }
  function fallbackCopy(text, ok) {
    var ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "absolute"; ta.style.left = "-9999px";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); ok(); } catch (e) {}
    document.body.removeChild(ta);
  }

  // ---- Rendern + Ereignisse ----
  function render() {
    var html;
    switch (state.step) {
      case "q1": html = viewQ1(); break;
      case "q2": html = viewQ2(); break;
      case "q3": html = viewQ3(); break;
      case "result": html = viewResult(); break;
      case "form": html = viewForm(); break;
      default: html = viewQ1();
    }
    root.innerHTML = html;
    var head = root.querySelector("[tabindex='-1']");
    if (head) head.focus();
  }

  function onClick(e) {
    var t = e.target.closest("[data-act]");
    if (!t || !root.contains(t)) return;
    var act = t.getAttribute("data-act");
    if (act === "go") {
      var step = t.getAttribute("data-step");
      if (step === "q3") { state.funktion = null; state.funktionDetail = ""; } // Auffang-Weg: keine Funktion
      go(step);
    }
    else if (act === "funktion") {
      var detail = document.getElementById("fkt-detail");
      state.funktionDetail = detail ? detail.value.trim() : "";
      state.funktion = t.getAttribute("data-fkt");
      go("result", "ordentlich");
    }
    else if (act === "cat") { go("result", t.getAttribute("data-cat")); }
    else if (act === "back") { back(); }
    else if (act === "copy") { copySummary(collect()); }
  }
  function onSubmit(e) {
    var form = e.target.closest("#antrag");
    if (!form) return;
    e.preventDefault();
    var d = collect();
    var errors = validate(d);
    if (Object.keys(errors).length) { showErrors(errors); return; }
    state.data = d;
    openMailto(d);
  }

  function init() {
    root = document.getElementById("assistent");
    if (!root) return;
    root.addEventListener("click", onClick);
    root.addEventListener("submit", onSubmit);
    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
