# Kazooyak

A browser-based, installable, **offline** pocket chord instrument. Tap pads,
hear chords. Built with vanilla JS and Tone.js, bundled with Vite.

```bash
npm install
npm run dev        # Vite dev server with HMR
npm run build      # production build into dist/
```

On iPhone: open the deployed page in Safari, then Share → Add to Home Screen.
After the first load the service worker caches everything, so it runs fully
offline.

Pushes to `main` auto-deploy to GitHub Pages via
[`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml).

## Inspiration

Kazooyak was inspired by [HiChord](https://hichord.co/), a small handheld
diatonic chord synth — seven chord pads, a quality-morphing joystick, a looper.
The hardware's core playing loop (Nashville Number System pads + a quality
selector + a one-button looper) is a wonderful idea, and Kazooyak reimagines
that idea as a web app.

That said: Kazooyak is its own project. None of HiChord's firmware, sound
design, UI, or assets are reused; the theory engine, synth wrapper, and UI
are written from scratch. HiChord is a trademark of its makers and is referenced
here only as creative inspiration.

## Console-pokable theory

The music-theory engine lives on `window.Kazooyak` for convenience — open the
dev console and explore:

```js
Kazooyak.theory.keyChords(0, 0, 'triad')   // all 7 chords in C major
Kazooyak.theory.chordNotes(7, 0, 4, '7')   // the V7 chord in G major, as MIDI notes
```

It's also a pure ES module with no audio dependencies, so you can load it in
Node:

```bash
node --input-type=module -e "import('./src/theory.js').then(t => console.log(t.keyChords(0,0,'triad').map(c=>c.label).join(' ')))"
```

For project conventions, architecture, and the deferred roadmap, see
[CLAUDE.md](./CLAUDE.md).
