// Shared behaviour: footer year, mobile menu, screenshot lightbox.
// The pages work without JavaScript; this only enhances them.
(function () {
  document.documentElement.classList.add("js");

  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  var toggle = document.querySelector(".nav-toggle");
  var links = document.getElementById("nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    links.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        links.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  var dlg = document.getElementById("lightbox");
  if (!dlg || typeof dlg.showModal !== "function") return;
  var img = document.createElement("img");
  dlg.appendChild(img);
  var cap = document.getElementById("lb-caption");
  document.querySelectorAll("a[data-lightbox]").forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      var thumb = link.querySelector("img");
      img.src = link.getAttribute("href");
      img.alt = thumb ? thumb.alt : "";
      cap.textContent = link.getAttribute("data-caption") || "";
      dlg.showModal();
    });
  });
  document.getElementById("lb-close").addEventListener("click", function () { dlg.close(); });
  dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener("close", function () { img.removeAttribute("src"); });
})();
