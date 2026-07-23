/* digest-cta.js — a "weekly digest" signup call-to-action injected near the
 * bottom of every domain section page. The site had no conversion path at all;
 * this captures intent.
 *
 * HONEST BY DEFAULT: with no backend configured it saves the address on the
 * visitor's device and says exactly that — it never claims to have emailed
 * anyone. To actually collect signups, set window.DIGEST_ENDPOINT (a URL that
 * accepts POST {email}) before this script runs, or edit ENDPOINT below.
 * A Formspree/Buttondown/Cloudflare-Worker URL all work. */
(function () {
  var ENDPOINT = (typeof window !== "undefined" && window.DIGEST_ENDPOINT) || "";
  if (document.getElementById("digestCta")) return;

  if (!document.getElementById("digestCtaStyles")) {
    var st = document.createElement("style");
    st.id = "digestCtaStyles";
    st.textContent =
      "#digestCta{max-width:900px;margin:34px auto 8px;padding:22px 24px;border-radius:16px;" +
      "background:linear-gradient(135deg,rgba(8,47,73,.55),rgba(2,6,23,.55));" +
      "border:1px solid rgba(56,189,248,.28);}" +
      "#digestCta h3{margin:0 0 4px;font-size:18px;font-weight:800;color:#eaf2ff;letter-spacing:.01em;}" +
      "#digestCta p{margin:0 0 14px;font-size:13px;line-height:1.5;color:#9fb2ca;}" +
      "#digestCta form{display:flex;flex-wrap:wrap;gap:10px;}" +
      "#digestCta input{flex:1 1 240px;min-width:0;padding:11px 14px;border-radius:10px;font-size:14px;" +
      "background:rgba(2,6,23,.6);border:1px solid rgba(56,189,248,.3);color:#eaf2ff;}" +
      "#digestCta input::placeholder{color:#6b8099;}" +
      "#digestCta button{flex:0 0 auto;padding:11px 22px;border:0;border-radius:10px;cursor:pointer;" +
      "font-size:14px;font-weight:800;letter-spacing:.02em;color:#04121f;" +
      "background:linear-gradient(135deg,#38bdf8,#22d3ee);}" +
      "#digestCta button:hover{filter:brightness(1.08);}" +
      "#digestCta .dc-msg{margin:12px 0 0;font-size:13px;font-weight:600;color:#7dd3fc;min-height:1px;}" +
      "#digestCta .dc-fine{margin:10px 0 0;font-size:11px;color:#5c7292;}";
    document.head.appendChild(st);
  }

  var box = document.createElement("section");
  box.id = "digestCta";
  box.setAttribute("aria-label", "Weekly digest signup");
  box.innerHTML =
    "<h3>Get the weekly digest</h3>" +
    "<p>One email a week across all 18 domains — the biggest moves from idea to shelf, " +
    "no fluff. Free.</p>" +
    '<form novalidate><input type="email" required autocomplete="email" ' +
    'placeholder="you@example.com" aria-label="Email address" />' +
    "<button type=\"submit\">Subscribe</button></form>" +
    '<p class="dc-msg" role="status" aria-live="polite"></p>' +
    '<p class="dc-fine">We never share your email. Unsubscribe anytime.</p>';

  // Insert above the coming-soon block if present, else at end of body.
  var anchor = document.querySelector(".coming-soon");
  if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(box, anchor);
  else document.body.appendChild(box);

  var form = box.querySelector("form");
  var input = box.querySelector("input");
  var msg = box.querySelector(".dc-msg");

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = (input.value || "").trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      msg.style.color = "#fca5a5";
      msg.textContent = "Please enter a valid email address.";
      return;
    }
    if (ENDPOINT) {
      msg.style.color = "#7dd3fc";
      msg.textContent = "Subscribing…";
      fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ email: email, source: location.pathname }),
      }).then(function (r) {
        if (!r.ok) throw new Error("bad status");
        msg.style.color = "#86efac";
        msg.textContent = "You're subscribed — check your inbox to confirm.";
        form.reset();
      }).catch(function () {
        msg.style.color = "#fca5a5";
        msg.textContent = "Something went wrong — please try again later.";
      });
      return;
    }
    // No backend configured: save on-device and say so honestly.
    try {
      var key = "digestSignups";
      var list = JSON.parse(localStorage.getItem(key) || "[]");
      if (list.indexOf(email) === -1) { list.push(email); localStorage.setItem(key, JSON.stringify(list)); }
    } catch (err) { /* storage blocked — still show honest message */ }
    msg.style.color = "#86efac";
    msg.textContent = "Thanks! Saved on this device — email signups go live at launch.";
    form.reset();
  });
})();
