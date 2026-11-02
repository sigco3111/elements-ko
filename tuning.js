// The demo's plain controls in terms of each spell's own settings. Upstream's 29 spell modules have
// 411 settings between them and no two sets alike, so Size and Intensity name, per module, the ones
// that mean that. Every setting multiplied here keeps to its own range (spells.json).

// Which settings make the spell bigger.
export const SIZE = {
	'plague-swarm': ['size', 'radius'],
	acid: ['size'],
	starfall: ['size', 'radius'],
	arcane: ['shield', 'spread'],
	fissure: ['width', 'reach', 'depth'],
	'lava-geyser': ['height', 'width'],
	earth: ['size', 'height', 'meteorSize'],
	'ember-swarm': ['size', 'radius'],
	phoenix: ['size'],
	fire: ['size'],
	'black-flame': ['size', 'height'],
	'fire-tornado': ['size', 'height'],
	'frozen-lightning': ['thickness', 'spurs'],
	'absolute-zero': ['radius'],
	blizzard: ['radius'],
	ice: ['size', 'wallHeight', 'wallWidth'],
	'aurora-veil': ['height', 'length'],
	'solar-flare': ['size'],
	supernova: ['size'],
	light: ['width', 'sigil', 'lance'],
	'ball-lightning': ['size', 'reach'],
	thunderstorm: ['radius'],
	lightning: ['crawl', 'cloud'],
	portal: ['size', 'reach'],
	void: ['size'],
	tsunami: ['height', 'width'],
	water: ['size', 'height'],
	'dust-devils': ['size', 'spread'],
	wind: ['size', 'slashSize'],
};

// Which settings make the spell stronger. Spells without an `intensity` of their own use what they have most of.
export const POWER = {
	'plague-swarm': ['glow', 'corrosion'],
	acid: ['glow', 'drips', 'bubbles'],
	starfall: ['intensity', 'sparkles'],
	arcane: ['intensity', 'sparkles'],
	fissure: ['intensity', 'debris'],
	'lava-geyser': ['intensity', 'surge', 'bombs'],
	earth: ['debris', 'dust', 'crack', 'shake'],
	'ember-swarm': ['glow', 'exposure'],
	phoenix: ['intensity', 'embers'],
	fire: ['intensity', 'embers'],
	'black-flame': ['intensity', 'embers'],
	'fire-tornado': ['intensity', 'flames'],
	'frozen-lightning': ['intensity', 'glints'],
	'absolute-zero': ['frost', 'glints', 'shards'],
	blizzard: ['strength', 'snow', 'streaks'],
	ice: ['glints', 'shards', 'mist', 'nova'],
	'aurora-veil': ['intensity', 'light'],
	'solar-flare': ['intensity', 'sparks'],
	supernova: ['intensity', 'sparks'],
	light: ['intensity', 'glow'],
	'ball-lightning': ['intensity', 'sparks'],
	thunderstorm: ['intensity', 'strikes'],
	lightning: ['intensity', 'sparks'],
	portal: ['stream', 'sparks', 'swirl'],
	void: ['gravity', 'disk', 'tendrils'],
	tsunami: ['foam', 'spray', 'mist'],
	water: ['droplets', 'splash', 'mist'],
	'dust-devils': ['strength', 'dust', 'streaks'],
	wind: ['strength', 'dust', 'streaks'],
};

// Settings many spells share, as agent controls: a multiplier of the spell's own value, for any
// spell that has the setting. [control id, setting, label, hint]
export const SHARED = [
	['tune.height', 'height', 'Height', 'How tall, for spells that rise.'],
	['tune.duration', 'duration', 'Duration', 'How long it lasts, for spells that last.'],
	['tune.hold', 'hold', 'Hold', 'How long it stays before it ends, for spells that hold.'],
	['tune.flight', 'speed', 'Flight speed', 'How fast it travels, for spells that fly.'],
	['tune.haze', 'haze', 'Heat haze', 'How much it bends the air behind it.'],
	['tune.smoke', 'smoke', 'Smoke', 'How much smoke it gives off.'],
	['tune.dust', 'dust', 'Dust', 'How much dust it raises.'],
	['tune.mist', 'mist', 'Mist', 'How much mist it gives off.'],
	['tune.sparks', 'sparks', 'Sparks', 'How many sparks it throws.'],
	['tune.embers', 'embers', 'Embers', 'How many embers it throws.'],
	['tune.debris', 'debris', 'Debris', 'How much rock and rubble it throws.'],
	['tune.scorch', 'scorch', 'Scorch', 'How much it burns the floor.'],
	['tune.frost', 'frost', 'Frost', 'How far frost spreads on the floor.'],
	['tune.glints', 'glints', 'Glints', 'How many ice glints catch the light.'],
];

// The settings that are the spell's main colour and its second one.
export const COLOURS = {
	'plague-swarm': ['color', 'color2'],
	acid: ['color', 'fogColor'],
	starfall: ['color', 'glow'],
	arcane: ['color', 'glow'],
	fissure: ['tint'],
	'lava-geyser': ['tint'],
	earth: ['rockColor', 'dustColor'],
	'ember-swarm': ['arcaneColor', 'ash'],
	phoenix: ['tint'],
	fire: ['tint'],
	'black-flame': ['rim', 'core'],
	'fire-tornado': ['tint'],
	'frozen-lightning': ['glow', 'tint'],
	'absolute-zero': ['tint', 'glow'],
	blizzard: ['glow', 'air'],
	ice: ['tint', 'glow'],
	'aurora-veil': ['color', 'top'],
	'solar-flare': ['color', 'core'],
	supernova: ['star', 'shock'],
	light: ['color', 'core'],
	'ball-lightning': ['plasma', 'glow'],
	thunderstorm: ['glow', 'core'],
	lightning: ['glow', 'core'],
	portal: ['rim', 'core'],
	void: ['edge', 'tint'],
	tsunami: ['tint', 'foamColor'],
	water: ['tint'],
	'dust-devils': ['sand', 'air'],
	wind: ['air', 'dustColor'],
};

export const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// What a spell's settings are, given its look and the controls: `look` is its preset's values or null,
// `v` the controls' current values. Returns every setting's value, clamped to its range.
export function settingsFor(spell, look, v) {
	const out = { ...spell.defaults, ...look };
	const size = SIZE[spell.id] ?? [];
	const power = POWER[spell.id] ?? [];
	for (const k of Object.keys(out)) {
		if (typeof out[k] !== 'number') continue;
		let m = 1;
		if (size.includes(k)) m *= v.size;
		if (power.includes(k)) m *= v.intensity;
		for (const [id, key] of SHARED) if (key === k) m *= v[id];
		if (m === 1) continue;
		const r = spell.ranges?.[k];
		let value = out[k] * m;
		if (Array.isArray(r) && typeof r[0] === 'number') value = Math.min(r[1], Math.max(r[0], value));
		out[k] = value;
	}
	if (v['color.on']) {
		const [main, second] = COLOURS[spell.id] ?? [];
		if (main) out[main] = v['color.main'];
		if (second) out[second] = v['color.second'];
	}
	return out;
}
