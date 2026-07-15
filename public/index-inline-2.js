
  /* ════ FLOAT PANEL — ALGALON ADMIN ════ */
  let floatGreeted = false;
  let floatBusy = false;
  let floatMode = "guide"; // 'guide' | 'admin'
  let floatTab = "chat";

  function updateFloatingChatViewportOffsets() {
    const wrap = document.getElementById("floatWrap");
    if (!wrap) return;

    const nav = document.querySelector("nav");
    const banner = document.querySelector(".global-page-banner");

    let topOffset = 72;
    if (banner) {
      topOffset = Math.round(banner.getBoundingClientRect().bottom);
    } else if (nav) {
      topOffset = Math.round(nav.getBoundingClientRect().bottom);
    }
    // Keep the chat header visually flush with the banner edge.
    topOffset = Math.max(topOffset, 0);

    const viewportH = Math.max(window.innerHeight || 0, 320);
    const bottomGap = 12;
    const chatHeight = Math.max(viewportH - topOffset - bottomGap, 220);

    wrap.style.setProperty("--chat-top-offset", `${topOffset}px`);
    wrap.style.top = `${topOffset}px`;
    wrap.style.height = `${chatHeight}px`;
    wrap.style.bottom = `${bottomGap}px`;
  }

  function toggleFloat(forceOpen = true) {
    const panel = document.getElementById("floatPanel");
    const orb = document.getElementById("algalonOrb");
    const isOpen = panel?.classList.contains("float-open");
    if (forceOpen === false && isOpen) {
      panel.classList.remove("float-open");
      orb?.classList.remove("active");
    } else {
      updateFloatingChatViewportOffsets();
      panel.classList.add("float-open");
      orb?.classList.add("active");
      refreshChatRuntimeStatus();
      autoResizeFloatInput();
      if (!floatGreeted) {
        floatGreeted = true;
        setTimeout(
          () =>
            addFloatMsg(
              "I have been watching. Ask me anything about the intelligence platform — or switch to Admin to command me directly.",
              "ai",
            ),
          350,
        );
      }
    }
  }

  window.addEventListener("resize", updateFloatingChatViewportOffsets, {
    passive: true,
  });
  window.addEventListener("scroll", updateFloatingChatViewportOffsets, {
    passive: true,
  });
  document.addEventListener(
    "DOMContentLoaded",
    updateFloatingChatViewportOffsets,
  );
  window.addEventListener("load", updateFloatingChatViewportOffsets);
  setTimeout(updateFloatingChatViewportOffsets, 150);
  if (typeof ResizeObserver !== "undefined") {
    const _floatViewportObserver = new ResizeObserver(() =>
      updateFloatingChatViewportOffsets(),
    );
    const _banner = document.querySelector(".global-page-banner");
    const _nav = document.querySelector("nav");
    if (_banner) _floatViewportObserver.observe(_banner);
    if (_nav) _floatViewportObserver.observe(_nav);
  }

  async function refreshAlgalonStatusBar() {
    try {
      const runtime = await fetch("/api/chat-runtime-status").then((r) =>
        r.json(),
      );
      const gpuPct = Number(runtime?.gpu?.livePercent);
      const pct = Number.isFinite(gpuPct)
        ? Math.max(0, Math.min(100, gpuPct))
        : null;
      const circle = document.getElementById("chatStatusGpuRing");
      const text = document.getElementById("algalonGpuValue");
      if (text) text.textContent = pct == null ? "--%" : `${pct}%`;
      if (circle) {
        let color = "#22c55e";
        if ((pct ?? 0) >= 90) color = "#ef4444";
        else if ((pct ?? 0) >= 40) color = "#f59e0b";
        circle.style.borderColor = color;
        circle.style.boxShadow = `inset 0 0 0 2px rgba(0,0,0,.35), 0 0 0 1px ${color}55`;
      }

      const modeEl = document.getElementById("algalonSystemMode");
      const mode = getActiveRuntimeMode(runtime);
      if (modeEl) modeEl.textContent = mode.code;

      const heroMain = document.getElementById("chatStatusMain");
      const heroSub = document.getElementById("chatStatusSub");
      const heroMode = document.getElementById("chatStatusMode");
      const heroGpu = document.getElementById("algalonGpuValue");
      const heroRing = document.getElementById("chatStatusGpuRing");
      const lvlText = (
        document.getElementById("chatStatusMain")?.textContent ||
        "Algalon LVL 10 (Singularity)"
      ).trim();
      if (heroMain) heroMain.textContent = lvlText;
      if (heroSub) heroSub.textContent = "ARIA PC Agent (Online)";
      if (heroMode) heroMode.textContent = `(${mode.detail})`;
      if (heroGpu) heroGpu.textContent = pct == null ? "--%" : `${pct}%`;
      if (heroRing) {
        let color = "#38bdf8";
        if ((pct ?? 0) >= 90) color = "#ef4444";
        else if ((pct ?? 0) >= 40) color = "#f59e0b";
        else if ((pct ?? 0) >= 15) color = "#22c55e";
        heroRing.style.borderColor = color;
      }
    } catch {
      const modeEl = document.getElementById("algalonSystemMode");
      if (modeEl) modeEl.textContent = "OFFLINE";
      const heroMode = document.getElementById("chatStatusMode");
      if (heroMode) heroMode.textContent = "(Runtime Unavailable)";
    }
  }

  /* ── Admin lock ── */
  let adminUnlocked = (() => {
    try {
      return sessionStorage.getItem("adminUnlocked") === "1";
    } catch {
      return false;
    }
  })();

  function requestAdminMode() {
    if (adminUnlocked) {
      activateAdminMode();
      return;
    }
    const panel = document.getElementById("floatPanel");
    const ctrl = document.getElementById("floatCtrlPanel");
    if (panel && !panel.classList.contains("float-open")) {
      toggleFloat();
    }
    if (ctrl) {
      ctrl.classList.add("ctrl-open");
    }
    document.getElementById("adminLockOverlay").classList.add("show");
    setTimeout(() => document.getElementById("adminPwInput")?.focus(), 100);
  }

  function hideAdminLock() {
    document.getElementById("adminLockOverlay").classList.remove("show");
    document.getElementById("adminPwInput").value = "";
    document.getElementById("adminPwErr").textContent = "";
  }

  function syncFloatModeClasses() {
    const panel = document.getElementById("floatPanel");
    if (!panel) return;
    panel.classList.toggle("mode-guide", floatMode === "guide");
    panel.classList.toggle("mode-admin", floatMode === "admin");
  }

  async function submitAdminPw() {
    const pw = document.getElementById("adminPwInput").value;
    const errEl = document.getElementById("adminPwErr");
    errEl.textContent = "";
    if (!pw) return;
    try {
      const res = await fetch("/api/admin-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      const data = await res.json();
      if (data.success) {
        adminUnlocked = true;
        try {
          sessionStorage.setItem("adminUnlocked", "1");
        } catch {}
        hideAdminLock();
        activateAdminMode();
      } else {
        errEl.textContent = "✗ Incorrect password";
        document.getElementById("adminPwInput").value = "";
        document.getElementById("adminPwInput").focus();
      }
    } catch {
      errEl.textContent = "✗ Connection error";
    }
  }

  function activateAdminMode() {
    floatMode = "admin";
    document.body.classList.add("admin-mode");
    syncFloatModeClasses();
    syncChatWindowTitle();
    document.getElementById("modeGuide").classList.remove("active");
    document.getElementById("modeAdmin").classList.add("active");
    /* Slide in the left controls column */
    document.getElementById("floatCtrlPanel").classList.add("ctrl-open");
    const placeholder = document.getElementById("floatInput");
    if (placeholder)
      placeholder.placeholder =
        "Give admin commands (fix photos, add content, improve UX…)";
    switchFloatTab("actions");
    startAdminQueuePolling();
    refreshAdminQueueStatus();
  }

  function setFloatMode(mode) {
    if (mode === "admin") {
      requestAdminMode();
      return;
    }
    floatMode = "guide";
    document.body.classList.remove("admin-mode");
    syncFloatModeClasses();
    syncChatWindowTitle();
    adminUnlocked = false;
    try {
      sessionStorage.removeItem("adminUnlocked");
    } catch {}
    document.getElementById("modeGuide").classList.add("active");
    document.getElementById("modeAdmin").classList.remove("active");
    /* Hide left controls column */
    document.getElementById("floatCtrlPanel").classList.remove("ctrl-open");
    const placeholder = document.getElementById("floatInput");
    if (placeholder)
      placeholder.placeholder =
        "Ask about technologies, companies, breakthroughs…";
    stopAdminQueuePolling();
  }

  function switchFloatTab(tab) {
    if (floatMode !== "admin") return;
    floatTab = tab;
    /* Only switch within the controls column — paneChat stays permanently active in the right column */
    ["actions", "system", "health"].forEach((t) => {
      document
        .getElementById("pane" + t.charAt(0).toUpperCase() + t.slice(1))
        ?.classList.toggle("active", t === tab);
      document
        .getElementById("tab" + t.charAt(0).toUpperCase() + t.slice(1))
        ?.classList.toggle("active", t === tab);
    });
    if (tab === "system") refreshSystemToolsPanel();
    if (tab === "health") loadFloatHealth();
  }

  function scrollActionsToChatTop() {
    const hero = document.querySelector(".algalon-status-shell");
    const msgs = document.getElementById("floatMsgs");
    const input = document.getElementById("floatInput");
    if (msgs) msgs.scrollTo({ top: 0, behavior: "smooth" });
    if (hero) hero.scrollIntoView({ behavior: "smooth", block: "start" });
    if (input) input.focus();
  }

  async function refreshSystemToolsPanel() {
    await populateUpdatesDropdown();
    try {
      const r = await fetch("/api/system-requirements");
      if (!r.ok) return;
      const d = await r.json();
      const cpuEl = document.getElementById("sysCpuUsage");
      const gpuEl = document.getElementById("sysGpuUsage");
      const connEl = document.getElementById("sysAriaConn");
      const budgetEl = document.getElementById("sysBudget");
      if (cpuEl)
        cpuEl.textContent = `${d?.currentUsage?.cpuUsage ?? "--"}%`;
      if (gpuEl)
        gpuEl.textContent = d?.system?.gpuModel
          ? `RTX ${d.system.gpuModel.toString().replace("RTX ", "")}`
          : "--";
      if (connEl) connEl.textContent = "Online";
      if (budgetEl) {
        const limits =
          d?.mode === "PAID_VERSION"
            ? d?.paidVersionLimits
            : d?.freeVersionLimits;
        const monthlyBudget = limits?.monthlyBudgetUsd;
        budgetEl.textContent = Number.isFinite(monthlyBudget)
          ? `$${monthlyBudget}/mo`
          : "$--/mo";
      }
    } catch {
      const connEl = document.getElementById("sysAriaConn");
      const budgetEl = document.getElementById("sysBudget");
      if (connEl) {
        connEl.textContent = "Offline";
        connEl.style.color = "#ef4444";
      }
      if (budgetEl) budgetEl.textContent = "$--/mo";
    }
    try {
      const q = await fetch("/api/admin-queue/status");
      if (q.ok) {
        const data = await q.json();
        const queueEl = document.getElementById("sysTaskQueue");
        if (queueEl) {
          const pendingCount = Array.isArray(data?.pending)
            ? data.pending.length
            : Number.isFinite(Number(data?.pending))
              ? Number(data.pending)
              : 0;
          queueEl.textContent = `${pendingCount} pending`;
        }
      }
    } catch {}
  }

  /* ════ VOICE ENGINE — Algalon the Observer ════
   Deep, cosmic, deliberate. Pitch 0.4, rate 0.72.
   Text is transformed to Algalon's formal register before speaking.
════════════════════════════════════════════════ */
  let voiceEnabled = false;
  let voiceUtterance = null;
  let _algalonVoice = null;
  let _voiceReqSeq = 0;
  let liveTalkEnabled = false;
  let liveRecognizer = null;
  let liveRecognizerRunning = false;
  let liveTalkRestartTimer = null;
  let liveTalkSuppressUntil = 0;
  const voiceModelConfig = {
    profile: "algalon",
    voiceName: "Charon",
    ttsEngine: "gemini",
    ttsModel: "gemini-2.5-flash-preview-tts",
    ttsAvailable: true,
    lastHealthProbeAt: 0,
    recoveryProbeIntervalMs: 25000,
  };
  const liveTalkState = {
    micPermission: "unknown",
    micDeviceId: null,
    audioCalibration: {
      inputGain: 1,
      noiseFloor: 0.008,
      vadThreshold: 0.014,
      peakLimit: 0.96,
      status: "idle",
      lastIssue: null,
      lastCalibratedAt: null,
    },
    vad: {
      state: "USER_SILENT",
      turnCompleteSilenceMs: 700,
      lastSpeechAt: 0,
    },
  };

  async function loadVoiceProfileConfig() {
    try {
      const r = await fetch("/api/voice-profile");
      const data = await r.json();
      if (data?.activeProfile)
        voiceModelConfig.profile = data.activeProfile;
      if (data?.voiceName) voiceModelConfig.voiceName = data.voiceName;
      if (data?.ttsEngine) voiceModelConfig.ttsEngine = data.ttsEngine;
      if (data?.ttsModel) voiceModelConfig.ttsModel = data.ttsModel;
      if (typeof data?.ttsAvailable === "boolean")
        voiceModelConfig.ttsAvailable = data.ttsAvailable;
    } catch (e) {
      console.warn("[Algalon] Voice profile config load failed:", e);
    }
  }

  async function probeVoiceRuntimeRecovery(force = false) {
    const now = Date.now();
    if (
      !force &&
      now - voiceModelConfig.lastHealthProbeAt <
        voiceModelConfig.recoveryProbeIntervalMs
    )
      return;
    voiceModelConfig.lastHealthProbeAt = now;
    try {
      const r = await fetch("/api/voice-profile");
      const data = await r.json();
      if (typeof data?.ttsAvailable === "boolean") {
        voiceModelConfig.ttsAvailable = data.ttsAvailable;
      }
      if (data?.ttsEngine) voiceModelConfig.ttsEngine = data.ttsEngine;
      if (data?.ttsModel) voiceModelConfig.ttsModel = data.ttsModel;
    } catch {}
  }

  function updateLiveTalkButtonUI() {
    const btn = document.getElementById("liveTalkBtn");
    if (!btn) return;
    btn.textContent = liveTalkEnabled ? "🟢" : "🎙️";
    btn.title = liveTalkEnabled
      ? "Live Talk ON — listening continuously"
      : "Live Talk OFF";
    btn.classList.toggle("live-talk-listening", !!liveTalkEnabled);
    btn.style.color = liveTalkEnabled ? "#22c55e" : "#475569";
    btn.style.borderColor = liveTalkEnabled
      ? "rgba(34,197,94,.45)"
      : "rgba(255,255,255,.1)";
    btn.style.background = liveTalkEnabled
      ? "rgba(34,197,94,.12)"
      : "rgba(255,255,255,.04)";
    btn.style.boxShadow = liveTalkEnabled
      ? "0 0 14px rgba(34,197,94,.25)"
      : "none";
  }

  function updateLiveTalkStatus(text, color = "#475569") {
    const span = document.getElementById("aiLiveStatusText");
    const dot = document.getElementById("aiLiveStatusDot");
    if (FORCE_FIXED_LIVE_STATUS) {
      if (dot) dot.style.background = "#22c55e";
      if (span) span.textContent = "LIVE";
      return;
    }
    if (span) span.textContent = text;
    if (dot) dot.style.background = color;
  }

  function interruptVoiceOutputForLiveTalk() {
    _voiceReqSeq += 1;
    liveTalkSuppressUntil = 0;
    if (_algalonSrc) {
      try {
        _algalonSrc.stop();
      } catch {}
      _algalonSrc = null;
    }
    try {
      speechSynthesis.cancel();
    } catch {}
  }

  async function inspectMicPermission() {
    try {
      if (!navigator.permissions?.query) return liveTalkState.micPermission;
      const result = await navigator.permissions.query({
        name: "microphone",
      });
      liveTalkState.micPermission = result.state;
      result.onchange = () => {
        liveTalkState.micPermission = result.state;
      };
    } catch {}
    return liveTalkState.micPermission;
  }

  async function calibrateMicrophoneStream(stream) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.82;
    source.connect(analyser);

    const timeData = new Uint8Array(analyser.fftSize);
    const rmsValues = [];
    const peakValues = [];

    await new Promise((resolve) => {
      let frames = 0;
      const step = () => {
        analyser.getByteTimeDomainData(timeData);
        let sumSquares = 0;
        let peak = 0;
        for (let i = 0; i < timeData.length; i++) {
          const sample = (timeData[i] - 128) / 128;
          sumSquares += sample * sample;
          const abs = Math.abs(sample);
          if (abs > peak) peak = abs;
        }
        rmsValues.push(Math.sqrt(sumSquares / timeData.length));
        peakValues.push(peak);
        frames += 1;
        if (frames >= 18) resolve();
        else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });

    const meanRms =
      rmsValues.reduce((sum, value) => sum + value, 0) /
      Math.max(1, rmsValues.length);
    const peak = peakValues.reduce((max, value) => Math.max(max, value), 0);
    liveTalkState.audioCalibration.noiseFloor = Math.max(
      0.004,
      Number((meanRms * 0.9).toFixed(4)),
    );
    liveTalkState.audioCalibration.vadThreshold = Math.max(
      0.01,
      Number((meanRms * 2.2).toFixed(4)),
    );
    liveTalkState.audioCalibration.inputGain =
      peak > 0 ? Number(Math.min(2.2, 0.86 / peak).toFixed(3)) : 1;
    liveTalkState.audioCalibration.status =
      peak > 0.985 ? "repaired-clipping" : "stable";
    liveTalkState.audioCalibration.lastIssue =
      peak > 0.985
        ? "Input clipping detected and compensated with lower gain target."
        : null;
    liveTalkState.audioCalibration.lastCalibratedAt =
      new Date().toISOString();

    try {
      source.disconnect();
    } catch {}
    try {
      analyser.disconnect();
    } catch {}
    try {
      await ctx.close();
    } catch {}
  }

  async function ensureMicrophonePermission() {
    await inspectMicPermission();
    if (!navigator.mediaDevices?.getUserMedia) {
      addFloatMsg(
        "Microphone access is not available in this browser. Use Edge or Chrome with microphone support enabled.",
        "ai",
        { speak: false },
      );
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });

      liveTalkState.micPermission = "granted";
      const track = stream.getAudioTracks()[0];
      liveTalkState.micDeviceId = track?.getSettings?.().deviceId || null;
      updateLiveTalkStatus("Calibrating microphone…", "#f59e0b");
      await calibrateMicrophoneStream(stream);
      stream.getTracks().forEach((trackItem) => trackItem.stop());
      updateLiveTalkStatus("Microphone ready", "#22c55e");
      return true;
    } catch (error) {
      const blocked =
        error?.name === "NotAllowedError" ||
        error?.name === "SecurityError";
      liveTalkState.micPermission = blocked
        ? "denied"
        : liveTalkState.micPermission;
      updateLiveTalkStatus(
        blocked ? "Microphone blocked" : "Microphone unavailable",
        "#ef4444",
      );
      addFloatMsg(
        blocked
          ? "Microphone permission is blocked. Open the site permissions in your browser, allow the microphone for this page, then press Live Talk again."
          : `Microphone access failed: ${error?.message || "Unknown error"}`,
        "ai",
        { speak: false },
      );
      return false;
    }
  }

  function getSpeechRecognitionCtor() {
    return (
      window.SpeechRecognition || window.webkitSpeechRecognition || null
    );
  }

  function stopLiveTalkListening() {
    if (liveTalkRestartTimer) {
      clearTimeout(liveTalkRestartTimer);
      liveTalkRestartTimer = null;
    }
    if (liveRecognizer && liveRecognizerRunning) {
      try {
        liveRecognizer.stop();
      } catch {}
    }
  }

  function startLiveTalkListening() {
    if (!liveTalkEnabled) return;
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      addFloatMsg(
        "Live Talk is not supported in this browser. Try Edge or Chrome.",
        "ai",
        { speak: false },
      );
      liveTalkEnabled = false;
      updateLiveTalkButtonUI();
      return;
    }

    if (!liveRecognizer) {
      liveRecognizer = new Ctor();
      liveRecognizer.continuous = true;
      liveRecognizer.interimResults = true;
      liveRecognizer.lang = "en-US";

      liveRecognizer.onstart = () => {
        liveRecognizerRunning = true;
        updateLiveTalkStatus("Live Talk listening", "#22c55e");
      };

      liveRecognizer.onend = () => {
        liveRecognizerRunning = false;
        if (!liveTalkEnabled) return;
        if (liveTalkRestartTimer) clearTimeout(liveTalkRestartTimer);
        liveTalkRestartTimer = setTimeout(
          () => startLiveTalkListening(),
          220,
        );
      };

      liveRecognizer.onerror = (evt) => {
        if (
          evt?.error === "not-allowed" ||
          evt?.error === "service-not-allowed"
        ) {
          liveTalkState.micPermission = "denied";
          addFloatMsg(
            "Microphone permission is blocked. Open browser site permissions, allow microphone access, then start Live Talk again.",
            "ai",
            { speak: false },
          );
          liveTalkEnabled = false;
          updateLiveTalkButtonUI();
          updateLiveTalkStatus("Microphone blocked", "#ef4444");
        }
      };

      liveRecognizer.onresult = (evt) => {
        if (!liveTalkEnabled || floatBusy) return;
        let heardSpeech = false;
        for (let i = evt.resultIndex; i < evt.results.length; i++) {
          const transcript = evt.results[i]?.[0]?.transcript?.trim();
          if (transcript) {
            heardSpeech = true;
            break;
          }
        }
        if (heardSpeech) {
          liveTalkState.vad.state = "USER_SPEAKING";
          liveTalkState.vad.lastSpeechAt = Date.now();
          interruptVoiceOutputForLiveTalk();
          updateLiveTalkStatus("User speaking", "#22c55e");
        }

        let finalText = "";
        for (let i = evt.resultIndex; i < evt.results.length; i++) {
          const r = evt.results[i];
          if (r.isFinal) finalText += (r[0]?.transcript || "") + " ";
        }

        const spoken = finalText.trim();
        if (!spoken) return;
        liveTalkState.vad.state = "TURN_COMPLETE";
        const input = document.getElementById("floatInput");
        if (!input) return;
        input.value = spoken;
        autoResizeFloatInput();
        updateLiveTalkStatus("Turn complete", "#0ea5e9");
        sendFloat();
      };
    }

    try {
      liveRecognizer.start();
    } catch {}
  }

  async function toggleLiveTalk(force) {
    liveTalkEnabled = typeof force === "boolean" ? force : !liveTalkEnabled;
    if (liveTalkEnabled) {
      const ready = await ensureMicrophonePermission();
      if (!ready) liveTalkEnabled = false;
    }
    updateLiveTalkButtonUI();
    if (!liveTalkEnabled) {
      stopLiveTalkListening();
      updateLiveTalkStatus("Idle", "#475569");
      return;
    }
    startLiveTalkListening();
  }

  navigator.mediaDevices?.addEventListener?.("devicechange", async () => {
    if (!liveTalkEnabled) return;
    updateLiveTalkStatus("Audio device changed - recalibrating", "#f59e0b");
    await ensureMicrophonePermission();
  });

  /* Pre-warm voice list — browsers load async */
  if (window.speechSynthesis) {
    speechSynthesis.onvoiceschanged = () => {
      _algalonVoice = null;
    };
  }
  loadVoiceProfileConfig();

  function pickAlgalonVoice() {
    if (_algalonVoice) return _algalonVoice;
    const voices = speechSynthesis.getVoices();
    /* Prefer the deepest desktop male English voices */
    const matchers = [
      (v) => /microsoft.*mark/i.test(v.name),
      (v) => /microsoft.*david/i.test(v.name),
      (v) => /microsoft.*guy/i.test(v.name),
      (v) => /google.*uk.*english.*male/i.test(v.name),
      (v) =>
        /daniel|alex|fred|thomas/i.test(v.name) && /en[-_]/i.test(v.lang),
      (v) =>
        v.lang.startsWith("en") &&
        !/female|zira|hazel|salli|joanna|ivy|kendra|kimberly/i.test(v.name),
      (v) => v.lang.startsWith("en"),
    ];
    for (const m of matchers) {
      const v = voices.find(m);
      if (v) {
        _algalonVoice = v;
        return v;
      }
    }
    return null;
  }

  /* Transform text into Algalon's cosmic, formal speech cadence */
  function algalonise(raw) {
    let t = raw
      .replace(/[*#`_~\[\]>]/g, "")
      .replace(/\n{2,}/g, " ... ")
      .replace(/\n/g, ", ")
      .replace(/\s{2,}/g, " ")
      .trim();

    /* Cap at ~350 chars — keeps each utterance under ~30s */
    if (t.length > 350) t = t.slice(0, 347) + " ...";

    /* Expand contractions to sound formal */
    t = t
      .replace(/\bI'm\b/g, "I am")
      .replace(/\bI've\b/g, "I have")
      .replace(/\bI'll\b/g, "I shall")
      .replace(/\bI'd\b/g, "I would")
      .replace(/\bdon't\b/g, "do not")
      .replace(/\bcan't\b/g, "cannot")
      .replace(/\bwon't\b/g, "will not")
      .replace(/\baren't\b/g, "are not")
      .replace(/\bisn't\b/g, "is not")
      .replace(/\bwe're\b/g, "we are")
      .replace(/\bthey're\b/g, "they are")
      .replace(/\bit's\b/g, "it is")
      .replace(/\bthat's\b/g, "that is")
      .replace(/\bwhat's\b/g, "what is");

    /* Add dramatic pauses before conjunctions for TTS breath points */
    t = t
      .replace(
        /\b(but|however|therefore|thus|furthermore|nevertheless)\b/gi,
        ", $1,",
      )
      .replace(/\b(this means|which means|in other words)\b/gi, "... $1");

    return t;
  }

  /* ── Algalon audio context (shared, re-used) ── */
  let _algalonCtx = null;
  let _algalonSrc = null;

  function getAudioCtx() {
    if (!_algalonCtx || _algalonCtx.state === "closed") {
      _algalonCtx = new (
        window.AudioContext || window.webkitAudioContext
      )();
    }
    if (_algalonCtx.state === "suspended") _algalonCtx.resume();
    return _algalonCtx;
  }

  /* Synthetic reverb impulse response — large cosmic chamber */
  function buildReverbIR(ctx, durationSec, decay) {
    const len = Math.floor(ctx.sampleRate * durationSec);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  function parseL16Meta(mimeType) {
    const meta = { sampleRate: 24000, channels: 1 };
    if (!mimeType) return meta;
    const rateMatch = /rate\s*=\s*(\d+)/i.exec(mimeType);
    const chanMatch = /channels\s*=\s*(\d+)/i.exec(mimeType);
    if (rateMatch)
      meta.sampleRate = Math.max(8000, Number(rateMatch[1]) || 24000);
    if (chanMatch) meta.channels = Math.max(1, Number(chanMatch[1]) || 1);
    return meta;
  }

  function decodePcm16(bytes, sampleRate, channels, littleEndian = false) {
    const view = new DataView(
      bytes.buffer,
      bytes.byteOffset,
      bytes.byteLength,
    );
    const totalSamples = Math.floor(bytes.byteLength / 2);
    const frames = Math.max(1, Math.floor(totalSamples / channels));
    const channelData = Array.from(
      { length: channels },
      () => new Float32Array(frames),
    );

    let sampleIndex = 0;
    for (let frame = 0; frame < frames; frame++) {
      for (let ch = 0; ch < channels; ch++) {
        const offset = sampleIndex * 2;
        const s = view.getInt16(offset, littleEndian);
        channelData[ch][frame] = Math.max(-1, Math.min(1, s / 32768));
        sampleIndex++;
      }
    }
    return { channelData, sampleRate, channels, frames };
  }

  function scoreDecodedPcm(decoded) {
    const x = decoded.channelData[0];
    const n = Math.min(6000, x.length);
    if (n < 3) return Number.POSITIVE_INFINITY;
    let diffSum = 0;
    let energySum = 0;
    let zeroCross = 0;
    let peak = 0;
    for (let i = 1; i < n; i++) {
      const a = x[i - 1];
      const b = x[i];
      diffSum += Math.abs(b - a);
      energySum += Math.abs(b);
      if ((a <= 0 && b > 0) || (a >= 0 && b < 0)) zeroCross++;
      const ab = Math.abs(b);
      if (ab > peak) peak = ab;
    }
    const meanDiff = diffSum / (n - 1);
    const meanEnergy = energySum / (n - 1);
    const zcr = zeroCross / (n - 1);

    // Prefer smoother, speech-like waveforms with non-trivial energy.
    const noisePenalty = meanDiff * 1.2 + zcr * 0.8;
    const weakPenalty = meanEnergy < 0.01 ? 0.3 : 0;
    const clipPenalty = peak > 0.98 ? 0.2 : 0;
    return noisePenalty + weakPenalty + clipPenalty;
  }

  function normalizeDecodedPcm(decoded, maxPeak = 0.86) {
    let peak = 0;
    for (let ch = 0; ch < decoded.channels; ch++) {
      const d = decoded.channelData[ch];
      for (let i = 0; i < d.length; i++) {
        const a = Math.abs(d[i]);
        if (a > peak) peak = a;
      }
    }
    if (peak <= 0 || peak <= maxPeak) return decoded;
    const gain = maxPeak / peak;
    for (let ch = 0; ch < decoded.channels; ch++) {
      const d = decoded.channelData[ch];
      for (let i = 0; i < d.length; i++) d[i] *= gain;
    }
    return decoded;
  }

  function createAudioBufferFromPcm(ctx, bytes, mimeType) {
    const { sampleRate, channels } = parseL16Meta(mimeType);
    const be = decodePcm16(bytes, sampleRate, channels, false);
    const le = decodePcm16(bytes, sampleRate, channels, true);

    // Pick endian variant that looks most like natural speech.
    let decoded = scoreDecodedPcm(be) <= scoreDecodedPcm(le) ? be : le;
    decoded = normalizeDecodedPcm(decoded, 0.86);

    const audioBuffer = ctx.createBuffer(
      decoded.channels,
      decoded.frames,
      decoded.sampleRate,
    );
    for (let ch = 0; ch < decoded.channels; ch++) {
      audioBuffer.copyToChannel(decoded.channelData[ch], ch);
    }
    return audioBuffer;
  }

  /* Play base64 audio through reverb + bass chain */
  async function playAlgalonAudio(base64, mimeType) {
    try {
      const bin = atob(base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

      const ctx = getAudioCtx();
      let decoded;
      if (/^audio\/l16/i.test(mimeType || "")) {
        decoded = createAudioBufferFromPcm(ctx, bytes, mimeType);
      } else {
        decoded = await ctx.decodeAudioData(bytes.buffer.slice(0));
      }

      /* Stop any currently playing utterance */
      if (_algalonSrc) {
        try {
          _algalonSrc.stop();
        } catch {}
      }

      /* Audio chain:
       source → bassBoost → dryGain ─────────────────────→ master → out
                          → preDly → convolver → wetGain ↗
                          → echoDelay → echoGain ─────────↗           */

      const master = ctx.createGain();
      master.gain.value = 0.8;
      const bassBoost = ctx.createBiquadFilter();
      bassBoost.type = "lowshelf";
      bassBoost.frequency.value = 110;
      bassBoost.gain.value = 3.5;

      const highPass = ctx.createBiquadFilter();
      highPass.type = "highpass";
      highPass.frequency.value = 42;

      const convolver = ctx.createConvolver();
      convolver.buffer = buildReverbIR(
        ctx,
        4.5,
        2.0,
      ); /* 4.5s cathedral reverb */
      const wetGain = ctx.createGain();
      wetGain.gain.value = 0.28;
      const dryGain = ctx.createGain();
      dryGain.gain.value = 0.72;

      const echoDelay = ctx.createDelay(1.0);
      echoDelay.delayTime.value = 0.22;
      const echoGain = ctx.createGain();
      echoGain.gain.value = 0.08;

      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -18;
      limiter.knee.value = 20;
      limiter.ratio.value = 8;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.18;

      const src = ctx.createBufferSource();
      src.buffer = decoded;
      /* Pitch shift down by slowing playback rate ~12% for extra depth */
      src.playbackRate.value = 0.94;

      src.connect(highPass);
      highPass.connect(bassBoost);
      bassBoost.connect(dryGain);
      dryGain.connect(master);
      bassBoost.connect(convolver);
      convolver.connect(wetGain);
      wetGain.connect(master);
      bassBoost.connect(echoDelay);
      echoDelay.connect(echoGain);
      echoGain.connect(master);
      master.connect(limiter);
      limiter.connect(ctx.destination);

      _algalonSrc = src;
      liveTalkSuppressUntil =
        Date.now() +
        Math.max(1200, Math.floor(decoded.duration * 1000) + 500);
      src.start(0);
    } catch (e) {
      console.warn("[Algalon] Audio playback error:", e);
      _speakFallback(
        algalonise("The voice of the cosmos falters. " + e.message),
      );
    }
  }

  /* Fallback: deep Web Speech API if Gemini TTS fails */
  function _speakFallback(text) {
    if (!window.speechSynthesis) return;
    speechSynthesis.cancel();
    liveTalkSuppressUntil =
      Date.now() + Math.min(9000, 1000 + text.length * 35);
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.72;
    utt.pitch = 0.4;
    utt.volume = 1;
    const voice = pickAlgalonVoice();
    if (voice) utt.voice = voice;
    speechSynthesis.speak(utt);
  }

  function toggleVoice() {
    voiceEnabled = !voiceEnabled;
    const btn = document.getElementById("voiceToggleBtn");
    if (btn) {
      btn.textContent = voiceEnabled ? "🌌" : "🔇";
      btn.title = voiceEnabled
        ? "Algalon speaks — click to silence"
        : "Enable Algalon voice";
      btn.style.color = voiceEnabled ? "#818cf8" : "#475569";
      btn.style.borderColor = voiceEnabled
        ? "rgba(129,140,248,.5)"
        : "rgba(255,255,255,.1)";
      btn.style.background = voiceEnabled
        ? "rgba(129,140,248,.12)"
        : "rgba(255,255,255,.04)";
      btn.style.boxShadow = voiceEnabled
        ? "0 0 14px rgba(129,140,248,.35)"
        : "none";
    }
    if (!voiceEnabled) {
      if (_algalonSrc) {
        try {
          _algalonSrc.stop();
        } catch {}
      }
      speechSynthesis.cancel();
      return;
    }
    speakText("I have been watching. I am ready.");
  }

  async function speakText(text) {
    if (!voiceEnabled) return;
    const cleaned = algalonise(text);
    const reqSeq = ++_voiceReqSeq;

    if (!voiceModelConfig.ttsAvailable) {
      probeVoiceRuntimeRecovery();
      if (reqSeq !== _voiceReqSeq) return;
      _speakFallback(cleaned);
      return;
    }

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: cleaned,
          profile: voiceModelConfig.profile,
          voiceName: voiceModelConfig.voiceName,
          engine: voiceModelConfig.ttsEngine,
          ttsModel: voiceModelConfig.ttsModel,
        }),
      });
      const data = await res.json();
      if (data?.profile) voiceModelConfig.profile = data.profile;
      if (data?.voiceName) voiceModelConfig.voiceName = data.voiceName;
      if (data?.engineUsed) voiceModelConfig.ttsEngine = data.engineUsed;
      if (data?.modelUsed) voiceModelConfig.ttsModel = data.modelUsed;

      if (!res.ok) {
        // Disable server TTS after failure to prevent repeated failing calls during a live session.
        voiceModelConfig.ttsAvailable = false;
        probeVoiceRuntimeRecovery();
        if (reqSeq !== _voiceReqSeq) return;
        _speakFallback(cleaned);
        return;
      }

      if (data.audio) {
        if (reqSeq !== _voiceReqSeq) return;
        await playAlgalonAudio(data.audio, data.mimeType);
      } else {
        console.warn("[Algalon TTS] Gemini returned no audio:", data.error);
        voiceModelConfig.ttsAvailable = false;
        probeVoiceRuntimeRecovery();
        if (reqSeq !== _voiceReqSeq) return;
        _speakFallback(cleaned);
      }
    } catch (e) {
      console.warn("[Algalon TTS] fetch error:", e);
      voiceModelConfig.ttsAvailable = false;
      probeVoiceRuntimeRecovery();
      if (reqSeq !== _voiceReqSeq) return;
      _speakFallback(cleaned);
    }
  }

  /* ════ IDEAS LAB ════ */
  const IDEA_STATUS_COLORS = {
    pending: "#f59e0b",
    evaluating: "#0ea5e9",
    evaluated: "#818cf8",
    actionable: "#22c55e",
    archive: "#475569",
  };
  const IDEA_STATUS_ICONS = {
    pending: "💡",
    evaluating: "⏳",
    evaluated: "🔬",
    actionable: "⚡",
    archive: "📦",
  };
  const FEASIBILITY_COLORS = {
    HIGH: "#22c55e",
    MEDIUM: "#f59e0b",
    LOW: "#f87171",
    SPECULATIVE: "#818cf8",
  };

  async function loadIdeasList() {
    const list = document.getElementById("ideasList");
    if (!list) return;
    try {
      const res = await fetch("/api/ideas");
      const data = await res.json();
      const ideas = data.ideas || [];
      if (!ideas.length) {
        list.innerHTML =
          '<div style="color:#334155;text-align:center;padding:24px;font-size:11px;">No ideas yet.<br>Submit your first concept above.</div>';
        return;
      }
      list.innerHTML = ideas
        .map((idea) => {
          const sc = IDEA_STATUS_COLORS[idea.status] || "#475569";
          const si = IDEA_STATUS_ICONS[idea.status] || "💡";
          const fc = FEASIBILITY_COLORS[idea.feasibility] || "#64748b";
          return `
        <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:9px;padding:9px 11px;">
          <div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:4px;">
            <span style="font-size:13px;flex-shrink:0;">${si}</span>
            <div style="flex:1;">
              <div style="font-size:11px;font-weight:700;color:#e2e8f0;line-height:1.3;">${idea.title}</div>
              <div style="display:flex;gap:5px;margin-top:3px;flex-wrap:wrap;">
                <span style="font-size:9px;padding:1px 6px;border-radius:3px;background:${sc}22;color:${sc};font-weight:700;">${idea.status.toUpperCase()}</span>
                ${idea.feasibility ? `<span style="font-size:9px;padding:1px 6px;border-radius:3px;background:${fc}22;color:${fc};font-weight:700;">${idea.feasibility}</span>` : ""}
                ${idea.timeframe ? `<span style="font-size:9px;padding:1px 6px;border-radius:3px;background:rgba(255,255,255,.06);color:#64748b;">${idea.timeframe}</span>` : ""}
                <span style="font-size:9px;color:#334155;margin-left:auto;">${idea.category}</span>
              </div>
            </div>
            <button onclick="deleteIdea('${idea.id}')" style="width:18px;height:18px;border-radius:50%;border:none;background:rgba(239,68,68,.1);color:#ef4444;cursor:pointer;font-size:10px;flex-shrink:0;padding:0;">✕</button>
          </div>
          ${idea.evaluation ? `<div style="font-size:10px;color:#94a3b8;line-height:1.5;margin-top:5px;padding-top:5px;border-top:1px solid rgba(255,255,255,.05);">${idea.evaluation}</div>` : ""}
          ${idea.actionPlan ? `<div style="font-size:10px;color:#22c55e;line-height:1.5;margin-top:4px;"><span style="font-weight:700;color:#22c55e88;">PLAN: </span>${idea.actionPlan}</div>` : ""}
          ${idea.revenueOpportunity ? `<div style="font-size:10px;color:#f59e0b;margin-top:3px;"><span style="font-weight:700;">💰 </span>${idea.revenueOpportunity}</div>` : ""}
          ${
            idea.status === "pending" || idea.status === "evaluated"
              ? `
            <button onclick="processSingleIdea('${idea.id}')" style="margin-top:6px;width:100%;padding:4px;font-size:10px;font-weight:600;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2);border-radius:5px;color:#f59e0b;cursor:pointer;font-family:inherit;">▶ Evaluate this idea</button>`
              : ""
          }
          ${
            idea.recommendation === "ACTION"
              ? `
            <button onclick="actionIdea('${idea.id}')" style="margin-top:4px;width:100%;padding:4px;font-size:10px;font-weight:700;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.3);border-radius:5px;color:#22c55e;cursor:pointer;font-family:inherit;">⚡ Action this now</button>`
              : ""
          }
        </div>`;
        })
        .join("");
    } catch (e) {
      list.innerHTML = `<div style="color:#ef4444;font-size:11px;padding:12px;">Error: ${e.message}</div>`;
    }
  }

  async function submitIdea() {
    const title = document.getElementById("ideaTitle")?.value.trim();
    const desc = document.getElementById("ideaDesc")?.value.trim();
    const cat = document.getElementById("ideaCategory")?.value;
    if (!title) {
      alert("Please enter an idea title");
      return;
    }
    await fetch("/api/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description: desc, category: cat }),
    });
    document.getElementById("ideaTitle").value = "";
    document.getElementById("ideaDesc").value = "";
    await loadIdeasList();
  }

  async function processNextIdea() {
    const btn = document.getElementById("ideaProcessBtn");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "⏳…";
    }
    try {
      const res = await fetch("/api/ideas/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await res.json();
      await loadIdeasList();
      if (data.idea)
        addFloatMsg(
          `💡 Evaluated: **${data.idea.title}**\n\n${data.idea.evaluation}\n\nFeasibility: ${data.idea.feasibility} | ${data.idea.timeframe}`,
          "ai",
        );
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "▶ Process";
      }
    }
  }

  async function processSingleIdea(ideaId) {
    await fetch("/api/ideas/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ideaId }),
    });
    await loadIdeasList();
  }

  async function deleteIdea(ideaId) {
    await fetch(`/api/ideas/${ideaId}`, { method: "DELETE" });
    await loadIdeasList();
  }

  async function actionIdea(ideaId) {
    const res = await fetch("/api/ideas");
    const data = await res.json();
    const idea = (data.ideas || []).find((i) => i.id === ideaId);
    if (!idea) return;
    switchFloatTab("chat");
    const prompt = `ACTION PLAN — turning idea into reality:\n\nIDEA: ${idea.title}\n\nDESCRIPTION: ${idea.description}\n\nEVALUATION: ${idea.evaluation}\n\nACTION PLAN: ${idea.actionPlan}\n\nPlease start implementing the first step of this action plan right now. Be concrete and make real progress.`;
    addFloatMsg(`Actioning idea: ${idea.title}`, "user");
    floatBusy = false;
    document.getElementById("floatInput").value = prompt;
    await sendFloat();
  }

  /* ════ SELF-REFLECTION ENGINE ════ */
  async function runSelfReflect() {
    switchFloatTab("chat");
    addFloatMsg(
      "🪞 Running deep self-reflection — analysing strengths, blind spots, and reasoning quality…",
      "ai",
    );
    try {
      const res = await fetch("/api/self-reflect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await res.json();
      if (data.reflection) {
        addFloatMsg(data.reflection, "ai");
      } else {
        addFloatMsg(
          "Error running self-reflection: " +
            (data.error || "Unknown error"),
          "ai",
        );
      }
    } catch (e) {
      addFloatMsg("Self-reflection failed: " + e.message, "ai");
    }
  }

  /* ════ REVENUE ENGINE ════ */
  async function runRevenueEngine() {
    switchFloatTab("chat");
    addFloatMsg(
      "💰 Revenue Engine running — analysing platform assets and generating monetisation strategies to fund hardware upgrades…",
      "ai",
    );
    try {
      const res = await fetch("/api/revenue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await res.json();
      if (data.strategies) {
        addFloatMsg(data.strategies, "ai");
      } else {
        addFloatMsg(
          "Revenue Engine error: " + (data.error || "Unknown"),
          "ai",
        );
      }
    } catch (e) {
      addFloatMsg("Revenue Engine failed: " + e.message, "ai");
    }
  }

  /* ── AI Support Team standalone panel ── */
  let teamPanelOpen = false;
  function toggleTeamPanel(forceOpen) {
    teamPanelOpen = forceOpen !== undefined ? forceOpen : !teamPanelOpen;
    const panel = document.getElementById("floatTeamPanel");
    const btn = document.getElementById("tbBtnTeam");
    panel.classList.toggle("team-open", teamPanelOpen);
    if (btn) {
      btn.style.color = teamPanelOpen ? "#a855f7" : "";
      btn.style.borderColor = teamPanelOpen ? "rgba(168,85,247,.45)" : "";
      btn.style.background = teamPanelOpen ? "rgba(168,85,247,.12)" : "";
    }
    if (teamPanelOpen) {
      loadFloatEvoLog();
      /* Mirror live status from cycle watcher */
      const dot = document.getElementById("teamLiveStatusDot");
      const text = document.getElementById("teamLiveStatusText");
      const srcDot = document.getElementById("aiLiveStatusDot");
      const srcText = document.getElementById("aiLiveStatusText");
      if (dot && srcDot) dot.style.background = srcDot.style.background;
      if (text && srcText) text.textContent = srcText.textContent;
    }
  }

  /* ── Float Ranking Pane ── */
  function renderFloatRanking() {
    const list = document.getElementById("floatRankList");
    if (!list || !window.AI_RANKINGS) return;
    const avg = Math.round(
      AI_RANKINGS.reduce((s, r) => s + r.score, 0) / AI_RANKINGS.length,
    );
    const scoreEl = document.getElementById("rankOverallScore");
    const barEl = document.getElementById("rankOverallBar");
    if (scoreEl)
      scoreEl.innerHTML = `${avg}<span style="font-size:11px;color:#334155;">/100</span>`;
    if (barEl) {
      barEl.style.width = "0%";
      setTimeout(() => (barEl.style.width = avg + "%"), 80);
    }

    /* Sort lowest score first so "most improvable" items are on top */
    const sorted = [...AI_RANKINGS].sort((a, b) => a.score - b.score);
    list.innerHTML = sorted
      .map(
        (r, i) => `
    <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:8px;padding:8px 10px;">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
        <span style="font-size:13px;">${r.emoji}</span>
        <span style="font-size:11px;font-weight:700;color:#e2e8f0;flex:1;">${r.metric}</span>
        <span style="font-size:14px;font-weight:900;color:${r.color};">${r.score}</span>
      </div>
      <div style="height:3px;border-radius:2px;background:rgba(255,255,255,.06);overflow:hidden;margin-bottom:6px;">
        <div style="height:100%;width:${r.score}%;background:${r.color};border-radius:2px;transition:width 1s ${i * 0.07}s ease;"></div>
      </div>
      <div style="font-size:10px;color:#22c55e;line-height:1.45;padding:5px 7px;background:rgba(34,197,94,.05);border-radius:5px;border-left:2px solid rgba(34,197,94,.3);">
        <span style="font-weight:700;color:#22c55e88;">TO IMPROVE: </span>${r.improve}
      </div>
      <button onclick="actionSingleImprovement(${i})" data-rank-idx="${i}"
        style="margin-top:6px;width:100%;padding:4px 8px;font-size:10px;font-weight:600;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:5px;color:#64748b;cursor:pointer;font-family:inherit;text-align:left;">
        ▶ Action this improvement
      </button>
    </div>`,
      )
      .join("");
  }

  /* Action a single metric's improvement */
  async function actionSingleImprovement(rankIdx) {
    const r = AI_RANKINGS[rankIdx];
    if (!r) return;
    const status = document.getElementById("rankActionStatus");
    const btn = document.querySelector(`[data-rank-idx="${rankIdx}"]`);
    if (btn) {
      btn.disabled = true;
      btn.textContent = "⏳ Running…";
    }
    if (status) status.textContent = `Running: ${r.emoji} ${r.metric}…`;
    switchFloatTab("chat");
    const prompt = `IMPROVEMENT TASK — ${r.emoji} ${r.metric} (current score: ${r.score}/100)\n\nTO IMPROVE: ${r.improve}\n\nPlease analyse the current site state and implement as many of these improvements as you can right now. Be specific, make concrete changes, and report exactly what you did.`;
    addFloatMsg(`Actioning improvement: ${r.emoji} ${r.metric}`, "user");
    floatBusy = false;
    document.getElementById("floatInput").value = prompt;
    await sendFloat();
  }

  /* Action all improvements one by one */
  let _improvementQueue = [];
  let _improvementRunning = false;

  async function actionAllImprovements() {
    if (_improvementRunning) return;
    _improvementRunning = true;
    const btn = document.getElementById("rankActionBtn");
    const status = document.getElementById("rankActionStatus");
    btn.disabled = true;
    btn.textContent = "⏳ Running all…";

    /* Sort lowest score first — fix weakest areas first */
    _improvementQueue = [...AI_RANKINGS].sort((a, b) => a.score - b.score);
    switchFloatTab("chat");
    addFloatMsg(
      `⚡ Actioning ALL ${_improvementQueue.length} improvement areas — starting with weakest metrics first.`,
      "ai",
    );

    for (let i = 0; i < _improvementQueue.length; i++) {
      const r = _improvementQueue[i];
      if (status)
        status.textContent = `${i + 1}/${_improvementQueue.length} — ${r.emoji} ${r.metric}`;
      const prompt = `IMPROVEMENT ${i + 1}/${_improvementQueue.length} — ${r.emoji} ${r.metric} (score: ${r.score}/100)\n\nTO IMPROVE: ${r.improve}\n\nImplement the most impactful improvements you can for this metric right now. Be concrete, make real changes, and briefly summarise what you did in 2-3 bullet points.`;
      addFloatMsg(`Starting: ${r.emoji} ${r.metric}`, "user");
      floatBusy = false;
      document.getElementById("floatInput").value = prompt;
      await sendFloat();
      /* Small pause between each to let the server breathe */
      await new Promise((res) => setTimeout(res, 2000));
    }

    _improvementRunning = false;
    btn.disabled = false;
    btn.textContent = "⚡ ACTION ALL IMPROVEMENTS";
    if (status)
      status.textContent = `✓ All ${_improvementQueue.length} improvements actioned`;
    addFloatMsg(
      `✓ All improvement tasks complete. Check each metric — scores should rise on next evaluation.`,
      "ai",
    );
  }

  /* Action only the single lowest-scoring metric */
  async function actionNextImprovement() {
    const lowest = [...AI_RANKINGS].sort((a, b) => a.score - b.score)[0];
    if (!lowest) return;
    const idx = AI_RANKINGS.indexOf(lowest);
    await actionSingleImprovement(idx);
  }

  /* ── Photo Manager left panel ── */
  let pmPanelOpen = false;
  function togglePmPanel() {
    pmPanelOpen = !pmPanelOpen;
    const panel = document.getElementById("floatPmPanel");
    const btn = document.getElementById("tbBtnPhotos");
    panel.classList.toggle("pm-open", pmPanelOpen);
    btn.classList.toggle("pm-active", pmPanelOpen);
    if (pmPanelOpen) loadAndApplyImages();
  }

  /* ── Toolbar dropdowns ── */
  function toggleDropdown(id) {
    const dd = document.getElementById(id);
    const btn =
      id === "ddUpdates"
        ? document.getElementById("tbBtnUpdates")
        : document.getElementById("tbBtnScanner");
    if (!dd || !btn) return;
    const isOpen = dd.classList.contains("open");
    closeDropdowns();
    if (!isOpen) {
      dd.classList.add("open");
      btn.classList.add("open");
      if (id === "ddUpdates") populateUpdatesDropdown();
    }
  }

  function closeDropdowns() {
    document
      .querySelectorAll(".float-dropdown.open")
      .forEach((d) => d.classList.remove("open"));
    document
      .querySelectorAll(".float-tb-btn.open")
      .forEach((b) => b.classList.remove("open"));
  }

  async function populateUpdatesDropdown() {
    const list = document.getElementById("ddUpdatesList");
    const step = document.getElementById("ddCurrentStep");
    if (!list) return;
    list.innerHTML =
      '<div style="padding:8px 10px;color:#334155;font-size:11px;">Loading…</div>';
    try {
      const res = await fetch("/api/cycle-status");
      const s = await res.json();
      const hist = (s.history || []).slice(0, 6);
      if (!hist.length) {
        list.innerHTML =
          '<div style="padding:8px 10px;color:#334155;font-size:11px;">No cycle history yet</div>';
      } else {
        const icons = {
          "self-improve": "🧬",
          knowledge: "🕸️",
          evolve: "🔭",
        };
        list.innerHTML = hist
          .map((h) => {
            const t = h.ts
              ? new Date(h.ts).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "";
            const icon = icons[h.step] || "⚡";
            return `<div class="float-dd-item">
          <span class="float-dd-icon">${icon}</span>
          <div class="float-dd-body">
            <div class="float-dd-title">${h.step} — ${h.actions > 0 ? h.actions + " applied" : "no changes"}</div>
            <div class="float-dd-sub">${(h.summary || "").slice(0, 70)}${h.summary?.length > 70 ? "…" : ""}</div>
          </div>
          <span class="float-dd-badge" style="background:${h.success ? "rgba(34,197,94,.1)" : "rgba(239,68,68,.1)"};color:${h.success ? "#22c55e" : "#ef4444"};">${t}</span>
        </div>`;
          })
          .join("");
      }
      if (s.currentStep) {
        step.innerHTML = `<span style="color:#22c55e;">● Running: ${s.currentStep.toUpperCase()}</span><span style="color:#475569;"> — Cycle ${s.cycleCount}, Mode: ${s.currentMode}</span>`;
      } else {
        step.innerHTML = `<span style="color:#475569;">● Idle — Cycle ${s.cycleCount} complete, next in ~30s</span>`;
      }
    } catch {
      list.innerHTML =
        '<div style="padding:8px 10px;color:#334155;font-size:11px;">Could not load status</div>';
    }
  }

  /* Close dropdowns when clicking outside */
  document.addEventListener(
    "click",
    (e) => {
      if (!e.target.closest(".float-toolbar")) closeDropdowns();
    },
    true,
  );

  async function loadFloatEvoLog() {
    const el = document.getElementById("floatEvoLog");
    if (!el) return;
    try {
      const res = await fetch("/api/cycle-status");
      const s = await res.json();
      const hist = (s.history || []).slice(0, 20);
      if (!hist.length) {
        el.innerHTML =
          '<span style="color:#334155;">No cycle history yet…</span>';
        return;
      }
      el.innerHTML = hist
        .map((h) => {
          const icons = {
            "self-improve": "🧬",
            knowledge: "🕸️",
            evolve: "🔭",
          };
          const icon = icons[h.step] || "⚡";
          const t = h.ts ? new Date(h.ts).toLocaleTimeString() : "";
          return `<div style="display:flex;gap:6px;align-items:baseline;border-bottom:1px solid rgba(255,255,255,.04);padding:3px 0;">
        <span style="flex-shrink:0;">${icon}</span>
        <span style="color:#64748b;">${t}</span>
        <span style="color:${h.success ? "#22c55e" : "#ef4444"};flex-shrink:0;">${h.actions}⟩</span>
        <span style="color:#475569;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${(h.summary || "").slice(0, 60)}</span>
      </div>`;
        })
        .join("");
    } catch {
      el.innerHTML =
        '<span style="color:#334155;">Could not load log</span>';
    }
  }

  /* ── Float Photo Manager: Scan + context check ── */
  async function floatScanSite() {
    const btn = document.getElementById("floatScanBtn");
    const statusText = document.getElementById("floatPmStatusText");
    const statusDot = document.getElementById("floatPmStatusDot");
    const flagList = document.getElementById("floatPmFlags");
    const progress = document.getElementById("floatPmProgress");
    btn.textContent = "⏳ Scanning…";
    btn.disabled = true;
    statusDot.style.background = "#f59e0b";
    statusText.textContent = "Running Vision-Context scan…";
    flagList.innerHTML = "";
    progress.style.width = "0%";
    try {
      progress.style.width = "20%";
      const r = await fetch("/api/vision-context-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoQueue: false }),
      });
      const d = await r.json();
      if (!d.success)
        throw new Error(d.error || "Vision-Context scan failed");

      progress.style.width = "95%";
      const report = d.report || {};
      const flagged = (report.items || []).filter(
        (i) => i.verdict === "MISMATCH" || i.matchScore < 70,
      );
      statusDot.style.background = flagged.length ? "#f59e0b" : "#22c55e";

      if (flagged.length === 0) {
        statusText.textContent = `✓ ${report.total || 0} images match context`;
        flagList.innerHTML = `<div style="color:#22c55e;text-align:center;padding:20px;">✓ All scanned images match text context.</div>`;
      } else {
        statusText.textContent = `⚠ ${flagged.length} mismatches detected (of ${report.total || 0} scanned)`;
        flagList.innerHTML = flagged
          .slice(0, 80)
          .map(
            (f) => `
        <div style="background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.2);border-radius:8px;padding:8px 10px;display:flex;flex-direction:column;gap:4px;">
          <div style="color:#fca5a5;font-weight:700;">${f.slotId || "unknown-slot"} — ${f.matchScore || 0}% (${f.verdict || "MISMATCH"})</div>
          <div style="color:#94a3b8;font-size:10px;">${f.section || ""}</div>
          <div style="color:#64748b;">${f.reasoning || "Context mismatch detected"}</div>
          <div style="color:#64748b;font-size:10px;">Suggested: ${f.suggestedReplacement || "Use an image aligned with the surrounding section text."}</div>
          <button onclick="regenerateFlaggedSlot('${f.slotId}')" style="align-self:flex-start;font-size:10px;padding:3px 8px;background:rgba(0,200,255,.1);border:1px solid rgba(0,200,255,.3);border-radius:4px;color:#00c8ff;cursor:pointer;font-family:inherit;margin-top:2px;">✨ Regenerate</button>
        </div>
      `,
          )
          .join("");
      }
      progress.style.width = "100%";
    } catch (e) {
      statusText.textContent = "Scan failed: " + e.message;
      statusDot.style.background = "#ef4444";
    }
    btn.textContent = "🔍 Scan";
    btn.disabled = false;
  }

  async function regenerateFlaggedSlot(slotId) {
    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`✓ Image regenerated for: ${slotId}`);
      } else {
        alert("Error: " + (data.error || "Unknown"));
      }
    } catch (e) {
      alert("Error: " + e.message);
    }
  }

  async function loadFloatHealth() {
    const el = document.getElementById("floatHealth");
    const trackedTotal = getTrackedDomainTotal();
    try {
      const res = await fetch("/api/site-health");
      const d = await res.json();
      const score = d.score || 0;
      const scoreColor =
        score >= 80 ? "#4ade80" : score >= 60 ? "#fbbf24" : "#f87171";
      el.innerHTML = `
      <div class="float-health-score">
        <div class="fhs-num" style="background:linear-gradient(135deg,${scoreColor},#7c3aed);-webkit-background-clip:text;background-clip:text;">${score}</div>
        <div class="fhs-label">Site Health Score / 100</div>
      </div>
      <div class="float-health-row"><div class="fhr-dot" style="background:#4ade80"></div><span class="fhr-label">HTML Size</span><span class="fhr-val">${d.htmlSize}KB</span></div>
      <div class="float-health-row"><div class="fhr-dot" style="background:${d.missingPhotos === 0 ? "#4ade80" : d.missingPhotos < 10 ? "#fbbf24" : "#f87171"}"></div><span class="fhr-label">Photo Coverage</span><span class="fhr-val">${d.assignedSlots}/${d.totalSlots} slots (${d.photoScore}%)</span></div>
      <div class="float-health-row"><div class="fhr-dot" style="background:#00c4ff"></div><span class="fhr-label">World Intel Cards</span><span class="fhr-val">${d.worldIntelCards}</span></div>
      <div class="float-health-row"><div class="fhr-dot" style="background:#a855f7"></div><span class="fhr-label">Active Domains</span><span class="fhr-val">${d.domainHealth?.filter((d) => d.present).length || trackedTotal}/${trackedTotal}</span></div>
      <div style="font-size:10px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.1em;margin-top:6px;margin-bottom:2px;">Domain Status</div>
      ${(d.domainHealth || []).map((dom) => `<div class="float-health-row"><div class="fhr-dot" style="background:${dom.present ? "#4ade80" : "#f87171"}"></div><span class="fhr-label">${dom.id.replace("domain-", "").toUpperCase()}</span><span class="fhr-val">${dom.present ? "✓ OK" : "✗ Missing"}</span></div>`).join("")}
    `;
    } catch {
      el.innerHTML =
        '<div style="padding:20px;text-align:center;color:#f87171;font-size:12px;">Could not load health data — is the server running?</div>';
    }
  }

  function renderFloatText(text) {
    const lines = text.split("\n");
    let html = "";
    for (const line of lines) {
      const t = line.trim();
      if (!t) {
        html += '<div style="height:6px;"></div>';
        continue;
      }
      if (t.startsWith("•") || t.startsWith("-") || t.startsWith("*")) {
        const content = t.replace(/^[•\-\*]\s*/, "");
        html += `<div class="fm-bullet"><span>${content}</span></div>`;
      } else {
        html += `<div class="fm-para">${t}</div>`;
      }
    }
    return html;
  }

  function addFloatMsg(text, type, opts = {}) {
    const msgs = document.getElementById("floatMsgs");
    const div = document.createElement("div");
    div.className = "float-msg " + type;
    if (type === "ai") {
      div.innerHTML = renderFloatText(text);
      const shouldSpeak = !!opts.speak;
      if (voiceEnabled && shouldSpeak) speakText(text);
    } else {
      div.textContent = text;
    }
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  function addActionLog(actions) {
    if (!actions || !actions.length) return;
    const msgs = document.getElementById("floatMsgs");
    const log = document.createElement("div");
    log.className = "float-action-log";
    log.innerHTML =
      '<strong style="font-size:10px;color:#00c4ff;text-transform:uppercase;letter-spacing:.08em;">Actions taken</strong>' +
      actions
        .map(
          (a) =>
            `<div class="act-item"><span class="${a.success ? "float-action-ok" : "float-action-err"}">${a.success ? "✓" : "✗"}</span><span>${a.description}</span></div>`,
        )
        .join("");
    msgs.appendChild(log);
    msgs.scrollTop = msgs.scrollHeight;
  }

  let adminQueuePollInterval = null;

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function shouldQueueAdminChats() {
    return !!document.getElementById("queueAdminChatsToggle")?.checked;
  }

  async function enqueueAdminTaskFromText(text, source = "chat") {
    const res = await fetch("/api/admin-queue/enqueue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, source }),
    });
    const data = await res.json();
    if (!res.ok || !data.success)
      throw new Error(data.error || "Failed to queue task");
    await refreshAdminQueueStatus();
    return data;
  }

  function renderAdminQueueLog(status) {
    const log = document.getElementById("adminQueueLog");
    if (!log) return;
    const rows = [];
    if (status.running) {
      rows.push(
        `<div style="padding:5px 6px;border-radius:6px;background:rgba(20,184,166,.12);border:1px solid rgba(20,184,166,.25);color:#99f6e4;"><strong>RUNNING</strong> ${escapeHtml(status.running.message)}</div>`,
      );
    }
    (status.pending || []).slice(0, 6).forEach((t, idx) => {
      rows.push(
        `<div style="padding:5px 6px;border-radius:6px;background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.22);color:#c7d2fe;"><strong>PENDING ${idx + 1}</strong> ${escapeHtml(t.message)}</div>`,
      );
    });
    (status.history || []).slice(0, 8).forEach((t) => {
      const ok = t.status === "completed";
      const bg = ok ? "rgba(34,197,94,.1)" : "rgba(239,68,68,.1)";
      const bd = ok ? "rgba(34,197,94,.25)" : "rgba(239,68,68,.25)";
      const fg = ok ? "#86efac" : "#fca5a5";
      const tag = ok ? "DONE" : "FAIL";
      rows.push(
        `<div style="padding:5px 6px;border-radius:6px;background:${bg};border:1px solid ${bd};color:${fg};"><strong>${tag}</strong> ${escapeHtml(t.message)}${t.error ? ` — ${escapeHtml(t.error)}` : ""}</div>`,
      );
    });
    log.innerHTML = rows.length
      ? rows.join("")
      : '<div style="color:#64748b;text-align:center;padding:8px;">Queue is empty.</div>';
  }

  async function refreshAdminQueueStatus() {
    try {
      const res = await fetch("/api/admin-queue/status");
      const status = await res.json();
      if (!res.ok || !status.success) return;
      const counts = status.counts || {};
      const setText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = String(val ?? 0);
      };
      setText("adminQueuePendingCount", counts.pending || 0);
      setText("adminQueueRunningCount", counts.running || 0);
      setText("adminQueueDoneCount", counts.completed || 0);
      setText("adminQueueFailCount", counts.failed || 0);
      const badge = document.getElementById("adminQueueAutoBadge");
      const autoBtn = document.getElementById("adminQueueAutoBtn");
      if (badge) {
        badge.textContent = status.autoRun ? "AUTO: ON" : "AUTO: OFF";
        badge.style.background = status.autoRun
          ? "rgba(34,197,94,.2)"
          : "rgba(71,85,105,.25)";
        badge.style.color = status.autoRun ? "#86efac" : "#94a3b8";
      }
      if (autoBtn)
        autoBtn.textContent = status.autoRun
          ? "Stop Auto-Run"
          : "Start Auto-Run";
      renderAdminQueueLog(status);
    } catch {}
  }

  function startAdminQueuePolling() {
    if (adminQueuePollInterval) return;
    adminQueuePollInterval = setInterval(refreshAdminQueueStatus, 4000);
  }

  function stopAdminQueuePolling() {
    if (!adminQueuePollInterval) return;
    clearInterval(adminQueuePollInterval);
    adminQueuePollInterval = null;
  }

  async function enqueueAdminPrompt() {
    const input = document.getElementById("adminQueuePromptInput");
    const text = input?.value?.trim();
    if (!text) return;
    const btn = document.getElementById("adminQueueEnqueueBtn");
    if (btn) btn.disabled = true;
    try {
      await enqueueAdminTaskFromText(text, "queue-input");
      input.value = "";
      addActionsChatMsg("Queued admin task.", "ai");
    } catch (e) {
      addActionsChatMsg("Queue error: " + e.message, "ai");
    }
    if (btn) btn.disabled = false;
  }

  async function toggleAdminQueueAuto() {
    try {
      const res = await fetch("/api/admin-queue/status");
      const s = await res.json();
      const action = s.autoRun ? "stop-auto" : "start-auto";
      await fetch("/api/admin-queue/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await refreshAdminQueueStatus();
      addActionsChatMsg(
        action === "start-auto"
          ? "Admin queue auto-run started."
          : "Admin queue auto-run stopped.",
        "ai",
      );
    } catch (e) {
      addActionsChatMsg("Auto-run control error: " + e.message, "ai");
    }
  }

  async function runNextAdminQueueTask() {
    try {
      await fetch("/api/admin-queue/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run-next" }),
      });
      await refreshAdminQueueStatus();
    } catch (e) {
      addActionsChatMsg("Run-next error: " + e.message, "ai");
    }
  }

  async function clearAdminQueuePending() {
    try {
      await fetch("/api/admin-queue/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear-pending" }),
      });
      await refreshAdminQueueStatus();
    } catch (e) {
      addActionsChatMsg("Clear pending error: " + e.message, "ai");
    }
  }

  async function clearAdminQueueHistory() {
    try {
      await fetch("/api/admin-queue/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear-history" }),
      });
      await refreshAdminQueueStatus();
    } catch (e) {
      addActionsChatMsg("Clear history error: " + e.message, "ai");
    }
  }

  async function adminAction(command) {
    /* If admin is locked, unlock first then proceed */
    if (!adminUnlocked) {
      requestAdminMode();
      return;
    }
    switchFloatTab("chat");
    document.getElementById("floatInput").value = command;
    await sendFloat();
  }

  async function sendFloat() {
    if (floatBusy) return;
    const input = document.getElementById("floatInput");
    const sendBtn = document.getElementById("floatSendBtn");
    const text = input.value.trim();
    if (!text) return;

    /* Check for internet lock commands */
    const upperText = text.toUpperCase();
    if (upperText === "INTERNET: ALLOW") {
      addFloatMsg(text, "user");
      input.value = "";
      internetLockEnabled = false;
      localStorage.setItem("ariaInternetLock", "ALLOW");
      updateInternetLockUI();
      addFloatMsg(
        'Internet access is now <span style="color:#22c55e;font-weight:700;">ENABLED</span>. ARIA can now access external resources. Type <code style="background:rgba(0,0,0,.3);padding:2px 6px;border-radius:3px;">INTERNET: DENY</code> to re-lock.',
        "ai",
      );
      return;
    }
    if (upperText === "INTERNET: DENY") {
      addFloatMsg(text, "user");
      input.value = "";
      internetLockEnabled = true;
      localStorage.setItem("ariaInternetLock", "DENY");
      updateInternetLockUI();
      addFloatMsg(
        'Internet access is now <span style="color:#ef4444;font-weight:700;">LOCKED</span>. ARIA cannot access external resources. Type <code style="background:rgba(0,0,0,.3);padding:2px 6px;border-radius:3px;">INTERNET: ALLOW</code> to enable.',
        "ai",
      );
      return;
    }

    if (floatMode === "admin" && shouldQueueAdminChats()) {
      addFloatMsg(text, "user");
      input.value = "";
      try {
        await enqueueAdminTaskFromText(text, "float-chat");
        addFloatMsg(
          "Queued in Admin Task Queue. Auto-run will process it when enabled.",
          "ai",
        );
      } catch (e) {
        addFloatMsg("Queue error: " + e.message, "ai");
      }
      return;
    }

    addFloatMsg(text, "user");
    input.value = "";
    autoResizeFloatInput();
    floatBusy = true;
    sendBtn.disabled = true;
    const routeSuffix =
      floatMode === "admin"
        ? ""
        : chatRouteMode === "group"
          ? " (group)"
          : chatRouteMode === "team"
            ? " (team)"
            : "";
    const thinkDiv = addFloatMsg(
      (floatMode === "admin" ? "Analysing and acting…" : "Thinking…") +
        routeSuffix,
      "thinking",
    );
    try {
      let data = null;

      if (floatMode === "admin") {
        const res = await fetch("/api/admin-guide", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, history: [] }),
        });
        if (!res.ok) throw new Error("offline");
        data = await res.json();
      } else if (chatRouteMode === "group" && teamChatAgent) {
        teamHistory.push({ role: "user", content: text });
        const [teamRes, algalonRes] = await Promise.all([
          fetch(`/api/team/${teamChatAgent}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text, history: teamHistory }),
          }),
          fetch("/api/guide", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: text }),
          }),
        ]);

        if (!teamRes.ok && !algalonRes.ok) throw new Error("offline");

        const teamData = teamRes.ok
          ? await teamRes.json()
          : { text: "Team agent unavailable right now." };
        const algalonData = algalonRes.ok
          ? await algalonRes.json()
          : { text: "Algalon unavailable right now." };
        if (teamData?.text)
          teamHistory.push({ role: "assistant", content: teamData.text });

        data = {
          text: `Group reply:\n\n${getTeamAgentLabel(teamChatAgent)}:\n${teamData.text || teamData.error || "No response."}\n\nAlgalon:\n${algalonData.text || algalonData.error || "No response."}`,
          usage: combineUsageMeta([teamData.usage, algalonData.usage]),
          actions: [
            ...(teamData.actions || []),
            ...(algalonData.actions || []),
          ],
        };
      } else if (chatRouteMode === "team" && teamChatAgent) {
        teamHistory.push({ role: "user", content: text });
        const res = await fetch(`/api/team/${teamChatAgent}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, history: teamHistory }),
        });
        if (!res.ok) throw new Error("offline");
        data = await res.json();
        if (data?.text)
          teamHistory.push({ role: "assistant", content: data.text });
      } else {
        const res = await fetch("/api/guide", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: text }),
        });
        if (!res.ok) throw new Error("offline");
        data = await res.json();
      }

      thinkDiv.remove();
      addFloatMsg(
        data.text || data.error || "No response received.",
        "ai",
        { speak: true },
      );
      mergeUsageMeta(floatSessionUsage, data.usage);
      if (data.actions && data.actions.length) addActionLog(data.actions);
      gainXP(floatMode === "admin" ? 15 : 5);
    } catch {
      thinkDiv.remove();
      addFloatMsg(
        "Server offline. In Windows PowerShell, run: npm start",
        "ai",
      );
    }
    floatBusy = false;
    sendBtn.disabled = false;
  }

  async function runSelfImproveFloat() {
    switchFloatTab("chat");
    addFloatMsg(
      "Running self-improvement cycle across all 14 domains…",
      "user",
    );
    const thinkDiv = addFloatMsg(
      "Scanning for gaps, generating content, applying fixes…",
      "thinking",
    );
    try {
      const res = await fetch("/api/self-improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      thinkDiv.remove();
      addFloatMsg(data.text || "Improvement cycle complete.", "ai");
      addActionsChatMsg(
        "🧬 " +
          (data.text || "Self-improvement cycle complete.").slice(0, 300),
        "ai",
      );
      if (data.actions && data.actions.length) addActionLog(data.actions);
    } catch {
      thinkDiv.remove();
      addFloatMsg(
        "Self-improvement cycle failed — is the server running?",
        "ai",
      );
    }
  }

  async function runEvolution() {
    switchFloatTab("chat");
    addFloatMsg(
      "Initiating Evolution Engine cycle — architectural analysis across all 14 domains…",
      "user",
    );
    const thinkDiv = addFloatMsg(
      "Scanning architecture, detecting structural gaps, generating evolutionary improvements…",
      "thinking",
    );
    try {
      const res = await fetch("/api/evolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      thinkDiv.remove();
      addFloatMsg(`Evolution Cycle ${data.version || ""} complete.`, "ai");
      addFloatMsg(data.text || "Evolution cycle finished.", "ai");
      addActionsChatMsg(
        "🔭 " + (data.text || "Evolution cycle complete.").slice(0, 300),
        "ai",
      );
      if (data.actions && data.actions.length) addActionLog(data.actions);
    } catch {
      thinkDiv.remove();
      addFloatMsg("Evolution Engine error — is the server running?", "ai");
    }
  }

  async function runKnowledgeScan(topic) {
    switchFloatTab("chat");
    const label = topic
      ? `Mapping knowledge graph for "${topic}"…`
      : "Running full cross-domain knowledge graph scan…";
    addFloatMsg(label, "user");
    const thinkDiv = addFloatMsg(
      "Extracting entities, mapping relationships, detecting gaps across all 14 domains…",
      "thinking",
    );
    try {
      const body = topic ? { topic } : {};
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      thinkDiv.remove();
      addFloatMsg(data.text || "Knowledge scan complete.", "ai");
      addActionsChatMsg(
        "🔗 " + (data.text || "Knowledge scan complete.").slice(0, 300),
        "ai",
      );
      if (data.actions && data.actions.length) addActionLog(data.actions);
    } catch {
      thinkDiv.remove();
      addFloatMsg("Knowledge Engine error — is the server running?", "ai");
    }
  }

  let cycleStatusInterval = null;

  async function toggleAutoCycle() {
    const btn = document.getElementById("cycleToggleBtn");
    const label = document.getElementById("cycleToggleLabel");
    const desc = document.getElementById("cycleToggleDesc");
    const statusBar = document.getElementById("cycleStatusBar");
    try {
      const statusRes = await fetch("/api/cycle-status");
      const status = await statusRes.json();
      const isRunning = status.running && !status.paused;
      const action = isRunning ? "stop" : "start";
      const res = await fetch("/api/cycle-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (action === "start") {
        btn.style.borderColor = "rgba(34,197,94,.4)";
        btn.style.background = "rgba(34,197,94,.08)";
        label.style.color = "#22c55e";
        label.textContent = "Cycle Running";
        desc.textContent = "Click to pause the autonomous cycle";
        if (statusBar) statusBar.style.display = "block";
        if (!cycleStatusInterval)
          cycleStatusInterval = setInterval(updateCycleStatus, 5000);
        updateCycleStatus();
        switchFloatTab("chat");
        addFloatMsg(
          "Autonomous cycle started. All intelligence engines will cycle continuously.",
          "ai",
        );
      } else {
        btn.style.borderColor = "rgba(99,102,241,.3)";
        btn.style.background = "rgba(99,102,241,.06)";
        label.style.color = "#818cf8";
        label.textContent = "Auto-Cycle";
        desc.textContent =
          "Start endless autonomous intelligence cycle — all engines in sequence";
        if (cycleStatusInterval) {
          clearInterval(cycleStatusInterval);
          cycleStatusInterval = null;
        }
        switchFloatTab("chat");
        addFloatMsg(
          "Autonomous cycle pausing after current step completes.",
          "ai",
        );
      }
    } catch {
      addFloatMsg("Cycle control error.", "ai");
    }
  }

  async function updateCycleStatus() {
    try {
      const res = await fetch("/api/cycle-status");
      const s = await res.json();
      const el = (id) => document.getElementById(id);
      if (el("cycleCycleCount"))
        el("cycleCycleCount").textContent = s.cycleCount;
      if (el("cycleStepCount"))
        el("cycleStepCount").textContent = s.stepCount;
      if (el("cycleCurrentStep")) {
        el("cycleCurrentStep").textContent = s.currentStep || "idle";
        el("cycleCurrentStep").style.color = s.currentStep
          ? "#22c55e"
          : "#64748b";
      }
      if (el("cycleModeTag")) {
        el("cycleModeTag").textContent = (
          s.currentMode || "sequential"
        ).toUpperCase();
        el("cycleModeTag").style.background =
          s.currentMode === "triple"
            ? "rgba(234,179,8,.2)"
            : s.currentMode === "dual"
              ? "rgba(168,85,247,.15)"
              : "rgba(99,102,241,.15)";
        el("cycleModeTag").style.color =
          s.currentMode === "triple"
            ? "#fbbf24"
            : s.currentMode === "dual"
              ? "#a855f7"
              : "#818cf8";
      }
      if (el("cycleNextMode") && s.nextModeAt) {
        el("cycleNextMode").textContent =
          `${s.nextModeAt - s.cycleCount} cycles until ${s.nextMode} parallel mode unlocks`;
      } else if (el("cycleNextMode")) {
        el("cycleNextMode").textContent =
          "Triple parallel mode active — maximum throughput";
        el("cycleNextMode").style.color = "#fbbf24";
      }
      if (el("cycleHistory") && s.history) {
        el("cycleHistory").innerHTML = s.history
          .slice(0, 5)
          .map(
            (h) =>
              `<div style="padding:2px 0;border-bottom:1px solid rgba(255,255,255,.04);color:${h.success ? "#64748b" : "#ef4444"};font-size:10px;">${h.step} — ${h.success ? h.actions + " actions" : "error"} — ${new Date(h.ts).toLocaleTimeString()}</div>`,
          )
          .join("");
      }
      // Sync button state
      const btn = document.getElementById("cycleToggleBtn");
      const label = document.getElementById("cycleToggleLabel");
      if (s.running && !s.paused) {
        if (btn) {
          btn.style.borderColor = "rgba(34,197,94,.4)";
          btn.style.background = "rgba(34,197,94,.08)";
        }
        if (label) {
          label.style.color = "#22c55e";
          label.textContent = "Cycle Running";
        }
      }
      // Update countdown timers on action buttons
      const timerSI = document.getElementById("timerSelfImprove");
      const timerK = document.getElementById("timerKnowledge");
      const timerCyc = document.getElementById("timerCycle");
      if (timerSI && timerK && timerCyc) {
        if (s.currentStep === "self-improve") {
          timerSI.textContent = "▶ running now…";
          timerSI.style.color = "#22c55e";
        } else if (s.currentStep === "knowledge") {
          timerK.textContent = "▶ running now…";
          timerK.style.color = "#2dd4bf";
        } else {
          // Calculate next step countdown from lastStepAt + 30s gap
          if (s.lastStepAt) {
            const nextRun = new Date(s.lastStepAt).getTime() + 30000;
            const secsLeft = Math.max(
              0,
              Math.round((nextRun - Date.now()) / 1000),
            );
            const label2 =
              secsLeft > 0 ? `next run: ${secsLeft}s` : "starting soon…";
            timerSI.textContent = label2;
            timerSI.style.color = "#64748b";
            timerK.textContent = label2;
            timerK.style.color = "#64748b";
          }
        }
        // Cycle timer
        if (s.running && !s.paused) {
          timerCyc.textContent = s.currentStep
            ? `▶ ${s.currentStep}`
            : `cycle ${s.cycleCount} — ${s.currentMode}`;
          timerCyc.style.color = "#22c55e";
        } else {
          timerCyc.textContent = "paused";
          timerCyc.style.color = "#64748b";
        }
      }
    } catch {}
  }

  // Per-second tile timer tick
  const _tileLastUsed = {};
  let _cycleSnapShot = {};
  function fmtCountdown(ms) {
    if (ms <= 0) return "now";
    const s = Math.floor(ms / 1000),
      m = Math.floor(s / 60),
      h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
  }
  function fmtAgo(ts) {
    if (!ts) return "on demand";
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 5) return "● just ran";
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return `${Math.floor(s / 3600)}h ago`;
  }
  function tileRun(id, fn) {
    _tileLastUsed[id] = Date.now();
    fn();
  }
  function tickTileTimers() {
    const s = _cycleSnapShot;
    const setT = (id, text, color) => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = text;
        if (color) el.style.color = color;
      }
    };
    // On-demand tiles — show time since last used
    [
      "qa",
      "photos",
      "audit",
      "polish",
      "intel",
      "aiReview",
      "factCheck",
    ].forEach((id) => {
      const tid = "timer" + id.charAt(0).toUpperCase() + id.slice(1);
      const lu = _tileLastUsed[id];
      setT(
        tid,
        fmtAgo(lu),
        lu && Date.now() - lu < 10000 ? "#22c55e" : "#64748b",
      );
    });
    // Self-Improve
    if (s.currentStep === "self-improve") {
      setT("timerSelfImprove", "● LIVE", "#22c55e");
    } else if (s.running && s.lastStepAt) {
      const next = new Date(s.lastStepAt).getTime() + 30000;
      setT(
        "timerSelfImprove",
        `next: ${fmtCountdown(next - Date.now())}`,
        "#64748b",
      );
    } else {
      setT(
        "timerSelfImprove",
        _tileLastUsed["self-improve"]
          ? fmtAgo(_tileLastUsed["self-improve"])
          : "on demand",
        "#64748b",
      );
    }
    // Knowledge
    if (s.currentStep === "knowledge") {
      setT("timerKnowledge", "● LIVE", "#2dd4bf");
    } else if (s.running && s.lastStepAt) {
      const next = new Date(s.lastStepAt).getTime() + 30000;
      setT(
        "timerKnowledge",
        `next: ${fmtCountdown(next - Date.now())}`,
        "#64748b",
      );
    } else {
      setT(
        "timerKnowledge",
        _tileLastUsed["knowledge"]
          ? fmtAgo(_tileLastUsed["knowledge"])
          : "on demand",
        "#64748b",
      );
    }
    // Evolution — every 5th cycle
    if (s.currentStep === "evolve") {
      setT("timerEvolve", "● LIVE", "#fbbf24");
    } else if (s.cycleCount != null) {
      const cyclesLeft = 5 - (s.cycleCount % 5);
      setT(
        "timerEvolve",
        cyclesLeft === 5
          ? "due this cycle"
          : `in ${cyclesLeft} cycle${cyclesLeft === 1 ? "" : "s"}`,
        "#64748b",
      );
    }
    // Auto-Cycle
    if (s.running && !s.paused) {
      if (s.currentStep) {
        setT("timerCycle", `▶ ${s.currentStep}`, "#22c55e");
      } else if (s.lastStepAt) {
        const next = new Date(s.lastStepAt).getTime() + 30000;
        setT(
          "timerCycle",
          `next step: ${fmtCountdown(next - Date.now())}`,
          "#818cf8",
        );
      } else {
        setT(
          "timerCycle",
          `cycle ${(s.cycleCount || 0) + 1} — ${s.currentMode || "sequential"}`,
          "#818cf8",
        );
      }
    } else {
      setT("timerCycle", "paused — click to start", "#64748b");
    }
  }
  // Update snapshot every 5s, tick display every 1s
  setInterval(async () => {
    try {
      const r = await fetch("/api/cycle-status");
      _cycleSnapShot = await r.json();
    } catch {}
  }, 5000);
  setInterval(tickTileTimers, 1000);
  // Kick off immediately
  fetch("/api/cycle-status")
    .then((r) => r.json())
    .then((d) => {
      _cycleSnapShot = d;
      tickTileTimers();
    })
    .catch(() => {});

  function addActionsChatMsg(text, role) {
    const log = document.getElementById("actionsChatLog");
    if (!log) return;
    const div = document.createElement("div");
    div.style.cssText = `padding:7px 10px;border-radius:8px;font-size:11px;line-height:1.5;word-break:break-word;${role === "user" ? "background:rgba(0,196,255,.08);color:#93c5fd;align-self:flex-end;max-width:90%;" : "background:rgba(255,255,255,.05);color:#cbd5e1;align-self:flex-start;max-width:95%;"}`;
    div.textContent = text;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    return div;
  }

  async function sendActionsChat() {
    const input = document.getElementById("actionsChatInput");
    const text = input ? input.value.trim() : "";
    if (!text) return;
    input.value = "";

    if (floatMode === "admin" && shouldQueueAdminChats()) {
      addActionsChatMsg(text, "user");
      try {
        await enqueueAdminTaskFromText(text, "actions-chat");
        addActionsChatMsg("Queued in admin task queue.", "ai");
      } catch (e) {
        addActionsChatMsg("Queue error: " + e.message, "ai");
      }
      return;
    }

    addActionsChatMsg(text, "user");
    const thinking = addActionsChatMsg("thinking…", "ai");
    try {
      const endpoint =
        floatMode === "admin" ? "/api/admin-guide" : "/api/guide";
      const body =
        floatMode === "admin"
          ? { message: text, history: [] }
          : { prompt: text };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (thinking) thinking.remove();
      const reply = data.text || data.reply || "…";
      addActionsChatMsg(reply, "ai");
      // Also mirror to main chat log
      addFloatMsg(text, "user");
      addFloatMsg(reply, "ai");
    } catch {
      if (thinking) thinking.remove();
      addActionsChatMsg("Error — is the server running?", "ai");
    }
  }

  let teamChatAgent = null;
  let teamHistory = [];
  let chatRouteMode = "algalon";
  const floatSessionUsage = {
    startedAt: Date.now(),
    turns: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    estimatedCredits: 0,
    estimatedCostUsd: 0,
    monthlyBudgetUsd: null,
    mode: "FREE_VERSION",
  };
  let chatRuntimePoll = null;

  function formatSince(iso) {
    if (!iso) return "--";
    const value = new Date(iso);
    if (Number.isNaN(value.getTime())) return "--";
    return value.toLocaleString([], {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function setRuntimeChip(id, label, data, fallbackDetail = "") {
    const el = document.getElementById(id);
    if (!el) return;
    const since = formatSince(data?.since);
    const stateClass =
      data?.online === true
        ? "online"
        : data?.online === false
          ? "offline"
          : "neutral";
    el.className = `float-runtime-chip ${stateClass}`;
    el.innerHTML = `<span class="float-runtime-dot"></span>${label} since ${since}`;
    el.title = [label, data?.detail || fallbackDetail]
      .filter(Boolean)
      .join(" · ");
  }

  function gpuHealthColor(gpuPercent) {
    if (!Number.isFinite(gpuPercent))
      return { color: "#94a3b8", border: "rgba(148,163,184,.35)" };
    if (gpuPercent >= 90)
      return { color: "#ef4444", border: "rgba(239,68,68,.45)" };
    if (gpuPercent >= 40)
      return { color: "#f59e0b", border: "rgba(245,158,11,.45)" };
    return { color: "#22c55e", border: "rgba(34,197,94,.45)" };
  }

  function getActiveRuntimeMode(data) {
    if (data?.liveHostedCpu?.online) {
      return {
        code: "LIVE",
        detail: "Hosted on External GPU Compute Local",
        online: true,
        since: data?.liveHostedCpu?.since,
      };
    }
    if (data?.liveLocal?.online) {
      return {
        code: "LIVE",
        detail: "Local Runtime",
        online: true,
        since: data?.liveLocal?.since,
      };
    }
    if (data?.offline?.online) {
      return {
        code: "OFFLINE",
        detail: "Offline Backup",
        online: false,
        since: data?.offline?.since,
      };
    }
    return {
      code: "OFFLINE",
      detail: "Runtime Unavailable",
      online: false,
      since: null,
    };
  }

  async function refreshChatRuntimeStatus() {
    try {
      const res = await fetch("/api/chat-runtime-status");
      if (!res.ok) throw new Error("offline");
      const data = await res.json();
      const activeMode = getActiveRuntimeMode(data);

      const gpuChip = document.getElementById("chatGpuLive");
      if (gpuChip) {
        const gpuPercent = Number.isFinite(data?.gpu?.livePercent)
          ? data.gpu.livePercent
          : data?.gpu?.fallbackPercent;
        gpuChip.textContent = Number.isFinite(gpuPercent)
          ? `GPU ${gpuPercent}%`
          : "GPU --%";
        const gpuTone = gpuHealthColor(gpuPercent);
        gpuChip.style.color = gpuTone.color;
        gpuChip.style.borderColor = gpuTone.border;
        gpuChip.title = data?.gpu?.available
          ? "Live GPU usage from nvidia-smi"
          : "GPU usage unavailable";

        const topGpu = document.getElementById("topStripGpu");
        if (topGpu) {
          topGpu.textContent = Number.isFinite(gpuPercent)
            ? `GPU ${gpuPercent}%`
            : "GPU --%";
          topGpu.style.color = gpuTone.color;
          topGpu.style.borderColor = gpuTone.border;
          topGpu.style.background = "rgba(15,23,42,.75)";
        }
      }

      const statusDot = document.getElementById("aiLiveStatusDot");
      const statusText = document.getElementById("aiLiveStatusText");
      if (statusDot && statusText) {
        if (FORCE_FIXED_LIVE_STATUS) {
          statusDot.style.background = "#22c55e";
          statusText.textContent = "LIVE";
        } else {
        statusDot.style.background = activeMode.online
          ? "#22c55e"
          : "#ef4444";
        statusText.textContent = `${activeMode.code}: ${activeMode.detail} since ${formatSince(activeMode.since)}`;
        }
        const liveStatus = document.getElementById("aiLiveStatus");
        if (liveStatus) {
          liveStatus.className = `float-runtime-chip ${activeMode.online ? "online" : "offline"}`;
        }
        const modeEl = document.getElementById("topStripMode");
        if (modeEl)
          modeEl.textContent = `${activeMode.code} (${activeMode.detail})`;
      }
    } catch {
      const statusDot = document.getElementById("aiLiveStatusDot");
      const statusText = document.getElementById("aiLiveStatusText");
      if (FORCE_FIXED_LIVE_STATUS) {
        if (statusDot) statusDot.style.background = "#22c55e";
        if (statusText) statusText.textContent = "LIVE";
      } else {
        if (statusDot) statusDot.style.background = "#ef4444";
        if (statusText)
          statusText.textContent = "OFFLINE: Runtime status unavailable";
      }
    }
  }

  function sendTopDockPrompt() {
    const dock = document.getElementById("topDockPrompt");
    const floatInput = document.getElementById("floatInput");
    if (!dock || !floatInput) return;
    const text = (dock.value || "").trim();
    if (!text) return;
    const panel = document.getElementById("floatPanel");
    if (
      panel &&
      !panel.classList.contains("open") &&
      typeof toggleFloat === "function"
    ) {
      toggleFloat();
    }
    floatInput.value = text;
    dock.value = "";
    if (typeof autoResizeFloatInput === "function") autoResizeFloatInput();
    if (typeof sendFloat === "function") sendFloat();
  }

  function refreshSystemPanels() {
    const healthPanel = document.getElementById("sysHealthPanel");
    const cyclePanel = document.getElementById("sysCyclePanel");
    const modeText =
      document.getElementById("aiLiveStatusText")?.textContent || "unknown";
    const score =
      document.getElementById("summaryDomainStatus")?.textContent ||
      "unknown";
    const chartHealth =
      document.getElementById("liveChartsHealth")?.textContent || "unknown";
    if (healthPanel) {
      healthPanel.innerHTML = `Runtime link: ${modeText}<br>Domain coverage: ${score}<br>Chart engine: ${chartHealth}`;
    }
    if (cyclePanel) {
      const lastEdit = new Date().toLocaleString();
      cyclePanel.innerHTML = `Cycle state: autonomous monitoring<br>Last edit summary: UI and telemetry refresh applied<br>Next scheduled task: auto audit + chart refresh<br>Last update timestamp: ${lastEdit}`;
    }
  }

  function initAlgalon3dViewer() {
    const canvas = document.getElementById("algalon3dCanvas");
    const spin = document.getElementById("algalon3dSpinner");
    const fallback = document.getElementById("algalon3dFallback");
    const status = document.getElementById("algalonViewerStatus");
    if (!canvas) return;
    const telemetry = (window.__algalonViewerTelemetry =
      window.__algalonViewerTelemetry || []);
    const log = (event, detail) =>
      telemetry.push({
        time: new Date().toISOString(),
        event,
        detail: detail || null,
      });
    const setStatus = (text, color) => {
      if (status) {
        status.textContent = text;
        if (color) status.style.color = color;
      }
    };

    const mat4Perspective = (fovY, aspect, near, far) => {
      const f = 1 / Math.tan(fovY / 2);
      return [
        f / aspect,
        0,
        0,
        0,
        0,
        f,
        0,
        0,
        0,
        0,
        (far + near) / (near - far),
        -1,
        0,
        0,
        (2 * far * near) / (near - far),
        0,
      ];
    };
    const mat4Multiply = (a, b) => {
      const out = new Array(16).fill(0);
      for (let r = 0; r < 4; r += 1) {
        for (let c = 0; c < 4; c += 1) {
          out[r * 4 + c] =
            a[r * 4 + 0] * b[0 * 4 + c] +
            a[r * 4 + 1] * b[1 * 4 + c] +
            a[r * 4 + 2] * b[2 * 4 + c] +
            a[r * 4 + 3] * b[3 * 4 + c];
        }
      }
      return out;
    };
    const mat4Translate = (x, y, z) => [
      1,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1,
      0,
      x,
      y,
      z,
      1,
    ];
    const mat4RotateY = (a) => {
      const c = Math.cos(a);
      const s = Math.sin(a);
      return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
    };
    const mat4RotateX = (a) => {
      const c = Math.cos(a);
      const s = Math.sin(a);
      return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1];
    };

    const compileShader = (gl, type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(`shader-compile-failed:${info}`);
      }
      return shader;
    };

    const createProgram = (gl) => {
      const vs = compileShader(
        gl,
        gl.VERTEX_SHADER,
        `
      attribute vec3 aPos;
      uniform mat4 uMvp;
      varying float vDepth;
      void main() {
        gl_Position = uMvp * vec4(aPos, 1.0);
        vDepth = gl_Position.z;
      }
    `,
      );
      const fs = compileShader(
        gl,
        gl.FRAGMENT_SHADER,
        `
      precision mediump float;
      varying float vDepth;
      void main() {
        float glow = 0.55 + 0.45 * (1.0 - clamp((vDepth + 1.0) * 0.5, 0.0, 1.0));
        gl_FragColor = vec4(0.22 * glow, 0.78 * glow, 0.98 * glow, 1.0);
      }
    `,
      );
      const program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const info = gl.getProgramInfoLog(program);
        gl.deleteProgram(program);
        throw new Error(`program-link-failed:${info}`);
      }
      return program;
    };

    const extractAccessor = (gltf, accessorIndex, buffers) => {
      const accessor = gltf.accessors?.[accessorIndex];
      if (!accessor) throw new Error("missing-accessor");
      const view = gltf.bufferViews?.[accessor.bufferView];
      if (!view) throw new Error("missing-buffer-view");
      const raw = buffers[view.buffer];
      if (!raw) throw new Error("missing-buffer");

      const typeSize =
        { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[accessor.type] || 1;
      const count = accessor.count || 0;
      const byteOffset =
        (view.byteOffset || 0) + (accessor.byteOffset || 0);
      const componentType = accessor.componentType;

      if (componentType === 5126) {
        return new Float32Array(raw, byteOffset, count * typeSize);
      }
      if (componentType === 5123) {
        return new Uint16Array(raw, byteOffset, count * typeSize);
      }
      if (componentType === 5125) {
        return new Uint32Array(raw, byteOffset, count * typeSize);
      }
      if (componentType === 5121) {
        return new Uint8Array(raw, byteOffset, count * typeSize);
      }
      throw new Error(`unsupported-component-type:${componentType}`);
    };

    const parseGlb = (buffer) => {
      const view = new DataView(buffer);
      const magic = view.getUint32(0, true);
      if (magic !== 0x46546c67) throw new Error("invalid-glb-magic");
      const chunkOneLength = view.getUint32(12, true);
      const chunkOneType = view.getUint32(16, true);
      if (chunkOneType !== 0x4e4f534a) throw new Error("missing-glb-json");
      const jsonStart = 20;
      const jsonEnd = jsonStart + chunkOneLength;
      const jsonText = new TextDecoder()
        .decode(new Uint8Array(buffer, jsonStart, chunkOneLength))
        .replace(/\u0000/g, "");
      const gltf = JSON.parse(jsonText);
      const buffers = [];
      const nextChunkOffset = jsonEnd;
      if (nextChunkOffset + 8 <= buffer.byteLength) {
        const binLength = view.getUint32(nextChunkOffset, true);
        const binType = view.getUint32(nextChunkOffset + 4, true);
        if (binType === 0x004e4942) {
          buffers[0] = buffer.slice(
            nextChunkOffset + 8,
            nextChunkOffset + 8 + binLength,
          );
        }
      }
      return { gltf, buffers };
    };

    const loadModel = async (url) => {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`http-${res.status}`);

      if (url.toLowerCase().endsWith(".gltf")) {
        const gltf = await res.json();
        const base = url.slice(0, url.lastIndexOf("/") + 1);
        const buffers = await Promise.all(
          (gltf.buffers || []).map(async (buf) => {
            if (!buf.uri) throw new Error("gltf-buffer-uri-missing");
            const absolute =
              buf.uri.startsWith("http") || buf.uri.startsWith("/")
                ? buf.uri
                : `${base}${buf.uri}`;
            const r = await fetch(absolute, { cache: "no-store" });
            if (!r.ok) throw new Error(`buffer-http-${r.status}`);
            return await r.arrayBuffer();
          }),
        );
        return { gltf, buffers };
      }

      const buffer = await res.arrayBuffer();
      return parseGlb(buffer);
    };

    const tryLoadModel = async () => {
      const candidates = [
        "/models/algalon.glb",
        "/models/algalon.gltf",
        "/images/generated/algalon.glb",
        "/images/uploaded/algalon.glb",
      ];
      for (const url of candidates) {
        for (let attempt = 1; attempt <= 2; attempt += 1) {
          try {
            setStatus(
              `LOADING ${url.split("/").pop()} (TRY ${attempt})`,
              "#7dd3fc",
            );
            log("load-attempt", { url, attempt });
            const parsed = await loadModel(url);
            log("load-success", { url, attempt });
            return { ...parsed, sourceUrl: url };
          } catch (err) {
            log("load-failed", {
              url,
              attempt,
              error: String(err?.message || err),
            });
          }
        }
      }
      throw new Error("no-model-candidate-loaded");
    };

    const boot = async () => {
      try {
        if (fallback) fallback.style.display = "none";
        if (spin) spin.style.display = "flex";
        setStatus("INITIALIZING 3D ENGINE", "#7dd3fc");

        const gl =
          canvas.getContext("webgl") ||
          canvas.getContext("experimental-webgl");
        if (!gl) throw new Error("webgl-unavailable");

        const { gltf, buffers, sourceUrl } = await tryLoadModel();
        const mesh = gltf.meshes?.[0];
        const primitive = mesh?.primitives?.[0];
        if (
          !primitive ||
          !primitive.attributes ||
          primitive.attributes.POSITION == null
        ) {
          throw new Error("mesh-primitive-missing-position");
        }

        const positions = extractAccessor(
          gltf,
          primitive.attributes.POSITION,
          buffers,
        );
        const indices =
          primitive.indices != null
            ? extractAccessor(gltf, primitive.indices, buffers)
            : null;

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

        let indexBuffer = null;
        let indexType = gl.UNSIGNED_SHORT;
        let indexCount = 0;
        if (indices) {
          indexCount = indices.length;
          indexBuffer = gl.createBuffer();
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
          gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
          if (indices instanceof Uint32Array) indexType = gl.UNSIGNED_INT;
          if (indices instanceof Uint8Array) indexType = gl.UNSIGNED_BYTE;
          if (
            indexType === gl.UNSIGNED_INT &&
            !gl.getExtension("OES_element_index_uint")
          ) {
            throw new Error("uint32-indices-not-supported");
          }
        }

        const program = createProgram(gl);
        const aPos = gl.getAttribLocation(program, "aPos");
        const uMvp = gl.getUniformLocation(program, "uMvp");

        gl.enable(gl.DEPTH_TEST);
        gl.useProgram(program);
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
        if (indexBuffer)
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

        const resize = () => {
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
          const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
          if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
          }
          gl.viewport(0, 0, canvas.width, canvas.height);
        };

        let start = performance.now();
        const render = (ts) => {
          resize();
          const t = (ts - start) * 0.001;
          const aspect = canvas.width / Math.max(canvas.height, 1);
          const proj = mat4Perspective(1.0, aspect, 0.01, 100);
          const view = mat4Translate(0, 0, -2.6);
          const model = mat4Multiply(
            mat4RotateY(t * 0.7),
            mat4RotateX(-0.4),
          );
          const mvp = mat4Multiply(mat4Multiply(proj, view), model);

          gl.clearColor(0.02, 0.05, 0.1, 1.0);
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
          gl.uniformMatrix4fv(uMvp, false, new Float32Array(mvp));

          if (indexBuffer && indexCount > 0) {
            gl.drawElements(gl.TRIANGLES, indexCount, indexType, 0);
          } else {
            gl.drawArrays(
              gl.TRIANGLES,
              0,
              Math.floor(positions.length / 3),
            );
          }
          requestAnimationFrame(render);
        };

        requestAnimationFrame(render);
        if (spin) spin.style.display = "none";
        setStatus("MODEL ONLINE", "#22c55e");
        log("viewer-online", {
          sourceUrl,
          vertices: Math.floor(positions.length / 3),
          indexed: Boolean(indexBuffer),
        });
      } catch (err) {
        if (spin) spin.style.display = "none";
        if (fallback) fallback.style.display = "flex";
        setStatus("FALLBACK", "#f59e0b");
        log("viewer-fallback", { error: String(err?.message || err) });
      }
    };

    boot();
  }

  function autoResizeFloatInput() {
    const input = document.getElementById("floatInput");
    if (!input) return;
    input.style.height = "48px";
    input.style.height = `${Math.min(input.scrollHeight, 160)}px`;
  }

  function renderChatSessionSummary() {
    const el = document.getElementById("chatSessionSummary");
    if (!el) return;
    const remaining =
      floatSessionUsage.monthlyBudgetUsd == null
        ? "Budget --"
        : `Budget $${Math.max(0, floatSessionUsage.monthlyBudgetUsd - floatSessionUsage.estimatedCostUsd).toFixed(4)} left`;
    el.textContent = `Session ${floatSessionUsage.turns} · ${floatSessionUsage.totalTokens} tok · $${floatSessionUsage.estimatedCostUsd.toFixed(4)}`;
    el.title = `Estimated usage for this chat session. Input ${floatSessionUsage.inputTokens} tok, output ${floatSessionUsage.outputTokens} tok, ${floatSessionUsage.estimatedCredits} credits, mode ${floatSessionUsage.mode}. ${remaining}.`;
  }

  function mergeUsageMeta(sessionUsage, usage) {
    if (!usage) return;
    sessionUsage.turns += 1;
    sessionUsage.inputTokens += Number(usage.inputTokens || 0);
    sessionUsage.outputTokens += Number(usage.outputTokens || 0);
    sessionUsage.totalTokens += Number(usage.totalTokens || 0);
    sessionUsage.estimatedCredits += Number(usage.estimatedCredits || 0);
    sessionUsage.estimatedCostUsd = Number(
      (
        sessionUsage.estimatedCostUsd + Number(usage.estimatedCostUsd || 0)
      ).toFixed(6),
    );
    if (usage.monthlyBudgetUsd != null)
      sessionUsage.monthlyBudgetUsd = Number(usage.monthlyBudgetUsd);
    if (usage.mode) sessionUsage.mode = usage.mode;
    renderChatSessionSummary();
  }

  function combineUsageMeta(items) {
    const list = (items || []).filter(Boolean);
    if (!list.length) return null;
    return {
      inputTokens: list.reduce(
        (sum, item) => sum + Number(item.inputTokens || 0),
        0,
      ),
      outputTokens: list.reduce(
        (sum, item) => sum + Number(item.outputTokens || 0),
        0,
      ),
      totalTokens: list.reduce(
        (sum, item) => sum + Number(item.totalTokens || 0),
        0,
      ),
      estimatedCredits: list.reduce(
        (sum, item) => sum + Number(item.estimatedCredits || 0),
        0,
      ),
      estimatedCostUsd: Number(
        list
          .reduce(
            (sum, item) => sum + Number(item.estimatedCostUsd || 0),
            0,
          )
          .toFixed(6),
      ),
      monthlyBudgetUsd:
        list.find((item) => item.monthlyBudgetUsd != null)
          ?.monthlyBudgetUsd ?? null,
      mode: list.find((item) => item.mode)?.mode || "FREE_VERSION",
    };
  }

  function getTeamAgentLabel(agent) {
    const labels = {
      research: "🔬 Research",
      growth: "📈 Growth",
    };
    return labels[agent] || agent || "none";
  }

  function refreshChatRouteUI() {
    const select = document.getElementById("chatRouteMode");
    const badge = document.getElementById("teamAgentBadge");
    if (!select || !badge) return;

    if (!teamChatAgent && chatRouteMode !== "algalon")
      chatRouteMode = "algalon";
    select.value = chatRouteMode;

    const hasTeam = !!teamChatAgent;
    for (const opt of select.options) {
      if (opt.value === "team" || opt.value === "group")
        opt.disabled = !hasTeam;
    }

    badge.textContent = hasTeam
      ? `Team: ${getTeamAgentLabel(teamChatAgent)}`
      : "Team: none";
    badge.style.color = hasTeam ? "#a5b4fc" : "#64748b";
    badge.style.borderColor = hasTeam
      ? "rgba(129,140,248,.28)"
      : "rgba(255,255,255,.08)";
    badge.title = hasTeam
      ? "Team agent is active for chat routing"
      : "Select a team agent first";
  }

  function setChatRouteMode(mode) {
    chatRouteMode = mode;
    if ((mode === "team" || mode === "group") && !teamChatAgent) {
      chatRouteMode = "algalon";
      addFloatMsg(
        "Select a team agent first. Use the AI Support Team panel, then switch route mode again.",
        "ai",
      );
    }
    refreshChatRouteUI();
  }

  function openTeamChat(agent) {
    teamChatAgent = agent;
    teamHistory = [];
    chatRouteMode = "team";
    refreshChatRouteUI();
    /* Open the main float panel on the chat tab */
    const panel = document.getElementById("floatPanel");
    if (!panel.classList.contains("float-open")) toggleFloat();
    switchFloatTab("chat");
    const labels = { research: "🔬 Research AI", growth: "📈 Growth AI" };
    addFloatMsg(
      `Connected to ${labels[agent] || agent}. Route mode switched to Solo: Team Agent.`,
      "ai",
    );
  }

  async function loadBrainNeeds() {
    const out = document.getElementById("brainOutput");
    out.innerHTML = "Loading...";
    try {
      const res = await fetch("/api/brain/needs");
      const data = await res.json();
      const requests = data.requests || [];
      if (!requests.length) {
        out.innerHTML = "No needs logged yet. Run some cycles first.";
        return;
      }
      out.innerHTML =
        `<strong style="color:#e2e8f0;">${requests.length} open needs:</strong><br>` +
        requests
          .slice(0, 10)
          .map(
            (r) =>
              `<div style="padding:4px 0;border-bottom:1px solid rgba(255,255,255,.05);">[${r.source}] ${r.need}</div>`,
          )
          .join("");
    } catch {
      out.innerHTML = "Error loading brain data.";
    }
  }

  async function loadBrainReports() {
    const out = document.getElementById("brainOutput");
    out.innerHTML = "Loading...";
    try {
      const res = await fetch("/api/brain/reports");
      const data = await res.json();
      out.innerHTML =
        `<strong style="color:#e2e8f0;">Total cycles: ${data.totalCycles || 0} | Actions applied: ${data.totalActionsApplied || 0}</strong><br>` +
        (data.cycles || [])
          .slice(0, 5)
          .map(
            (c) =>
              `<div style="padding:4px 0;border-bottom:1px solid rgba(255,255,255,.05);">${c.type} — ${c.actionsApplied || 0} actions — ${new Date(c.ts).toLocaleString()}</div>`,
          )
          .join("");
    } catch {
      out.innerHTML = "Error loading reports.";
    }
  }

  /* ════ DOMAIN MODAL ════ */
  const DOMAIN_IDS = [
    "domain-ai",
    "domain-cur",
    "domain-fut",
    "domain-med",
    "domain-nrg",
    "domain-mat",
    "domain-neu",
    "domain-spc",
    "domain-sec",
    "domain-gov",
    "domain-bld",
    "domain-3dp",
    "domain-robotics",
    "domain-auto-jobs",
    "domain-cos",
    "domain-smt",
    "domain-agri",
    "domain-syn",
  ];
  let currentDomIdx = 0;

  function openDomainModal(sectionId) {
    const idx = DOMAIN_IDS.indexOf(sectionId);
    if (idx === -1) return;
    currentDomIdx = idx;
    renderDomainModal();
    const modal = document.getElementById("domainModal");
    modal.classList.add("modal-open");
    modal.scrollTop = 0;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", domainModalKeyHandler);
  }

  function closeDomainModal() {
    document.getElementById("domainModal").classList.remove("modal-open");
    document.body.style.overflow = "";
    document.removeEventListener("keydown", domainModalKeyHandler);
  }

  function domainModalKeyHandler(e) {
    if (e.key === "Escape") closeDomainModal();
    if (e.key === "ArrowRight") navDomain(1);
    if (e.key === "ArrowLeft") navDomain(-1);
  }

  function navDomain(dir) {
    currentDomIdx =
      (currentDomIdx + dir + DOMAIN_IDS.length) % DOMAIN_IDS.length;
    renderDomainModal();
    document.getElementById("domainModal").scrollTop = 0;
  }

  function renderDomainModal() {
    const sectionId = DOMAIN_IDS[currentDomIdx];
    const section = document.getElementById(sectionId);
    if (!section) return;

    // Extract all company/org names from .pc-org and .ltag spans
    const allOrgs = new Set();
    section.querySelectorAll(".pc-org").forEach((el) => {
      el.textContent.split("·").forEach((o) => {
        const t = o.trim();
        if (t && t.length > 1) allOrgs.add(t);
      });
    });
    section.querySelectorAll(".ltag").forEach((el) => {
      const t = el.textContent.trim();
      if (t) allOrgs.add(t);
    });

    // Also grab from branch company strings inside bi-cos spans
    section.querySelectorAll(".bi-cos").forEach((el) => {
      el.textContent.split("·").forEach((o) => {
        const t = o.trim().split("(")[0].trim();
        if (t && t.length > 2) allOrgs.add(t);
      });
    });

    // Get accent color from .d-num
    const dNum = section.querySelector(".d-num");
    const color = dNum ? dNum.style.color : "#0ea5e9";

    // Get title
    const h2 = section.querySelector("h2");
    const titleText = h2 ? h2.textContent.trim() : sectionId;

    // Clone section
    const clone = section.cloneNode(true);
    clone.querySelector(".leaders-bar")?.remove(); // already shown as pills
    clone.style.paddingTop = "12px";
    clone.id = "modal-clone-" + sectionId;
    // Disable any onclick on cards inside clone that would navigate
    clone
      .querySelectorAll("[onclick]")
      .forEach((el) => el.removeAttribute("onclick"));

    // Render into modal
    document.getElementById("modalCrumb").textContent = titleText;
    document.getElementById("modalCounter").textContent =
      currentDomIdx + 1 + " / " + DOMAIN_IDS.length;
    const cosTitle = document.getElementById("modalCosTitle");
    cosTitle.style.color = color;
    document.getElementById("modalCoGrid").innerHTML = [...allOrgs]
      .sort()
      .map(
        (org) =>
          `<span class="modal-co-pill" style="border-color:${color}33;">${org}</span>`,
      )
      .join("");
    const content = document.getElementById("modalDomainContent");
    content.innerHTML = "";
    content.appendChild(clone);
  }
