// Ultra Elements as a library for a game: createElements(), then cast() and render(). Adapted from
// Ultra Elements' src/main.js (Humpalumps, MIT): the same frame and warm-up, without its panel, reel
// and benchmarks, and with warming in slices small enough to run between frames.
// README.md has the short version; lib/ultra-elements/CONTRIBUTING.md explains a spell's module.
import * as THREE from 'three';
import { Q, TIERS } from './lib/ultra-elements/src/engine/quality.js';
import { PostFX } from './lib/ultra-elements/src/engine/PostFX.js';
import { PlanarReflection } from './lib/ultra-elements/src/engine/PlanarReflection.js';
import { CameraRig } from './lib/ultra-elements/src/engine/camera.js';
import { SkySystem } from './lib/ultra-elements/src/scene/sky.js';
import { createArena, REFLECT_LAYER } from './lib/ultra-elements/src/scene/arena.js';
import { U, ARENA, packWorld, lights, forces, impacts, occluders, arenaRaycast } from './lib/ultra-elements/src/vfx/common.js';
import { bakeNoise } from './lib/ultra-elements/src/vfx/noise.js';
import { GroundField } from './lib/ultra-elements/src/vfx/GroundField.js';
import { Particles } from './lib/ultra-elements/src/vfx/Particles.js';
import { TrailRibbons, AnalyticRibbons } from './lib/ultra-elements/src/vfx/Ribbons.js';
import { Bolts } from './lib/ultra-elements/src/vfx/Bolts.js';
import { Volumes } from './lib/ultra-elements/src/vfx/Volumes.js';
import { Shockwaves } from './lib/ultra-elements/src/vfx/Shockwaves.js';
import { FxTarget } from './lib/ultra-elements/src/vfx/FxTarget.js';
import { Lens } from './lib/ultra-elements/src/vfx/Lens.js';
import { Spikes } from './lib/ultra-elements/src/vfx/Spikes.js';
import { Sigils } from './lib/ultra-elements/src/vfx/Sigils.js';
import { Metaballs } from './lib/ultra-elements/src/vfx/Metaballs.js';
import { Casts } from './lib/ultra-elements/src/spells/cast.js';
import { SPELLS, ENTRIES, ELEMENTS } from './lib/ultra-elements/src/spells/index.js';
import { bakeFoam } from './lib/ultra-elements/src/vfx/ParticleFluid.js';

export { SPELLS, ENTRIES, ELEMENTS, ARENA, Q, TIERS };

const breathe = () => new Promise((r) => setTimeout(r, 0));

// Every pass a system draws off-scene: its quads, meshes and bare materials, found on its own fields.
const passCam = new THREE.Camera();
const passGeometry = new THREE.BufferGeometry();
passGeometry.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
function passesOf(system, into = new Set()) {
  for (const v of Object.values(system)) {
    if (v?.isMesh || v?.isPoints) into.add(v);
    else if (v?.mesh?.isMesh) into.add(v.mesh);
    else if (v?.isMaterial) {
      const m = new THREE.Mesh(passGeometry, v);
      m.frustumCulled = false;
      into.add(m);
    }
  }
  return into;
}
// Starts every link at once and waits for them: the driver compiles them side by side, and nothing
// blocks. The first draw of a program still being linked waits for it, so these go before any draw.
async function linkAll(renderer, target, meshes, camera = passCam) {
  const prev = renderer.getRenderTarget();
  renderer.setRenderTarget(target);
  const jobs = [...meshes].filter((m) => m.material).map((m) => renderer.compileAsync(m, camera));
  renderer.setRenderTarget(prev);
  await Promise.all(jobs);
}

// The world's parts are built one at a time so a loading page can say how far along it is: await
// createElements(...) takes about as long as the start of a cold load. `spells` adds your own spell
// modules to the 39 (see README.md, Make a new spell). `onProgress` gets 0 to 1 while it builds.
export async function createElements({ renderer, camera, sky: skyPreset = 'dusk', spells: extra = [], onProgress } = {}) {
  renderer.autoClear = false;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.info.autoReset = false;
  // no synchronous shader log checks: they stall the page on every new program
  renderer.debug.checkShaderErrors = false;
  if (!renderer.extensions.has('EXT_color_buffer_float')) throw new Error('This device can not render to float textures, so the spells can not run.');
  for (const s of extra) addSpell(s);

  const rig = new CameraRig();
  const reducedPref = matchMedia('(prefers-reduced-motion: reduce)').matches;
  rig.reduced = reducedPref;
  const scenes = { opaque: new THREE.Scene(), refract: new THREE.Scene(), lines: new THREE.Scene(), fx: new THREE.Scene() };

  const sky = new SkySystem(renderer);
  const bakeTarget = new THREE.WebGLRenderTarget(1, 1);
  await linkAll(renderer, bakeTarget, [...passesOf(sky), ...passesOf(sky.atmosphere)].filter((m) => !m.parent && m !== sky.background));
  sky.setPreset(skyPreset);
  bakeNoise(renderer, Q);
  const ground = new GroundField(renderer, Q.groundSize);
  const arena = createArena({ renderer, sky });
  scenes.opaque.environment = sky.cube;
  scenes.opaque.add(sky.background, arena.group);
  scenes.refract.environment = sky.cube;
  scenes.refract.add(arena.refractGroup);
  U.uSkyCube.value = sky.cube;
  onProgress?.(0.1);
  await breathe();

  const reflection = new PlanarReflection(REFLECT_LAYER);
  reflection.scale = Q.reflectionScale;
  const emptyReflection = new THREE.DataTexture(new Uint8Array(4), 1, 1);
  emptyReflection.needsUpdate = true;

  const particles = new Particles(renderer, { ground });
  const trails = new TrailRibbons({ max: 64, points: 48 });
  const bolts = new Bolts();
  const volumes = new Volumes();
  const shocks = new Shockwaves();
  const spikes = new Spikes({ max: 48 });
  const sigils = new Sigils({ max: 8 });
  const metaballs = new Metaballs({ max: 4 });
  const fxTarget = new FxTarget(renderer);
  const lens = new Lens(renderer);
  const post = new PostFX(renderer);
  post.viewCamera = camera;
  post.params.bloomLevels = Q.bloomLevels;
  post.params.anamorphic = Q.anamorphic ? 1 : 0;
  post.params.meterEvery = Q.mobile ? 3 : 1;

  let seed = 1;
  const fx = {
    renderer, camera, scenes, U, Q, ARENA, sky, arena, ground, particles, trails, bolts, volumes, shocks, spikes, sigils, metaballs,
    lights, forces, impacts, occluders, rig, post, lens, fxTarget, AnalyticRibbons,
    dummies: arena.dummies, pool: arena.pool, spells: {}, reduced: reducedPref,
    systems: [],
    rand() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; },
    flash(amount) {
      const now = performance.now();
      fx._flashes = (fx._flashes ?? []).filter((t) => now - t < 1000);
      if (fx.reduced && (fx._flashes.length >= 3 || amount > 0.3)) amount = Math.min(amount, 0.15);
      fx._flashes.push(now);
      post.params.flash = Math.min(2, Math.max(post.params.flash ?? 0, amount));
    },
  };

  // ground probes: the 3 dummies + every live cast's target, read back async
  const probePts = Array.from({ length: 16 }, () => [0, 0]);
  const probeXZ = Array.from({ length: 16 }, () => new THREE.Vector2());
  let probeN = 0, probeReadN = 0;
  const probeOut = new Float32Array(8), probeList = [];
  fx.groundAt = (x, z) => {
    let best = -1, bd = 1;
    for (let i = 0; i < Math.min(probeReadN, ground.probeCount); i++) {
      const d = Math.hypot(probeXZ[i].x - x, probeXZ[i].y - z);
      if (d < bd) { bd = d; best = i; }
    }
    if (best < 0) return null;
    for (let k = 0; k < 8; k++) probeOut[k] = ground.probes[best * 8 + k];
    return probeOut;
  };
  function updateProbes(casts) {
    probeReadN = probeN;
    for (let i = 0; i < probeN; i++) probeXZ[i].set(probePts[i][0], probePts[i][1]);
    probeN = 0;
    for (const d of ARENA.dummies) { probePts[probeN][0] = d.x; probePts[probeN][1] = d.z; probeN++; }
    for (const c of casts.list) if (c.alive && probeN < 16) { probePts[probeN][0] = c.to.x; probePts[probeN][1] = c.to.z; probeN++; }
    probeList.length = 0;
    for (let i = 0; i < probeN; i++) probeList.push(probePts[i]);
    ground.setProbes(probeList);
  }

  scenes.lines.add(bolts.cores, trails.lines, sigils.mesh);
  scenes.opaque.add(spikes.opaque);
  scenes.refract.add(spikes.refract, metaballs.group);
  scenes.fx.add(bolts.glows, trails.fx, shocks.mesh, volumes.group);
  for (const s of SPELLS) {
    s.defaults = { ...s.params };
    s.params = { ...s.params };
    for (const [k, def] of Object.entries(s.kinds ?? {})) particles.addKind(`${s.id}.${k}`, def);
    fx.spells[s.id] = s;
  }
  // every spell allocates in create(). Remember the scene objects it added: its programs are
  // compiled and warmed on their own.
  const sceneObjects = () => { const set = new Set(); for (const sc of Object.values(scenes)) sc.traverse((o) => set.add(o)); return set; };
  const foamSpells = new Set(['water', 'tsunami']);
  let built = 0;
  for (const s of SPELLS) {
    const before = sceneObjects(), systems = fx.systems.length;
    s.inst = s.create(fx);
    s.systems = fx.systems.slice(systems);
    s.objects = [...sceneObjects()].filter((o) => !before.has(o));
    s.roots = s.objects.filter((o) => before.has(o.parent));
    s.warm = false;
    onProgress?.(0.1 + 0.3 * (++built / SPELLS.length));
    if (built % 6 === 0) await breathe();
  }
  particles.build();
  scenes.lines.add(particles.glow);
  scenes.fx.add(particles.media);
  scenes.opaque.add(...particles.debris);
  scenes.refract.add(scenes.lines);   // drawn in the refract call (see renderFrame)
  const casts = new Casts(fx);
  fx.casts = casts;

  // ambient wind: always force slot 0, pushes every responsive particle
  const wind = forces.acquire();
  Object.assign(wind, { type: 0, p: [0, 0.35, 0.25, 0] });
  wind.dir.set(1, 0, 0.3).normalize();
  const env = { wind: 0, windAngle: 20 };

  // --- targets ---------------------------------------------------------------------------
  const auto = { fx: 1 };
  let hdrRT = null;
  const size = new THREE.Vector2();
  function makeTargets() {
    renderer.getDrawingBufferSize(size);
    hdrRT?.dispose();
    hdrRT = new THREE.WebGLRenderTarget(size.x, size.y, {
      type: THREE.HalfFloatType, samples: Q.msaa, generateMipmaps: false,
      depthTexture: new THREE.DepthTexture(size.x, size.y, THREE.FloatType),
    });
    U.uSceneColor.value = hdrRT.texture;
    U.uSceneDepth.value = hdrRT.depthTexture;
    U.uResolution.value.copy(size);
    reflection.scale = Q.reflectionScale;
    reflection.setSize(size.x, size.y);
    fxTarget.setSize(size.x, size.y, Q.fxScale * auto.fx);
    post.setSize(size.x, size.y);
    lens.setSize?.(size.x, size.y);
  }
  U.uNearFar.value.set(camera.near, camera.far);

  function applySun() {
    sky.update();
    arena.updateSun();   // sets uSunDir/uSunColor/uAmbient (the moon at night) and the shadow map
    post.params.maxExposure = sky.night ? 6 : 20;   // night: don't blow the orb out to white
  }
  let sunDirty = true;

  // --- frame ------------------------------------------------------------------------------
  const view = { timeScale: 1, exposure: 1 };
  let elapsed = 0, simTime = 0, warming = false;

  function forceVisible() {
    for (const sc of Object.values(scenes)) sc.traverse((o) => {
      o.visible = true;
      if (o.geometry?.isInstancedBufferGeometry) o.geometry.instanceCount = Math.max(1, o.geometry.instanceCount);
    });
  }

  function renderFrame(dt) {
    elapsed += dt;
    if (sunDirty) { applySun(); sunDirty = false; }
    renderer.info.reset();
    const sdt = dt * view.timeScale * rig.timeScale;
    simTime += sdt;
    U.uTime.value = simTime % 3600;
    U.uDt.value = sdt;
    U.uFrame.value++;

    wind.p[0] = env.wind;
    wind.dir.set(Math.cos(THREE.MathUtils.degToRad(env.windAngle)), 0, Math.sin(THREE.MathUtils.degToRad(env.windAngle)));
    casts.update(sdt);
    for (const s of SPELLS) s.inst.tick?.(sdt);
    arena.update(renderer, sdt, camera);
    spikes.update(sdt);   // writes occluder capsules, so before packWorld
    sigils.update();
    packWorld(sdt, { maxLights: Q.maxLights, maxShadowed: Q.shadowLights });

    particles.update(sdt, simTime);
    updateProbes(casts);
    ground.update(sdt);
    trails.update(sdt);
    bolts.update();
    volumes.update(camera);
    shocks.update(sdt);
    metaballs.update();
    for (const sys of fx.systems) sys.update(sdt, camera);
    if (warming) forceVisible();

    if (Q.reflections) {
      reflection.render(renderer, scenes.opaque, camera);
      if (Q.reflectFx) renderer.render(scenes.lines, reflection.camera);
      arena.uniforms.uReflection.value = reflection.target.texture;
      arena.uniforms.uReflMatrix.value = reflection.textureMatrix;
    } else arena.uniforms.uReflection.value = emptyReflection;

    renderer.setRenderTarget(hdrRT);
    renderer.setClearColor(0x000000, 1);
    renderer.clear(true, true, false);
    renderer.render(scenes.opaque, camera);
    // refraction + lines in one call: every render into the MSAA target pays a ~0.3 ms resolve
    renderer.render(scenes.refract, camera);

    let frame = fxTarget.render(scenes.fx, camera, hdrRT.texture, nullTimer, null);
    if (lens.active) frame = lens.render(frame, hdrRT.depthTexture, camera);

    post.params.exposure = view.exposure;
    post.render(frame, dt, hdrRT.texture);
    post.params.flash = Math.max(0, (post.params.flash ?? 0) - dt * 6);
  }
  const nullTimer = { begin() {}, beginFrame() {}, endFrame() {} };

  const gl = renderer.getContext();
  async function gpuFence() {
    const s = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    while (gl.clientWaitSync(s, 0, 0) === gl.TIMEOUT_EXPIRED) await new Promise((r) => setTimeout(r, 1));
    gl.deleteSync(s);
  }

  // --- warm-up: every program compiled and drawn once into its real targets before the first cast.
  // Systems hide idle meshes in their update(), so the warm frame re-forces them after the updates.
  async function warmCore() {
    const saved = [];
    const parked = [];   // spells warm on their own: out of the scenes while the core does
    const park = () => { for (const s of SPELLS) for (const o of s.roots) { parked.push([o, o.parent]); o.parent.remove(o); } };
    const unpark = () => { for (const [o, p] of parked) p.add(o); parked.length = 0; };
    const forced = () => {
      for (const sc of Object.values(scenes)) sc.traverse((o) => {
        saved.push([o, o.visible, o.geometry?.isInstancedBufferGeometry ? o.geometry.instanceCount : null]);
      });
      forceVisible();
    };
    park();
    forced();
    renderer.setRenderTarget(hdrRT);   // compile the linear-output variants we actually draw with
    const jobs = Object.values(scenes).map((sc) => renderer.compileAsync(sc, camera));
    renderer.setRenderTarget(null);
    const restore = () => { for (const [o, v, n] of saved.reverse()) { o.visible = v;   // reverse: lines are traversed twice (nested in refract)
      if (n !== null) o.geometry.instanceCount = n; } saved.length = 0; };
    restore();
    unpark();
    // and the passes that aren't in a scene, all at once
    const offScene = new Set([arena.pool.sim.mesh, ...particles.sims.map((q) => q.mesh)]);
    for (const sys of [post, fxTarget, lens]) passesOf(sys, offScene);
    jobs.push(linkAll(renderer, hdrRT, [...offScene].filter((m) => !m.parent)));
    // the final picture goes to the canvas, not a target: its own variant
    jobs.push(linkAll(renderer, null, passesOf({ m: post.matComp })));
    await Promise.all(jobs);
    // one frame with everything forced on, in one go: spells warm at the same time, between awaits
    park();
    forced();
    particles.warm(true);
    lens.active = lens.warming = true;
    warming = true;
    renderFrame(1 / 60);
    warming = false;
    restore();
    particles.warm(false);
    lens.active = lens.warming = false;
    unpark();
    await gpuFence();
  }

  // per-spell warm-up: compile its programs (parallel compile, linear-output variants) and draw
  // each pass once into tiny targets with its meshes forced on, since ANGLE builds some variants
  // at first draw. Off the visible frame, so it can run between frames.
  let warmHdr = null, warmFx = null;
  const sceneOf = (o) => { let p = o; while (p && !p.isScene) p = p.parent; return p; };
  // Starts linking a spell's programs without waiting for them (the driver does them side by side).
  function linkSpell(s) {
    if (s.linking) return s.linking;
    renderer.setRenderTarget(hdrRT);
    const jobs = s.roots.map((o) => renderer.compileAsync(o, camera, sceneOf(o)));
    renderer.setRenderTarget(null);
    for (const sys of s.systems) if (sys.link) jobs.push(sys.link());
    return (s.linking = Promise.all(jobs));
  }
  function warmSpell(s) {
    if (s.warm) return Promise.resolve();
    return (s.warming ??= (async () => {
      await linkSpell(s);
      for (const sys of s.systems) await sys.prepare?.();
      if (foamSpells.has(s.id)) await bakeFoam(renderer);
      if (s.objects.length) {
        await breathe();
        if (!warmHdr || warmHdr.samples !== hdrRT.samples) { warmHdr?.dispose(); warmHdr = hdrRT.clone(); warmHdr.setSize(4, 4); }
        if (!warmFx) { warmFx = fxTarget.rt.clone(); warmFx.setSize(4, 4); }
        const saved = s.objects.map((o) => [o, o.visible, o.geometry?.isInstancedBufferGeometry ? o.geometry.instanceCount : null, o.frustumCulled]);
        // only this spell's: the rest may still be linking, and a draw waits for its link
        const own = new Set(s.objects), others = [];
        for (const sc of Object.values(scenes)) sc.traverse((o) => { if (o.material && o.visible && !own.has(o)) { others.push(o); o.visible = false; } });
        for (const o of s.objects) { o.visible = true; o.frustumCulled = false; if (o.geometry?.isInstancedBufferGeometry) o.geometry.instanceCount = Math.max(1, o.geometry.instanceCount); }
        const prev = renderer.getRenderTarget();
        renderer.setRenderTarget(warmHdr);
        renderer.render(scenes.opaque, camera);
        renderer.render(scenes.refract, camera);
        renderer.setRenderTarget(warmFx);
        renderer.render(scenes.fx, camera);
        renderer.setRenderTarget(prev);
        for (const [o, v, n, c] of saved) { o.visible = v; o.frustumCulled = c; if (n !== null) o.geometry.instanceCount = n; }
        for (const o of others) o.visible = true;
        }
      s.warm = true;
    })());
  }
  // The first draw of a program that writes several targets (everything in the half-res FX pass) waits
  // on a second compile on the GPU's main thread, however it was linked. These spells' take over 80 ms
  // each (an RTX 4090's PC, D3D11), so they go before ready, slowest first, for as long as there's time.
  const SLOW_FIRST_DRAW = ['water', 'thunderstorm', 'wind', 'supernova', 'light', 'dust-devils', 'acid', 'solar-flare', 'black-flame', 'starfall', 'arcane', 'blizzard', 'aurora-veil', 'tsunami'];
  async function warmSlow(until) {
    await Promise.all(SLOW_FIRST_DRAW.map(async (id) => {
      const s = fx.spells[id];
      if (!s) return;
      await linkSpell(s);
      if (performance.now() < until) await warmSpell(s);
    }));
  }
  function linkEverySpell() { for (const s of SPELLS) linkSpell(s); }
  const warmQueue = [];
  let warmRunning = false;
  // Everything that isn't warm yet, one spell at a time, with frames between. Selecting a spell
  // moves it to the front (warmFirst).
  async function warmRest({ gap = 40 } = {}) {
    if (warmRunning) return;
    warmRunning = true;
    warmQueue.push(...SPELLS.filter((s) => !s.warm && !warmQueue.includes(s)));
    while (warmQueue.length) {
      const s = warmQueue.shift();
      if (!s.warm) await warmSpell(s);
      await new Promise((r) => setTimeout(r, gap));
    }
    warmRunning = false;
  }
  function warmFirst(s) {
    const i = warmQueue.indexOf(s);
    if (i > 0) { warmQueue.splice(i, 1); warmQueue.unshift(s); }
  }

  // --- what a game calls ------------------------------------------------------------------
  let targetsHidden = false;
  const ladder = { n: -240, missed: 0, clean: 0, level: 0 };
  const LADDER = [() => { Q.auto.emission = 0.6; }, () => { Q.auto.steps = 0.6; }, () => { auto.fx = 0.66; makeTargets(); }];
  function setResolution(r) {
    Q.resolution = Math.round(r * 20) / 20;
    const s = renderer.getSize(size);
    api.setSize(s.x, s.y);
    ladder.n = -60;
  }
  const _ndc = new THREE.Vector3(), _dir = new THREE.Vector3();
  function entryOf(name) {
    return typeof name === 'object' ? name : ENTRIES.find((e) => e.name === name || e.key === name || e.spell.id === name) ?? null;
  }
  const api = {
    fx, scenes, sky, arena, rig, post, casts, ground, particles, lights, forces, impacts, env, view, renderer, camera, makeTargets,
    SPELLS, ENTRIES, ELEMENTS, ARENA, Q, entryOf, warmSpell, warmRest, warmFirst, warmCore, warmSlow, linkEverySpell, renderFrame,
    get elapsed() { return elapsed; },
    get warmLeft() { return SPELLS.filter((s) => !s.warm).length; },
    /** The render size in CSS pixels, and how many drawn pixels a CSS pixel gets. */
    setSize(width, height, pixelRatio = Math.min(devicePixelRatio, 1.5) * Q.resolution) {
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      makeTargets();
    },
    setSky(preset) {
      sky.setPreset(preset);
      sunDirty = true;
      post._snap = true;
    },
    /** Casts `name` at a world point: spell or form name ("Fireball"), `target` a dummy's index or -1. */
    cast(name, point, { target = -1, held = false, from, seed: castSeed } = {}) {
      const e = entryOf(name);
      if (!e) throw new Error(`No spell called ${name}`);
      const opts = { form: e.form, target, held, seed: castSeed, ...(from ? { from } : {}) };
      if (e.spell.warm) return casts.cast(e.spell, point, opts);
      // not compiled yet: cast the moment it is, rather than stall a frame compiling
      const p = point.clone();
      warmFirst(e.spell);
      warmSpell(e.spell).then(() => casts.cast(e.spell, p, opts));
      return null;
    },
    /** One spell's setting, live (lib/ultra-elements/src/spells/*.js and spells.json list them all). */
    setParam(spell, key, value) {
      const s = fx.spells[spell];
      if (!s) return;
      s.params[key] = value;
      s.inst.onParam?.(key, value);
    },
    /** Where a pointer at normalized device coordinates (-1 to 1) lands in the arena, or null. */
    pick(x, y) {
      _dir.copy(_ndc.set(x, y, 0.5)).unproject(camera).sub(camera.position).normalize();
      const t = arenaRaycast(camera.position, _dir, 120);
      if (t < 0) return null;
      const p = camera.position.clone().addScaledVector(_dir, t);
      // a dummy hit targets its torso
      const di = targetsHidden ? -1 : ARENA.dummies.findIndex((d) => Math.hypot(p.x - d.x, p.z - d.z) < ARENA.dummyRadius + 0.15 && p.y < ARENA.dummyHeight + 0.1);
      if (di >= 0) return { point: ARENA.dummies[di].clone().setY(Math.min(Math.max(p.y, 0.6), 1.6)), index: di };
      return { point: p, index: -1 };
    },
    /**
     * Hides the training ground for your own world: its floor, walls, columns and dummies, with its sun still lighting
     * what you add to arena.group. Spells still land on a flat floor at y = 0 and stop at a low wall 18 m from the
     * middle (arenaSDF, built into the particles), and only the training ground's floor shows scorch and frost.
     */
    hideArena() {
      arena.group.traverse((o) => { if (o.isMesh) o.visible = false; });
      arena.refractGroup.visible = false;
      for (const c of [...occluders.list]) if (c.kind !== 2 && c.kind !== 3) c.release();
      targetsHidden = true;
      sunDirty = true;
    },
    /** The sun's shadow map is only drawn when asked: after you add or move things in arena.group. */
    updateShadow() {
      sunDirty = true;
    },
    /** Takes away every cast and what they left: particles, spikes, marks on the floor, what the dummies took. */
    clear() {
      casts.clear();
      ground.clear();
      impacts.clear();
      particles.clearState();
      for (const h of spikes.spikes) if (h.active) h.release();
      for (const d of fx.dummies) for (const k in d.status) d.status[k] = 0;
    },
    /**
     * Upstream's phone profile, for every device: when more than 4% of frames miss 60 fps over two
     * seconds, fewer particles, fewer volume steps, a smaller FX buffer, then a lower resolution (to
     * half). Uniforms and sizes only, so nothing recompiles. Call it with each frame's ms.
     */
    autoQuality(ms) {
      if (ms > 250 || ++ladder.n <= 0) return;
      if (ms > 20) ladder.missed++;
      if (ladder.n < 120) return;
      const miss = ladder.missed / ladder.n;
      ladder.n = ladder.missed = 0;
      if (miss > 0.04) {
        ladder.clean = 0;
        if (ladder.level < LADDER.length) LADDER[ladder.level++]();
        else if (Q.resolution > 0.5) setResolution(Q.resolution - 0.05);
      } else if (miss <= 0.01 && ++ladder.clean >= 3) {
        ladder.clean = 0;
        if (Q.resolution < TIERS[Q.tier].resolution) setResolution(Q.resolution + 0.05);
      }
    },
    /** One frame: the spells, the world and the post, to the canvas. */
    render(dt) {
      rig.apply(camera, dt);
      renderFrame(dt);
      rig.restore(camera);
    },
  };
  onProgress?.(0.45);
  return api;
}

// Adds a spell module to the list the world builds from, in its element's place. Before createElements.
function addSpell(s) {
  s.element ??= s.id;
  if (SPELLS.includes(s)) return;
  const rank = (el) => ELEMENTS.findIndex((e) => e.id === el);
  let at = SPELLS.findIndex((o) => rank(o.element) > rank(s.element));
  if (at < 0) at = SPELLS.length;
  SPELLS.splice(at, 0, s);
  for (const form of s.forms?.length ? s.forms : [s.name]) {
    ENTRIES.push({ spell: s, form: s.forms?.length ? form : '', name: s.forms?.length ? form : s.name, element: s.element, key: `${s.id}:${form}` });
  }
}
