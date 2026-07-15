/* AI Systems — per-category top-10 ranking graph.
   Renders category chips + animated horizontal bars from ai-rankings.json
   (the single place to edit scores). No dependencies. */
(function () {
  var root = document.getElementById("aiRankings");
  if (!root) return;
  var src = root.getAttribute("data-rankings-src");
  if (!src) return;

  fetch(src)
    .then(function (r) { return r.json(); })
    .then(render)
    .catch(function () {
      root.innerHTML = '<p class="airk-err">Ranking data unavailable right now.</p>';
    });

  function render(data) {
    var cats = (data && data.categories) || [];
    if (!cats.length) return;

    var chips = document.createElement("div");
    chips.className = "airk-chips";
    var board = document.createElement("div");
    board.className = "airk-board";
    var note = document.createElement("p");
    note.className = "airk-note";
    note.textContent = (data.note || "") + (data.lastUpdated ? " Updated " + data.lastUpdated + "." : "");

    cats.forEach(function (cat, i) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "airk-chip" + (i === 0 ? " active" : "");
      chip.textContent = (cat.icon ? cat.icon + " " : "") + cat.label;
      chip.style.setProperty("--cat-color", cat.color || "#38bdf8");
      chip.addEventListener("click", function () {
        chips.querySelectorAll(".airk-chip").forEach(function (c) {
          c.classList.remove("active");
        });
        chip.classList.add("active");
        showCat(cat);
      });
      chips.appendChild(chip);
    });

    root.appendChild(chips);
    root.appendChild(board);
    root.appendChild(note);
    showCat(cats[0]);

    function showCat(cat) {
      board.innerHTML = "";
      board.style.setProperty("--cat-color", cat.color || "#38bdf8");

      var head = document.createElement("div");
      head.className = "airk-head";
      var title = document.createElement("div");
      title.className = "airk-title";
      title.textContent = "Top 10 — " + cat.label;
      var blurb = document.createElement("div");
      blurb.className = "airk-blurb";
      blurb.textContent = cat.blurb || "";
      head.appendChild(title);
      head.appendChild(blurb);
      board.appendChild(head);

      var max = 100;
      (cat.entries || []).slice(0, 10).forEach(function (e, i) {
        var row = document.createElement("div");
        row.className = "airk-row";

        var rank = document.createElement("span");
        rank.className = "airk-rank" + (i < 3 ? " top3" : "");
        rank.textContent = String(i + 1).padStart(2, "0");

        var label = document.createElement("span");
        label.className = "airk-name";
        label.textContent = e.name;
        var org = document.createElement("em");
        org.className = "airk-org";
        org.textContent = e.org || "";
        label.appendChild(org);

        var track = document.createElement("div");
        track.className = "airk-track";
        var bar = document.createElement("div");
        bar.className = "airk-bar";
        bar.style.width = "0%";
        var score = document.createElement("span");
        score.className = "airk-score";
        score.textContent = e.score;
        track.appendChild(bar);
        track.appendChild(score);

        row.appendChild(rank);
        row.appendChild(label);
        row.appendChild(track);
        board.appendChild(row);

        // Two-frame delay so the width transition animates on category switch.
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            bar.style.width = (Math.max(0, Math.min(e.score, max)) / max) * 100 + "%";
          });
        });
      });
    }
  }
})();
