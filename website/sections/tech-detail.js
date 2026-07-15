/* tech-detail.js — renders a technology detail page from its domain JSON
   by ?d=<domain>&id=<id>. Externalised so the page carries no inline script. */
(function () {
        // Domain code → data file + section page.
        var DOMAINS = {
          nrg: {
            src: "/website/sections/domain-nrg/energy-tech.json",
            back: "/website/sections/domain-nrg/index.html",
            label: "Energy & Power",
          },
          gadgets: {
            src: "/website/sections/gadgets/gadgets.json",
            back: "/website/sections/gadgets/index.html",
            label: "Gadgets",
          },
          health: {
            src: "/website/sections/health/health.json",
            back: "/website/sections/health/index.html",
            label: "Health",
          },
          jobs: {
            src: "/website/sections/jobs/jobs.json",
            back: "/website/sections/jobs/index.html",
            label: "Jobs & Automation",
          },
          pcparts: {
            src: "/website/sections/pc-parts/pc-parts.json",
            back: "/website/sections/pc-parts/index.html",
            label: "PC Parts",
          },
          aisystems: {
            src: "/website/sections/ai-systems/ai-systems.json",
            back: "/website/sections/ai-systems/index.html",
            label: "Best AI Systems",
          },
        };
        var STAGE = {
          now: "NOW", near: "NEAR", far: "FAR", theory: "THEORY",
          lab: "LAB", trial: "TRIAL", proto: "PROTO", pilot: "PILOT",
          soon: "1–3 YRS", mid: "3–7 YRS", later: "7–15 YRS", safe: "HUMAN-SAFE",
        };
        function esc(s) {
          return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
            return {
              "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
            }[c];
          });
        }
        function qp(k) {
          return new URLSearchParams(location.search).get(k) || "";
        }
        var dcode = qp("d") || "nrg";
        var id = qp("id");
        var dom = DOMAINS[dcode] || DOMAINS.nrg;
        var back = document.getElementById("tdBack");
        back.href = dom.back;
        back.textContent = "← Back to " + dom.label;

        fetch(dom.src)
          .then(function (r) { return r.ok ? r.json() : []; })
          .then(function (items) {
            var t = (items || []).filter(function (x) { return x.id === id; })[0];
            var host = document.getElementById("tdContent");
            if (!t) {
              host.innerHTML =
                '<p class="td-text">Technology not found. <a class="td-back" href="' +
                dom.back + '">Return to the section →</a></p>';
              return;
            }
            document.title = t.name + " | The Future 24/7";
            var stage = STAGE[t.stage] || String(t.stage || "").toUpperCase();
            var bg = t.photo
              ? "background-image:url('" + esc(t.photo) + "')"
              : "background-image:linear-gradient(140deg,#0c4a6e,#38bdf8)";
            var companies = (t.companies || [])
              .map(function (c) {
                return '<span class="td-company">' + esc(c) + "</span>";
              })
              .join("");
            function spec(k, v) {
              if (v == null || v === "" || v === "—") return "";
              return (
                '<div class="td-spec"><div class="td-spec-k">' + esc(k) +
                '</div><div class="td-spec-v">' + esc(v) + "</div></div>"
              );
            }
            function section(title, body) {
              if (!body) return "";
              return '<div class="td-sec-title">' + esc(title) + "</div>" +
                '<p class="td-text">' + esc(body) + "</p>";
            }
            var specs = [
              spec("Type", t.type),
              spec("Efficiency / CF", t.eff),
              spec("Cost", t.cost),
              spec("Tech level", t.techLevel),
              spec("Stage", stage),
              spec("Best use case", t.use),
            ].join("");
            host.innerHTML =
              '<div class="td-hero" style="' + bg + '">' +
              '<div class="td-hero-cap">' +
              '<h1 class="td-title">' + esc(t.name) + "</h1>" +
              '<div class="td-badges">' +
              '<span class="etype ' + esc(t.etype || "st") + '">' + esc(t.type) + "</span>" +
              '<span class="pbadge ' + esc(t.stage) + '">' + esc(stage) + "</span>" +
              "</div></div></div>" +
              section("What it is", t.what) +
              section("How it works", t.how) +
              section("Current global usage", t.usage) +
              (t.pros ? section("Advantages", t.pros) : "") +
              (t.cons ? section("Limitations", t.cons) : "") +
              section("Future potential", t.future) +
              '<div class="td-sec-title">Specifications</div>' +
              '<div class="td-specs">' + specs + "</div>" +
              (companies
                ? '<div class="td-sec-title">Leading organisations</div>' +
                  '<div class="td-companies">' + companies + "</div>"
                : "");
          })
          .catch(function () {
            document.getElementById("tdContent").innerHTML =
              '<p class="td-text">Could not load technology data.</p>';
          });
      })();
