(function () {
  var STORAGE_KEY = "ndgcv-view";
  var body = document.body;
  var buttons = document.querySelectorAll("[data-view-btn]");
  var label = document.querySelector("[data-view-label]");

  function setView(view) {
    if (view !== "interactive" && view !== "simple") view = "interactive";
    body.setAttribute("data-view", view);
    try {
      localStorage.setItem(STORAGE_KEY, view);
    } catch (e) {}
    buttons.forEach(function (btn) {
      var on = btn.getAttribute("data-view-btn") === view;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    if (label) {
      label.textContent = view === "simple" ? "Simple view" : "Interactive view";
    }
  }

  var saved = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch (e) {}
  setView(saved || "interactive");

  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      setView(btn.getAttribute("data-view-btn"));
    });
  });
})();
