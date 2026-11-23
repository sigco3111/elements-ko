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
import { groupKo, spellKo } from './names-ko.js';

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
	['lightning', groupKo('lightning')],
	['fire', groupKo('fire')],
	['water', groupKo('water')],
	['ice', groupKo('ice')],
	['earth', groupKo('earth')],
	['wind', groupKo('wind')],
	['void', groupKo('void')],
	['light', groupKo('light')],
	['acid', groupKo('acid')],
	['arcane', groupKo('arcane')],
	['hybrid', groupKo('hybrid')],
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
				label: '주문',
				hint: '클릭으로 시전할 주문: 땅이나 표적 아무 곳이나 클릭하세요.',
				type: 'choice',
				options: entries.map(({ name, s }) => ({
					value: slug(name),
					label: spellKo(name),
					group: groupOf[s.element],
					...(images ? { image: `thumbs/spells/${slug(name)}.webp` } : {}),
				})),
				default: DEFAULT,
				essential: true,
			},
			{ id: 'size', label: '크기', hint: '시전 하나의 크기.', type: 'number', min: 0.4, max: 2, step: 0.05, default: 1, unit: '×', essential: true },
			{ id: 'intensity', label: '강도', hint: '시전 하나의 세기와 밝기.', type: 'number', ...times, essential: true },
			{ id: 'speed', label: '속도', hint: '전체 재생 속도: 1 미만이면 슬로모션.', type: 'number', min: 0.1, max: 2, step: 0.05, default: 1, unit: '×', essential: true },
			{
				id: 'sky',
				label: '하늘',
				hint: '훈련장 위의 시간대. 다른 사람에게는 항상 해 질 녘으로 보입니다.',
				type: 'choice',
				options: [
					{ value: 'dusk', label: '해 질 녘' },
					{ value: 'noon', label: '한낮' },
					{ value: 'night', label: '밤' },
				],
				default: 'dusk',
			},
			{
				id: 'look',
				label: '모양',
				hint: '주문의 세 가지 지정 모양(spells.json의 프리셋) 중 하나, 또는 고유 모양.',
				type: 'choice',
				options: [
					{ value: 'own', label: '고유 모양' },
					{ value: 'first', label: '첫 번째 모양' },
					{ value: 'second', label: '두 번째 모양' },
					{ value: 'third', label: '세 번째 모양' },
				],
				default: 'own',
			},
			{ id: 'auto', label: '계속 시전', hint: '표적에 선택한 주문을 계속 시전합니다.', type: 'toggle', default: false },
			{ id: 'auto.all', label: '전부 시전', hint: "'계속 시전'이 켜져 있는 동안 모든 주문을 차례로 시전합니다.", type: 'toggle', default: false },
			{ id: 'shake', label: '카메라 흔들림', hint: '큰 충격이 카메라를 흔드는 정도.', type: 'number', min: 0, max: 2, step: 0.05, default: 1, unit: '×' },
			{ id: 'reduced', label: '섬광 줄이기', hint: '섬광을 초당 최대 세 번으로 줄이고, 흔들림·히트스톱·시야각 효과를 줄입니다.', type: 'toggle', default: false },
			{ id: 'exposure', label: '노출', hint: '전체 화면을 밝게 또는 어둡게 합니다.', type: 'number', min: 0.25, max: 4, step: 0.01, default: 1, unit: '×' },
			{ id: 'bloom', label: '블룸', hint: '밝은 것이 화면으로 번져 나가는 정도.', type: 'number', min: 0, max: 0.6, step: 0.005, default: 0.12 },
			{ id: 'contrast', label: '대비', hint: '최종 화면의 대비.', type: 'number', min: 0.7, max: 1.6, step: 0.01, default: 1.12 },
			{ id: 'saturation', label: '채도', hint: '최종 화면의 색 강도.', type: 'number', min: 0, max: 2, step: 0.01, default: 1.3 },
			{ id: 'vignette', label: '비네트', hint: '화면 모서리가 어두워지는 정도.', type: 'number', min: 0, max: 1, step: 0.01, default: 0.12 },
			{ id: 'motion-blur', label: '모션 블러', hint: '카메라가 빠르게 움직일 때 화면이 흐려지는 정도.', type: 'number', min: 0, max: 1, step: 0.01, default: 0.5 },
			{ id: 'wind', label: '바람', hint: '연기·먼지·불똥을 미는 일정한 바람.', type: 'number', min: 0, max: 12, step: 0.1, default: 0, unit: 'm/s' },
			{ id: 'wind.direction', label: '바람 방향', hint: '바람이 불어가는 쪽.', type: 'number', min: -180, max: 180, step: 1, default: 20, unit: '°' },
			{ id: 'fov', label: '시야각', hint: '카메라의 수직 시야각.', type: 'number', min: 25, max: 90, step: 1, default: 50, unit: '°' },
			{ id: 'particles', label: '입자 양', hint: '주문마다 방출하는 입자 수: 낮을수록 부하가 적습니다.', type: 'number', min: 0.1, max: 2, step: 0.01, default: 1, unit: '×' },
			{ id: 'color.on', label: '색 직접 지정', hint: '주문의 기본 색들을 아래 두 색으로 바꿉니다.', type: 'toggle', default: false },
			{ id: 'color.main', label: '기본 색', hint: '색 직접 지정이 켜져 있을 때의 주문 기본 색.', type: 'color', default: '#33d6ff' },
			{ id: 'color.second', label: '보조 색', hint: '색 직접 지정이 켜져 있을 때의 주문 보조 색.', type: 'color', default: '#ff4fd8' },
			...SHARED.map(([id, , label, hint]) => ({ id, label, hint: `${hint} 주문 고유 값에 곱해집니다.`, type: 'number', ...times })),
		],
		presets: [],
		// Clicking in the frame casts, so Clear is the only trigger.
		triggers: [{ id: 'clear', label: '지우기', hint: '모든 시전과 바닥의 그을음·서리, 표적이 입은 것을 치웁니다.' }],
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
