(function () {
  const img = document.getElementById("utilityHeroPhoto");
  if (!img) return;

  const pageKey = String(document.body?.dataset?.utilityKey || "utility");
  const title = (
    document.querySelector(".utility-summary h1")?.textContent ||
    document.title ||
    pageKey
  ).trim();

  // Guaranteed on-disk fallback so the hero is never broken or empty.
  const sharedFallback =
    "/images/generated/ai-company-openai-1782348213738.jpg";

  // Route the hero through the same-origin context-image proxy: it resolves a
  // themed, page-relevant image and 302-redirects to the shared fallback if the
  // generator is unavailable — no 404s, no broken images, real "photo +
  // context" on every utility page.
  const ctxUrl =
    "/api/context-image?" +
    new URLSearchParams({
      title: title + " — future technology intelligence",
      domain: pageKey,
      fallback: sharedFallback,
    }).toString();

  let sharedTried = false;
  img.addEventListener("error", () => {
    if (!sharedTried) {
      sharedTried = true;
      img.src = sharedFallback;
      return;
    }
    const wrap = img.closest(".utility-photo");
    if (wrap) wrap.style.display = "none";
  });

  img.src = ctxUrl;
})();
