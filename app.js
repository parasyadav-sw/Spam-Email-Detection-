// --- STATE MANAGEMENT ---
let activeDataset = [];
let classifier = null;
let settings = {
  alpha: 1.0,
  minWordLength: 2,
  lowercase: true,
  removeStopWords: false
};
let voiceEnabled = localStorage.getItem("pyantiphish_voice_enabled") !== "false";
let voiceDebounceTimeout = null;
let battleDebounceTimeout = null;
let lastSpokenText = "";
let isEmlScan = false;
let particleAnimationId = null;
let particles = [];
let themeMode = localStorage.getItem("pyantiphish_theme") || "sky";

// Custom cursor coordinates tracking
let mouseX = -100, mouseY = -100;
let glowX = -100, glowY = -100;
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// --- DOM ELEMENTS ---
const elements = {
  // Custom Cursors & Overlays
  cursorDot: document.getElementById("cursor-dot"),
  cursorGlow: document.getElementById("cursor-glow"),
  spamAlertFlash: document.getElementById("spam-alert-flash"),

  // Cinematic Cyber Battle Overlay
  cyberBattleOverlay: document.getElementById("cyber-battle-overlay"),
  battleShield: document.getElementById("battle-shield"),
  battleThreat: document.getElementById("battle-threat"),
  battleThreatIconContainer: document.getElementById("battle-threat-icon-container"),
  battleLaser: document.getElementById("battle-laser"),
  battleParticles: document.getElementById("battle-particles"),
  battleShockwave: document.getElementById("battle-shockwave"),
  battleTitle: document.getElementById("battle-title"),
  battleSubtitle: document.getElementById("battle-subtitle"),
  themeToggleBtn: document.getElementById("theme-toggle-btn"),
  themeIcon: document.getElementById("theme-icon"),

  // Navigation & Headers
  tabHeadingTitle: document.getElementById("tab-heading-title"),
  tabHeadingDesc: document.getElementById("tab-heading-desc"),
  menuItems: document.querySelectorAll(".menu-item"),
  tabContents: document.querySelectorAll(".tab-content"),
  sidebarTrainCount: document.getElementById("sidebar-train-count"),
  sidebarVocabCount: document.getElementById("sidebar-vocab-count"),
  
  // Sandbox Tab
  emailDropZone: document.getElementById("email-drop-zone"),
  emlFileInput: document.getElementById("eml-file-input"),
  sandboxTextarea: document.getElementById("sandbox-textarea"),
  sandboxWordCount: document.getElementById("sandbox-word-count"),
  clearSandboxBtn: document.getElementById("clear-sandbox-btn"),
  addToDatasetBtn: document.getElementById("add-to-dataset-btn"),
  spamBadge: document.getElementById("spam-badge"),
  gaugeProgress: document.getElementById("gauge-progress"),
  gaugePercent: document.getElementById("gauge-percent"),
  gaugeLabel: document.getElementById("gauge-label"),
  logScoreSpam: document.getElementById("log-score-spam"),
  logScoreHam: document.getElementById("log-score-ham"),
  highlightedView: document.getElementById("highlighted-view"),
  urlInspectorCount: document.getElementById("url-inspector-count"),
  urlInspectorList: document.getElementById("url-inspector-list"),

  // Health Report Elements
  healthReportPanel: document.getElementById("health-report-panel"),
  healthScoreNum: document.getElementById("health-score-num"),
  healthStatusBadge: document.getElementById("health-status-badge"),
  healthProgressFill: document.getElementById("health-progress-fill"),
  reportIssuesList: document.getElementById("report-issues-list"),
  recommendationsBox: document.getElementById("recommendations-box"),
  copyReportBtn: document.getElementById("copy-report-btn"),
  printReportBtn: document.getElementById("print-report-btn"),
  downloadPdfBtn: document.getElementById("download-pdf-btn"),

  // Voice Assistant Elements
  voiceAlertToggle: document.getElementById("voice-alert-toggle"),
  voiceReactor: document.getElementById("voice-reactor"),
  voiceStatusText: document.getElementById("voice-status-text"),

  // Dataset Tab
  datasetSearch: document.getElementById("dataset-search"),
  dsStatTotal: document.getElementById("ds-stat-total"),
  dsStatSpam: document.getElementById("ds-stat-spam"),
  dsStatHam: document.getElementById("ds-stat-ham"),
  datasetTableBody: document.getElementById("dataset-table-body"),
  resetDatasetBtn: document.getElementById("reset-dataset-btn"),
  importBtn: document.getElementById("import-btn"),
  exportBtn: document.getElementById("export-btn"),
  fileImportInput: document.getElementById("file-import-input"),

  // Vocabulary Tab
  vocabSearch: document.getElementById("vocab-search"),
  vocabTotalWords: document.getElementById("vocab-total-words"),
  vocabTableBody: document.getElementById("vocab-table-body"),

  // Analytics Tab
  runCvBtn: document.getElementById("run-cv-btn"),
  valAccuracy: document.getElementById("val-accuracy"),
  valPrecision: document.getElementById("val-precision"),
  valRecall: document.getElementById("val-recall"),
  valF1: document.getElementById("val-f1"),
  cmTp: document.getElementById("cm-tp"),
  cmFn: document.getElementById("cm-fn"),
  cmFp: document.getElementById("cm-fp"),
  cmTn: document.getElementById("cm-tn"),

  // Settings Tab
  settingsAlpha: document.getElementById("settings-alpha"),
  settingsMinLen: document.getElementById("settings-min-len"),
  settingsLowercase: document.getElementById("settings-lowercase"),
  settingsStopwords: document.getElementById("settings-stopwords"),
  saveSettingsBtn: document.getElementById("save-settings-btn"),

  // Global Add Sample Modal
  globalAddBtn: document.getElementById("global-add-btn"),
  addSampleModal: document.getElementById("add-sample-modal"),
  closeModalBtn: document.getElementById("close-modal-btn"),
  modalCancelBtn: document.getElementById("modal-cancel-btn"),
  modalSaveBtn: document.getElementById("modal-save-btn"),
  modalTextarea: document.getElementById("modal-textarea"),
  modalLabel: document.getElementById("modal-label")
};

// Titles and subtitles for each tab
const tabHeaders = {
  sandbox: {
    title: "Sandbox Classifier",
    desc: "Input raw email contents to analyze spam risk and explore individual word probabilities."
  },
  dataset: {
    title: "Dataset Manager",
    desc: "Review existing training entries, add custom spam/ham samples, or import/export the dataset."
  },
  vocabulary: {
    title: "Word Vocabulary",
    desc: "Explore the dictionary of words learned by the model, including conditional frequencies and likelihoods."
  },
  analytics: {
    title: "Analytics Dashboard",
    desc: "Evaluate classification metrics and analyze generalized model success using K-Fold cross validation."
  },
  settings: {
    title: "Model Settings",
    desc: "Tune tokenization boundaries, Laplace smoothing factors, and vocabulary filters."
  }
};

// --- INITIALIZATION ---
function init() {
  initTheme();
  loadSettings();
  loadDataset();
  initClassifier();
  setupEventHandlers();
  
  // Setup Premium Interaction Systems
  initCustomCursor();
  init3dTilt();
  initMagneticButtons();
  initVoiceAssistant();
  
  // Set initial navigation state
  switchTab("sandbox");
  
  // Trigger initial model evaluation for analytics tab
  evaluateModel();
}

function initCustomCursor() {
  if (isTouchDevice) {
    if (elements.cursorDot) elements.cursorDot.style.display = 'none';
    if (elements.cursorGlow) elements.cursorGlow.style.display = 'none';
    return;
  }

  // Track mouse coordinates
  window.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  // Lag loop using requestAnimationFrame (LERP)
  function renderCursor() {
    // Center point moves instantly
    if (elements.cursorDot) {
      elements.cursorDot.style.left = `${mouseX}px`;
      elements.cursorDot.style.top = `${mouseY}px`;
    }

    // Glow circle lags behind
    if (elements.cursorGlow) {
      glowX += (mouseX - glowX) * 0.15;
      glowY += (mouseY - glowY) * 0.15;
      elements.cursorGlow.style.left = `${glowX}px`;
      elements.cursorGlow.style.top = `${glowY}px`;
    }

    requestAnimationFrame(renderCursor);
  }
  
  // Start loop
  requestAnimationFrame(renderCursor);

  // Bind cursor changes on hovering items
  const cyanHoverSelectors = "a, .btn:not(.btn-danger), .drop-zone, input, textarea, select, th, tr, td, .slider";
  document.addEventListener("mouseover", (e) => {
    if (e.target.closest(cyanHoverSelectors)) {
      elements.cursorGlow.classList.add("hover-link");
    }
    // Danger hover (red alerts, clear, delete)
    if (e.target.closest(".action-btn-icon, .btn-danger, #clear-sandbox-btn, #reset-dataset-btn, #modal-cancel-btn")) {
      elements.cursorGlow.classList.add("hover-danger");
    }
  });

  document.addEventListener("mouseout", (e) => {
    if (e.target.closest(cyanHoverSelectors)) {
      elements.cursorGlow.classList.remove("hover-link");
    }
    if (e.target.closest(".action-btn-icon, .btn-danger, #clear-sandbox-btn, #reset-dataset-btn, #modal-cancel-btn")) {
      elements.cursorGlow.classList.remove("hover-danger");
    }
  });
}

function init3dTilt() {
  if (isTouchDevice) return;

  const panels = document.querySelectorAll(".panel");
  panels.forEach(panel => {
    panel.addEventListener("mousemove", (e) => {
      const rect = panel.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Translate center offset to degrees (-8deg to 8deg)
      const rotateX = -((y - rect.height / 2) / (rect.height / 2)) * 8;
      const rotateY = ((x - rect.width / 2) / (rect.width / 2)) * 8;

      panel.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    panel.addEventListener("mouseleave", () => {
      panel.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg)";
    });
  });
}

function initMagneticButtons() {
  if (isTouchDevice) return;

  const buttons = document.querySelectorAll(".btn, .menu-item, .logo-icon");
  buttons.forEach(btn => {
    btn.addEventListener("mousemove", (e) => {
      const rect = btn.getBoundingClientRect();
      // Relative offset from button center
      const x = e.clientX - (rect.left + rect.width / 2);
      const y = e.clientY - (rect.top + rect.height / 2);

      // Translate 25% of cursor pull
      btn.style.transform = `translate(${x * 0.25}px, ${y * 0.25}px)`;
    });

    btn.addEventListener("mouseleave", () => {
      btn.style.transform = "translate(0px, 0px)";
    });
  });
}

// --- CONFIG & STORAGE ---
function loadSettings() {
  const saved = localStorage.getItem("pyantiphish_settings");
  if (saved) {
    try {
      settings = JSON.parse(saved);
      // Populate inputs
      elements.settingsAlpha.value = settings.alpha;
      elements.settingsMinLen.value = settings.minWordLength;
      elements.settingsLowercase.checked = settings.lowercase;
      elements.settingsStopwords.checked = settings.removeStopWords;
    } catch (e) {
      console.error("Failed to parse settings", e);
    }
  }
}

function saveSettings() {
  settings = {
    alpha: parseFloat(elements.settingsAlpha.value) || 1.0,
    minWordLength: parseInt(elements.settingsMinLen.value) || 2,
    lowercase: elements.settingsLowercase.checked,
    removeStopWords: elements.settingsStopwords.checked
  };
  localStorage.setItem("pyantiphish_settings", JSON.stringify(settings));
}

function loadDataset() {
  const saved = localStorage.getItem("pyantiphish_dataset");
  if (saved) {
    try {
      activeDataset = JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse dataset from localStorage. Resetting.", e);
      activeDataset = [...window.defaultDataset];
    }
  } else {
    activeDataset = [...window.defaultDataset];
    saveDatasetToStorage();
  }
}

function saveDatasetToStorage() {
  localStorage.setItem("pyantiphish_dataset", JSON.stringify(activeDataset));
}

function initClassifier() {
  classifier = new window.SpamClassifier(settings);
  classifier.train(activeDataset);
  updateModelCounts();
  runClassification(); // updates sandbox with current text (if any)
}

// --- CLASSIFIER / SANDBOX ACTIONS ---
function calculateThreatScore(text, result) {
  const isSpam = result.label === "spam";
  const winningConfidence = isSpam ? result.confidence : (1 - result.confidence);
  let baseScore = isSpam ? (winningConfidence * 60) : (winningConfidence * 20);

  const urlRegex = /https?:\/\/[^\s"'<>\(\)]+/gi;
  const rawUrls = text.match(urlRegex) || [];
  const uniqueUrls = [...new Set(rawUrls)];
  
  let urlPenalty = 0;
  uniqueUrls.forEach(urlStr => {
    const analysis = analyzeUrlRisk(urlStr);
    if (analysis.risk === "Critical") {
      urlPenalty += 15;
    } else if (analysis.risk === "High") {
      urlPenalty += 10;
    } else if (analysis.risk === "Medium") {
      urlPenalty += 5;
    }
  });
  
  const finalUrlPenalty = Math.min(40, urlPenalty);
  return Math.min(100, Math.max(0, Math.round(baseScore + finalUrlPenalty)));
}

function toggleInputControls(disabled) {
  if (elements.sandboxTextarea) elements.sandboxTextarea.disabled = disabled;
  if (elements.clearSandboxBtn) elements.clearSandboxBtn.disabled = disabled;
  if (elements.addToDatasetBtn) elements.addToDatasetBtn.disabled = disabled;
  if (elements.globalAddBtn) elements.globalAddBtn.disabled = disabled;
}

class BattleParticle {
  constructor(x, y, color, speedScale = 1) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = (Math.random() * 5 + 2) * speedScale;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.radius = Math.random() * 4 + 1.5;
    this.alpha = 1;
    this.decay = Math.random() * 0.02 + 0.015;
    this.color = color;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= this.decay;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color.replace("alpha", this.alpha.toFixed(2));
    ctx.shadowBlur = 12;
    const shadowColor = this.color.replace("alpha", "1");
    ctx.shadowColor = shadowColor;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function startExplosion(x, y, count, colors, speedScale = 1) {
  particles = [];
  for (let i = 0; i < count; i++) {
    const color = colors[Math.floor(Math.random() * colors.length)];
    particles.push(new BattleParticle(x, y, color, speedScale));
  }

  const canvasContainer = elements.battleParticles;
  if (!canvasContainer) return;

  let canvas = document.getElementById("battle-canvas");
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = "battle-canvas";
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "none";
    canvasContainer.appendChild(canvas);
  }

  const ctx = canvas.getContext("2d");
  const rect = canvasContainer.getBoundingClientRect();
  canvas.width = rect.width || 550;
  canvas.height = rect.height || 400;

  if (particleAnimationId) {
    cancelAnimationFrame(particleAnimationId);
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.update();
      if (p.alpha <= 0) {
        particles.splice(i, 1);
      } else {
        p.draw(ctx);
      }
    }

    if (particles.length > 0) {
      particleAnimationId = requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particleAnimationId = null;
    }
  }

  animate();
}

function triggerCyberBattle(text, result) {
  const totalScore = calculateThreatScore(text, result);
  let category = "safe";
  if (totalScore > 70) {
    category = "critical";
  } else if (totalScore > 35) {
    category = "spam";
  }

  toggleInputControls(true);

  const overlay = elements.cyberBattleOverlay;
  const shield = elements.battleShield;
  const threat = elements.battleThreat;
  const threatIconContainer = elements.battleThreatIconContainer;
  const laser = elements.battleLaser;
  const shockwave = elements.battleShockwave;
  const title = elements.battleTitle;
  const subtitle = elements.battleSubtitle;
  const scanner = document.querySelector(".battle-scanner");
  const arena = overlay ? overlay.querySelector(".battle-arena") : null;

  overlay.className = "cyber-battle-overlay active";
  shield.className = "battle-entity shield-entity";
  threat.className = "battle-entity threat-entity";
  threat.style.transform = "";
  threat.style.opacity = "1";
  laser.className = "battle-laser";
  laser.style.width = "0";
  laser.style.left = "142px";
  laser.style.opacity = "0";
  shockwave.className = "battle-shockwave";

  if (arena) {
    arena.classList.remove("shake");
  }

  if (scanner) {
    scanner.classList.remove("active");
  }

  const canvas = document.getElementById("battle-canvas");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  if (particleAnimationId) {
    cancelAnimationFrame(particleAnimationId);
    particleAnimationId = null;
  }

  // Virus threat icon (email threat)
  const virusSvg = `
    <svg class="threat-svg virus-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      <circle cx="12" cy="12" r="6" fill="currentColor" fill-opacity="0.1" />
      <path d="M9.5 10h.01M14.5 10h.01M9 14c.5 1.5 2.5 1.5 3 0" />
    </svg>
  `;

  // Initially populate threat container with the virus icon representing the threat
  threatIconContainer.innerHTML = virusSvg;

  if (category === "safe") {
    threat.classList.add("safe");
    if (scanner) scanner.classList.add("active");
    title.textContent = "AI Security Verification";
    subtitle.textContent = "Verifying email header metadata and token integrity...";
  } else if (category === "spam") {
    threat.classList.add("spam");
    title.textContent = "Anomalies Flagged";
    subtitle.textContent = "Analyzing probability vectors and URL ratings...";
  } else {
    threat.classList.add("critical");
    title.textContent = "High Risk Identified";
    subtitle.textContent = "Exploit footprint or spam payload detected...";
  }

  if (voiceEnabled) {
    speakText("Initiating visual email check.");
  }

  setTimeout(() => {
    if (category === "safe") {
      subtitle.textContent = "Performing cryptographic reputation checks...";
    } else if (category === "spam") {
      laser.className = "battle-laser active-sky";
      laser.style.left = "142px";
      laser.style.width = "266px";
      laser.style.opacity = "1";
      shield.classList.add("defending");
      title.textContent = "AI Shield Active";
      subtitle.textContent = "Analyzing reputation weights...";
    } else {
      // Critical threat intense defense sequence (laser + screen shake)
      laser.className = "battle-laser active-orange";
      laser.style.left = "142px";
      laser.style.width = "266px";
      laser.style.opacity = "1";
      shield.classList.add("defending");
      if (arena) arena.classList.add("shake");
      title.textContent = "AI Isolating Threats";
      subtitle.textContent = "Filtering phishing vectors...";
    }
  }, 800);

  setTimeout(() => {
    if (category === "safe") {
      if (scanner) scanner.classList.remove("active");
      title.textContent = "Email Verified";
      subtitle.textContent = "Zero anomalies found. Sandbox safe.";
      // Safe email verified: virus icon resolves/transforms into a checkmark icon
      threatIconContainer.innerHTML = `
        <svg class="threat-svg check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      `;
      startExplosion(443, 200, 35, ["rgba(52, 211, 153, alpha)", "rgba(59, 130, 246, alpha)", "rgba(251, 113, 133, alpha)"], 0.8);
    } else if (category === "spam") {
      // Spam: shield destroys the virus icon
      laser.style.opacity = "0";
      threat.style.transform = "scale(0)";
      threat.style.opacity = "0";
      shockwave.classList.add("active");
      title.textContent = "Threat Neutralized";
      subtitle.textContent = "Spam tags appended to local model storage.";
      startExplosion(443, 200, 55, ["rgba(249, 115, 22, alpha)", "rgba(251, 113, 133, alpha)", "rgba(59, 130, 246, alpha)"]);
    } else {
      // Critical threat destroyed sequence (arena shake + massive explosion)
      laser.style.opacity = "0";
      shield.classList.remove("defending");
      threat.style.transform = "scale(0)";
      threat.style.opacity = "0";
      shockwave.classList.add("active", "critical");
      if (arena) {
        arena.classList.remove("shake");
        void arena.offsetWidth; // trigger reflow
        arena.classList.add("shake");
      }
      title.textContent = "Critical Threat Blocked";
      subtitle.textContent = "Dangerous links isolated. Input labeled spam.";
      startExplosion(443, 200, 85, ["rgba(251, 113, 133, alpha)", "rgba(249, 115, 22, alpha)", "rgba(255, 255, 255, alpha)"], 1.2);
    }
  }, 1400);

  setTimeout(() => {
    presentClassificationResults(text, result);

    if (voiceEnabled) {
      let threatPhrase = "";
      if (category === "critical") {
        threatPhrase = "Critical threat blocked. Dangerous links isolated.";
      } else if (category === "spam") {
        threatPhrase = "Threat neutralized. Content classified as spam.";
      } else {
        threatPhrase = "Email is verified as safe.";
      }
      speakText(`Analysis complete. ${threatPhrase}`);
    }
  }, 2200);

  setTimeout(() => {
    overlay.classList.remove("active");
    if (arena) arena.classList.remove("shake");
    toggleInputControls(false);
  }, 2600);
}

function presentClassificationResults(text, result) {
  const isSpam = result.label === "spam";
  if (isSpam) {
    elements.spamBadge.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" style="width:18px;height:18px;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <span>Spam</span>
    `;
  } else {
    elements.spamBadge.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" style="width:18px;height:18px;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
      <span>Ham (Safe)</span>
    `;
  }
  elements.spamBadge.className = `result-badge ${isSpam ? "spam" : "ham"}`;

  const winningConfidence = isSpam ? result.confidence : (1 - result.confidence);
  const confidencePercent = Math.round(winningConfidence * 100);
  
  elements.gaugePercent.textContent = `${confidencePercent}%`;
  elements.gaugeLabel.textContent = isSpam ? "Spam Conf." : "Ham Conf.";
  
  const perimeter = 439.6;
  const offset = perimeter * (1 - winningConfidence);
  elements.gaugeProgress.style.strokeDashoffset = offset;
  elements.gaugeProgress.className = `gauge-fill ${isSpam ? "spam" : "ham"}`;

  if (elements.spamAlertFlash) {
    if (isSpam && winningConfidence > 0.75) {
      elements.spamAlertFlash.classList.add("active");
    } else {
      elements.spamAlertFlash.classList.remove("active");
    }
  }

  elements.logScoreSpam.textContent = result.spamScore.toFixed(2);
  elements.logScoreHam.textContent = result.hamScore.toFixed(2);

  renderHealthReport(text, result);
}

// --- CLASSIFIER / SANDBOX ACTIONS ---
function runClassification() {
  const text = elements.sandboxTextarea.value.trim();
  
  if (!text) {
    clearTimeout(battleDebounceTimeout);
    clearTimeout(voiceDebounceTimeout);
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    lastSpokenText = "";
    isEmlScan = false;
    
    elements.sandboxWordCount.textContent = "0 words";
    elements.spamBadge.textContent = "No Input";
    elements.spamBadge.className = "result-badge empty";
    
    if (elements.spamAlertFlash) {
      elements.spamAlertFlash.classList.remove("active");
    }

    elements.gaugePercent.textContent = "0%";
    elements.gaugeLabel.textContent = "Spam Conf.";
    elements.gaugeProgress.style.strokeDashoffset = "439.6";
    elements.gaugeProgress.className = "gauge-fill ham";

    elements.logScoreSpam.textContent = "-";
    elements.logScoreHam.textContent = "-";

    elements.highlightedView.innerHTML = `<span class="placeholder-msg">Start typing in the text area above to view interactive model weights. Red highlighted words indicate spam triggers, green indicates normal words, and hover over individual words to see probability rates.</span>`;
    
    if (elements.urlInspectorCount) {
      elements.urlInspectorCount.textContent = "0 links detected";
    }
    if (elements.urlInspectorList) {
      elements.urlInspectorList.innerHTML = `
        <div class="url-inspector-empty">
          No links detected in the email body. Link reputation scan is clean.
        </div>`;
    }

    if (elements.healthReportPanel) {
      elements.healthReportPanel.style.display = "none";
    }
    return;
  }

  const tokens = classifier.tokenize(text);
  elements.sandboxWordCount.textContent = `${tokens.length} words`;

  const result = classifier.classify(text);

  renderHighlightedText(text, result.wordProbabilities);
  inspectUrls(text);
  presentClassificationResults(text, result);

  if (isEmlScan) {
    isEmlScan = false;
    clearTimeout(battleDebounceTimeout);
    triggerCyberBattle(text, result);
  } else {
    clearTimeout(battleDebounceTimeout);
    // Announce via voice assistant in real-time (with debounce to avoid chatter)
    if (voiceEnabled) {
      clearTimeout(voiceDebounceTimeout);
      voiceDebounceTimeout = setTimeout(() => {
        announceHealthReport(text, result);
      }, 1500);
    }
  }
}


function renderHighlightedText(originalText, wordProbabilities) {
  // Map word tokens to statistical info objects for quick lookup
  const probMap = new Map();
  wordProbabilities.forEach(wp => {
    // Normalize word matches in the lookup table (lowercased)
    probMap.set(wp.word.toLowerCase(), wp);
  });

  // Split text keeping whitespace and line breaks so layout remains identical
  const parts = originalText.split(/(\s+)/);
  
  const htmlContent = parts.map(part => {
    if (/^\s+$/.test(part)) {
      // Return raw whitespace, replacing newlines with HTML br
      return part.replace(/\n/g, '<br>');
    }
    
    // Clean up word for lookup matching
    const cleaned = part.replace(/[^\w']/g, '').toLowerCase();
    const wp = probMap.get(cleaned);

    if (wp) {
      const posteriorPercent = Math.round(wp.posteriorSpam * 100);
      const spamLikelihoodStr = wp.spamProb.toExponential(2);
      const hamLikelihoodStr = wp.hamProb.toExponential(2);
      
      let badgeTitle = "";
      if (wp.category === "spam-strong") badgeTitle = "Strong Spam Indicator";
      else if (wp.category === "spam-weak") badgeTitle = "Weak Spam Indicator";
      else if (wp.category === "ham-strong") badgeTitle = "Strong Ham Indicator";
      else if (wp.category === "ham-weak") badgeTitle = "Weak Ham Indicator";
      else badgeTitle = "Neutral Token";

      return `<span class="hl-word ${wp.category}">
        ${part}
        <span class="tooltip">
          <h4>${part} — ${badgeTitle}</h4>
          <div class="tooltip-row"><span>Spam Posterior P:</span><span>${posteriorPercent}%</span></div>
          <div class="tooltip-row"><span>Spam Occurrence:</span><span>${wp.spamCount} times</span></div>
          <div class="tooltip-row"><span>Ham Occurrence:</span><span>${wp.hamCount} times</span></div>
          <div class="tooltip-row"><span>P(Word|Spam):</span><span>${spamLikelihoodStr}</span></div>
          <div class="tooltip-row"><span>P(Word|Ham):</span><span>${hamLikelihoodStr}</span></div>
        </span>
      </span>`;
    }

    return part; // Return as-is if no classifier token is available (e.g. short words or punctuation)
  }).join('');

  elements.highlightedView.innerHTML = htmlContent;
}

// Helper to animate count-up values for stats
function animateValue(obj, start, end, duration, formatPercent = false) {
  if (!obj) return;
  const range = end - start;
  let startTimestamp = null;
  
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const currentVal = progress * range + start;
    
    if (formatPercent) {
      obj.textContent = `${currentVal.toFixed(1)}%`;
    } else {
      obj.textContent = Math.floor(currentVal);
    }
    
    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else {
      obj.textContent = formatPercent ? `${end.toFixed(1)}%` : end;
    }
  };
  
  window.requestAnimationFrame(step);
}

function updateModelCounts() {
  const total = activeDataset.length;
  const spamCount = activeDataset.filter(item => item.label === "spam").length;
  const hamCount = total - spamCount;
  const vocabSize = classifier.vocabulary.size;

  // Animate stats
  animateValue(elements.sidebarTrainCount, 0, total, 800);
  animateValue(elements.sidebarVocabCount, 0, vocabSize, 800);
  animateValue(elements.dsStatTotal, 0, total, 800);
  animateValue(elements.dsStatSpam, 0, spamCount, 800);
  animateValue(elements.dsStatHam, 0, hamCount, 800);
  
  elements.vocabTotalWords.textContent = `${vocabSize} unique words learned`;
}

// --- ROUTING / NAVIGATION ---
function switchTab(tabId) {
  // Update active tab buttons
  elements.menuItems.forEach(item => {
    if (item.dataset.tab === tabId) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });

  // Switch tab display
  elements.tabContents.forEach(content => {
    if (content.id === `${tabId}-tab`) {
      content.classList.add("active");
    } else {
      content.classList.remove("active");
    }
  });

  // Update header text
  const headerData = tabHeaders[tabId];
  if (headerData) {
    elements.tabHeadingTitle.textContent = headerData.title;
    elements.tabHeadingDesc.textContent = headerData.desc;
  }

  // Refresh tab-specific lists
  if (tabId === "dataset") {
    renderDatasetTable();
  } else if (tabId === "vocabulary") {
    renderVocabularyTable();
  }
}

// --- DATASET MANAGER ACTIONS ---
function renderDatasetTable() {
  const query = elements.datasetSearch.value.toLowerCase().trim();
  const tbody = elements.datasetTableBody;
  tbody.innerHTML = "";

  const filtered = activeDataset.map((item, index) => ({ ...item, originalIndex: index }))
    .filter(item => item.text.toLowerCase().includes(query));

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); font-style: italic; padding: 2rem;">No matching data samples found.</td></tr>`;
    return;
  }

  filtered.forEach(item => {
    const tr = document.createElement("tr");
    
    // ID cell
    const tdId = document.createElement("td");
    tdId.style.fontFamily = "var(--font-code)";
    tdId.style.color = "var(--text-muted)";
    tdId.textContent = `#${item.originalIndex + 1}`;
    tr.appendChild(tdId);
    
    // Content cell
    const tdText = document.createElement("td");
    const divText = document.createElement("div");
    divText.className = "cell-text";
    divText.textContent = item.text;
    tdText.appendChild(divText);
    tr.appendChild(tdText);
    
    // Label cell
    const tdLabel = document.createElement("td");
    const spanLabel = document.createElement("span");
    spanLabel.className = `lbl-badge ${item.label}`;
    spanLabel.textContent = item.label;
    tdLabel.appendChild(spanLabel);
    tr.appendChild(tdLabel);
    
    // Actions cell
    const tdActions = document.createElement("td");
    tdActions.className = "cell-actions";
    
    const delBtn = document.createElement("button");
    delBtn.className = "action-btn-icon";
    delBtn.title = "Delete Sample";
    delBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    `;
    delBtn.addEventListener("click", () => deleteSample(item.originalIndex));
    
    tdActions.appendChild(delBtn);
    tr.appendChild(tdActions);
    
    tbody.appendChild(tr);
  });
}

function deleteSample(index) {
  activeDataset.splice(index, 1);
  saveDatasetToStorage();
  initClassifier();
  renderDatasetTable();
  evaluateModel();
}

function resetDataset() {
  if (confirm("Are you sure you want to restore the default dataset? This will clear all custom additions.")) {
    activeDataset = [...window.defaultDataset];
    saveDatasetToStorage();
    initClassifier();
    renderDatasetTable();
    evaluateModel();
  }
}

function exportDataset() {
  const dataStr = JSON.stringify(activeDataset, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pyantiphish_dataset_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const parsed = JSON.parse(evt.target.result);
      if (Array.isArray(parsed) && parsed.every(item => typeof item.text === 'string' && (item.label === 'spam' || item.label === 'ham'))) {
        if (confirm(`Do you want to append ${parsed.length} items to the current dataset? Select Cancel to completely replace the dataset instead.`)) {
          activeDataset = [...activeDataset, ...parsed];
        } else {
          activeDataset = parsed;
        }
        saveDatasetToStorage();
        initClassifier();
        renderDatasetTable();
        evaluateModel();
        alert("Dataset imported and retrained successfully!");
      } else {
        alert("Invalid JSON schema. Expected an array of objects like { text: 'string', label: 'spam|ham' }.");
      }
    } catch (err) {
      alert("Failed to parse JSON file: " + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = "";
}

// --- VOCABULARY TAB ACTIONS ---
function renderVocabularyTable() {
  const query = elements.vocabSearch.value.toLowerCase().trim();
  const tbody = elements.vocabTableBody;
  tbody.innerHTML = "";

  let vocabList = classifier.getVocabularyData();

  if (query) {
    vocabList = vocabList.filter(item => item.word.includes(query));
  }

  vocabList.sort((a, b) => b.ratio - a.ratio);

  if (vocabList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); font-style: italic; padding: 2rem;">No vocabulary words match the filter query.</td></tr>`;
    return;
  }

  vocabList.forEach(item => {
    const tr = document.createElement("tr");

    const tdWord = document.createElement("td");
    tdWord.style.fontWeight = "600";
    tdWord.textContent = item.word;
    tr.appendChild(tdWord);

    const tdSpamC = document.createElement("td");
    tdSpamC.style.fontFamily = "var(--font-code)";
    tdSpamC.textContent = item.spamCount;
    tr.appendChild(tdSpamC);

    const tdHamC = document.createElement("td");
    tdHamC.style.fontFamily = "var(--font-code)";
    tdHamC.textContent = item.hamCount;
    tr.appendChild(tdHamC);

    const tdSpamL = document.createElement("td");
    tdSpamL.style.fontFamily = "var(--font-code)";
    tdSpamL.style.color = "var(--text-secondary)";
    tdSpamL.textContent = item.pSpam.toExponential(3);
    tr.appendChild(tdSpamL);

    const tdHamL = document.createElement("td");
    tdHamL.style.fontFamily = "var(--font-code)";
    tdHamL.style.color = "var(--text-secondary)";
    tdHamL.textContent = item.pHam.toExponential(3);
    tr.appendChild(tdHamL);

    const tdRatio = document.createElement("td");
    tdRatio.style.textAlign = "right";
    const spanRatio = document.createElement("span");
    
    if (item.ratio > 2.0) {
      spanRatio.className = "ratio-badge spam-skew";
    } else if (item.ratio < 0.5) {
      spanRatio.className = "ratio-badge ham-skew";
    } else {
      spanRatio.className = "ratio-badge neutral-skew";
    }
    spanRatio.textContent = item.ratio.toFixed(2) + "x";
    
    tdRatio.appendChild(spanRatio);
    tr.appendChild(tdRatio);

    tbody.appendChild(tr);
  });
}

// --- ANALYTICS / EVALUATION ACTIONS ---
function evaluateModel() {
  elements.runCvBtn.disabled = true;
  elements.runCvBtn.textContent = "Validating...";
  
  setTimeout(() => {
    try {
      const results = classifier.evaluate(activeDataset, 5);
      
      // Animate evaluation metrics (scale to percentage)
      animateValue(elements.valAccuracy, 0, results.accuracy * 100, 1000, true);
      animateValue(elements.valPrecision, 0, results.precision * 100, 1000, true);
      animateValue(elements.valRecall, 0, results.recall * 100, 1000, true);
      animateValue(elements.valF1, 0, results.f1 * 100, 1000, true);

      // Animate confusion matrix numbers
      animateValue(elements.cmTp, 0, results.tp, 1000);
      animateValue(elements.cmFn, 0, results.fn, 1000);
      animateValue(elements.cmFp, 0, results.fp, 1000);
      animateValue(elements.cmTn, 0, results.tn, 1000);
    } catch (e) {
      console.error("Evaluation failed", e);
      alert("Cross validation requires a larger dataset. Add more spam/ham entries to test accuracy.");
    } finally {
      elements.runCvBtn.disabled = false;
      elements.runCvBtn.textContent = "Run 5-Fold Validation";
    }
  }, 100);
}

// --- GLOBAL ADD MODAL ---
function openAddSampleModal(prefillMsg = "", prefillLabel = "spam") {
  elements.modalTextarea.value = prefillMsg;
  elements.modalLabel.value = prefillLabel;
  elements.addSampleModal.classList.add("active");
}

function closeAddSampleModal() {
  elements.addSampleModal.classList.remove("active");
}

function saveCustomSample() {
  const text = elements.modalTextarea.value.trim();
  const label = elements.modalLabel.value;

  if (!text) {
    alert("Please enter message content before saving.");
    return;
  }

  activeDataset.unshift({ text, label });
  saveDatasetToStorage();
  initClassifier();
  closeAddSampleModal();
  
  renderDatasetTable();
  renderVocabularyTable();
  evaluateModel();
}

// Decodes quoted-printable string
function decodeQuotedPrintable(str) {
  let decoded = str.replace(/=\r?\n/g, "");
  decoded = decoded.replace(/=([0-9A-F]{2})/gi, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
  return decoded;
}

// Parses EML text into displayable Subject & Body
function parseEml(emlText) {
  const splitRegex = /\r?\n\r?\n/;
  const match = emlText.match(splitRegex);
  let headersStr = "";
  let bodyStr = "";
  
  if (match) {
    const index = match.index;
    headersStr = emlText.substring(0, index);
    bodyStr = emlText.substring(index + match[0].length);
  } else {
    bodyStr = emlText;
  }

  // Extract Subject
  let subject = "";
  const subjectMatch = headersStr.match(/^Subject:\s*(.*)$/im);
  if (subjectMatch) {
    subject = subjectMatch[1].trim();
  }

  // Handle MIME boundaries
  const boundaryMatch = headersStr.match(/boundary=["']?([^"'\s;]+)["']?/i);
  if (boundaryMatch) {
    const boundary = boundaryMatch[1];
    const parts = bodyStr.split("--" + boundary);
    let textPart = "";
    let htmlPart = "";

    for (const part of parts) {
      if (part.trim() === "" || part.trim() === "--") continue;

      const partMatch = part.match(/\r?\n\r?\n/);
      if (!partMatch) continue;

      const partHeaders = part.substring(0, partMatch.index);
      let partBody = part.substring(partMatch.index + partMatch[0].length);

      const partContentType = partHeaders.match(/Content-Type:\s*([^;]+)/i);
      const partContentTypeStr = partContentType ? partContentType[1].trim().toLowerCase() : "";

      const partQP = /Content-Transfer-Encoding:\s*quoted-printable/i.test(partHeaders);
      if (partQP) {
        partBody = decodeQuotedPrintable(partBody);
      }

      if (partContentTypeStr.includes("text/plain")) {
        textPart = partBody;
        break;
      } else if (partContentTypeStr.includes("text/html")) {
        htmlPart = partBody;
      }
    }

    if (textPart) {
      bodyStr = textPart;
    } else if (htmlPart) {
      bodyStr = htmlPart.replace(/<[^>]*>/g, " ");
    }
  } else {
    // Check if whole message body is Quoted-Printable
    const isQP = /Content-Transfer-Encoding:\s*quoted-printable/i.test(headersStr);
    if (isQP) {
      bodyStr = decodeQuotedPrintable(bodyStr);
    }
  }

  // Final cleanup: remove residual HTML tags, trim, and combine
  bodyStr = bodyStr.replace(/<[^>]*>/g, " ").trim();
  
  return {
    subject: subject,
    body: bodyStr
  };
}

// Handler for loading .eml files
function loadEmlFile(file) {
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = parseEml(e.target.result);
      let displayContent = "";
      if (parsed.subject) {
        displayContent = `Subject: ${parsed.subject}\n\n${parsed.body}`;
      } else {
        displayContent = parsed.body;
      }
      elements.sandboxTextarea.value = displayContent;
      isEmlScan = true;
      runClassification();
    } catch (err) {
      console.error("Failed to parse EML file", err);
      alert("Failed to parse EML file. Please ensure it is a valid email file.");
    }
  };
  reader.readAsText(file);
}

// Scans text for URLs, runs cybersecurity heuristics, and renders risk cards
function inspectUrls(text) {
  const listContainer = elements.urlInspectorList;
  const countBadge = elements.urlInspectorCount;
  if (!listContainer) return;

  // Regex to extract all http/https links
  const urlRegex = /https?:\/\/[^\s"'<>\(\)]+/gi;
  const rawUrls = text.match(urlRegex) || [];
  
  // Deduplicate URLs to show only unique links
  const uniqueUrls = [...new Set(rawUrls)];

  if (countBadge) {
    countBadge.textContent = `${uniqueUrls.length} link${uniqueUrls.length === 1 ? "" : "s"} detected`;
  }

  if (uniqueUrls.length === 0) {
    listContainer.innerHTML = `
      <div class="url-inspector-empty">
        No links detected in the email body. Link reputation scan is clean.
      </div>`;
    return;
  }

  listContainer.innerHTML = "";

  uniqueUrls.forEach(urlStr => {
    const analysis = analyzeUrlRisk(urlStr);
    
    // Create card element
    const card = document.createElement("div");
    card.className = "url-card";
    
    // Info block HTML
    let reasonsHtml = "";
    if (analysis.reasons.length > 0) {
      reasonsHtml = `<div class="url-reasons-list">` + 
        analysis.reasons.map(r => `<span class="url-reason-tag ${r.level}">${r.text}</span>`).join("") + 
        `</div>`;
    } else {
      reasonsHtml = `<div class="url-reasons-list"><span class="url-reason-tag safe">✓ Reputation Clean (Safe Link)</span></div>`;
    }

    card.innerHTML = `
      <div class="url-card-info">
        <a href="${urlStr}" target="_blank" class="url-card-address" title="${urlStr}">${urlStr}</a>
        ${reasonsHtml}
      </div>
      <div class="url-actions">
        <span class="url-badge ${analysis.risk.toLowerCase()}">${analysis.risk}</span>
        <button class="url-copy-btn" data-link="${urlStr}">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
          Copy
        </button>
      </div>
    `;

    // Add Copy event listener to copy button inside card
    const copyBtn = card.querySelector(".url-copy-btn");
    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(urlStr).then(() => {
        copyBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          Copied!
        `;
        copyBtn.classList.add("copied");
        setTimeout(() => {
          copyBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            Copy
          `;
          copyBtn.classList.remove("copied");
        }, 1500);
      });
    });

    listContainer.appendChild(card);
  });
}

// --- EMAIL HEALTH REPORT ENGINE ---
function renderHealthReport(text, result) {
  if (!elements.healthReportPanel) return;

  const isSpam = result.label === "spam";
  const winningConfidence = isSpam ? result.confidence : (1 - result.confidence);
  
  // 1. Calculate Threat Score
  let baseScore = isSpam ? (winningConfidence * 60) : (winningConfidence * 20);
  
  // URL Risk penalties
  const urlRegex = /https?:\/\/[^\s"'<>\(\)]+/gi;
  const rawUrls = text.match(urlRegex) || [];
  const uniqueUrls = [...new Set(rawUrls)];
  
  let urlPenalty = 0;
  const urlIssues = [];
  const urlReputations = [];
  
  uniqueUrls.forEach(urlStr => {
    const analysis = analyzeUrlRisk(urlStr);
    urlReputations.push({ url: urlStr, risk: analysis.risk, reasons: analysis.reasons });
    
    if (analysis.risk === "Critical") {
      urlPenalty += 15;
    } else if (analysis.risk === "High") {
      urlPenalty += 10;
    } else if (analysis.risk === "Medium") {
      urlPenalty += 5;
    }
  });
  
  // Cap URL penalty at 40
  const finalUrlPenalty = Math.min(40, urlPenalty);
  let totalScore = Math.min(100, Math.max(0, Math.round(baseScore + finalUrlPenalty)));
  
  // 2. Animate Threat Score Number
  animateValue(elements.healthScoreNum, 0, totalScore, 1000);
  
  // 3. Determine Threat Level & Badge Styles
  let threatLevel = "Safe";
  let badgeClass = "ham";
  let progressClass = "low";
  let recBoxClass = "low";
  let recommendationsText = "";
  
  if (totalScore > 70) {
    threatLevel = "Critical";
    badgeClass = "spam";
    progressClass = "high";
    recBoxClass = "high";
    recommendationsText = "<strong>Immediate Actions Required:</strong> Do NOT click any links, open attachments, or reply to this sender. This message contains critical phishing indicators and active security threat signatures. Delete the email immediately from your inbox and trash.";
  } else if (totalScore > 35) {
    threatLevel = "Moderate";
    badgeClass = "medium";
    progressClass = "moderate";
    recBoxClass = "moderate";
    recommendationsText = "<strong>Caution Recommended:</strong> This email contains elements frequently used in social engineering campaigns (such as urgent phrasing or redirection links). Verify the identity of the sender via an alternative secure channel before proceeding.";
  } else {
    threatLevel = "Safe";
    badgeClass = "ham";
    progressClass = "low";
    recBoxClass = "low";
    recommendationsText = "<strong>Standard Operations:</strong> No active threat vectors or phishing patterns were detected by our Naive Bayes classifiers. You may treat this email as safe under normal operating protocols.";
  }
  
  // Update badge
  elements.healthStatusBadge.textContent = threatLevel;
  elements.healthStatusBadge.className = `lbl-badge ${badgeClass}`;
  
  // Update progress bar width and class
  elements.healthProgressFill.className = `health-progress-fill ${progressClass}`;
  setTimeout(() => {
    elements.healthProgressFill.style.width = `${totalScore}%`;
  }, 100);
  
  // 4. Compile Detected Issues (Threat Vectors)
  const issuesList = [];
  
  // Issue: Classifier result
  if (isSpam) {
    issuesList.push({
      text: `NLP classifier detected high-density spam markers (Probability: ${Math.round(winningConfidence * 100)}%).`,
      level: "critical"
    });
  } else if (winningConfidence > 0.1) {
    issuesList.push({
      text: `NLP classifier matched minor suspicious text patterns (Probability: ${Math.round(winningConfidence * 100)}%).`,
      level: "medium"
    });
  } else {
    issuesList.push({
      text: `NLP text signature classified as standard normal text.`,
      level: "safe"
    });
  }
  
  // Issue: URLs
  if (uniqueUrls.length > 0) {
    issuesList.push({
      text: `Detected ${uniqueUrls.length} active hyperlink${uniqueUrls.length === 1 ? "" : "s"} inside email body.`,
      level: urlPenalty > 0 ? "high" : "safe"
    });
    
    // Add specific URL findings
    urlReputations.forEach(u => {
      if (u.risk !== "Safe") {
        const reasonsStr = u.reasons.map(r => r.text).join(", ");
        issuesList.push({
          text: `URL reputation scan flagged link [${u.url}] as ${u.risk} Risk (${reasonsStr}).`,
          level: u.risk.toLowerCase()
        });
      }
    });
  }
  
  // Issue: Suspicious keywords in text (spam triggers)
  const spamTriggers = result.wordProbabilities
    .filter(wp => wp.category === "spam-strong" || wp.category === "spam-weak")
    .map(wp => wp.word);
    
  const uniqueTriggers = [...new Set(spamTriggers)].slice(0, 5);
  if (uniqueTriggers.length > 0) {
    issuesList.push({
      text: `Detected high-weight spam trigger keywords: "${uniqueTriggers.join(', ')}".`,
      level: isSpam ? "high" : "medium"
    });
  }
  
  // Render issues list
  elements.reportIssuesList.innerHTML = "";
  issuesList.forEach(issue => {
    const li = document.createElement("li");
    li.className = `report-issue-item ${issue.level}`;
    
    let iconSvg = "";
    if (issue.level === "critical" || issue.level === "high") {
      iconSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      `;
    } else if (issue.level === "medium") {
      iconSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      `;
    } else {
      iconSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      `;
    }
    
    li.innerHTML = `${iconSvg}<span>${issue.text}</span>`;
    elements.reportIssuesList.appendChild(li);
  });
  
  // Render recommendations box
  elements.recommendationsBox.className = `recommendations-box ${recBoxClass}`;
  elements.recommendationsBox.innerHTML = recommendationsText;
  
  // Show report panel
  elements.healthReportPanel.style.display = "block";
  
  // Store report data on the DOM element for access during printing/copying
  elements.healthReportPanel.dataset.score = totalScore;
  elements.healthReportPanel.dataset.level = threatLevel;
  elements.healthReportPanel.dataset.classification = result.label;
  elements.healthReportPanel.dataset.confidence = Math.round(winningConfidence * 100);
  elements.healthReportPanel.dataset.issues = JSON.stringify(issuesList.map(i => i.text));
  elements.healthReportPanel.dataset.keywords = JSON.stringify(uniqueTriggers);
  elements.healthReportPanel.dataset.recommendations = recommendationsText;
  elements.healthReportPanel.dataset.urlsCount = uniqueUrls.length;
}

function copyReportToClipboard() {
  const panel = elements.healthReportPanel;
  if (!panel || !panel.dataset.score) return;
  
  const score = panel.dataset.score;
  const level = panel.dataset.level;
  const classification = panel.dataset.classification;
  const confidence = panel.dataset.confidence;
  const issues = JSON.parse(panel.dataset.issues || "[]");
  const keywords = JSON.parse(panel.dataset.keywords || "[]");
  const recs = panel.dataset.recommendations.replace(/<[^>]*>/g, "");
  
  let textReport = `==================================================
PARASSENTINEL EMAIL SECURITY HEALTH REPORT
==================================================
Threat Score: ${score}/100 [Level: ${level.toUpperCase()}]
NLP Classification: ${classification.toUpperCase()} (Confidence: ${confidence}%)

IDENTIFIED THREAT VECTORS:
${issues.length > 0 ? issues.map(i => `- ${i}`).join("\n") : "- None"}

DETECTED TRIGGER KEYWORDS:
${keywords.length > 0 ? keywords.join(", ") : "None"}

SAFETY RECOMMENDATIONS:
${recs}
==================================================
Generated via Client-Side Cyber-AI Sandbox Engine
`;

  navigator.clipboard.writeText(textReport).then(() => {
    const copyBtn = elements.copyReportBtn;
    const oldText = copyBtn.innerHTML;
    copyBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
      Report Copied!
    `;
    copyBtn.style.borderColor = "#10b981";
    copyBtn.style.color = "#10b981";
    setTimeout(() => {
      copyBtn.innerHTML = oldText;
      copyBtn.style.borderColor = "";
      copyBtn.style.color = "";
    }, 1500);
  }).catch(err => {
    console.error("Failed to copy report", err);
  });
}

function printReport(isPdf) {
  const panel = elements.healthReportPanel;
  if (!panel || !panel.dataset.score) return;
  
  const score = parseInt(panel.dataset.score);
  const level = panel.dataset.level;
  const classification = panel.dataset.classification;
  const confidence = panel.dataset.confidence;
  const issues = JSON.parse(panel.dataset.issues || "[]");
  const keywords = JSON.parse(panel.dataset.keywords || "[]");
  const recs = panel.dataset.recommendations;
  
  const printWindow = window.open("", "_blank", "width=800,height=800");
  if (!printWindow) {
    alert("Popup blocked! Please allow popups to print or export reports.");
    return;
  }
  
  let themeColor = "#00f2fe";
  if (score > 70) themeColor = "#ff007f";
  else if (score > 35) themeColor = "#f97316";
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>ParasSentinel Email Health Report - Threat Index ${score}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Outfit:wght@400;600;800&display=swap');
    
    body {
      font-family: 'Outfit', sans-serif;
      background-color: #030307;
      color: #ffffff;
      padding: 30px;
      margin: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .report-card {
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(8, 10, 24, 0.7);
      border-radius: 20px;
      padding: 40px;
      max-width: 700px;
      margin: 0 auto;
      box-shadow: 0 0 30px rgba(139, 92, 246, 0.1);
    }
    
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    
    .logo {
      font-weight: 800;
      font-size: 1.5rem;
      letter-spacing: -0.5px;
      background: linear-gradient(135deg, #bd00ff, #00f2fe);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    
    .timestamp {
      font-size: 0.85rem;
      color: #94a3b8;
      font-family: 'JetBrains Mono', monospace;
    }
    
    .score-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
    }
    
    .score-circle {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      border: 6px solid ${themeColor};
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      box-shadow: 0 0 15px ${themeColor}40;
    }
    
    .score-num {
      font-size: 2.2rem;
      font-weight: 800;
      font-family: 'JetBrains Mono', monospace;
      line-height: 1;
    }
    
    .score-label {
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #94a3b8;
      margin-top: 2px;
    }
    
    .badge {
      font-weight: 800;
      font-size: 1.1rem;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: ${themeColor};
      padding: 8px 20px;
      border-radius: 30px;
      border: 1.5px solid ${themeColor};
      background: ${themeColor}12;
      text-shadow: 0 0 8px ${themeColor}40;
    }
    
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 12px;
      padding: 15px 20px;
      margin-bottom: 30px;
      font-size: 0.9rem;
      border: 1px solid rgba(255, 255, 255, 0.03);
    }
    
    .meta-item {
      display: flex;
      justify-content: space-between;
    }
    
    .meta-item span:first-child {
      color: #94a3b8;
    }
    
    .meta-item span:last-child {
      font-weight: 600;
      font-family: 'JetBrains Mono', monospace;
    }
    
    h3 {
      font-size: 1.15rem;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 1px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      padding-bottom: 8px;
      margin-top: 30px;
      margin-bottom: 15px;
    }
    
    ul {
      margin: 0;
      padding-left: 20px;
    }
    
    li {
      margin-bottom: 10px;
      font-size: 0.95rem;
      line-height: 1.4;
    }
    
    .recommendations-box {
      border-radius: 12px;
      padding: 20px;
      background: ${themeColor}08;
      border: 1px solid ${themeColor}25;
      font-size: 0.95rem;
      line-height: 1.5;
      color: #e2e8f0;
    }
    
    .recommendations-box strong {
      color: #ffffff;
    }
    
    .footer-note {
      text-align: center;
      margin-top: 40px;
      font-size: 0.8rem;
      color: #475569;
      font-family: 'JetBrains Mono', monospace;
    }

    @media print {
      body {
        background-color: #ffffff;
        color: #000000;
        padding: 0;
      }
      .report-card {
        border: none;
        box-shadow: none;
        background: none;
        padding: 0;
        max-width: 100%;
      }
      header {
        border-bottom: 2px solid #000000;
      }
      .meta-grid {
        background: #f1f5f9;
        border: 1px solid #cbd5e1;
        color: #000000;
      }
      .meta-item span:first-child {
        color: #475569;
      }
      .meta-item span:last-child {
        color: #000000;
      }
      h3 {
        color: #475569;
        border-bottom: 2px solid #cbd5e1;
      }
      li {
        color: #000000;
      }
      .recommendations-box {
        background: #f8fafc;
        border: 1px solid #cbd5e1;
        color: #000000;
      }
      .recommendations-box strong {
        color: #000000;
      }
      .logo {
        background: none;
        -webkit-text-fill-color: initial;
        color: #000000;
      }
      .timestamp {
        color: #475569;
      }
    }
  </style>
</head>
<body>
  <div class="report-card">
    <header>
      <div class="logo">PARASSENTINEL SECURE</div>
      <div class="timestamp">${new Date().toLocaleString()}</div>
    </header>
    
    <div class="score-section">
      <div class="score-circle">
        <span class="score-num">${score}</span>
        <span class="score-label">Threat Index</span>
      </div>
      <div class="badge">${level} Risk</div>
    </div>
    
    <div class="meta-grid">
      <div class="meta-item">
        <span>NLP Classification</span>
        <span>${classification.toUpperCase()}</span>
      </div>
      <div class="meta-item">
        <span>Model Confidence</span>
        <span>${confidence}%</span>
      </div>
      <div class="meta-item">
        <span>Hyperlinks Detected</span>
        <span>${panel.dataset.urlsCount}</span>
      </div>
      <div class="meta-item">
        <span>Engine Signature</span>
        <span>Naive Bayes v2.1</span>
      </div>
    </div>
    
    <h3>Identified Threat Vectors</h3>
    <ul>
      ${issues.map(i => `<li>${i}</li>`).join("")}
    </ul>
    
    ${keywords.length > 0 ? `
      <h3>Detected Trigger Keywords</h3>
      <p style="font-family: 'JetBrains Mono', monospace; font-size: 0.95rem; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.03); padding: 10px 15px; border-radius: 8px; margin: 0; color: #fff;">
        ${keywords.join(", ")}
      </p>
    ` : ""}
    
    <h3>Safety Recommendations</h3>
    <div class="recommendations-box">
      ${recs}
    </div>
    
    <div class="footer-note">
      This document is a cybersecurity health assessment generated by ParasSentinel AI.
    </div>
  </div>
  
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    }
  </script>
</body>
</html>
  `;
  
  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

// URL Cybersecurity Heuristics Analyzer
function analyzeUrlRisk(urlStr) {
  let hostname = "";
  let pathname = "";
  const reasons = [];
  let score = 0; // Risk score: Safe = 0, Med = 1, High = 2-3, Crit = 4+

  try {
    const urlObj = new URL(urlStr);
    hostname = urlObj.hostname.toLowerCase();
    pathname = urlObj.pathname.toLowerCase();
  } catch (e) {
    // Basic regex fallback if browser URL constructor throws
    const hostMatch = urlStr.match(/https?:\/\/([^\/\s]+)/i);
    hostname = hostMatch ? hostMatch[1].toLowerCase() : urlStr;
  }

  // 1. Detect Shortened URLs
  const shorteners = [
    "bit.ly", "tinyurl.com", "t.co", "is.gd", "buff.ly", "adf.ly", "goo.gl", "ow.ly", 
    "rebrand.ly", "git.io", "urlr.me", "tiny.cc", "t.ly", "shorturl.at"
  ];
  if (shorteners.some(s => hostname === s || hostname.endsWith("." + s))) {
    reasons.push({ text: "masked URL shortener", level: "medium" });
    score += 1;
  }

  // 2. Detect IP-based URLs (IPv4 check)
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipRegex.test(hostname)) {
    reasons.push({ text: "IP-based address", level: "critical" });
    score += 4;
  }

  // 3. Detect Suspicious TLDs
  const suspiciousTlds = [
    ".ru", ".xyz", ".top", ".click", ".work", ".biz", ".download", ".info", ".loan", 
    ".racing", ".win", ".gq", ".cf", ".tk", ".ml", ".cc", ".link", ".buzz", ".club"
  ];
  const matchedTld = suspiciousTlds.find(tld => hostname.endsWith(tld));
  if (matchedTld) {
    reasons.push({ text: `suspicious TLD (${matchedTld})`, level: "high" });
    score += 2;
  }

  // 4. Detect Excessive Subdomains
  const subdomainCount = hostname.split(".").length;
  if (subdomainCount > 4) {
    reasons.push({ text: "excessive subdomain levels", level: "high" });
    score += 2;
  }

  // 5. Detect Brand Impersonation (Spoofing)
  const brands = ["paypal", "amazon", "netflix", "apple", "google", "microsoft", "facebook", "yahoo", "steam", "chase", "bankofamerica"];
  const officialDomains = {
    paypal: "paypal.com",
    amazon: "amazon.com",
    netflix: "netflix.com",
    apple: "apple.com",
    google: "google.com",
    microsoft: "microsoft.com",
    facebook: "facebook.com",
    yahoo: "yahoo.com",
    steam: "steampowered.com",
    chase: "chase.com",
    bankofamerica: "bankofamerica.com"
  };

  brands.forEach(brand => {
    // If hostname contains the brand name (e.g. paypalsecure-update.com) but is NOT the official domain
    if (hostname.includes(brand)) {
      const official = officialDomains[brand];
      if (hostname !== official && !hostname.endsWith("." + official)) {
        reasons.push({ text: `brand spoofing attempt ("${brand}")`, level: "critical" });
        score += 4;
      }
    }
  });

  // 6. Detect urgent or financial keywords in path/host
  const keywords = [
    "login", "signin", "verify", "secure", "update", "account", "billing", 
    "wallet", "bank", "invoice", "checkout", "card", "password", "security", "restore"
  ];
  const foundKeywords = keywords.filter(k => hostname.includes(k) || pathname.includes(k));
  if (foundKeywords.length > 0) {
    reasons.push({ text: `phishing keywords: ${foundKeywords.slice(0, 2).join(", ")}`, level: "medium" });
    score += 1;
  }

  // Determine final risk level
  let risk = "Safe";
  if (score >= 4) {
    risk = "Critical";
  } else if (score >= 2) {
    risk = "High";
  } else if (score >= 1) {
    risk = "Medium";
  }

  return {
    risk: risk,
    reasons: reasons
  };
}

// --- EVENT HANDLERS CONFIGURATION ---
function setupEventHandlers() {
  // Navigation
  elements.menuItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const tabId = item.dataset.tab;
      switchTab(tabId);
    });
  });

  // Sandbox Real-time updates
  elements.sandboxTextarea.addEventListener("input", runClassification);
  elements.clearSandboxBtn.addEventListener("click", () => {
    elements.sandboxTextarea.value = "";
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    clearTimeout(voiceDebounceTimeout);
    lastSpokenText = "";
    runClassification();
  });

  // Sandbox explicit scan trigger
  const scanBtn = document.getElementById("scan-email-btn");
  if (scanBtn) {
    scanBtn.addEventListener("click", () => {
      const text = elements.sandboxTextarea.value.trim();
      if (!text) return;
      isEmlScan = true;
      runClassification();
    });
  }

  // EML drag and drop event listeners
  const dropZone = elements.emailDropZone;
  const fileInput = elements.emlFileInput;

  if (dropZone && fileInput) {
    // Open file dialog on drop zone click
    dropZone.addEventListener("click", () => fileInput.click());

    // Handle file select via browse dialog
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        loadEmlFile(file);
      }
      e.target.value = "";
    });

    // Drag over effects
    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.classList.add("dragover");
    });

    dropZone.addEventListener("dragleave", () => {
      dropZone.classList.remove("dragover");
    });

    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.classList.remove("dragover");
      
      // 1. Handle file drops (e.g. .eml files)
      const file = e.dataTransfer.files[0];
      if (file) {
        if (file.name.toLowerCase().endsWith(".eml")) {
          loadEmlFile(file);
        } else {
          alert("Invalid file type. Please upload a .eml email file.");
        }
        return;
      }
      
      // 2. Handle direct text drag-and-drop (e.g. dragging selected email body text directly)
      const text = e.dataTransfer.getData("text/plain");
      if (text) {
        elements.sandboxTextarea.value = text.trim();
        isEmlScan = true;
        runClassification();
      }
    });
  }
  
  // Quick Save from Sandbox
  elements.addToDatasetBtn.addEventListener("click", () => {
    const text = elements.sandboxTextarea.value.trim();
    if (!text) return;
    
    const result = classifier.classify(text);
    openAddSampleModal(text, result.label);
  });

  // Modals Actions
  elements.globalAddBtn.addEventListener("click", () => openAddSampleModal("", "spam"));
  elements.closeModalBtn.addEventListener("click", closeAddSampleModal);
  elements.modalCancelBtn.addEventListener("click", closeAddSampleModal);
  elements.modalSaveBtn.addEventListener("click", saveCustomSample);

  elements.addSampleModal.addEventListener("click", (e) => {
    if (e.target === elements.addSampleModal) {
      closeAddSampleModal();
    }
  });

  elements.datasetSearch.addEventListener("input", renderDatasetTable);
  elements.resetDatasetBtn.addEventListener("click", resetDataset);
  
  elements.exportBtn.addEventListener("click", exportDataset);
  elements.importBtn.addEventListener("click", () => elements.fileImportInput.click());
  elements.fileImportInput.addEventListener("change", handleImport);

  elements.vocabSearch.addEventListener("input", renderVocabularyTable);

  elements.runCvBtn.addEventListener("click", evaluateModel);

  // Health Report Action Listeners
  if (elements.copyReportBtn) {
    elements.copyReportBtn.addEventListener("click", copyReportToClipboard);
  }
  if (elements.printReportBtn) {
    elements.printReportBtn.addEventListener("click", () => printReport(false));
  }
  if (elements.downloadPdfBtn) {
    elements.downloadPdfBtn.addEventListener("click", () => printReport(true));
  }

  // Voice Alert Toggle Event
  if (elements.voiceAlertToggle) {
    elements.voiceAlertToggle.addEventListener("change", (e) => {
      voiceEnabled = e.target.checked;
      localStorage.setItem("pyantiphish_voice_enabled", voiceEnabled);
      
      if (voiceEnabled) {
        elements.voiceReactor.classList.remove("disabled");
        elements.voiceStatusText.textContent = "Protocol Standby";
        elements.voiceStatusText.classList.remove("offline");
        
        speakText("Voice alerts enabled. Protocol active.");
      } else {
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
        clearTimeout(voiceDebounceTimeout);
        elements.voiceReactor.classList.remove("speaking");
        elements.voiceReactor.classList.add("disabled");
        elements.voiceStatusText.textContent = "Protocol Offline";
        elements.voiceStatusText.classList.remove("speaking");
        elements.voiceStatusText.classList.add("offline");
      }
    });
  }

  elements.saveSettingsBtn.addEventListener("click", () => {
    saveSettings();
    initClassifier();
    evaluateModel();
    alert("Classifier configurations applied and model retrained!");
  });

  if (elements.themeToggleBtn) {
    elements.themeToggleBtn.addEventListener("click", toggleTheme);
  }
}

// Start app
document.addEventListener("DOMContentLoaded", init);
window.addEventListener("load", init);

// --- VOICE ASSISTANT ENGINE ---
let voices = [];
function loadVoices() {
  if (window.speechSynthesis) {
    voices = window.speechSynthesis.getVoices();
  }
}
if (window.speechSynthesis) {
  loadVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
}

function initVoiceAssistant() {
  if (!elements.voiceAlertToggle || !elements.voiceReactor || !elements.voiceStatusText) return;
  
  elements.voiceAlertToggle.checked = voiceEnabled;
  
  if (voiceEnabled) {
    elements.voiceReactor.classList.remove("disabled");
    elements.voiceStatusText.textContent = "Protocol Standby";
    elements.voiceStatusText.classList.remove("offline");
  } else {
    elements.voiceReactor.classList.add("disabled");
    elements.voiceStatusText.textContent = "Protocol Offline";
    elements.voiceStatusText.classList.add("offline");
  }
}

function speakText(text) {
  if (!window.speechSynthesis || !voiceEnabled) return;

  window.speechSynthesis.cancel(); // Cancel active speech

  // Use a slight timeout to ensure cancellation completes and prevent speech suppression in Chrome/Edge
  setTimeout(() => {
    const utterance = new SpeechSynthesisUtterance(text);
    window.activeUtterance = utterance; // Prevent garbage collection bug in Chromium browsers
    
    let voiceList = window.speechSynthesis.getVoices();
    if (voiceList.length === 0) {
      loadVoices();
      voiceList = voices;
    }
    
    let selectedVoice = null;
    // 1. Try en-GB male voice (Jarvis vibe)
    selectedVoice = voiceList.find(v => v.lang === "en-GB" && v.name.toLowerCase().includes("male"));
    // 2. Try en-GB voice
    if (!selectedVoice) {
      selectedVoice = voiceList.find(v => v.lang === "en-GB");
    }
    // 3. Try en-US male voice
    if (!selectedVoice) {
      selectedVoice = voiceList.find(v => v.lang.startsWith("en") && v.name.toLowerCase().includes("male"));
    }
    // 4. Try any English voice
    if (!selectedVoice) {
      selectedVoice = voiceList.find(v => v.lang.startsWith("en"));
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    utterance.rate = 1.05;  // Slightly faster than normal (Jarvis vibe)
    utterance.pitch = 0.95; // Slightly lower pitch for calm robotic tone
    
    utterance.onstart = () => {
      if (elements.voiceReactor) {
        elements.voiceReactor.classList.add("speaking");
      }
      if (elements.voiceStatusText) {
        elements.voiceStatusText.textContent = "Protocol Speaking...";
        elements.voiceStatusText.className = "voice-status-text speaking";
      }
    };
    
    utterance.onend = utterance.onerror = () => {
      if (elements.voiceReactor) {
        elements.voiceReactor.classList.remove("speaking");
      }
      if (elements.voiceStatusText) {
        elements.voiceStatusText.textContent = "Protocol Standby";
        elements.voiceStatusText.className = "voice-status-text";
      }
    };
    
    window.speechSynthesis.speak(utterance);
  }, 100);
}

function announceHealthReport(text, result) {
  if (!voiceEnabled || !text) return;
  
  if (text === lastSpokenText) return;
  lastSpokenText = text;

  const isSpam = result.label === "spam";
  const winningConfidence = isSpam ? result.confidence : (1 - result.confidence);
  let baseScore = isSpam ? (winningConfidence * 60) : (winningConfidence * 20);
  
  const urlRegex = /https?:\/\/[^\s"'<>\(\)]+/gi;
  const rawUrls = text.match(urlRegex) || [];
  const uniqueUrls = [...new Set(rawUrls)];
  
  let urlPenalty = 0;
  uniqueUrls.forEach(urlStr => {
    const analysis = analyzeUrlRisk(urlStr);
    if (analysis.risk === "Critical") {
      urlPenalty += 15;
    } else if (analysis.risk === "High") {
      urlPenalty += 10;
    } else if (analysis.risk === "Medium") {
      urlPenalty += 5;
    }
  });
  
  const finalUrlPenalty = Math.min(40, urlPenalty);
  let totalScore = Math.min(100, Math.max(0, Math.round(baseScore + finalUrlPenalty)));
  
  let threatPhrase = "";
  if (totalScore > 70) {
    threatPhrase = "Critical threat identified. Do not interact with this email.";
  } else if (totalScore > 35) {
    threatPhrase = "Warning. Multiple phishing indicators detected.";
  } else {
    threatPhrase = "This email appears legitimate.";
  }
  
  speakText(`Scanning email. Analysis complete. ${threatPhrase}`);
}

// --- THEME PROTOCOL CONTROLLERS ---
function initTheme() {
  const toggleBtn = elements.themeToggleBtn;
  if (!toggleBtn) return;
  
  // Apply initial theme from localStorage
  const savedTheme = localStorage.getItem("pyantiphish_theme") || "sky";
  if (savedTheme === "mint") {
    document.body.classList.remove("sky-theme");
    document.body.classList.add("mint-theme");
    themeMode = "mint";
  } else {
    document.body.classList.remove("mint-theme");
    document.body.classList.add("sky-theme");
    themeMode = "sky";
  }
  updateThemeIcon();
}

function updateThemeIcon() {
  const icon = elements.themeIcon;
  if (!icon) return;
  
  const isMint = document.body.classList.contains("mint-theme");
  
  if (isMint) {
    // Mint Theme: Sparkles Icon
    icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />`;
  } else {
    // Sky Theme: Sun/Cloud Icon
    icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-11.314l.707.707m11.314 11.314l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />`;
  }
}

function toggleTheme() {
  const isMint = document.body.classList.contains("mint-theme");
  
  if (isMint) {
    document.body.classList.remove("mint-theme");
    document.body.classList.add("sky-theme");
    themeMode = "sky";
  } else {
    document.body.classList.remove("sky-theme");
    document.body.classList.add("mint-theme");
    themeMode = "mint";
  }
  
  localStorage.setItem("pyantiphish_theme", themeMode);
  updateThemeIcon();
  
  if (voiceEnabled) {
    speakText(`Visual theme updated to ${themeMode} style.`);
  }
}
