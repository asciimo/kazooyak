/* ============================================================================
 * app.js — UI wiring
 * ----------------------------------------------------------------------------
 * Builds the pads and quality dial, handles touch input, holds the small bit of
 * state (key / octave / waveform / quality), and routes presses to the synth
 * and the looper. All the musical decisions live in theory.js; this file is
 * just hands and eyes.
 * ========================================================================== */

import * as theory from './theory.js';
import * as synth from './synth.js';
import * as looper from './looper.js';

const SAVE_KEY = 'kazooyak.state.v1';

const WAVEFORMS = ['sine', 'sawtooth', 'square', 'triangle'];
const WAVE_LABEL = { sine: 'sine', sawtooth: 'saw', square: 'square', triangle: 'tri' };
const DEG_VAR = ['--deg-1','--deg-2','--deg-3','--deg-4','--deg-5','--deg-6','--deg-7'];

/* Friendly short labels for the eight dial slots (in QUALITY_RING order). */
const SLOT_LABEL = {
  'maj/min': 'maj/min', 7: '7', 'maj/min7': 'maj7',
  'maj/min9': '9', sus4: 'sus4', maj6: '6', dim: 'dim', aug: 'aug',
};

export function init() {
  /* ---- Persistent state (survives reloads via localStorage) -------------- */
  const state = Object.assign(
    { keyOffset: 0, octave: 0, waveform: 'sawtooth', quality: 'maj/min' },
    loadState()
  );
  function loadState() {
    try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; }
    catch { return {}; }
  }
  function saveState() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch {}
  }

  /* ---- Build the DOM ----------------------------------------------------- */
  const app = document.getElementById('app');
  app.innerHTML = `
    <header>
      <div class="wordmark">Kazoo<span>yak</span></div>
      <div class="tag">web</div>
    </header>

    <div class="controls">
      <div class="ctl" id="key">
        <span class="lab">Key</span>
        <div class="stepper">
          <button data-k="-1" aria-label="key down">‹</button>
          <span class="val" id="keyVal">C</span>
          <button data-k="1" aria-label="key up">›</button>
        </div>
      </div>
      <div class="ctl" id="oct">
        <span class="lab">Octave</span>
        <div class="stepper">
          <button data-o="-1" aria-label="octave down">‹</button>
          <span class="val" id="octVal">0</span>
          <button data-o="1" aria-label="octave up">›</button>
        </div>
      </div>
      <div class="ctl" id="wave">
        <span class="lab">Wave</span>
        <div class="stepper">
          <button data-w="-1" aria-label="previous waveform">‹</button>
          <span class="val" id="waveVal">saw</span>
          <button data-w="1" aria-label="next waveform">›</button>
        </div>
      </div>
      <div class="ctl vol">
        <span class="lab">Vol</span>
        <input type="range" id="vol" min="0" max="1" step="0.01" value="0.8" aria-label="volume">
      </div>
    </div>

    <div class="pads" id="pads"></div>

    <div class="dial-wrap">
      <div class="dial" id="dial">
        <div class="hub">Quality</div>
      </div>
    </div>

    <button class="looper" id="looper" data-state="idle">
      <span class="dot"></span><span id="looperLabel">Record loop</span>
    </button>

    <div class="hint">Install: tap Share, then “Add to Home Screen”.</div>
  `;

  /* ---- Pads (staggered: 2·4·6 on top, 1·3·5·7 below) --------------------- */
  // grid columns are 1..8; spanning two columns each gives the offset rows.
  const PAD_POS = {
    0: { col: '1 / 3', row: 2 }, // I
    1: { col: '2 / 4', row: 1 }, // ii
    2: { col: '3 / 5', row: 2 }, // iii
    3: { col: '4 / 6', row: 1 }, // IV
    4: { col: '5 / 7', row: 2 }, // V
    5: { col: '6 / 8', row: 1 }, // vi
    6: { col: '7 / 9', row: 2 }, // vii°
  };
  const padsEl = document.getElementById('pads');
  const padEls = [];
  for (let p = 0; p < 7; p++) {
    const el = document.createElement('div');
    el.className = 'pad';
    el.style.gridColumn = PAD_POS[p].col;
    el.style.gridRow = PAD_POS[p].row;
    el.style.setProperty('--c', `var(${DEG_VAR[p]})`);
    el.innerHTML = `<span class="roman"></span><span class="name"></span>`;
    bindPad(el, p);
    padsEl.appendChild(el);
    padEls.push(el);
  }

  /* ---- Quality dial (8 slots around a circle, top = maj/min, clockwise) -- */
  const dial = document.getElementById('dial');
  const W = 230, H = 196, CX = W / 2, CY = H / 2, R = 78;
  const slotEls = {};
  theory.QUALITY_RING.forEach((q, i) => {
    const ang = (-90 + i * 45) * Math.PI / 180; // start at top, go clockwise
    const x = CX + R * Math.cos(ang);
    const y = CY + R * Math.sin(ang);
    const el = document.createElement('div');
    el.className = 'slot';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.textContent = SLOT_LABEL[q];
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); setQuality(q); });
    dial.appendChild(el);
    slotEls[q] = el;
  });

  /* ---- Input handling for a pad ----------------------------------------- */
  function bindPad(el, pad) {
    // Notes are captured at press time and stored on the element, so releasing
    // always lets go of exactly what was pressed even if the quality changed.
    let held = null;

    const down = async (e) => {
      e.preventDefault();
      if (held) return;
      await ensureStartedWithWaveform();
      held = theory.chordNotes(state.keyOffset, state.octave, pad, state.quality);
      synth.attackChord(held);
      looper.record('attack', held);
      el.classList.add('active');
    };
    const up = () => {
      if (!held) return;
      synth.releaseChord(held);
      looper.record('release', held);
      held = null;
      el.classList.remove('active');
    };

    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', up);
  }

  /* ---- State changes + re-render ---------------------------------------- */
  function renderPads() {
    const chords = theory.keyChords(state.keyOffset, state.octave, state.quality);
    chords.forEach((c) => {
      padEls[c.pad].querySelector('.roman').textContent = c.roman;
      padEls[c.pad].querySelector('.name').textContent = c.label;
    });
  }
  function renderControls() {
    document.getElementById('keyVal').textContent = theory.keyName(state.keyOffset);
    document.getElementById('octVal').textContent =
      (state.octave > 0 ? '+' : '') + state.octave;
    document.getElementById('waveVal').textContent = WAVE_LABEL[state.waveform];
    Object.entries(slotEls).forEach(([q, el]) =>
      el.classList.toggle('active', q === state.quality));
  }
  function setQuality(q) { state.quality = q; saveState(); renderPads(); renderControls(); }

  /* ---- Control wiring ---------------------------------------------------- */
  document.getElementById('key').addEventListener('click', (e) => {
    const k = e.target.dataset.k; if (!k) return;
    state.keyOffset = ((state.keyOffset + Number(k)) % 12 + 12) % 12;
    saveState(); renderPads(); renderControls();
  });
  document.getElementById('oct').addEventListener('click', (e) => {
    const o = e.target.dataset.o; if (!o) return;
    state.octave = Math.max(-2, Math.min(2, state.octave + Number(o)));
    saveState(); renderPads(); renderControls();
  });
  document.getElementById('wave').addEventListener('click', (e) => {
    const w = e.target.dataset.w; if (!w) return;
    const i = (WAVEFORMS.indexOf(state.waveform) + Number(w) + WAVEFORMS.length) % WAVEFORMS.length;
    state.waveform = WAVEFORMS[i];
    synth.setWaveform(state.waveform);
    saveState(); renderControls();
  });
  const vol = document.getElementById('vol');
  vol.addEventListener('input', () => synth.setVolume(Number(vol.value)));

  /* ---- Looper button ----------------------------------------------------- */
  const looperBtn = document.getElementById('looper');
  const looperLabel = document.getElementById('looperLabel');
  looper.setOnStateChange((s) => {
    looperBtn.dataset.state = s;
    looperLabel.textContent =
      s === 'recording' ? 'Stop & play' :
      s === 'playing'   ? 'Clear loop'  : 'Record loop';
  });
  looperBtn.addEventListener('pointerdown', async (e) => {
    e.preventDefault();
    await ensureStartedWithWaveform();
    looper.toggle();
  });

  /* ---- First paint ------------------------------------------------------- */
  renderPads();
  renderControls();
  synth.setVolume(Number(vol.value));

  // Apply the saved waveform once audio starts. We can't call setWaveform until
  // the synth graph exists, so wrap ensureStarted to do it on first unlock.
  async function ensureStartedWithWaveform() {
    const wasStarted = synth.isStarted();
    await synth.ensureStarted();
    if (!wasStarted) synth.setWaveform(state.waveform);
  }
}
