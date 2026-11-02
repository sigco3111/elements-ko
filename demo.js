// The block demo: Ultra Elements (Humpalumps, MIT) through elements.js, steered by Patch's block page
// through Patch's block demo helper (lib/patch-block.js, from patch.gg/patch-block.js). The controls are
// in recipe.json.
//
// In the frame: click to cast the chosen spell there, drag to look around, scroll to zoom. Until the
// first click it casts by itself, so the page is never empty.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { patchBlock } from 'patch-block';
import { block as recipeBlock } from './recipe.json';
import { createElements } from './elements.js';
import { settingsFor, slug } from './tuning.js';

// Ready within this long of starting, however much of the warm-up is done by then (ms).
const READY_BY = 7000;
const times = { start: performance.now() };
const mark = (name) => (times[name] = Math.round(performance.now() - times.start));

const canvas = document.getElementById('viewport');
canvas.style.visibility = 'hidden';
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, depth: false, stencil: false, alpha: false, powerPreference: 'high-performance' });
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);

// In front of the caster's orb, the targets ahead and the columns and the sunset behind them.
const VIEW = { position: [-1.6, 2.6, 10.8], target: [0.3, 1.3, -0.5] };
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
	elements.warmFirst(spellEntry.spell);
	elements.arena.setFocus?.(new THREE.Color(spellEntry.spell.hue), 2.5);
	hud.querySelector('.name').textContent = spellEntry.name;
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

// --- casting: a click casts, a drag looks -------------------------------------------------------
let touched = false; // until the first click the demo casts by itself
let next = 0.9; // seconds until the next cast by itself
let down = null;
canvas.addEventListener('pointerdown', (e) => {
	down = { x: e.clientX, y: e.clientY };
});
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
	controls.update();
	byItself(dt * v.speed);
	elements.render(dt);
}

// --- start ----------------------------------------------------------------------------------------
async function start() {
	elements = await createElements({ renderer, camera, sky: v.sky, onProgress: (p) => block.progress(p * 0.6) });
	mark('built');
	resize();
	elements.rig.amount = v.shake;
	elements.view.timeScale = v.speed;
	choose(v.spell);
	elements.linkEverySpell();
	mark('kicked');
	// the slowest first draws go on while the core links, when the GPU's main thread is free
	const slow = elements.warmSlow(times.start + READY_BY);
	await elements.warmCore();
	mark('core');
	block.progress(0.9);
	await elements.warmSpell(spellEntry.spell);
	mark('spell');
	await slow;
	mark('slow');
	// the settled view: the exposure and the sky have what they'd have after a while, and what the warm-up drew is gone
	elements.clear();
	elements.post._snap = true;
	for (let i = 0; i < 4; i++) elements.render(1 / 60);
	mark('settled');
	block.progress(1);
	canvas.style.visibility = '';
	hud.hidden = false;
	tip.hidden = false;
	last = performance.now();
	requestAnimationFrame(loop);
	block.ready();
	mark('ready');
	// the rest, in slices between frames; a spell chosen meanwhile goes first
	if (!location.search.includes('nowarm')) setTimeout(() => elements.warmRest().then(() => mark('allWarm')), 300);
}
start();

window.__block = { get elements() { return elements; }, values: v, camera, controls, renderer, block, times, set: (id, value) => hooks.onSet(id, value), hooks, stop() { touched = true; }, VIEW };
