// cassette.dsp.js

class CassetteDSP {
  constructor(audioContext) {
    this.ctx = audioContext;

    // ------------------------------------------------------------
    // INPUT / OUTPUT
    // ------------------------------------------------------------
    this.input = this.ctx.createGain();
    this.output = this.ctx.createGain();

    // ------------------------------------------------------------
    // HISS
    // ------------------------------------------------------------
    this.hissGain = this.ctx.createGain();
    this.hissGain.gain.value = 0.0;
    this.hissNode = this._createNoiseSource();
    this.hissNode.connect(this.hissGain).connect(this.output);

    // ------------------------------------------------------------
    // TAPE COMPRESSION
    // ------------------------------------------------------------
    this.saturation = this.ctx.createWaveShaper();
    this.saturation.curve = this._makeTapeSaturation(0.5);
    this.saturation.oversample = "4x";

    // ------------------------------------------------------------
    // WOW / FLUTTER
    // ------------------------------------------------------------
    this.wowGain = this.ctx.createGain();
    this.wowGain.gain.value = 0.0;

    this.wowOsc = this.ctx.createOscillator();
    this.wowOsc.type = "sine";
    this.wowOsc.frequency.value = 0.3;
    this.wowOsc.connect(this.wowGain);

    this.flutterOsc = this.ctx.createOscillator();
    this.flutterOsc.type = "sine";
    this.flutterOsc.frequency.value = 7.5;
    this.flutterOsc.connect(this.wowGain);

    this.wowOsc.start();
    this.flutterOsc.start();

    // ------------------------------------------------------------
    // BASE EQ FILTERS
    // ------------------------------------------------------------
    this.headBump = this.ctx.createBiquadFilter();
    this.headBump.type = "peaking";
    this.headBump.frequency.value = 180;
    this.headBump.Q.value = 1.2;

    this.lowShelf = this.ctx.createBiquadFilter();
    this.lowShelf.type = "lowshelf";
    this.lowShelf.frequency.value = 120;

    this.toneTilt = this.ctx.createBiquadFilter();
    this.toneTilt.type = "peaking";
    this.toneTilt.frequency.value = 1200;
    this.toneTilt.Q.value = 0.7;

    this.highCut = this.ctx.createBiquadFilter();
    this.highCut.type = "lowpass";
    this.highCut.frequency.value = 8500;

    // ------------------------------------------------------------
    // SETTINGS 2 FILTERS
    // ------------------------------------------------------------
    this.settings2LowShelf = this.ctx.createBiquadFilter();
    this.settings2LowShelf.type = "lowshelf";
    this.settings2LowShelf.frequency.value = 150;

    this.settings2Presence = this.ctx.createBiquadFilter();
    this.settings2Presence.type = "peaking";
    this.settings2Presence.frequency.value = 2500;
    this.settings2Presence.Q.value = 0.7;

    // ------------------------------------------------------------
    // SETTINGS 3 FILTERS
    // ------------------------------------------------------------
    this.settings3LowShelf = this.ctx.createBiquadFilter();
    this.settings3LowShelf.type = "lowshelf";
    this.settings3LowShelf.frequency.value = 90;

    this.settings3Body = this.ctx.createBiquadFilter();
    this.settings3Body.type = "peaking";
    this.settings3Body.frequency.value = 700;
    this.settings3Body.Q.value = 1.0;

    this.settings3PunchGain = this.ctx.createGain();
    this.settings3PunchGain.gain.value = 1;

    // ------------------------------------------------------------
    // DSP CHAIN
    // ------------------------------------------------------------
    this.input.connect(this.saturation);
    this.saturation.connect(this.headBump);
    this.headBump.connect(this.lowShelf);
    this.lowShelf.connect(this.toneTilt);
    this.toneTilt.connect(this.highCut);

    // Settings 2 filters
    this.highCut.connect(this.settings2LowShelf);
    this.settings2LowShelf.connect(this.settings2Presence);

    // Settings 3 filters
    this.settings2Presence.connect(this.settings3LowShelf);
    this.settings3LowShelf.connect(this.settings3Body);
    this.settings3Body.connect(this.settings3PunchGain);

    // Final output
    this.settings3PunchGain.connect(this.output);

    this.wowGain.connect(this.output.gain);

    // ------------------------------------------------------------
    // PARAMETERS
    // ------------------------------------------------------------
    this.enabled = false;

    this.baseParams = {
      hiss: 0.3,
      saturation: 0.5,
      wowFlutter: 0.25,
      softBass: 0.5,
      tone: 0.4
    };

    this.settings2Params = {
      highBass: 0.6,
      presence: 0.4
    };

    this.settings3Params = {
      lowBass: 0.7,
      punch: 0.5,
      bodyBoost: 0.5
    };

    this.settings2Enabled = false;
    this.settings3Enabled = false;
  }

  // ------------------------------------------------------------
  // NOISE SOURCE
  // ------------------------------------------------------------
  _createNoiseSource() {
    const bufferSize = 2 * this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.25;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    noise.start();
    return noise;
  }

  // ------------------------------------------------------------
  // TAPE SATURATION
  // ------------------------------------------------------------
  _makeTapeSaturation(amount) {
    const n = 2048;
    const curve = new Float32Array(n);
    const drive = amount * 4.0;

    for (let i = 0; i < n; i++) {
      const x = (i / n) * 2 - 1;
      const y = Math.tanh(x * drive) * 0.85 + (x * 0.15);
      curve[i] = y;
    }

    return curve;
  }

  // ------------------------------------------------------------
  // DSP TOGGLE
  // ------------------------------------------------------------
  setEnabled(on) {
    this.enabled = on;

    this.hissGain.gain.value = on ? this.baseParams.hiss : 0;

    if (!on) {
      this.output.gain.value = 1;
      this.lowShelf.gain.value = 0;
      this.toneTilt.gain.value = 0;
      this.highCut.frequency.value = 20000;
      this.wowGain.gain.value = 0;
    } else {
      this.updateBase(this.baseParams);
      this.applysettings2DSP(this.settings2Enabled);
      this.applysettings3DSP(this.settings3Enabled);
    }
  }

  // ------------------------------------------------------------
  // UPDATE BASE PARAMETERS
  // ------------------------------------------------------------
  updateBase(params) {
    Object.assign(this.baseParams, params);

    this.hissGain.gain.value = this.enabled ? this.baseParams.hiss : 0;

    this.saturation.curve = this._makeTapeSaturation(this.baseParams.saturation);

    this.lowShelf.gain.value = this.baseParams.softBass * 14 - 7;
    this.toneTilt.gain.value = this.baseParams.tone * 6 - 3;

    this.wowGain.gain.value = this.baseParams.wowFlutter * 0.3;

    this.output.gain.value = 1 + this.baseParams.saturation * 0.3;

    this.applysettings2DSP(this.settings2Enabled);
    this.applysettings3DSP(this.settings3Enabled);
  }

  // ------------------------------------------------------------
  // SETTINGS 2
  // ------------------------------------------------------------
  applysettings2DSP(enabled) {
    this.settings2Enabled = enabled;

    if (!enabled) {
      this.settings2LowShelf.gain.value = 0;
      this.settings2Presence.gain.value = 0;
      return;
    }

    this.settings2LowShelf.gain.value = this.settings2Params.highBass * 10;
    this.settings2Presence.gain.value = this.settings2Params.presence * 8;
  }

  // ------------------------------------------------------------
  // SETTINGS 3
  // ------------------------------------------------------------
  applysettings3DSP(enabled) {
    this.settings3Enabled = enabled;

    if (!enabled) {
      this.settings3LowShelf.gain.value = 0;
      this.settings3Body.gain.value = 0;
      this.settings3PunchGain.gain.value = 1;
      return;
    }

    this.settings3LowShelf.gain.value = this.settings3Params.lowBass * 12;
    this.settings3Body.gain.value = this.settings3Params.bodyBoost * 10;
    this.settings3PunchGain.gain.value = 1 + (this.settings3Params.punch * 0.8);
  }

// ------------------------------------------------------------
// DSP DISCONNECT
// ------------------------------------------------------------
disconnect() {
  try {
    this.input.disconnect();
  } catch (e) {}

  try {
    this.output.disconnect();
  } catch (e) {}
}

  // ------------------------------------------------------------
  // APPLY DSP OBJECT
  // ------------------------------------------------------------
  applyDSPObject(DSP) {
    if (!DSP) return;

    if (DSP.baseParams) {
      this.baseParams = DSP.baseParams;
      this.updateBase(this.baseParams);
    }
    if (DSP.settings2Params) {
      this.settings2Params = DSP.settings2Params;
      this.applysettings2DSP(this.settings2Enabled);
    }
    if (DSP.settings3Params) {
      this.settings3Params = DSP.settings3Params;
      this.applysettings3DSP(this.settings3Enabled);
    }
  }
}
