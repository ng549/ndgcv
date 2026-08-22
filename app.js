(function () {
  var STORAGE_KEY = "ndgcv-view";
  var body = document.body;
  var buttons = document.querySelectorAll("[data-view-btn]");
  var label = document.querySelector("[data-view-label]");
  var list = document.getElementById("story-list");

  function setView(view) {
    if (view !== "interactive" && view !== "simple") view = "interactive";
    body.setAttribute("data-view", view);
    try { localStorage.setItem(STORAGE_KEY, view); } catch (e) {}
    buttons.forEach(function (btn) {
      var on = btn.getAttribute("data-view-btn") === view;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    if (label) label.textContent = view === "simple" ? "Simple view" : "Interactive view";
  }

  var saved = null;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) {}
  setView(saved || "interactive");
  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      setView(btn.getAttribute("data-view-btn"));
    });
  });

  /* ---------- Story engine ---------- */
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function buildCard(story) {
    var card = el("article", "story-card");
    card.id = "role-" + story.id;
    card.setAttribute("data-role", story.id);

    var head = el("button", "story-head");
    head.type = "button";
    head.setAttribute("aria-expanded", "false");
    head.innerHTML =
      '<span class="story-years">' + story.years + "</span>" +
      "<h3>" + story.company + "</h3>" +
      '<p class="role">' + story.title + " · " + story.location + "</p>" +
      '<p class="story-summary">' + story.summary + "</p>" +
      '<span class="story-toggle" aria-hidden="true">Open story</span>';

    var panel = el("div", "story-panel");
    panel.hidden = true;

    var stage = el("div", "story-stage");
    var img = el("img", "story-image");
    img.alt = "";
    img.loading = "lazy";
    var frame = el("div", "story-frame");
    frame.appendChild(img);
    var caption = el("p", "story-caption");
    frame.appendChild(caption);
    stage.appendChild(frame);

    var chapterNav = el("div", "chapter-nav");
    chapterNav.setAttribute("role", "tablist");

    var chapterBody = el("div", "chapter-body");
    var chapterLabel = el("p", "chapter-label");
    var chapterTitle = el("h4", "chapter-title");
    var chapterText = el("p", "chapter-text");
    chapterBody.appendChild(chapterLabel);
    chapterBody.appendChild(chapterTitle);
    chapterBody.appendChild(chapterText);

    var controls = el("div", "chapter-controls");
    var prev = el("button", "chap-btn");
    prev.type = "button";
    prev.textContent = "← Prev";
    var next = el("button", "chap-btn");
    next.type = "button";
    next.textContent = "Next →";
    controls.appendChild(prev);
    controls.appendChild(next);

    var film = el("div", "story-film");
    story.chapters.forEach(function (ch, i) {
      var thumb = el("button", "film-thumb");
      thumb.type = "button";
      thumb.setAttribute("data-i", String(i));
      thumb.innerHTML =
        '<span class="film-num">' + String(i + 1).padStart(2, "0") + "</span>" +
        '<span class="film-label">' + ch.label.replace(/^\d+\s/, "") + "</span>";
      film.appendChild(thumb);

      var tab = el("button", "chapter-tab");
      tab.type = "button";
      tab.setAttribute("role", "tab");
      tab.setAttribute("data-i", String(i));
      tab.textContent = ch.label;
      chapterNav.appendChild(tab);
    });

    panel.appendChild(stage);
    panel.appendChild(chapterNav);
    panel.appendChild(chapterBody);
    panel.appendChild(controls);
    panel.appendChild(film);

    var state = { i: 0 };

    function show(i) {
      state.i = (i + story.chapters.length) % story.chapters.length;
      var ch = story.chapters[state.i];
      chapterLabel.textContent = ch.label;
      chapterTitle.textContent = ch.title;
      chapterText.textContent = ch.body;
      caption.textContent = ch.caption || "";
      if (ch.image) {
        img.src = ch.image;
        img.onerror = function () {
          frame.classList.add("is-fallback");
          img.removeAttribute("src");
        };
        frame.classList.remove("is-fallback");
      } else {
        frame.classList.add("is-fallback");
      }
      panel.querySelectorAll(".chapter-tab").forEach(function (t, ti) {
        t.classList.toggle("is-active", ti === state.i);
      });
      panel.querySelectorAll(".film-thumb").forEach(function (t, ti) {
        t.classList.toggle("is-active", ti === state.i);
      });
    }

    function open() {
      card.classList.add("is-open");
      panel.hidden = false;
      head.setAttribute("aria-expanded", "true");
      head.querySelector(".story-toggle").textContent = "Close";
      show(state.i);
    }
    function close() {
      card.classList.remove("is-open");
      panel.hidden = true;
      head.setAttribute("aria-expanded", "false");
      head.querySelector(".story-toggle").textContent = "Open story";
    }

    head.addEventListener("click", function () {
      if (card.classList.contains("is-open")) close();
      else {
        document.querySelectorAll(".story-card.is-open").forEach(function (c) {
          c.classList.remove("is-open");
          var p = c.querySelector(".story-panel");
          if (p) p.hidden = true;
          var h = c.querySelector(".story-head");
          if (h) {
            h.setAttribute("aria-expanded", "false");
            var t = h.querySelector(".story-toggle");
            if (t) t.textContent = "Open story";
          }
        });
        open();
      }
    });

    prev.addEventListener("click", function () { show(state.i - 1); });
    next.addEventListener("click", function () { show(state.i + 1); });
    panel.querySelectorAll(".chapter-tab, .film-thumb").forEach(function (t) {
      t.addEventListener("click", function () {
        show(parseInt(t.getAttribute("data-i"), 10));
      });
    });

    card.appendChild(head);
    card.appendChild(panel);
    return card;
  }

  if (list && window.NDG_STORIES) {
    list.innerHTML = "";
    window.NDG_STORIES.forEach(function (s) {
      list.appendChild(buildCard(s));
    });
  }
})();
