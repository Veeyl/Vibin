import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const BG = new THREE.Color('#070708');
const ACCENT = new THREE.Color('#ff4f1a');

/*
 * Camera "shots", one per chapter. `shift` slides the car sideways on screen
 * (world units along the camera's right vector) so copy and car never collide.
 * The car's nose points toward +Z.
 */
const SHOTS = {
  hero: { pos: [-5.2, 1.15, 5.4], center: [0, 0.45, 0], shift: 1.35, fov: 32 },
  anatomy: { pos: [7.6, 0.9, 0.2], center: [0, 0.5, 0], shift: 2.0, fov: 30 },
  configure: { pos: [4.9, 1.75, 4.5], center: [0, 0.4, 0], shift: -1.45, fov: 32 },
  legends: { pos: [0.0, 11.5, 1.2], center: [0, 0, 0], shift: 0, fov: 30 },
  velocity: { pos: [-2.3, 0.8, -6.6], center: [0, 0.55, 0], shift: 1.7, fov: 34 },
  finale: { pos: [0, 0.75, 8.2], center: [0, 0.55, 0], shift: 0, fov: 30 },
};

export const CHAPTERS = Object.keys(SHOTS);

/* A dark studio with emissive softboxes — this is what the paint reflects. */
function buildStudio() {
  const s = new THREE.Scene();
  const room = new THREE.Mesh(
    new THREE.BoxGeometry(40, 20, 40),
    new THREE.MeshBasicMaterial({ color: 0x040405, side: THREE.BackSide })
  );
  room.position.y = 8;
  s.add(room);

  const strip = (w, h, intensity, color, pos, rot) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(color).multiplyScalar(intensity),
        side: THREE.DoubleSide,
      })
    );
    m.position.set(...pos);
    m.rotation.set(...rot);
    s.add(m);
  };

  // overhead softbox lanes
  strip(1.1, 14, 7, '#ffffff', [-1.7, 7, 0], [Math.PI / 2, 0, 0]);
  strip(1.1, 14, 7, '#ffffff', [1.7, 7, 0], [Math.PI / 2, 0, 0]);
  // horizon strips that draw the long highlight down the flanks
  strip(16, 0.45, 5, '#ffffff', [9, 2.2, 0], [0, -Math.PI / 2, 0]);
  strip(16, 0.45, 5, '#ffffff', [-9, 2.2, 0], [0, Math.PI / 2, 0]);
  // warm accent behind, cool kicker in front
  strip(12, 0.4, 7, '#ff5a1f', [0, 1.4, -12], [0, 0, 0]);
  strip(12, 0.35, 2.2, '#a9bcff', [0, 1.4, 12], [0, Math.PI, 0]);
  // broad low fill so the dark paints keep their shape
  strip(10, 3, 0.5, '#ffffff', [0, 3, 12], [0, Math.PI, 0]);
  strip(10, 3, 0.35, '#ffffff', [0, 3, -12], [0, 0, 0]);
  return s;
}

function buildFloor() {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uBg: { value: BG.clone() },
      uAccent: { value: ACCENT.clone() },
      uOffset: { value: 0 },
      uSpeed: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uBg;
      uniform vec3 uAccent;
      uniform float uOffset;
      uniform float uSpeed;
      varying vec3 vWorld;

      float grid(vec2 p, float scale) {
        vec2 q = p * scale;
        vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q);
        return 1.0 - min(min(g.x, g.y), 1.0);
      }

      void main() {
        vec2 p = vWorld.xz;
        float d = length(p * vec2(1.0, 0.72));
        float fade = smoothstep(17.0, 1.5, d);
        vec2 mp = vec2(p.x, p.y + uOffset);

        float g = grid(mp, 0.5) * 0.55 + grid(mp, 2.0) * 0.12;
        // dashed lane markings either side of the car
        float lane = smoothstep(0.05, 0.0, abs(abs(p.x) - 2.1));
        float dash = step(0.55, fract(mp.y * 0.22));

        vec3 col = uBg;
        col += vec3(0.05) * smoothstep(7.5, 0.0, d);          // light pool
        col += vec3(0.045) * g * fade;                         // grid
        col += uAccent * lane * dash * fade * (0.08 + uSpeed * 1.4);
        col = mix(uBg, col, fade);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), material);
  floor.rotation.x = -Math.PI / 2;
  return floor;
}

/* Light streaks that rush past when you "drive" (scroll fast). */
function buildStreaks(count = 160) {
  const geo = new THREE.BoxGeometry(0.018, 0.018, 1);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.frustumCulled = false;
  const data = [];
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = THREE.MathUtils.randFloatSpread(14);
      y = THREE.MathUtils.randFloat(0.05, 4.5);
    } while (Math.abs(x) < 1.7 && y < 1.6); // keep them out of the car
    data.push({ x, y, z: THREE.MathUtils.randFloatSpread(40), len: THREE.MathUtils.randFloat(0.6, 3.6) });
    c.copy(Math.random() < 0.35 ? ACCENT : new THREE.Color(1, 1, 1)).multiplyScalar(3);
    mesh.setColorAt(i, c);
  }
  return { mesh, data };
}

export function createExperience(canvas, { onProgress, onLoad, onError }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  scene.background = BG;

  const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(-9, 0.6, 11); // intro: far and low, then the damping dollies us in

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(buildStudio(), 0.035).texture;

  const floor = buildFloor();
  scene.add(floor);

  const streaks = buildStreaks();
  scene.add(streaks.mesh);

  // ---------- Car ----------
  const carGroup = new THREE.Group();
  scene.add(carGroup);

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: '#a8100b',
    metalness: 0.85,
    roughness: 0.32,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
  });
  const rimMat = new THREE.MeshStandardMaterial({ color: '#cfcfcf', metalness: 1, roughness: 0.28 });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    metalness: 0.25,
    roughness: 0,
    transmission: 1,
  });

  const paintTarget = bodyMat.color.clone();
  const rimTarget = rimMat.color.clone();
  const glassTarget = glassMat.color.clone();
  const wheels = [];

  const draco = new DRACOLoader();
  draco.setDecoderPath('/draco/');
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);
  const aoTex = new THREE.TextureLoader().load('/models/ferrari_ao.png');

  loader.load(
    '/models/ferrari.glb',
    (gltf) => {
      const car = gltf.scene.children[0];
      car.getObjectByName('body').material = bodyMat;
      ['rim_fl', 'rim_fr', 'rim_rr', 'rim_rl', 'trim'].forEach((n) => {
        const o = car.getObjectByName(n);
        if (o) o.material = rimMat;
      });
      car.getObjectByName('glass').material = glassMat;
      ['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr'].forEach((n) => {
        const o = car.getObjectByName(n);
        if (o) wheels.push(o);
      });

      const ao = new THREE.Mesh(
        new THREE.PlaneGeometry(0.655 * 4, 1.3 * 4),
        new THREE.MeshBasicMaterial({
          map: aoTex,
          blending: THREE.MultiplyBlending,
          toneMapped: false,
          transparent: true,
          premultipliedAlpha: true,
        })
      );
      ao.rotation.x = -Math.PI / 2;
      ao.position.y = 0.002;
      ao.renderOrder = 2;
      car.add(ao);

      carGroup.add(car);
      onProgress?.(1);
      onLoad?.();
    },
    (e) => {
      if (e.total) onProgress?.(Math.min(e.loaded / e.total, 0.99));
    },
    (err) => onError?.(err)
  );

  // ---------- Post-processing ----------
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.55, 0.5, 0.9);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  composer.setSize(window.innerWidth, window.innerHeight);

  // ---------- Camera rig ----------
  const cur = { pos: camera.position.clone(), center: new THREE.Vector3(0, 0.45, 0), shift: 0, fov: 32 };
  const want = { pos: new THREE.Vector3(), center: new THREE.Vector3(), shift: 0, fov: 32 };
  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const lookAt = new THREE.Vector3();
  let carYaw = 0;
  let travel = 0;
  let wheelAngle = 0;
  let time = 0;

  function shotFor(name) {
    const s = SHOTS[name];
    const portrait = window.innerWidth < 820;
    const aspect = window.innerWidth / window.innerHeight;
    // pull back on narrow screens so the whole car fits
    const k = portrait ? THREE.MathUtils.clamp(1.6 / aspect, 1.25, 2.2) : 1;
    return {
      pos: tmpA.fromArray(s.pos).sub(tmpB.fromArray(s.center)).multiplyScalar(k).add(tmpB).clone(),
      center: new THREE.Vector3().fromArray(s.center),
      shift: portrait ? 0 : s.shift,
      fov: s.fov,
      portraitLift: portrait ? 0.9 : 0,
    };
  }

  /**
   * @param {number} dt seconds
   * @param {object} st { from, to, t, kmh, mouse:{x,y}, yaw }
   */
  function update(dt, st) {
    time += dt;
    const a = shotFor(st.from);
    const b = shotFor(st.to);
    const t = st.t;
    want.pos.lerpVectors(a.pos, b.pos, t);
    want.center.lerpVectors(a.center, b.center, t);
    // on portrait screens, aim above the car so it sits in the upper half
    want.center.y -= THREE.MathUtils.lerp(a.portraitLift, b.portraitLift, t) * 0.5;
    want.shift = THREE.MathUtils.lerp(a.shift, b.shift, t);

    const speed = Math.abs(st.kmh);
    const speedN = THREE.MathUtils.clamp(speed / 320, 0, 1);
    want.fov = THREE.MathUtils.lerp(a.fov, b.fov, t) + speedN * 7;

    const damp = 1 - Math.exp(-dt * 3.2);
    cur.pos.lerp(want.pos, damp);
    cur.center.lerp(want.center, damp);
    cur.shift += (want.shift - cur.shift) * damp;
    cur.fov += (want.fov - cur.fov) * damp;

    // camera basis for screen-space shift + mouse parallax
    right.subVectors(cur.center, cur.pos).normalize().cross(up).normalize();
    camera.position.copy(cur.pos);
    camera.position.addScaledVector(right, st.mouse.x * 0.28);
    camera.position.y += st.mouse.y * 0.14;
    // tiny road-shake at speed
    if (speedN > 0.05) {
      camera.position.x += (Math.random() - 0.5) * 0.012 * speedN;
      camera.position.y += (Math.random() - 0.5) * 0.012 * speedN;
    }
    lookAt.copy(cur.center).addScaledVector(right, -cur.shift);
    camera.lookAt(lookAt);
    if (Math.abs(camera.fov - cur.fov) > 0.01) {
      camera.fov = cur.fov;
      camera.updateProjectionMatrix();
    }

    // car yaw (configurator drag)
    carYaw += (st.yaw - carYaw) * (1 - Math.exp(-dt * 6));
    carGroup.rotation.y = carYaw;

    // driving: wheels, floor, streaks
    const dir = Math.sign(st.kmh) || 1;
    const ms = st.kmh / 3.6;
    wheelAngle += ms * dt * 0.35;
    for (const w of wheels) w.rotation.x = wheelAngle;

    travel += ms * dt * 0.25;
    floor.material.uniforms.uOffset.value = travel;
    floor.material.uniforms.uSpeed.value = speedN;

    streaks.mesh.material.opacity = THREE.MathUtils.smoothstep(speedN, 0.08, 0.6) * 0.9;
    if (streaks.mesh.material.opacity > 0.001) {
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const sc = new THREE.Vector3();
      const p = new THREE.Vector3();
      streaks.data.forEach((s, i) => {
        s.z -= ms * dt * 1.4;
        if (dir > 0 && s.z < -20) s.z += 40;
        if (dir < 0 && s.z > 20) s.z -= 40;
        p.set(s.x, s.y, s.z);
        sc.set(1, 1, s.len * (0.4 + speedN * 2.2));
        m.compose(p, q, sc);
        streaks.mesh.setMatrixAt(i, m);
      });
      streaks.mesh.instanceMatrix.needsUpdate = true;
    }
    bloom.strength = 0.45 + speedN * 0.6;

    // paint/rim/glass transitions
    const cd = 1 - Math.exp(-dt * 4);
    bodyMat.color.lerp(paintTarget, cd);
    rimMat.color.lerp(rimTarget, cd);
    glassMat.color.lerp(glassTarget, cd);

    composer.render(dt);
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
    bloom.setSize(w, h);
  }
  window.addEventListener('resize', resize);

  return {
    update,
    setPaint: (hex) => paintTarget.set(hex),
    setRims: (hex) => {
      rimTarget.set(hex);
      rimMat.roughness = hex === '#2a2a2e' ? 0.45 : 0.28;
    },
    setGlass: (kind) => glassTarget.set(kind === 'smoke' ? '#2b2b2f' : '#ffffff'),
  };
}
