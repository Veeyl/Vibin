import { CHAPTERS } from './scene.js';

const LEGENDS = [
  {
    year: 1974,
    name: 'Lamborghini Countach LP400',
    origin: 'Sant’Agata · IT',
    engine: '3.9 L V12 · mid-mounted',
    power: 375,
    zero: '5.6 s',
    top: 290,
    story: 'The scissor-doored wedge that hung on every bedroom wall. Marcello Gandini drew the future with a ruler.',
  },
  {
    year: 1987,
    name: 'Ferrari F40',
    origin: 'Maranello · IT',
    engine: '2.9 L twin-turbo V8',
    power: 478,
    zero: '4.1 s',
    top: 324,
    story: 'Enzo Ferrari’s final signature. No ABS, no power steering, no apologies — the first road car past 200 mph.',
  },
  {
    year: 1992,
    name: 'McLaren F1',
    origin: 'Woking · UK',
    engine: '6.1 L BMW S70/2 V12',
    power: 627,
    zero: '3.2 s',
    top: 386,
    story: 'A central driving seat, a gold-foil engine bay, and the production-car speed record for over a decade.',
  },
  {
    year: 2004,
    name: 'Porsche Carrera GT',
    origin: 'Leipzig · DE',
    engine: '5.7 L V10 · Le Mans bred',
    power: 612,
    zero: '3.9 s',
    top: 330,
    story: 'A shelved racing V10 wrapped in carbon fibre, with a manual gearbox and a beechwood shift knob.',
  },
  {
    year: 2005,
    name: 'Bugatti Veyron 16.4',
    origin: 'Molsheim · FR',
    engine: '8.0 L quad-turbo W16',
    power: 1001,
    zero: '2.5 s',
    top: 407,
    story: 'Volkswagen’s moonshot: a thousand horsepower that could still idle politely through Monaco.',
  },
  {
    year: 2021,
    name: 'Rimac Nevera',
    origin: 'Zagreb · HR',
    engine: 'Quad-motor electric · 120 kWh',
    power: 1914,
    zero: '1.97 s',
    top: 412,
    story: 'Four motors, torque vectoring at every wheel, and a silence that arrives faster than anything with pistons.',
  },
];

const RACE = [
  { name: 'Bugatti Chiron Super Sport 300+', kmh: 490.48 },
  { name: 'Koenigsegg Agera RS', kmh: 447.19 },
  { name: 'Bugatti Veyron Super Sport', kmh: 431.07 },
  { name: 'Rimac Nevera', kmh: 412 },
  { name: 'McLaren F1', kmh: 386.4 },
  { name: 'Porsche Carrera GT', kmh: 330 },
  { name: 'Ferrari 458 Italia', kmh: 325, featured: true },
];

const GEARS = [0, 45, 85, 130, 180, 230, 280, 340];
const RPM_SEGMENTS = 24;
const RED_FROM = 19;

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const smoothstep = (a, b, x) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

export function initUI() {
  history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Build data-driven sections ---------- */
  const track = $('#legends-track');
  track.innerHTML = LEGENDS.map(
    (l) => `
    <article class="legend" data-reveal>
      <div class="legend__top"><span>${l.origin}</span><span>${String(l.power).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} PS</span></div>
      <p class="legend__year" aria-hidden="true">${l.year}</p>
      <h3 class="legend__name">${l.name}</h3>
      <p class="legend__story">${l.story}</p>
      <p class="legend__engine">${l.engine}</p>
      <dl class="legend__stats">
        <div><dt>Year</dt><dd>${l.year}</dd></div>
        <div><dt>0–100</dt><dd>${l.zero}</dd></div>
        <div><dt>Top</dt><dd>${l.top}<small> km/h</small></dd></div>
      </dl>
      <div class="legend__bar" title="Power relative to 2,000 PS"><span style="--p:${(l.power / 2000).toFixed(3)}"></span></div>
    </article>`
  ).join('');

  $('#race').innerHTML = RACE.map(
    (r, i) => `
    <li class="race__row${r.featured ? ' is-featured' : ''}">
      <span class="race__name">${r.name}</span>
      <span class="race__track"><span class="race__fill" style="--w:${(r.kmh / 500).toFixed(4)};--i:${i}"></span></span>
      <span class="race__val">${r.kmh.toFixed(r.kmh % 1 ? 1 : 0)} km/h</span>
    </li>`
  ).join('');
  $('#race').setAttribute('data-observe', '');

  // spotlight that follows the cursor across legend cards
  $$('.legend').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });

  const step = () => ($('.legend').offsetWidth || 320) + 22;
  $('#legends-prev').addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  $('#legends-next').addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));

  /* ---------- Reveal + counters ---------- */
  $$('.chapter').forEach((sec) => $$('[data-reveal]', sec).forEach((el, i) => el.style.setProperty('--i', i % 6)));

  const animateCounter = (el) => {
    const end = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.decimals || '0', 10);
    const sep = el.dataset.sep === 'true';
    const fmt = (v) => (sep ? Math.round(v).toLocaleString('en-US') : v.toFixed(dec));
    if (reduceMotion) return (el.textContent = fmt(end));
    const t0 = performance.now();
    const dur = 1800;
    const tick = (now) => {
      const p = Math.min((now - t0) / dur, 1);
      el.textContent = fmt(end * (1 - Math.pow(2, -10 * p)));
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = fmt(end);
    };
    requestAnimationFrame(tick);
  };

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('in-view');
        $$('.counter', e.target).forEach(animateCounter);
        io.unobserve(e.target);
      });
    },
    { threshold: 0.2, rootMargin: '0px 0px -8% 0px' }
  );
  $$('[data-reveal], [data-observe]').forEach((el) => io.observe(el));

  /* ---------- HUD ---------- */
  const rpmEl = $('#hud-rpm');
  rpmEl.innerHTML = Array.from({ length: RPM_SEGMENTS }, (_, i) => `<i class="${i >= RED_FROM ? 'red' : ''}"></i>`).join('');
  const segs = $$('i', rpmEl);
  const speedEl = $('#hud-speed');
  const gearEl = $('#hud-gear');
  const logo = $('#nav-logo');
  const bar = $('#progress-bar');
  let lastSpeed = -1;
  let lastLit = -1;
  let lastGear = '';

  /* ---------- Pointer parallax ---------- */
  const mouse = { x: 0, y: 0 };
  const mouseT = { x: 0, y: 0 };
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    mouseT.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouseT.y = -((e.clientY / window.innerHeight) * 2 - 1);
  });

  /* ---------- Configurator drag ---------- */
  let yaw = 0;
  const stage = $('#drag-stage');
  let dragging = false;
  let lastX = 0;
  stage.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastX = e.clientX;
    stage.setPointerCapture(e.pointerId);
    stage.classList.add('is-dragging');
  });
  stage.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    yaw += (e.clientX - lastX) * 0.009;
    lastX = e.clientX;
  });
  const endDrag = () => {
    dragging = false;
    stage.classList.remove('is-dragging');
  };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  $('#rotate-left').addEventListener('click', () => (yaw -= Math.PI / 4));
  $('#rotate-right').addEventListener('click', () => (yaw += Math.PI / 4));
  $('#rotate-reset').addEventListener('click', () => (yaw = Math.round(yaw / (Math.PI * 2)) * Math.PI * 2));

  /* ---------- Chapter geometry ---------- */
  const sections = CHAPTERS.map((id) => $(`[data-chapter="${id}"]`));
  let tops = [];
  const measure = () => (tops = sections.map((s) => s.getBoundingClientRect().top + window.scrollY));
  measure();
  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);

  const navLinks = $$('.nav__links a');
  const railLinks = $$('.rail a');
  let activeIdx = -1;

  /* ---------- Scroll velocity → km/h ---------- */
  let lastY = window.scrollY;
  let vel = 0;

  /* ---------- Loader ---------- */
  const loaderEl = $('#loader');
  const arc = $('#loader-arc');
  const rpmTxt = $('#loader-rpm');
  const pctTxt = $('#loader-pct');
  let target = 0;
  let shown = 0;
  let modelReady = false;
  let started = false;

  function tickLoader(dt) {
    if (started) return;
    // ease toward the real progress, but never faster than a satisfying rev
    shown = Math.min(shown + (target - shown) * (1 - Math.exp(-dt * 6)), shown + dt * 0.85);
    arc.style.strokeDashoffset = (395.84 * (1 - shown)).toFixed(2);
    rpmTxt.textContent = String(Math.round(shown * 9000)).padStart(4, '0');
    pctTxt.textContent = `${Math.round(shown * 100)}%`;
    if (modelReady && shown > 0.985) {
      started = true;
      loaderEl.classList.add('is-done');
      loaderEl.setAttribute('aria-hidden', 'true');
      document.body.classList.add('is-ready');
      measure();
      setTimeout(() => loaderEl.remove(), 1400);
    }
  }

  /* ---------- Per-frame update ---------- */
  function update(dt) {
    tickLoader(dt);

    const y = window.scrollY;
    const vh = window.innerHeight;

    // camera blend between chapters
    let i = 0;
    for (let k = 0; k < tops.length; k++) if (y >= tops[k] - 1) i = k;
    let t = 0;
    if (i < tops.length - 1) t = smoothstep(0.15, 0.92, (y - tops[i]) / Math.max(tops[i + 1] - tops[i], 1));
    const from = CHAPTERS[i];
    const to = CHAPTERS[Math.min(i + 1, CHAPTERS.length - 1)];

    const idx = Math.min(i + (t > 0.5 ? 1 : 0), CHAPTERS.length - 1);
    if (idx !== activeIdx) {
      activeIdx = idx;
      document.body.dataset.chapter = CHAPTERS[idx];
      railLinks.forEach((a, k) => a.classList.toggle('is-active', k === idx));
      navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${sections[idx].id}`));
    }

    // scroll speed (signed): down = forward, up = reverse
    const inst = dt > 0 ? (y - lastY) / dt : 0;
    lastY = y;
    vel += (inst - vel) * (1 - Math.exp(-dt * 5));
    if (Math.abs(vel) < 4) vel = 0;
    const kmh = Math.max(-120, Math.min(340, vel * 0.085));
    const speed = Math.abs(kmh);

    const s = Math.round(speed);
    if (s !== lastSpeed) {
      lastSpeed = s;
      speedEl.textContent = String(s).padStart(3, '0');
      logo.style.setProperty('--needle', Math.min(speed / 320, 1).toFixed(3));
    }

    let gear = 'N';
    let rpmN = 0.08;
    if (kmh < -2) {
      gear = 'R';
      rpmN = 0.2 + Math.min(speed / 120, 1) * 0.7;
    } else if (speed >= 2) {
      let g = 1;
      while (g < GEARS.length - 1 && speed > GEARS[g]) g++;
      gear = String(g);
      rpmN = 0.35 + 0.65 * ((speed - GEARS[g - 1]) / (GEARS[g] - GEARS[g - 1]));
    }
    if (gear !== lastGear) {
      lastGear = gear;
      gearEl.textContent = gear;
      gearEl.classList.toggle('is-reverse', gear === 'R');
    }
    const lit = Math.round(Math.min(rpmN, 1) * RPM_SEGMENTS);
    if (lit !== lastLit) {
      lastLit = lit;
      segs.forEach((el, k) => el.classList.toggle('on', k < lit));
    }

    const max = document.documentElement.scrollHeight - vh;
    bar.style.transform = `scaleX(${max > 0 ? (y / max).toFixed(4) : 0})`;

    const md = 1 - Math.exp(-dt * 3);
    mouse.x += (mouseT.x - mouse.x) * md;
    mouse.y += (mouseT.y - mouse.y) * md;

    return {
      from,
      to,
      t,
      kmh: reduceMotion ? 0 : kmh,
      mouse,
      yaw: CHAPTERS[idx] === 'configure' ? yaw : 0,
    };
  }

  /* ---------- Configurator wiring ---------- */
  function bindConfigurator(exp) {
    const group = (container, output, apply) => {
      const btns = $$('button', $(container));
      btns.forEach((btn) =>
        btn.addEventListener('click', () => {
          btns.forEach((b) => {
            b.classList.toggle('is-active', b === btn);
            b.setAttribute('aria-pressed', String(b === btn));
          });
          $(output).textContent = btn.dataset.name;
          apply(btn);
        })
      );
    };
    group('#paint-swatches', '#paint-name', (b) => exp.setPaint(b.dataset.color));
    group('#rim-chips', '#rim-name', (b) => exp.setRims(b.dataset.color));
    group('#glass-chips', '#glass-name', (b) => exp.setGlass(b.dataset.glass));
  }

  return {
    update,
    bindConfigurator,
    setProgress: (p) => (target = Math.max(target, p)),
    markLoaded: () => {
      modelReady = true;
      target = 1;
    },
    showError: () => {
      $('.loader__label').textContent = 'The garage door is stuck — please refresh.';
    },
  };
}
