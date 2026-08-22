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

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function firstImage(story) {
    for (var i = 0; i < story.chapters.length; i++) {
      if (story.chapters[i].image) return story.chapters[i].image;
    }
    return null;
  }

  function buildCard(story, index) {
    var card = el("article", "story-card");
    card.id = "role-" + story.id;
    card.setAttribute("data-role", story.id);

    var head = el("button", "story-head");
    head.type = "button";
    head.setAttribute("aria-expanded", "false");

    var previewSrc = firstImage(story);
    var previewHtml = previewSrc
      ? '<div class="story-preview"><img src="' + previewSrc + '" alt="" loading="lazy" onerror="this.parentNode.classList.add(\'is-fallback\')" /></div>'
      : '<div class="story-preview is-fallback"></div>';

    head.innerHTML =
      '<div class="story-head-main">' +
        '<span class="story-index">' + String(index + 1).padStart(2, "0") + "</span>" +
        '<div class="story-head-text">' +
          '<span class="story-years">' + story.years + "</span>" +
          "<h3>" + story.company + "</h3>" +
          '<p class="role">' + story.title + " · " + story.location + "</p>" +
          '<p class="story-summary">' + story.summary + "</p>" +
        "</div>" +
        '<span class="story-toggle" aria-hidden="true"><span class="toggle-label">Open</span><span class="toggle-icon">+</span></span>' +
      "</div>" +
      previewHtml;

    var panel = el("div", "story-panel");
    panel.hidden = true;

    var layout = el("div", "story-layout");

    var stage = el("div", "story-stage");
    var img = el("img", "story-image");
    img.alt = "";
    img.loading = "lazy";
    var frame = el("div", "story-frame");
    frame.appendChild(img);
    var caption = el("p", "story-caption");
    frame.appendChild(caption);
    stage.appendChild(frame);

    var film = el("div", "story-film");
    story.chapters.forEach(function (ch, i) {
      var thumb = el("button", "film-thumb");
      thumb.type = "button";
      thumb.setAttribute("data-i", String(i));
      var tImg = ch.image
        ? '<span class="film-media"><img src="' + ch.image + '" alt="" loading="lazy" onerror="this.parentNode.classList.add(\'is-fallback\')" /></span>'
        : '<span class="film-media is-fallback"></span>';
      thumb.innerHTML =
        tImg +
        '<span class="film-meta"><span class="film-num">' + String(i + 1).padStart(2, "0") + "</span>" +
        '<span class="film-label">' + ch.label.replace(/^\d+\s/, "") + "</span></span>";
      film.appendChild(thumb);
    });
    stage.appendChild(film);

    var narrative = el("div", "story-narrative");
    var chapterNav = el("div", "chapter-nav");
    chapterNav.setAttribute("role", "tablist");
    story.chapters.forEach(function (ch, i) {
      var tab = el("button", "chapter-tab");
      tab.type = "button";
      tab.setAttribute("role", "tab");
      tab.setAttribute("data-i", String(i));
      tab.textContent = ch.label;
      chapterNav.appendChild(tab);
    });

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
    var progress = el("span", "chap-progress");
    var next = el("button", "chap-btn");
    next.type = "button";
    next.textContent = "Next →";
    controls.appendChild(prev);
    controls.appendChild(progress);
    controls.appendChild(next);

    narrative.appendChild(chapterNav);
    narrative.appendChild(chapterBody);
    narrative.appendChild(controls);

    layout.appendChild(stage);
    layout.appendChild(narrative);
    panel.appendChild(layout);

    var state = { i: 0 };

    function show(i) {
      state.i = (i + story.chapters.length) % story.chapters.length;
      var ch = story.chapters[state.i];
      chapterLabel.textContent = ch.label;
      chapterTitle.textContent = ch.title;
      chapterText.textContent = ch.body;
      caption.textContent = ch.caption || "";
      progress.textContent = (state.i + 1) + " / " + story.chapters.length;
      if (ch.image) {
        img.style.opacity = "0";
        img.onload = function () { img.style.opacity = "0.95"; };
        img.src = ch.image;
        img.onerror = function () {
          frame.classList.add("is-fallback");
          img.removeAttribute("src");
          img.style.opacity = "1";
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
      var tl = head.querySelector(".toggle-label");
      var ti = head.querySelector(".toggle-icon");
      if (tl) tl.textContent = "Close";
      if (ti) ti.textContent = "–";
      show(state.i);
      try { card.scrollIntoView({ behavior: "smooth", block: "nearest" }); } catch (e) {}
    }
    function close() {
      card.classList.remove("is-open");
      panel.hidden = true;
      head.setAttribute("aria-expanded", "false");
      var tl = head.querySelector(".toggle-label");
      var ti = head.querySelector(".toggle-icon");
      if (tl) tl.textContent = "Open";
      if (ti) ti.textContent = "+";
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
            var lab = h.querySelector(".toggle-label");
            var ic = h.querySelector(".toggle-icon");
            if (lab) lab.textContent = "Open";
            if (ic) ic.textContent = "+";
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
    window.NDG_STORIES.forEach(function (s, i) {
      list.appendChild(buildCard(s, i));
    });
  }
})();
