(function () {
  "use strict";

  var config = window.HERVOR_CONFIG || { links: {} };
  var toast = document.querySelector(".toast");
  var toastTimer;

  // Escalona la animación de entrada en el orden del documento
  document.querySelectorAll(".reveal").forEach(function (el, i) {
    el.style.setProperty("--i", i);
  });

  function showToast(message) {
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.hidden = true; }, 3200);
  }

  // Conecta cada botón con su URL configurada
  document.querySelectorAll("[data-link]").forEach(function (link) {
    var url = (config.links[link.dataset.link] || "").trim();

    if (url) {
      link.href = url;
      return;
    }

    link.removeAttribute("target");
    link.setAttribute("aria-disabled", "true");
    link.addEventListener("click", function (event) {
      event.preventDefault();
      showToast(config.pendingMessage);
    });
  });
})();
