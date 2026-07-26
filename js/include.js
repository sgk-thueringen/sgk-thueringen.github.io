/* =====================================================================
   include.js — fügt Header/Footer-Partials clientseitig ein.
   Muster: fetch(partials/<name>.html) -> innerHTML in [data-include].
   Danach: aktiven Navigationspunkt markieren.
   Kein Framework, keine externen Requests (nur eigene Partials).
   ===================================================================== */
(function () {
  "use strict";

  // Version der Partials — an die Fetch-URL angehängt, damit geänderte Header/Footer
  // ohne hartes Neuladen ankommen. Bei Änderung an einem Partial hochzählen (und die
  // Versionsnummer von include.js selbst in den Seiten mit anheben).
  var ASSET_V = "4";

  function markActive() {
    var nav = document.getElementById("hauptnav");
    if (!nav) return;
    // aktuellen Pfad normalisieren: ohne "index.html", mit fuehrendem/abschliessendem "/"
    var path = location.pathname.replace(/index\.html$/, "");
    if (path === "") path = "/";
    if (path.length > 1 && path.charAt(path.length - 1) !== "/") path += "/";

    var links = nav.querySelectorAll("a[href]");
    var bestEl = null, bestLen = -1;
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute("href");
      if (href.charAt(0) !== "/") continue;           // nur interne Root-Pfade
      if (href.length > 1 && href.charAt(href.length - 1) !== "/") href += "/";
      var match = (href === "/") ? (path === "/") : (path.indexOf(href) === 0);
      // laengste passende Uebereinstimmung gewinnt (z. B. /verein/vorstand/ vor /verein/)
      if (match && href.length > bestLen) { bestEl = links[i]; bestLen = href.length; }
    }
    if (bestEl) {
      bestEl.setAttribute("aria-current", "page");
      bestEl.classList.add("is-active");
      // Liegt der aktive Link in einem Untermenü, auch den Auslöser-Button markieren
      var parent = bestEl.closest ? bestEl.closest(".hasmenu") : null;
      if (parent) {
        var t = parent.querySelector(".hauptnav__toggle");
        if (t) t.classList.add("is-active");
      }
    }
  }

  // ---- Untermenü „Verein" (Disclosure). Öffnen/Schließen ausschließlich per Klick
  //      bzw. Tastatur (nativer <button>: Enter/Leertaste). Kein Öffnen per Hover.
  //      Schließt in vier Fällen: (1) erneuter Klick auf „Verein", (2) Klick/Tipp
  //      außerhalb, (3) Escape (Fokus zurück auf „Verein"), (4) Fokus verlässt das
  //      Menü per Tab. aria-expanded wird bei jedem Wechsel gesetzt. ----
  function initMenu() {
    var box = document.querySelector(".hasmenu");
    if (!box) return;
    var toggle = box.querySelector(".hauptnav__toggle");
    var sub = box.querySelector(".hauptnav__sub");
    if (!toggle || !sub) return;

    // Einzige Quelle der Wahrheit: aria-expanded am Auslöser. Die Sichtbarkeit des
    // Untermenüs steuert allein das CSS darüber (kein hidden/kein inline-style/keine Klasse).
    function setOpen(open) {
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    }
    function isOpen() { return toggle.getAttribute("aria-expanded") === "true"; }

    // (1) Umschalten. stopPropagation: der Öffnungsklick darf den Außen-Klick-Handler
    //     (unten am document) nicht auslösen — sonst schließt dieselbe Geste sofort wieder.
    toggle.addEventListener("click", function (e) {
      e.stopPropagation();
      setOpen(!isOpen());
    });

    // (3) Escape schließt und setzt den Fokus zurück auf „Verein".
    box.addEventListener("keydown", function (e) {
      if ((e.key === "Escape" || e.key === "Esc") && isOpen()) { setOpen(false); toggle.focus(); }
    });

    // (4) Fokus verlässt das Menü (z. B. per Tab hinter den letzten Eintrag) -> schließen.
    box.addEventListener("focusout", function (e) {
      if (!e.relatedTarget || !box.contains(e.relatedTarget)) setOpen(false);
    });

    // (2) Klick oder Tipp außerhalb des Menüs schließt.
    document.addEventListener("click", function (e) {
      if (isOpen() && !box.contains(e.target)) setOpen(false);
    });

    // Untermenü-Link angeklickt -> Menü schließen (kein hängender Zustand vor dem Wechsel).
    sub.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest("a")) setOpen(false);
    });
  }

  function inject(el) {
    var name = el.getAttribute("data-include");
    if (!name) return;
    fetch("/partials/" + name + ".html?v=" + ASSET_V)
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (html) {
        el.innerHTML = html;
        if (name === "header") { markActive(); initMenu(); }
      })
      .catch(function () {
        // Fallback bleibt der im Platzhalter enthaltene <noscript>-Inhalt / statische Links
      });
  }

  // ---- Staging-Feedback-Widget: Link zum Google-Formular des Vereins, beim Klick
  //      dynamisch mit der aktuellen Seiten-URL vorausgefüllt. Kein iframe/Embed/
  //      Google-Skript. Vor Livegang entfernen: diese eine Zeile in run() streichen
  //      und partials/feedback.html löschen (siehe OFFENE-PUNKTE I4). ----
  var FEEDBACK_ENTRY = "entry.1652826813"; // Formularfeld „Welche Seite?"
  function initFeedback() {
    fetch("/partials/feedback.html?v=" + ASSET_V)
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (html) {
        var host = document.createElement("div");
        host.innerHTML = html;
        document.body.appendChild(host);
        var btn = document.getElementById("sgk-feedback-btn");
        if (btn) btn.addEventListener("click", function (e) {
          e.preventDefault();
          // Basis-URL aus dem HTML lesen, Prefill erst hier bauen -> je Seite korrekt
          var base = btn.getAttribute("href");
          var url = base + "&" + FEEDBACK_ENTRY + "=" + encodeURIComponent(window.location.href);
          window.open(url, "_blank", "noopener");
        });
      })
      .catch(function () {});
  }

  function run() {
    var slots = document.querySelectorAll("[data-include]");
    for (var i = 0; i < slots.length; i++) inject(slots[i]);
    initFeedback(); // Staging-Feedback-Widget (vor Livegang entfernen)
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
