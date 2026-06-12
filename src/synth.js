/* ============================================================================
 * synth.js — a thin wrapper around Tone.js
 * ----------------------------------------------------------------------------
 * This is the only file that talks to the audio engine. The rest of the app
 * deals in MIDI note numbers and never touches Web Audio directly. Keeping the
 * boundary here means the synth could later be swapped for, say, a MIDI emitter
 * on desktop without disturbing the theory or the UI.
 * ========================================================================== */

import * as Tone from 'tone';
import { midiToFreq } from './theory.js';

let poly = null;        // Tone.PolySynth
let master = null;      // master volume (Tone.Volume)
let started = false;    // has the AudioContext been unlocked by a gesture?

/* Build the synth graph. Called lazily on the first user gesture, because
 * browsers (iOS especially) refuse to start audio until the user taps.       */
export async function ensureStarted() {
  if (started) return;
  await Tone.start();             // resumes the suspended AudioContext

  master = new Tone.Volume(-6).toDestination();

  poly = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'sawtooth' },
    // A gentle envelope so chords swell in and release smoothly rather than
    // clicking. attack/decay/sustain/release in seconds (sustain is a level).
    envelope: { attack: 0.012, decay: 0.12, sustain: 0.72, release: 0.45 },
  }).connect(master);

  poly.maxPolyphony = 32;         // plenty for a handful of held chords
  started = true;
}

/* Change the oscillator waveform for all voices. */
export function setWaveform(type) {
  if (poly) poly.set({ oscillator: { type } });
}

/* Master volume as 0..1 (we map it to a sensible decibel range). */
export function setVolume(v01) {
  if (!master) return;
  // 0 -> silent-ish, 1 -> 0 dB. Below ~0.02 we hard-mute.
  master.volume.value = v01 <= 0.02 ? -Infinity : (v01 - 1) * 36;
}

/* Press a chord (array of MIDI notes). Held until releaseChord. */
export function attackChord(midiNotes, time) {
  if (!poly) return;
  const freqs = midiNotes.map(midiToFreq);
  poly.triggerAttack(freqs, time);
}

/* Let a chord go. */
export function releaseChord(midiNotes, time) {
  if (!poly) return;
  const freqs = midiNotes.map(midiToFreq);
  poly.triggerRelease(freqs, time);
}

/* Fire-and-forget one-shot (used by drum-style triggers if ever needed). */
export function pluckChord(midiNotes, dur = 0.4, time) {
  if (!poly) return;
  const freqs = midiNotes.map(midiToFreq);
  poly.triggerAttackRelease(freqs, dur, time);
}

export function isStarted() { return started; }
export function getSynth() { return poly; }
