import './style.css';
import { createExperience } from './scene.js';
import { initUI } from './ui.js';

const ui = initUI();

const experience = createExperience(document.getElementById('webgl'), {
  onProgress: ui.setProgress,
  onLoad: ui.markLoaded,
  onError: (err) => {
    console.error(err);
    ui.showError();
  },
});
ui.bindConfigurator(experience);

// One loop drives both the DOM (HUD, loader) and the WebGL scene.
let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  experience.update(dt, ui.update(dt));
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
