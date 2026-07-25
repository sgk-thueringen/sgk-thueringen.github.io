/* =====================================================================
   include.js — fügt Header/Footer-Partials clientseitig ein.
   Muster: fetch(partials/<name>.html) -> innerHTML in [data-include].
   Danach: aktiven Navigationspunkt markieren.
   Kein Framework, keine externen Requests (nur eigene Partials).
   ===================================================================== */
(function () {
  "use strict";

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
    }
  }

  function inject(el) {
    var name = el.getAttribute("data-include");
    if (!name) return;
    fetch("/partials/" + name + ".html")
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (html) {
        el.innerHTML = html;
        if (name === "header") markActive();
      })
      .catch(function () {
        // Fallback bleibt der im Platzhalter enthaltene <noscript>-Inhalt / statische Links
      });
  }

  // ---- Staging-Feedback-Widget: reiner Link zum Google-Formular des Vereins.
  //      Kein iframe/Embed/Google-Skript. Vor Livegang entfernen: diese eine Zeile
  //      in run() streichen und partials/feedback.html löschen (siehe OFFENE-PUNKTE I4). ----
  function initFeedback() {
    fetch("/partials/feedback.html")
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (html) {
        var host = document.createElement("div");
        host.innerHTML = html;
        document.body.appendChild(host);
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
