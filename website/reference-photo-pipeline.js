(function () {
  const panel = document.getElementById("photoPipelinePanel");
  if (!panel) return;

  const metaEl = document.getElementById("ppMeta");
  const outEl = document.getElementById("ppOutput");
  const btnRefresh = document.getElementById("ppRefresh");
  const btnRunAll = document.getElementById("ppRunAll");
  const btnScan = document.getElementById("ppScan");
  const btnGenerate = document.getElementById("ppGenerate");
  const strictToggle = document.getElementById("ppStrictMode");

  function setBusy(isBusy) {
    [btnRefresh, btnRunAll, btnScan, btnGenerate].forEach((btn) => {
      if (btn) btn.disabled = isBusy;
    });
  }

  function pretty(value) {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  async function api(path, options) {
    const res = await fetch(path, {
      method: options?.method || "GET",
      headers: { "Content-Type": "application/json" },
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }

    if (!res.ok) {
      const msg = json?.error || `Request failed (${res.status})`;
      throw new Error(msg);
    }
    return json;
  }

  function renderStatus(status) {
    const slots = status?.slots || {};
    const auto = status?.autoLoop || {};
    const last = status?.lastRun || null;
    const provider = "pollinations (free)";

    metaEl.textContent =
      `Slots: ${slots.assigned || 0}/${slots.total || 0} assigned ` +
      `(missing ${slots.missing || 0}) | Auto loop: ${auto.active ? "running" : "idle"} ` +
      `| Next auto run: ${auto.nextRunInSec || 0}s | Provider: ${provider} | Scope: main page`;

    if (last) {
      outEl.textContent = pretty(last);
    }
  }

  async function refreshStatus() {
    const status = await api("/api/photo-pipeline/status");
    renderStatus(status);
    return status;
  }

  async function runFullPipeline() {
    setBusy(true);
    const strict = !!strictToggle?.checked;
    const profile = strict
      ? { threshold: 85, maxFixes: 40, maxMissing: 24, scanLimit: 300 }
      : { threshold: 70, maxFixes: 20, maxMissing: 20, scanLimit: 150 };

    outEl.textContent = `Running full photo pipeline (${strict ? "strict" : "standard"}, main page scope)... this can take a while.`;
    try {
      const result = await api("/api/photo-pipeline/run", {
        method: "POST",
        body: {
          threshold: profile.threshold,
          maxFixes: profile.maxFixes,
          maxMissing: profile.maxMissing,
          autoFix: true,
          scanLimit: profile.scanLimit,
          scope: "main",
        },
      });
      outEl.textContent = pretty(result?.run || result);
      await refreshStatus();
    } finally {
      setBusy(false);
    }
  }

  async function scanOnly() {
    setBusy(true);
    outEl.textContent = "Running slot scan...";
    try {
      const result = await api("/api/scan-site", { method: "POST" });
      outEl.textContent = pretty(result);
      await refreshStatus();
    } finally {
      setBusy(false);
    }
  }

  async function generateMissingOnly() {
    setBusy(true);
    outEl.textContent = "Queueing generation for missing slots...";
    try {
      const result = await api("/api/generate-all-images", { method: "POST" });
      outEl.textContent = pretty(result);
      setTimeout(() => {
        refreshStatus().catch(() => {});
      }, 2000);
    } finally {
      setBusy(false);
    }
  }

  btnRefresh?.addEventListener("click", () => {
    refreshStatus().catch((err) => {
      outEl.textContent = `Status error: ${err.message}`;
    });
  });

  btnRunAll?.addEventListener("click", () => {
    runFullPipeline().catch((err) => {
      outEl.textContent = `Pipeline run failed: ${err.message}`;
      setBusy(false);
    });
  });

  btnScan?.addEventListener("click", () => {
    scanOnly().catch((err) => {
      outEl.textContent = `Scan failed: ${err.message}`;
      setBusy(false);
    });
  });

  btnGenerate?.addEventListener("click", () => {
    generateMissingOnly().catch((err) => {
      outEl.textContent = `Generate failed: ${err.message}`;
      setBusy(false);
    });
  });

  refreshStatus().catch((err) => {
    metaEl.textContent = "Photo pipeline status unavailable.";
    outEl.textContent = `Initial load error: ${err.message}`;
  });
})();
