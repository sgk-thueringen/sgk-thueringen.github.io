/* =====================================================================
   mailto.js — baut verschleierte E-Mail-Links erst zur Laufzeit zusammen,
   damit die volle Adresse nicht im HTML-Quelltext steht (Spam-Schutz).

   Muster im HTML:
     <a class="mail-obf" data-user="name" data-domain="beispiel.de"
        [data-subject="Betreff"] [data-label="1"] hidden>E-Mail</a>
     <noscript>name [at] beispiel.de ([at] durch @ ersetzen)</noscript>

   Beim DOMContentLoaded: href = mailto:user@domain (+ optional ?subject),
   sichtbarer Linktext = user@domain (außer data-label ist gesetzt, dann
   bleibt der vorhandene Text), danach wird der Link sichtbar (hidden weg)
   und ist ein vollwertiger, fokussierbarer Link (Fokus-Indikator via CSS).
   Ohne JavaScript bleibt der Link verborgen; der <noscript>-Text zeigt die
   lesbare [at]-Form. Kein externer Request, keine Bibliothek.
   Nicht auf /impressum/ verwenden — dort muss die Adresse nach § 5 DDG
   unmittelbar und unverschleiert lesbar sein.
   ===================================================================== */
(function () {
  "use strict";

  function build() {
    var links = document.querySelectorAll("a.mail-obf");
    for (var i = 0; i < links.length; i++) {
      var el = links[i];
      var user = el.getAttribute("data-user");
      var domain = el.getAttribute("data-domain");
      if (!user || !domain) continue;

      var adresse = user + "@" + domain;
      var href = "mailto:" + adresse;
      var subject = el.getAttribute("data-subject");
      if (subject) href += "?subject=" + encodeURIComponent(subject);

      el.setAttribute("href", href);
      if (!el.getAttribute("data-label")) el.textContent = adresse;
      el.hidden = false;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();
