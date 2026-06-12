/* Entry point. Vite reads index.html which loads this as a module script.
 *
 * Two jobs:
 *   1. Expose `window.Kazooyak` for the dev console (the theory engine is
 *      meant to be poked at directly — see CLAUDE.md).
 *   2. Kick off the UI.
 *
 * All internal wiring is via direct ES imports between sibling modules;
 * `window.Kazooyak` is purely a devtools convenience and never read from
 * inside app code.
 */

import * as theory from './theory.js';
import * as synth from './synth.js';
import * as looper from './looper.js';
import { init } from './app.js';
import './styles.css';

if (typeof window !== 'undefined') {
  window.Kazooyak = { theory, synth, looper };
}

init();
