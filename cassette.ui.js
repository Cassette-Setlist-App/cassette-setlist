// cassette.ui.js

class CassetteUI {
  constructor() {
    this.gearLeft = document.querySelector(".gear-left");
    this.gearRight = document.querySelector(".gear-right");

    this.tapeLeft = document.querySelector(".tape-left");
    this.tapeRight = document.querySelector(".tape-right");

    this.playPauseBtn = document.getElementById("playPause");
    this.prevHoldBtn = document.getElementById("prevHold");
    this.nextHoldBtn = document.getElementById("nextHold");

    this.isPlaying = false;
    this.direction = "forward";

    this.totalTapeLength = 0;      // sum of all track durations (seconds)
    this.globalTapePosition = 0;   // time played across all tracks (seconds)

    // visual max tape radius (not 100% full, so it doesn't look “too full”)
    this.maxTapeScale = 0.75;      // 0.0–1.0, how big the fullest reel looks

    this._applyInitialTapeState();
  }

  _applyInitialTapeState() {
    // Left starts mostly full, right almost empty but visible
    const leftStart = this.maxTapeScale;      // e.g. 0.75
    const rightStart = this.maxTapeScale * 0.05; // tiny but visible

    this.tapeLeft.style.setProperty("--tape-scale", leftStart);
    this.tapeRight.style.setProperty("--tape-scale", rightStart);
  }

  // Sum of all track durations
  setTotalTapeLength(seconds) {
    this.totalTapeLength = seconds;
    this._updateTapeProgress();
  }

  // Time already played across all tracks
  setGlobalTapePosition(seconds) {
    this.globalTapePosition = seconds;
    this._updateTapeProgress();
  }

  // Backward compatibility
  setTotalDuration(seconds) {
    this.setTotalTapeLength(seconds);
  }

  setCurrentGlobalTime(seconds) {
    this.setGlobalTapePosition(seconds);
  }

  setControlHandlers({ onPlayPause, onPrevHoldStart, onPrevHoldEnd, onNextHoldStart, onNextHoldEnd }) {
    this.playPauseBtn.onclick = () => {
      this.direction = "forward";
      onPlayPause();
    };

    this.prevHoldBtn.onmousedown = () => {
      this.direction = "rewind";
      onPrevHoldStart();
    };
    this.prevHoldBtn.onmouseup = () => {
      onPrevHoldEnd();
      this.direction = "forward";
    };
    this.prevHoldBtn.onmouseleave = () => {
      onPrevHoldEnd();
      this.direction = "forward";
    };

    this.nextHoldBtn.onmousedown = () => {
      this.direction = "fastforward";
      onNextHoldStart();
    };
    this.nextHoldBtn.onmouseup = () => {
      onNextHoldEnd();
      this.direction = "forward";
    };
    this.nextHoldBtn.onmouseleave = () => {
      onNextHoldEnd();
      this.direction = "forward";
    };
  }

  setPlaying(isPlaying) {
  this.isPlaying = isPlaying;

  const playIcon = document.getElementById("playIcon");
  const pauseIcon = document.getElementById("pauseIcon");

  if (isPlaying) {
    this.gearLeft.classList.add("gear-spinning");
    this.gearRight.classList.add("gear-spinning");
    this.tapeLeft.classList.add("tape-lit");
    this.tapeRight.classList.add("tape-lit");

    // PAUSE SVG
    playIcon.style.display = "none";
    pauseIcon.style.display = "block";

  } else {
    this.gearLeft.classList.remove("gear-spinning");
    this.gearRight.classList.remove("gear-spinning");
    this.tapeLeft.classList.remove("tape-lit");
    this.tapeRight.classList.remove("tape-lit");

    // PLAY SVG
    playIcon.style.display = "block";
    pauseIcon.style.display = "none";
  }
}

_updateTapeProgress() {
  if (this.totalTapeLength <= 0) return;

  const linear = Math.min(this.globalTapePosition / this.totalTapeLength, 1);

  const progress = Math.sqrt(linear); 

  const max = 0.75;     
  const min = max * 0.05;

  const leftScale = max * (1 - progress) + min * progress;

  const rightScale = max * progress + min * (1 - progress);

  this.tapeLeft.style.setProperty("--tape-scale", leftScale);
  this.tapeRight.style.setProperty("--tape-scale", rightScale);

  let leftShadow, rightShadow;

  if (this.direction === "forward") {
    leftShadow = "inset 20px 0 40px rgba(255,255,255,0.25), inset -20px 0 40px rgba(0,0,0,0.6)";
    rightShadow = "inset -20px 0 40px rgba(255,255,255,0.25), inset 20px 0 40px rgba(0,0,0,0.6)";
  } else if (this.direction === "rewind") {
    leftShadow = "inset -20px 0 40px rgba(255,255,255,0.25), inset 20px 0 40px rgba(0,0,0,0.6)";
    rightShadow = "inset 20px 0 40px rgba(255,255,255,0.25), inset -20px 0 40px rgba(0,0,0,0.6)";
  } else {
    leftShadow = "inset 25px 0 50px rgba(255,255,255,0.3), inset -25px 0 50px rgba(0,0,0,0.7)";
    rightShadow = "inset -25px 0 50px rgba(255,255,255,0.3), inset 25px 0 50px rgba(0,0,0,0.7)";
  }

  this.tapeLeft.style.boxShadow = leftShadow;
  this.tapeRight.style.boxShadow = rightShadow;

  const dir = this.direction === "rewind" ? "reverse" : "normal";

  this.gearLeft.style.animationDirection = dir;
  this.gearRight.style.animationDirection = dir;
  this.tapeLeft.style.animationDirection = dir;
  this.tapeRight.style.animationDirection = dir;
}

}
