// Writes recipe.json (the block demo's recipe: mode browser + block) and spells.json (every spell with
// its settings, ranges and presets, for agents and for lib/ultra-elements' spell files): `node make-recipe.mjs`.
// demo.js reads its controls from recipe.json. The spells are read from their own modules, so they stay in
// step with lib/ultra-elements. A recipe holds at most 64 controls and the spells have 411 settings, so
// spells.json has them all and the recipe's agent controls are the ones many spells share.
// Every option has its picture, thumbs/spells/<id>.webp, from make-thumbs.mjs. `--no-images` leaves them out.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { COLOURS, POWER, SHARED, SIZE, slug } from './tuning.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const images = !process.argv.includes('--no-images') && fs.existsSync(path.join(here, 'thumbs/spells'));

// The modules read location and matchMedia when they load (engine/quality.js).
globalThis.location = { search: '' };
globalThis.matchMedia = () => ({ matches: false });
const dir = path.join(here, 'lib/ultra-elements/src/spells');
const skip = new Set(['index.js', 'cast.js', 'combos.js', '_template.js']);
const files = [];
for (const n of fs.readdirSync(dir)) {
	const f = path.join(dir, n);
	if (fs.statSync(f).isDirectory()) files.push(...fs.readdirSync(f).filter((m) => !m.includes('.glsl.')).map((m) => path.join(f, m)));
	else if (!skip.has(n)) files.push(f);
}
const ELEMENTS = [
	['lightning', 'Lightning'],
	['fire', 'Fire'],
	['water', 'Water'],
	['ice', 'Ice'],
	['earth', 'Earth'],
	['wind', 'Wind'],
	['void', 'Void'],
	['light', 'Light'],
	['acid', 'Acid'],
	['arcane', 'Arcane'],
	['hybrid', 'Two at once'],
];
const rank = Object.fromEntries(ELEMENTS.map(([id], i) => [id, i]));
const groupOf = Object.fromEntries(ELEMENTS);
const spells = [];
for (const f of files) {
	const s = (await import(pathToFileURL(f).href)).default;
	if (!s?.create) continue;
	s.element ??= s.id;
	spells.push({ ...s, file: path.relative(here, f).split(path.sep).join('/') });
}
spells.sort((a, b) => rank[a.element] - rank[b.element] || (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
const entries = spells.flatMap((s) => (s.forms?.length ? s.forms : [s.name]).map((name) => ({ name, s })));
if (entries.length !== 39) throw new Error(`expected 39 spells, found ${entries.length}`);
for (const s of spells) {
	for (const [what, table] of [['SIZE', SIZE], ['POWER', POWER], ['COLOURS', COLOURS]]) {
		for (const k of table[s.id] ?? []) if (!(k in s.params)) throw new Error(`${what}: ${s.id} has no setting ${k}`);
	}
	if (!SIZE[s.id] || !POWER[s.id] || !COLOURS[s.id]) throw new Error(`tuning.js is missing ${s.id}`);
}

const DEFAULT = 'starfall';
const times = { min: 0.25, max: 2.5, step: 0.05, default: 1, unit: '×' };
const recipe = {
	mode: 'browser',
	block: {
		controls: [
			{
				id: 'spell',
				label: 'Spell',
				hint: 'Which spell a click casts: click anywhere on the ground or at a target.',
				type: 'choice',
				options: entries.map(({ name, s }) => ({
					value: slug(name),
					label: name,
					group: groupOf[s.element],
					...(images ? { image: `thumbs/spells/${slug(name)}.webp` } : {}),
				})),
				default: DEFAULT,
				essential: true,
			},
			{ id: 'size', label: 'Size', hint: 'How big each cast is.', type: 'number', min: 0.4, max: 2, step: 0.05, default: 1, unit: '×', essential: true },
			{ id: 'intensity', label: 'Intensity', hint: 'How strong and bright each cast is.', type: 'number', ...times, essential: true },
			{ id: 'speed', label: 'Speed', hint: 'How fast everything plays: below 1 is slow motion.', type: 'number', min: 0.1, max: 2, step: 0.05, default: 1, unit: '×', essential: true },
			{
				id: 'sky',
				label: 'Sky',
				hint: 'The time of day over the training ground. People always see dusk.',
				type: 'choice',
				options: ['dusk', 'noon', 'night'].map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) })),
				default: 'dusk',
			},
			{
				id: 'look',
				label: 'Look',
				hint: "One of the spell's three named looks (presets in spells.json), or its own.",
				type: 'choice',
				options: [
					{ value: 'own', label: 'Its own' },
					{ value: 'first', label: 'First look' },
					{ value: 'second', label: 'Second look' },
					{ value: 'third', label: 'Third look' },
				],
				default: 'own',
			},
			{ id: 'auto', label: 'Keep casting', hint: 'Keeps casting the chosen spell at the targets.', type: 'toggle', default: false },
			{ id: 'auto.all', label: 'Cast them all', hint: 'While keep casting is on, goes through every spell in turn.', type: 'toggle', default: false },
			{ id: 'shake', label: 'Camera shake', hint: 'How much big impacts shake the camera.', type: 'number', min: 0, max: 2, step: 0.05, default: 1, unit: '×' },
			{ id: 'reduced', label: 'Reduce flashes', hint: 'Dims flashes to at most three a second, and cuts shake, hitstop and FOV punch.', type: 'toggle', default: false },
			{ id: 'exposure', label: 'Exposure', hint: 'Brightens or darkens the whole picture.', type: 'number', min: 0.25, max: 4, step: 0.01, default: 1, unit: '×' },
			{ id: 'bloom', label: 'Bloom', hint: 'How much bright things glow out into the picture.', type: 'number', min: 0, max: 0.6, step: 0.005, default: 0.12 },
			{ id: 'contrast', label: 'Contrast', hint: "The final picture's contrast.", type: 'number', min: 0.7, max: 1.6, step: 0.01, default: 1.12 },
			{ id: 'saturation', label: 'Saturation', hint: "The final picture's colour strength.", type: 'number', min: 0, max: 2, step: 0.01, default: 1.3 },
			{ id: 'vignette', label: 'Vignette', hint: 'How much the corners of the picture darken.', type: 'number', min: 0, max: 1, step: 0.01, default: 0.12 },
			{ id: 'motion-blur', label: 'Motion blur', hint: 'How much the picture blurs with fast camera moves.', type: 'number', min: 0, max: 1, step: 0.01, default: 0.5 },
			{ id: 'wind', label: 'Wind', hint: 'A steady wind that pushes smoke, dust and sparks.', type: 'number', min: 0, max: 12, step: 0.1, default: 0, unit: 'm/s' },
			{ id: 'wind.direction', label: 'Wind direction', hint: 'Where the wind blows towards.', type: 'number', min: -180, max: 180, step: 1, default: 20, unit: '°' },
			{ id: 'fov', label: 'Field of view', hint: "The camera's vertical field of view.", type: 'number', min: 25, max: 90, step: 1, default: 50, unit: '°' },
			{ id: 'particles', label: 'Particle budget', hint: 'How many particles every spell emits: lower is cheaper.', type: 'number', min: 0.1, max: 2, step: 0.01, default: 1, unit: '×' },
			{ id: 'color.on', label: 'Own colours', hint: "Replaces the spell's main colours with the two below.", type: 'toggle', default: false },
			{ id: 'color.main', label: 'Main colour', hint: "The spell's main colour, while own colours is on.", type: 'color', default: '#33d6ff' },
			{ id: 'color.second', label: 'Second colour', hint: "The spell's second colour, while own colours is on.", type: 'color', default: '#ff4fd8' },
			...SHARED.map(([id, , label, hint]) => ({ id, label, hint: `${hint} Multiplies the spell's own value.`, type: 'number', ...times })),
		],
		presets: [],
		// Clicking in the frame casts, so Clear is the only trigger.
		triggers: [{ id: 'clear', label: 'Clear', hint: 'Takes away every cast, the scorch and frost on the floor and what the targets took.' }],
	},
	credits: [
		{ files: 'assets/', license: 'MIT', source: 'https://github.com/Humpalumps/ultra-elements', author: 'Humpalumps, Ultra Elements (and Ultra-Water, which it adapts)' },
		{ files: 'assets/', license: 'MIT', source: 'https://github.com/mrdoob/three.js', author: 'three.js authors' },
		{ files: 'thumbs/', license: 'MIT', author: 'Patch (stills of this demo)' },
	],
};
fs.writeFileSync(path.join(here, 'recipe.json'), `${JSON.stringify(recipe, null, '\t')}\n`);

const spellsJson = spells.map((s) => ({
	id: s.id,
	name: s.name,
	element: s.element,
	file: s.file,
	forms: s.forms?.length ? s.forms : [s.name],
	shape: s.shape ?? 'projectile',
	...(s.formShapes ? { formShapes: s.formShapes } : {}),
	timing: s.timing,
	size: SIZE[s.id],
	intensity: POWER[s.id],
	colours: COLOURS[s.id],
	settings: Object.fromEntries(Object.entries(s.params).map(([k, v]) => [k, { default: v, ...(s.ranges?.[k] ? { range: s.ranges[k] } : {}) }])),
	presets: s.presets ?? {},
}));
fs.writeFileSync(path.join(here, 'spells.json'), `${JSON.stringify(spellsJson, null, '\t')}\n`);
const c = recipe.block.controls;
console.log(`recipe.json: ${c.length} controls (${c.filter((x) => x.essential).length} essential), ${entries.length} spells in ${new Set(entries.map((e) => e.s.element)).size} groups; spells.json: ${spells.length} modules, ${spells.reduce((a, s) => a + Object.keys(s.params).length, 0)} settings`);
