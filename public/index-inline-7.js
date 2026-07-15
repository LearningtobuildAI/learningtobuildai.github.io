
if ("serviceWorker" in navigator) {
  const OFFLINE_VERSION = "2026.06.29.2";
  navigator.serviceWorker
    .register(`/sw.js?v=${encodeURIComponent(OFFLINE_VERSION)}`)
    .then((registration) => {
      registration.update().catch(() => {});

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            newWorker.postMessage({ type: "SKIP_WAITING" });
          }
        });
      });

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (window.__swReloading) return;
        window.__swReloading = true;
        window.location.reload();
      });
    })
    .catch(() => {});
}
