// app.js

let audioCtx;
let audioElement;
let trackList = [];
let currentTrackIndex = -1;
let mediaSource;
let cassetteDsp;
let cassetteEnabled = false;
let wowFlutterAmount = 0.25;
let wowFlutterInterval = null;

const cassetteUI = new CassetteUI();

// DOM references
const dropZone = document.getElementById("dropZone");
const trackListEl = document.getElementById("trackList");
const progressBar = document.getElementById("progressBar");
const progressFill = document.getElementById("progressFill");
const timeLabel = document.getElementById("timeLabel");

const cassetteDspToggle = document.getElementById("cassetteDspToggle");
const settingsToggle = document.getElementById("settingsToggle");
const settingsOverlay = document.getElementById("settingsOverlay");
const settingsCloseX = document.getElementById("settingsCloseX");

const hissSlider = document.getElementById("hissSlider");
const saturationSlider = document.getElementById("saturationSlider");
const wowFlutterSlider = document.getElementById("wowFlutterSlider");
const softBassSlider = document.getElementById("softBassSlider");
const toneSlider = document.getElementById("toneSlider");

const settings2DSPCheckbox = document.getElementById("settings2DSP");
const settings3DSPCheckbox = document.getElementById("settings3DSP");

const settings2HighBassSlider = document.getElementById("settings2HighBassSlider");
const settings2PresenceSlider = document.getElementById("settings2PresenceSlider");

const settings3LowBassSlider = document.getElementById("settings3LowBassSlider");
const settings3PunchSlider = document.getElementById("settings3PunchSlider");
const settings3BodyBoostSlider = document.getElementById("settings3BodyBoostSlider");

const folderInput = document.getElementById("folderInput");

const settingsDownloadBottom = document.getElementById("settingsDownloadBottom");
const settingsLoadOpen = document.getElementById("settingsLoadOpen");

const settingsLoadOverlay = document.getElementById("settingsLoadOverlay");
const settingsLoadCloseX = document.getElementById("settingsLoadCloseX");
const settingsDSPList = document.getElementById("settingsDSPList");
const loadSettingsBtn = document.getElementById("loadSettingsBtn");

let dspDSPs = [];
let defaultDspLoaded = false;

// Prevent browser opening files in new tab on drag/drop
window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("drop", (e) => e.preventDefault());

// ------------------------------------------------------------
// INIT AUDIO + DSP + UI
// ------------------------------------------------------------
function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    audioElement = new Audio();
    audioElement.crossOrigin = "anonymous";

    mediaSource = audioCtx.createMediaElementSource(audioElement);
    cassetteDsp = new CassetteDSP(audioCtx);

    // ⭐ FIXED ROUTING — ALWAYS THROUGH DSP
    mediaSource.connect(cassetteDsp.input);
    cassetteDsp.output.connect(audioCtx.destination);

    cassetteUI.setControlHandlers({
      onPlayPause: togglePlayPause,
      onPrevHoldStart: () => startSeekHold("prev"),
      onPrevHoldEnd: stopSeekHold,
      onNextHoldStart: () => startSeekHold("next"),
      onNextHoldEnd: stopSeekHold,
    });

    audioElement.addEventListener("timeupdate", onTimeUpdate);
    audioElement.addEventListener("ended", onTrackEnded);

    loadDefaultDspSettings();
  }
}

// ------------------------------------------------------------
// DEFAULT DSP LOAD
// ------------------------------------------------------------
async function loadDefaultDspSettings() {
  if (defaultDspLoaded || !cassetteDsp) return;
  try {
    const res = await fetch("Cassette DSP/cassette.dsp.json");
    if (!res.ok) return;
    const DSP = await res.json();

    const base = DSP.baseParams || cassetteDsp.baseParams;
    const settings2 = DSP.settings2Params || cassetteDsp.settings2Params;
    const settings3 = DSP.settings3Params || cassetteDsp.settings3Params;

    cassetteDsp.baseParams = base;
    cassetteDsp.settings2Params = settings2;
    cassetteDsp.settings3Params = settings3;

    hissSlider.value = base.hiss;
    saturationSlider.value = base.saturation;
    wowFlutterSlider.value = base.wowFlutter;
    softBassSlider.value = base.softBass;
    toneSlider.value = base.tone;

    settings2HighBassSlider.value = settings2.highBass;
    settings2PresenceSlider.value = settings2.presence;

    settings3LowBassSlider.value = settings3.lowBass;
    settings3PunchSlider.value = settings3.punch;
    settings3BodyBoostSlider.value = settings3.bodyBoost;

    cassetteDsp.updateBase(base);
    cassetteDsp.applysettings2DSP(settings2DSPCheckbox.checked);
    cassetteDsp.applysettings3DSP(settings3DSPCheckbox.checked);

    if (cassetteEnabled) startWowFlutter();

    defaultDspLoaded = true;
  } catch (e) {
    console.warn("Default DSP file not found or failed to load:", e);
  }
}

// ------------------------------------------------------------
// TIME + PROGRESS
// ------------------------------------------------------------
function onTimeUpdate() {
  if (!audioElement) return;

  const currentTrackTime = audioElement.currentTime;
  const totalTapeLength = getTotalDuration();
  const globalTapePosition =
    getElapsedBeforeCurrentTrack() + currentTrackTime;

  cassetteUI.setTotalTapeLength(totalTapeLength);
  cassetteUI.setGlobalTapePosition(globalTapePosition);

  updateProgressUI();
}

function onTrackEnded() {
  const playIcon = document.getElementById("playIcon");
  const pauseIcon = document.getElementById("pauseIcon");

  if (currentTrackIndex < trackList.length - 1) {
    currentTrackIndex++;
    playCurrentTrack();

    const globalTapePosition = getElapsedBeforeCurrentTrack();
    cassetteUI.setGlobalTapePosition(globalTapePosition);
  } else {
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }
    cassetteUI.setPlaying(false);

    if (playIcon && pauseIcon) {
      playIcon.style.display = "block";
      pauseIcon.style.display = "none";
    }
  }
}

function getTotalDuration() {
  return trackList.reduce((sum, t) => sum + (t.duration || 0), 0);
}

function getElapsedBeforeCurrentTrack() {
  let sum = 0;
  for (let i = 0; i < currentTrackIndex; i++) {
    sum += trackList[i].duration || 0;
  }
  return sum;
}

function updateProgressUI() {
  const total = getTotalDuration();
  const globalTime = getElapsedBeforeCurrentTrack() + (audioElement?.currentTime || 0);
  const progress = total > 0 ? globalTime / total : 0;

  progressFill.style.width = `${progress * 100}%`;

  const currentTrackDuration = trackList[currentTrackIndex]?.duration || 0;
  const currentTrackTime = audioElement?.currentTime || 0;

  timeLabel.textContent =
    `${formatTime(currentTrackTime)} / ${formatTime(currentTrackDuration)}`;
}

function formatTime(sec) {
  sec = Math.floor(sec || 0);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ------------------------------------------------------------
// FOLDER LOAD
// ------------------------------------------------------------
dropZone.addEventListener("click", () => {
  folderInput.click();
});

folderInput.addEventListener("change", async (e) => {
  initAudio();
  const files = Array.from(e.target.files).filter((f) =>
    ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/aiff", "audio/x-aiff"].includes(f.type)
  );
  await loadFolderFiles(files);
});

// Drag & drop
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", async (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  initAudio();

  const files = Array.from(e.dataTransfer.files).filter((f) =>
    ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/aiff", "audio/x-aiff"].includes(f.type)
  );
  await loadFolderFiles(files);
});

// ------------------------------------------------------------
// LOAD FOLDER FILES
// ------------------------------------------------------------
async function loadFolderFiles(files) {
  trackList = [];
  currentTrackIndex = -1;

  cassetteUI.setTotalTapeLength(0);
  cassetteUI.setGlobalTapePosition(0);
  cassetteUI.setPlaying(false);

  progressFill.style.width = "0%";
  timeLabel.textContent = "00:00 / 00:00";

  let totalTapeLength = 0;

  for (const file of files) {
    const url = URL.createObjectURL(file);
    const duration = await getFileDuration(url);
    const cleanName = file.name.replace(/\.(mp3|wav|aiff)$/i, "");

    trackList.push({ name: cleanName, url, duration });

    totalTapeLength += duration;
  }

  cassetteUI.setTotalTapeLength(totalTapeLength);

  renderTrackList();

  if (trackList.length > 0) {
    currentTrackIndex = 0;
    playCurrentTrack();
  }
}

async function getFileDuration(url) {
  return new Promise((resolve) => {
    const tempAudio = new Audio();
    tempAudio.src = url;
    tempAudio.addEventListener("loadedmetadata", () => {
      resolve(tempAudio.duration || 0);
    });
  });
}

// ------------------------------------------------------------
// TRACK LIST 
// ------------------------------------------------------------
function renderTrackList() {
  trackListEl.innerHTML = "";

  // ⭐ Sort tracks by leading number if present
  const sortedTracks = [...trackList].sort((a, b) => {
    const numA = extractLeadingNumber(a.name);
    const numB = extractLeadingNumber(b.name);

    // Both have numbers → sort numerically
    if (numA !== null && numB !== null) {
      return numA - numB;
    }

    // Only A has number → A comes first
    if (numA !== null) return -1;

    // Only B has number → B comes first
    if (numB !== null) return 1;

    // Neither has numbers → keep original order
    return 0;
  });

  sortedTracks.forEach((track, index) => {
    const li = document.createElement("li");

    const original = track.name;
    const num = extractLeadingNumber(original);

    let label;

    if (num !== null) {
      // ⭐ KEEP ORIGINAL NUMBER EXACTLY AS IN FILENAME
      label = original;
    } else {
      // ⭐ No number → keep original name
      label = original;
    }

    li.textContent = label;

    if (index === currentTrackIndex) {
      li.classList.add("active");
    }

    li.onclick = () => {
      currentTrackIndex = index;
      playCurrentTrack();
    };

    trackListEl.appendChild(li);
  });

  cassetteUI.setTotalTapeLength(getTotalDuration());
}


function extractLeadingNumber(name) {
  const match = name.match(/^\s*(\d+)\s*[-.]?\s*/);
  return match ? parseInt(match[1], 10) : null;
}

function updateTrackActiveState() {
  Array.from(trackListEl.children).forEach((li, idx) => {
    li.classList.toggle("active", idx === currentTrackIndex);
  });
}


// ------------------------------------------------------------
// PLAYBACK
// ------------------------------------------------------------
function playCurrentTrack() {
  if (!audioElement || currentTrackIndex < 0 || currentTrackIndex >= trackList.length) return;

  const track = trackList[currentTrackIndex];
  audioElement.src = track.url;

  const elapsed = getElapsedBeforeCurrentTrack();
  cassetteUI.setGlobalTapePosition(elapsed);

  audioElement.play();

  cassetteUI.setPlaying(true);
  cassetteUI.direction = "forward";

  const playIcon = document.getElementById("playIcon");
  const pauseIcon = document.getElementById("pauseIcon");
  if (playIcon && pauseIcon) {
    playIcon.style.display = "none";
    pauseIcon.style.display = "block";
  }

  updateTrackActiveState();
}

// ------------------------------------------------------------
// Play / pause toggle
// ------------------------------------------------------------
function togglePlayPause() {
  if (!audioElement) return;

  const playIcon = document.getElementById("playIcon");
  const pauseIcon = document.getElementById("pauseIcon");

  if (audioElement.paused) {
    audioElement.play();
    cassetteUI.setPlaying(true);
    cassetteUI.direction = "forward";

    if (playIcon && pauseIcon) {
      playIcon.style.display = "none";
      pauseIcon.style.display = "block";
    }
  } else {
    audioElement.pause();
    cassetteUI.setPlaying(false);

    if (playIcon && pauseIcon) {
      playIcon.style.display = "block";
      pauseIcon.style.display = "none";
    }
  }
}

// ------------------------------------------------------------
// SEEK HOLD
// ------------------------------------------------------------
let seekHoldDirection = null;
let seekHoldTimer = null;

function startSeekHold(direction) {
  if (!audioElement) return;

  seekHoldDirection = direction;

  if (direction === "prev") {
    cassetteUI.direction = "rewind";
  } else if (direction === "next") {
    cassetteUI.direction = "fastforward";
  }

  cassetteUI.setPlaying(true);

  const playIcon = document.getElementById("playIcon");
  const pauseIcon = document.getElementById("pauseIcon");
  if (playIcon && pauseIcon) {
    playIcon.style.display = "none";
    pauseIcon.style.display = "block";
  }

  seekHoldTimer = setInterval(() => {
    const step = 4.0;

    if (direction === "prev") {
      audioElement.currentTime = Math.max(audioElement.currentTime - step, 0);

      if (audioElement.currentTime <= 0) {
        if (currentTrackIndex > 0) {
          currentTrackIndex--;

          const prevTrack = trackList[currentTrackIndex];
          audioElement.src = prevTrack.url;

          const prevDur = prevTrack.duration || 0;
          audioElement.currentTime = Math.max(prevDur - 0.1, 0);

          audioElement.play();
          updateTrackActiveState();
        }
      }
    } else if (direction === "next") {
      const maxDur = trackList[currentTrackIndex]?.duration || audioElement.duration || 0;

      audioElement.currentTime = Math.min(audioElement.currentTime + step, maxDur);

      if (audioElement.currentTime >= maxDur) {
        if (currentTrackIndex < trackList.length - 1) {
          currentTrackIndex++;

          const nextTrack = trackList[currentTrackIndex];
          audioElement.src = nextTrack.url;

          audioElement.currentTime = 0;

          audioElement.play();
          updateTrackActiveState();
        }
      }
    }

    onTimeUpdate();
  }, 60);
}

function stopSeekHold() {
  if (seekHoldTimer) {
    clearInterval(seekHoldTimer);
    seekHoldTimer = null;
  }
  seekHoldDirection = null;

  const playIcon = document.getElementById("playIcon");
  const pauseIcon = document.getElementById("pauseIcon");

  if (audioElement && !audioElement.paused) {
    cassetteUI.direction = "forward";
    cassetteUI.setPlaying(true);

    if (playIcon && pauseIcon) {
      playIcon.style.display = "none";
      pauseIcon.style.display = "block";
    }
  } else {
    cassetteUI.setPlaying(false);

    if (playIcon && pauseIcon) {
      playIcon.style.display = "block";
      pauseIcon.style.display = "none";
    }
  }
}

// ------------------------------------------------------------
// PROGRESS BAR CLICK
// ------------------------------------------------------------
progressBar.addEventListener("click", (e) => {
  if (!audioElement || trackList.length === 0) return;
  const rect = progressBar.getBoundingClientRect();
  const ratio = (e.clientX - rect.left) / rect.width;
  const total = getTotalDuration();
  const targetGlobal = ratio * total;

  let accumulated = 0;
  let targetIndex = 0;
  for (let i = 0; i < trackList.length; i++) {
    const d = trackList[i].duration || 0;
    if (targetGlobal < accumulated + d) {
      targetIndex = i;
      break;
    }
    accumulated += d;
  }
  currentTrackIndex = targetIndex;
  audioElement.src = trackList[currentTrackIndex].url;
  audioElement.currentTime = targetGlobal - accumulated;
  audioElement.play();
  cassetteUI.direction = "forward";
  cassetteUI.setPlaying(true);
  updateTrackActiveState();

  const playIcon = document.getElementById("playIcon");
  const pauseIcon = document.getElementById("pauseIcon");
  if (playIcon && pauseIcon) {
    playIcon.style.display = "none";
    pauseIcon.style.display = "block";
  }
});

// ------------------------------------------------------------
// DSP TOGGLE
// ------------------------------------------------------------
cassetteDspToggle.addEventListener("click", () => {
  if (!audioCtx) initAudio();
  cassetteEnabled = !cassetteEnabled;
  cassetteDspToggle.textContent = "Cassette DSP";
  cassetteDspToggle.classList.toggle("on", cassetteEnabled);
  cassetteDsp.setEnabled(cassetteEnabled);

  try {
    mediaSource.disconnect();
  } catch (e) {}

  if (cassetteEnabled) {
    mediaSource.connect(cassetteDsp.input);
    cassetteDsp.output.connect(audioCtx.destination);
    startWowFlutter();
  } else {
    mediaSource.connect(audioCtx.destination);
    stopWowFlutter();
  }
});

// ------------------------------------------------------------
// WOW & FLUTTER
// ------------------------------------------------------------
function startWowFlutter() {
  stopWowFlutter();
  wowFlutterAmount = parseFloat(wowFlutterSlider.value) || 0.25;

  wowFlutterInterval = setInterval(() => {
    if (!audioElement) return;

    const t = Date.now() / 1000;

    const mod =
      Math.sin(t * 0.9) * wowFlutterAmount * 0.015 +
      Math.sin(t * 3.5) * wowFlutterAmount * 0.005;

    audioElement.playbackRate = 1 + mod;
  }, 40);
}

function stopWowFlutter() {
  if (wowFlutterInterval) {
    clearInterval(wowFlutterInterval);
    wowFlutterInterval = null;
  }
  if (audioElement) audioElement.playbackRate = 1.0;
}

// ------------------------------------------------------------
// SETTINGS OVERLAY
// ------------------------------------------------------------
settingsToggle.addEventListener("click", () => {
  settingsOverlay.classList.remove("hidden");
});

settingsCloseX.addEventListener("click", () => {
  settingsOverlay.classList.add("hidden");
});

// ------------------------------------------------------------
// BASE DSP SLIDERS
// ------------------------------------------------------------
[
  hissSlider,
  saturationSlider,
  softBassSlider,
  toneSlider
].forEach((slider) => {
    slider.addEventListener("input", () => {
    if (!cassetteDsp) return;
    cassetteDsp.updateBase({
      hiss: parseFloat(hissSlider.value),
      saturation: parseFloat(saturationSlider.value),
      softBass: parseFloat(softBassSlider.value),
      tone: parseFloat(toneSlider.value),
      wowFlutter: parseFloat(wowFlutterSlider.value),
    });
    if (cassetteEnabled) startWowFlutter();
  });
});

wowFlutterSlider.addEventListener("input", () => {
  if (!cassetteDsp) return;
  cassetteDsp.updateBase({
    hiss: parseFloat(hissSlider.value),
    saturation: parseFloat(saturationSlider.value),
    softBass: parseFloat(softBassSlider.value),
    tone: parseFloat(toneSlider.value),
    wowFlutter: parseFloat(wowFlutterSlider.value),
  });
  if (cassetteEnabled) startWowFlutter();
});

// ------------------------------------------------------------
// settings2 DSP — checkbox + sliders
// ------------------------------------------------------------
settings2DSPCheckbox.addEventListener("change", () => {
  if (!cassetteDsp) return;
  cassetteDsp.settings2Params.highBass = parseFloat(settings2HighBassSlider.value);
  cassetteDsp.settings2Params.presence = parseFloat(settings2PresenceSlider.value);
  cassetteDsp.applysettings2DSP(settings2DSPCheckbox.checked);
});

settings2HighBassSlider.addEventListener("input", () => {
  if (!cassetteDsp) return;
  cassetteDsp.settings2Params.highBass = parseFloat(settings2HighBassSlider.value);
  cassetteDsp.applysettings2DSP(settings2DSPCheckbox.checked);
});

settings2PresenceSlider.addEventListener("input", () => {
  if (!cassetteDsp) return;
  cassetteDsp.settings2Params.presence = parseFloat(settings2PresenceSlider.value);
  cassetteDsp.applysettings2DSP(settings2DSPCheckbox.checked);
});

// ------------------------------------------------------------
// settings3 DSP — checkbox + sliders
// ------------------------------------------------------------
settings3DSPCheckbox.addEventListener("change", () => {
  if (!cassetteDsp) return;
  cassetteDsp.settings3Params.lowBass = parseFloat(settings3LowBassSlider.value);
  cassetteDsp.settings3Params.punch = parseFloat(settings3PunchSlider.value);
  cassetteDsp.settings3Params.bodyBoost = parseFloat(settings3BodyBoostSlider.value);
  cassetteDsp.applysettings3DSP(settings3DSPCheckbox.checked);
});

settings3LowBassSlider.addEventListener("input", () => {
  if (!cassetteDsp) return;
  cassetteDsp.settings3Params.lowBass = parseFloat(settings3LowBassSlider.value);
  cassetteDsp.applysettings3DSP(settings3DSPCheckbox.checked);
});

settings3PunchSlider.addEventListener("input", () => {
  if (!cassetteDsp) return;
  cassetteDsp.settings3Params.punch = parseFloat(settings3PunchSlider.value);
  cassetteDsp.applysettings3DSP(settings3DSPCheckbox.checked);
});

settings3BodyBoostSlider.addEventListener("input", () => {
  if (!cassetteDsp) return;
  cassetteDsp.settings3Params.bodyBoost = parseFloat(settings3BodyBoostSlider.value);
  cassetteDsp.applysettings3DSP(settings3DSPCheckbox.checked);
});

// ------------------------------------------------------------
// SETTINGS → DOWNLOAD JSON
// ------------------------------------------------------------
function getCurrentDspSettings() {
  if (!cassetteDsp) return null;

  return {
    baseParams: cassetteDsp.baseParams,
    settings2Params: cassetteDsp.settings2Params,
    settings3Params: cassetteDsp.settings3Params,

    settings2Enabled: cassetteDsp.settings2Enabled,
    settings3Enabled: cassetteDsp.settings3Enabled
  };
}

function downloadSettingsJson() {
  const settings = getCurrentDspSettings();
  if (!settings) return;

  const blob = new Blob([JSON.stringify(settings, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cassette.dsp.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

settingsDownloadBottom.addEventListener("click", downloadSettingsJson);


// ------------------------------------------------------------
// SETTINGS LOAD OVERLAY (DSP LIST)
// ------------------------------------------------------------
settingsLoadOpen.addEventListener("click", () => {
  settingsLoadOverlay.classList.remove("hidden");
  loadDSPList();
});

settingsLoadCloseX.addEventListener("click", () => {
  settingsLoadOverlay.classList.add("hidden");
});

async function loadDSPList() {
  try {
    const res = await fetch("Cassette DSP/cassette.dsp.settings.json");
    dspDSPs = await res.json();

    settingsDSPList.innerHTML = "";
    dspDSPs.forEach((entry, idx) => {
      const opt = document.createElement("option");
      opt.value = idx;
      opt.textContent = entry.name || `DSP ${idx + 1}`;
      settingsDSPList.appendChild(opt);
    });
  } catch (e) {
    console.error("Failed to load cassette.dsp.settings.json", e);
  }
}

settingsDSPList.addEventListener("change", () => {
  const idx = parseInt(settingsDSPList.value, 10);
  const entry = dspDSPs[idx];
  if (!entry || !cassetteDsp) return;

  const DSP = entry.DSP || entry.data || entry;

  const base = DSP.baseParams || cassetteDsp.baseParams;
  const settings2 = DSP.settings2Params || cassetteDsp.settings2Params;
  const settings3 = DSP.settings3Params || cassetteDsp.settings3Params;

  // ⭐ NEW: Read enabled flags (default false if missing)
  const settings2Enabled = DSP.settings2Enabled ?? false;
  const settings3Enabled = DSP.settings3Enabled ?? false;

  // Apply DSP values
  cassetteDsp.baseParams = base;
  cassetteDsp.settings2Params = settings2;
  cassetteDsp.settings3Params = settings3;

  // ⭐ Apply enabled flags to DSP engine
  cassetteDsp.settings2Enabled = settings2Enabled;
  cassetteDsp.settings3Enabled = settings3Enabled;

  // Update UI sliders
  hissSlider.value = base.hiss;
  saturationSlider.value = base.saturation;
  wowFlutterSlider.value = base.wowFlutter;
  softBassSlider.value = base.softBass;
  toneSlider.value = base.tone;

  settings2HighBassSlider.value = settings2.highBass;
  settings2PresenceSlider.value = settings2.presence;

  settings3LowBassSlider.value = settings3.lowBass;
  settings3PunchSlider.value = settings3.punch;
  settings3BodyBoostSlider.value = settings3.bodyBoost;

  // ⭐ Update UI checkboxes
  settings2DSPCheckbox.checked = settings2Enabled;
  settings3DSPCheckbox.checked = settings3Enabled;

  // Apply DSP logic
  cassetteDsp.updateBase(base);
  cassetteDsp.applysettings2DSP(settings2Enabled);
  cassetteDsp.applysettings3DSP(settings3Enabled);

  if (cassetteEnabled) startWowFlutter();
});


// ------------------------------------------------------------
// INIT ON FIRST INTERACTION
// ------------------------------------------------------------
document.addEventListener("click", () => initAudio(), { once: true });
