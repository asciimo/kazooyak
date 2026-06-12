/* ============================================================================
 * theory.js — Kazooyak music-theory engine
 * ----------------------------------------------------------------------------
 * This file is pure music theory. No audio, no Web Audio, no DOM. Every
 * function takes numbers/strings in and gives numbers/strings out, which means
 * you can open the browser console and poke at it directly:
 *
 *     Kazooyak.theory.keyChords(0, 0, 'triad')   // all 7 chords in C major
 *     Kazooyak.theory.chordNotes(7, 0, 4, '7')   // the V7 chord in G major
 *
 * It's deliberately the readable heart of the app. The synth and the UI are
 * plumbing built around what this file decides.
 * ========================================================================== */

/* --- Note names ----------------------------------------------------------
 * 12 pitch classes. Index 0 = C. We use sharps throughout (no flats) to keep
 * the lookup trivial; B# / Cb style spelling is out of scope.                */
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/* --- The major scale -----------------------------------------------------
 * Semitone distance of each scale degree from the tonic. This is THE pattern
 * that defines "major": whole, whole, half, whole, whole, whole, half.
 *   degree:   I  ii iii IV  V  vi vii
 *   semis:    0  2   4  5   7  9   11                                         */
export const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];

/* --- Diatonic triad qualities --------------------------------------------
 * If you build a 3-note stack of thirds on each scale degree using ONLY notes
 * from the major scale, you get this fixed pattern of qualities. It never
 * changes with key — that's the whole point of the Nashville Number System.  */
export const DIATONIC_QUALITY = ['maj', 'min', 'min', 'maj', 'maj', 'min', 'dim'];

/* Roman-numeral labels for the 7 pads (upper = major, lower = minor).        */
export const ROMAN = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];

/* MIDI reference: middle C (C4) is MIDI note 60. Everything is offset from
 * this. Concert A (A4 = MIDI 69) is 440 Hz.                                   */
export const MIDDLE_C = 60;

/* --- Chord "joystick" qualities ------------------------------------------
 * Each quality is a function of the pad's BASE triad quality ('maj' | 'min' |
 * 'dim') and returns a list of intervals in semitones, measured up from the
 * chord's own root. So [0,4,7] is root + major third + perfect fifth.
 *
 * The eight slots mirror a hardware joystick (see README for inspiration).
 * "maj/min"-style slots stay diatonic: a 7th on a minor pad is a minor 7th,
 * on a major pad a major 7th, etc. The "7" slot is the odd one out — it adds
 * a *flat* seventh to whatever triad you have, giving the dominant-flavoured
 * sound.                                                                     */
const QUALITIES = {
  // 'triad' = leave the pad as its natural diatonic chord.
  triad:   (base) => baseTriad(base),
  'maj/min': (base) => baseTriad(base),               // same as triad

  7:       (base) => [...baseTriad(base), 10],        // add b7 (dominant-ish)
  'maj/min7': (base) => base === 'maj'
                          ? [0, 4, 7, 11]              // maj7
                          : [...baseTriad(base), 10],  // min7 / dim7-ish
  'maj/min9': (base) => base === 'maj'
                          ? [0, 4, 7, 11, 14]          // maj9
                          : [...baseTriad(base), 10, 14],

  sus2:    () => [0, 2, 7],                            // 2nd replaces the 3rd
  sus4:    () => [0, 5, 7],                            // 4th replaces the 3rd
  maj6:    (base) => base === 'min' ? [0, 3, 7, 9] : [0, 4, 7, 9],
  aug:     () => [0, 4, 8],                            // raised 5th
  dim:     () => [0, 3, 6],                            // lowered 3rd and 5th
};

/* The eight selectable quality slots, in the clockwise order they sit around
 * the on-screen D-pad (top, then clockwise). 'triad' is the rest position.   */
export const QUALITY_RING = [
  'maj/min',   // N  (top)   — the natural diatonic chord
  7,           // NE
  'maj/min7',  // E
  'maj/min9',  // SE
  'sus4',      // S
  'maj6',      // SW  (manual labels this sus2/maj6; we expose maj6 here)
  'dim',       // W
  'aug',       // NW
];

/* Map each base triad quality to its interval set. */
function baseTriad(base) {
  if (base === 'min') return [0, 3, 7];
  if (base === 'dim') return [0, 3, 6];
  return [0, 4, 7]; // 'maj'
}

/* ------------------------------------------------------------------------ */
/* Core helpers                                                             */
/* ------------------------------------------------------------------------ */

/* MIDI note number -> frequency in Hz. The equal-tempered formula. */
export function midiToFreq(m) {
  return 440 * Math.pow(2, (m - 69) / 12);
}

/* MIDI note number -> name with octave, e.g. 60 -> "C4". */
export function midiToName(m) {
  const name = NOTE_NAMES[((m % 12) + 12) % 12];
  const octave = Math.floor(m / 12) - 1;
  return name + octave;
}

/* Just the pitch-class name for a key offset, e.g. 7 -> "G". */
export function keyName(keyOffset) {
  return NOTE_NAMES[((keyOffset % 12) + 12) % 12];
}

/* The MIDI note of a pad's chord ROOT, before any quality intervals.
 *   keyOffset : 0..11, semitones the whole key is transposed from C
 *   octave    : integer octave shift of the whole instrument
 *   pad       : 0..6, which of the seven chord buttons                       */
export function chordRootMidi(keyOffset, octave, pad) {
  return MIDDLE_C + keyOffset + octave * 12 + MAJOR_SCALE[pad];
}

/* The interval set for a pad given a selected quality. */
export function chordIntervals(pad, quality) {
  const base = DIATONIC_QUALITY[pad];
  const fn = QUALITIES[quality] || QUALITIES.triad;
  return fn(base);
}

/* The full chord as MIDI note numbers. This is what the synth plays. */
export function chordNotes(keyOffset, octave, pad, quality) {
  const root = chordRootMidi(keyOffset, octave, pad);
  return chordIntervals(pad, quality).map((iv) => root + iv);
}

/* The full chord as frequencies in Hz (handy if you bypass Tone's note names). */
export function chordFreqs(keyOffset, octave, pad, quality) {
  return chordNotes(keyOffset, octave, pad, quality).map(midiToFreq);
}

/* A human-readable chord label, e.g. "Cmaj7", "Am", "G7", "Bdim".
 * This is display sugar — it reads the root name and picks a suffix that
 * matches the resulting interval set.                                        */
export function chordLabel(keyOffset, octave, pad, quality) {
  const rootMidi = chordRootMidi(keyOffset, octave, pad);
  const rootName = NOTE_NAMES[((rootMidi % 12) + 12) % 12];
  const base = DIATONIC_QUALITY[pad];

  const suffix = {
    triad:      base === 'min' ? 'm' : base === 'dim' ? 'dim' : '',
    'maj/min':  base === 'min' ? 'm' : base === 'dim' ? 'dim' : '',
    7:          base === 'min' ? 'm7' : '7',
    'maj/min7': base === 'min' ? 'm7' : base === 'dim' ? 'm7b5' : 'maj7',
    'maj/min9': base === 'min' ? 'm9' : 'maj9',
    sus2:       'sus2',
    sus4:       'sus4',
    maj6:       base === 'min' ? 'm6' : '6',
    aug:        'aug',
    dim:        'dim',
  }[quality] ?? '';

  return rootName + suffix;
}

/* All seven chords for the current key+octave+quality, as a tidy array of
 * descriptors. The UI uses this to label and play every pad.                 */
export function keyChords(keyOffset, octave, quality) {
  const out = [];
  for (let pad = 0; pad < 7; pad++) {
    out.push({
      pad,
      roman: ROMAN[pad],
      label: chordLabel(keyOffset, octave, pad, quality),
      notes: chordNotes(keyOffset, octave, pad, quality),
      names: chordNotes(keyOffset, octave, pad, quality).map(midiToName),
    });
  }
  return out;
}
