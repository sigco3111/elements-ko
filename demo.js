// The block demo: Ultra Elements (Humpalumps, MIT) through elements.js, steered by Patch's block page
// through Patch's block demo helper (lib/patch-block.js, from patch.gg/patch-block.js). The controls are
// in recipe.json.
//
// In the frame: click to cast the chosen spell there, drag to look around, scroll to zoom. Until the
// first click it casts by itself and the view sways a little, so it's alive from its first frame.
//
// It says ready only when it's really usable: every spell warm, the GPU caught up and frames running on
// time. Nothing heavy runs after that. A longer load with a bar beats a view that opens and then freezes.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { patchBlock } from 'patch-block';
import { block as recipeBlock } from './recipe.json';
import { createElements } from './elements.js';
import { settingsFor, slug } from './tuning.js';
import { spellKo } from './names-ko.js';
import { mountPanel } from './panel.js';

// Only a safety for a GPU that never answers (ms): a slow PC waits behind the bar, however long it takes.
const GIVE_UP = 90000;
const times = { start: performance.now() };
const mark = (name) => (times[name] = Math.round(performance.now() - times.start));

const canvas = document.getElementById('viewport');
canvas.style.visibility = 'hidden';
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, depth: false, stencil: false, alpha: false, powerPreference: 'high-performance' });
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);

// Behind the caster's orb, so what it casts flies out across the frame, with the targets, the columns and the sunset beyond.
const VIEW = { position: [-2.6, 3.0, 14.2], target: [0.3, 1.2, -0.5] };
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.zoomSpeed = 1.2;
controls.minDistance = 3;
controls.maxDistance = 45;
controls.maxPolarAngle = Math.PI * 0.495;
controls.rotateSpeed = 0.6;
camera.position.fromArray(VIEW.position);
controls.target.fromArray(VIEW.target);
controls.update();

const hud = document.getElementById('armed');
const tip = document.getElementById('tip');
const v = {}; // every control's current value, kept in step from onSet
let elements = null;
let spellEntry = null;
let visible = true;

// --- what the controls do ---------------------------------------------------------------------
const LOOKS = { first: 0, second: 1, third: 2 };
const lookOf = (spell) => {
	if (!(v.look in LOOKS)) return null;
	return Object.values(spell.presets ?? {})[LOOKS[v.look]] ?? null;
};
// Applies Size, Intensity, the look and the rest to the chosen spell.
function tune(spell) {
	const values = settingsFor(spell, lookOf(spell), v);
	for (const [k, value] of Object.entries(values)) if (spell.params[k] !== value) elements.setParam(spell.id, k, value);
}
const hue = (element) => elements.ELEMENTS.find((e) => e.id === element)?.hue ?? '#fafafa';
function choose(value) {
	spellEntry = elements.ENTRIES.find((e) => slug(e.name) === value) ?? elements.ENTRIES[0];
	tune(spellEntry.spell);
	elements.arena.setFocus?.(new THREE.Color(spellEntry.spell.hue), 2.5);
	hud.querySelector('.name').textContent = spellKo(spellEntry.name);
	hud.style.setProperty('--accent', hue(spellEntry.element));
}
// Mostly the near target, so it fills the view.
const TURNS = [0, 0, 1, 0, 2];
let turn = 0;
function castAtDummy(entry = spellEntry) {
	const i = TURNS[turn++ % TURNS.length];
	elements.cast(entry, elements.ARENA.dummies[i].clone().setY(1.1), { target: i });
}
// How long a cast takes to play: charge, flight or beam, impact and most of what it leaves.
function lengthOf(entry) {
	const s = entry.spell, T = s.timing ?? {};
	const shape = s.formShapes?.[entry.form] ?? s.shape ?? 'projectile';
	const travel = shape === 'beam' ? T.sustain ?? 4 : shape === 'projectile' ? 1 : 0;
	return Math.min(8, Math.max(3.5, (T.charge ?? 0.5) + travel + (T.impact ?? 0.2) + 0.7 * (T.linger ?? 2)));
}
function preview() {
	elements.casts.clear();
	castAtDummy();
	next = lengthOf(spellEntry);
}
let previewAt = 0;
const hooks = {
	onSet(id, value) {
		v[id] = value;
		if (!elements) return;
		switch (id) {
			case 'spell':
				choose(value);
				return preview();
			case 'speed':
				elements.view.timeScale = value;
				return;
			case 'sky':
				return elements.setSky(value);
			case 'shake':
				elements.rig.amount = value;
				return;
			case 'reduced':
				elements.rig.reduced = value;
				elements.fx.reduced = value;
				return;
			case 'exposure':
				elements.view.exposure = value;
				return;
			case 'bloom':
				elements.post.params.bloomStrength = value;
				return;
			case 'contrast':
			case 'saturation':
			case 'vignette':
				elements.post.params[id] = value;
				return;
			case 'motion-blur':
				elements.post.params.motionBlur = value;
				return;
			case 'wind':
				elements.env.wind = value;
				return;
			case 'wind.direction':
				elements.env.windAngle = value;
				return;
			case 'fov':
				camera.fov = value;
				camera.updateProjectionMatrix();
				return;
			case 'particles':
				elements.Q.emission = value;
				return;
			case 'auto':
			case 'auto.all':
				next = 0;
				return;
			default:
				tune(spellEntry.spell);
				// see what changed: the next cast, soon, unless one is already playing
				previewAt = 0.35;
		}
	},
	onTrigger(id) {
		if (id === 'clear') {
			elements?.clear();
			next = lengthOf(spellEntry);
		}
	},
	onVisible(on) {
		visible = on;
	},
};
const block = patchBlock({ ...recipeBlock, ...hooks });
Object.assign(v, block.values);

// Patch 호스트 안(iframe)이 아니라 독립 배포판일 때만: 로딩 표시와 설정 패널을 스스로 그린다.
const embedded = window.parent !== window;
const loadingEl = document.getElementById('loading');
if (!embedded) mountPanel(recipeBlock);
else loadingEl.hidden = true;
function progress(value, label) {
	block.progress(value, label);
	if (embedded || !loadingEl) return;
	loadingEl.querySelector('.lbl').textContent = label;
	loadingEl.querySelector('.bar i').style.width = `${Math.round(value * 100)}%`;
}

// --- casting: a click casts, a drag looks -------------------------------------------------------
let touched = false; // until the first click the demo casts by itself
let next = 0.1; // seconds until the next cast by itself
let down = null;
let swaying = true; // until the first touch of the view
canvas.addEventListener('pointerdown', (e) => {
	swaying = false;
	down = { x: e.clientX, y: e.clientY };
});
canvas.addEventListener('wheel', () => { swaying = false; }, { passive: true });
canvas.addEventListener('pointerup', (e) => {
	if (!down || !spellEntry) return;
	const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
	down = null;
	if (moved > 6) return;
	const r = canvas.getBoundingClientRect();
	const hit = elements.pick(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
	if (!hit) return;
	touched = true;
	elements.cast(spellEntry, hit.point, { target: hit.index });
	hud.classList.remove('cast');
	void hud.offsetWidth;
	hud.classList.add('cast');
});

const UP = new THREE.Vector3(0, 1, 0);
let swayTime = 0, swayed = 0;
function sway(dt) {
	if (!swaying) return;
	swayTime += dt;
	const to = Math.sin(swayTime * 0.35) * 0.05;
	camera.position.sub(controls.target).applyAxisAngle(UP, to - swayed).add(controls.target);
	swayed = to;
}

function byItself(dt) {
	if (previewAt > 0 && (previewAt -= dt) <= 0 && !elements.casts.count()) castAtDummy();
	const on = !touched || v.auto;
	if (!on) return;
	next -= dt;
	if (next > 0) return;
	if (v.auto && v['auto.all']) {
		const all = elements.ENTRIES;
		spellEntry = all[(all.indexOf(spellEntry) + 1) % all.length];
		v.spell = slug(spellEntry.name);
		choose(v.spell);
		block.state({ spell: v.spell });
	}
	castAtDummy();
	next = lengthOf(spellEntry);
}

// --- size, and the quality a slow GPU can hold ----------------------------------------------------
function resize() {
	const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
	if (w && h) elements.setSize(w, h);
}
addEventListener('resize', () => elements && resize());

// --- loop -----------------------------------------------------------------------------------------
let last = 0;
function loop(now) {
	requestAnimationFrame(loop);
	const ms = now - last;
	last = now;
	if (!visible) return;
	elements.autoQuality(ms);
	const dt = Math.min(ms / 1000, 0.1);
	sway(dt);
	controls.update();
	byItself(dt * v.speed);
	elements.render(dt);
}

// --- start ----------------------------------------------------------------------------------------
async function start() {
	elements = await createElements({ renderer, camera, sky: v.sky, onProgress: (p) => progress(p * 0.15, '주문을 만드는 중') });
	mark('built');
	resize();
	elements.rig.amount = v.shake;
	elements.view.timeScale = v.speed;
	choose(v.spell);
	await elements.warmAll({ until: times.start + GIVE_UP, onProgress: (p) => progress(0.15 + p * 0.8, '주문을 준비하는 중') });
	mark('warmed');
	await settle();
	mark('settled');
	progress(1, '주문을 준비하는 중');
	loadingEl.hidden = true;
	canvas.style.visibility = '';
	hud.hidden = false;
	tip.hidden = false;
	document.getElementById('credit').hidden = false;
	last = performance.now();
	requestAnimationFrame(loop);
	block.ready();
	mark('ready');
	mark('allWarm');
}
// Real frames with the canvas still hidden, until they come on time: the view opens on what it'll keep doing, with
// the exposure settled and what the warm-up drew gone. A hidden tab has no frames, so this stops waiting after 3 s.
function settle() {
	elements.clear();
	elements.post._snap = true;
	return new Promise((done) => {
		const timer = setTimeout(done, 3000);
		let calm = 0, was = performance.now();
		const step = (now) => {
			calm = now - was < 40 ? calm + 1 : 0;
			was = now;
			elements.render(1 / 60);
			if (calm >= 6) {
				clearTimeout(timer);
				elements.gpuFence().then(done);
			} else requestAnimationFrame(step);
		};
		requestAnimationFrame(step);
	});
}
start();

window.__block = { get elements() { return elements; }, values: v, camera, controls, renderer, block, times, set: (id, value) => hooks.onSet(id, value), hooks, stop() { touched = true; }, VIEW };
