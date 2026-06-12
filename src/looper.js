/* ============================================================================
 * looper.js — an event (not audio) looper
 * ----------------------------------------------------------------------------
 * Instead of recording the audio output, we record WHAT you played: a list of
 * "attack"/"release" events, each with the chord's MIDI notes and a timestamp
 * relative to when recording began. On stop we hand those events to a Tone.Part
 * scheduled on the Transport, which re-triggers the synth and loops perfectly.
 *
 * State cycle mirrors the hardware's single button:
 *     idle --tap--> recording --tap--> playing --tap--> idle (cleared)
 * ========================================================================== */

import * as Tone from 'tone';
import { attackChord, releaseChord } from './synth.js';

let state = 'idle';     // 'idle' | 'recording' | 'playing'
let events = [];        // [{ t, type:'attack'|'release', notes:[...] }]
let recStart = 0;       // Tone.now() at record start
let part = null;        // Tone.Part during playback
let onChange = () => {}; // UI callback(state)

function setState(s) {
  state = s;
  onChange(state);
}

/* Record a live event while in 'recording'. The app calls this from the same
 * place it triggers the synth, so what you hear is exactly what's captured.  */
export function record(type, notes) {
  if (state !== 'recording') return;
  events.push({ t: Tone.now() - recStart, type, notes: notes.slice() });
}

/* The single-button cycle. */
export function toggle() {
  if (state === 'idle') startRecording();
  else if (state === 'recording') startPlaying();
  else clear();
}

function startRecording() {
  events = [];
  recStart = Tone.now();
  setState('recording');
}

function startPlaying() {
  const length = Math.max(0.25, Tone.now() - recStart); // loop length in seconds
  if (events.length === 0) { setState('idle'); return; }

  // Build a Tone.Part: each event fires at its recorded offset, looping at
  // `length`. Tone schedules these sample-accurately off the Transport.
  part = new Tone.Part((time, ev) => {
    if (ev.type === 'attack') attackChord(ev.notes, time);
    else releaseChord(ev.notes, time);
  }, events.map((e) => [e.t, e]));

  part.loop = true;
  part.loopEnd = length;
  part.start(0);

  Tone.getTransport().start();
  setState('playing');
}

export function clear() {
  if (part) { part.stop(); part.dispose(); part = null; }
  Tone.getTransport().stop();
  Tone.getTransport().cancel();
  events = [];
  setState('idle');
}

export function setOnStateChange(fn) { onChange = fn; }
export function getState() { return state; }
