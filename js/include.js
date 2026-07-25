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

  // ---- Staging-Feedback-Widget (vor Livegang entfernen: diese eine Zeile in run()
  //      streichen und partials/feedback.html löschen — siehe OFFENE-PUNKTE I4) ----
  function initFeedback() {
    fetch("/partials/feedback.html")
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (html) {
        var host = document.createElement("div");
        host.innerHTML = html;
        document.body.appendChild(host);
        wireFeedback();
      })
      .catch(function () {});
  }
  function wireFeedback() {
    var btn = document.getElementById("sgk-feedback-btn");
    var panel = document.getElementById("sgk-feedback-panel");
    var text = document.getElementById("sgk-feedback-text");
    var mailBtn = document.getElementById("sgk-feedback-mail");
    var copyBtn = document.getElementById("sgk-feedback-copy");
    var status = document.getElementById("sgk-feedback-status");
    if (!btn || !panel) return;

    function openPanel(o) {
      panel.hidden = !o;
      btn.setAttribute("aria-expanded", o ? "true" : "false");
      if (o) { if (status) status.hidden = true; if (text) text.focus(); }
    }
    btn.addEventListener("click", function () { openPanel(panel.hidden); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !panel.hidden) { openPanel(false); btn.focus(); }
    });

    function payload() {
      var d = new Date();
      return (text ? text.value.trim() : "") +
        "\r\n\r\nSeite: " + location.href +
        "\r\nDatum: " + d.toLocaleString("de-DE");
    }
    if (mailBtn) mailBtn.addEventListener("click", function () {
      var subject = "Feedback Staging: " + location.pathname;
      window.location.href = "mailto:SGK-Thueringen@t-online.de" +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(payload());
    });
    if (copyBtn) copyBtn.addEventListener("click", function () {
      var t = payload();
      function ok() { if (status) { status.textContent = "Text kopiert."; status.hidden = false; } }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(t).then(ok, function () { fallback(t, ok); });
      } else { fallback(t, ok); }
    });
    function fallback(t, ok) {
      var ta = document.createElement("textarea");
      ta.value = t; ta.setAttribute("readonly", ""); ta.style.position = "absolute"; ta.style.left = "-9999px";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); ok(); } catch (e) {}
      document.body.removeChild(ta);
    }
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
