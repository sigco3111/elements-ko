// Captures the pictures of the Spell and Sky choices (thumbs/spells and thumbs/sky, <id>.webp, 112 x 112) and the cover
// (cover.jpg, 1280 x 720) from the built demo in muted headless Chromium: `npm run build`, then `node make-thumbs.mjs`,
// then `npm run build` again to copy them into dist/. `node make-thumbs.mjs fireball meteor` retakes only those.
// Needs playwright-core and a Chromium: PLAYWRIGHT_CORE (default patch-lab's) and CHROME.
import { createServer } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(here, 'dist');
const pw = process.env.PLAYWRIGHT_CORE ?? 'C:/Users/drini/src/patch-lab/harness/node_modules/playwright-core/index.mjs';
const chrome = process.env.CHROME ?? path.join(process.env.LOCALAPPDATA ?? '', 'ms-playwright/chromium-1243/chrome-win64/chrome.exe');
const { chromium } = await import(pathToFileURL(pw).href);

// Close on the near target, wide for what fills the ground, low for what rises.
const C = [-4.5, 1.9, 7.5, 0, 1.35, 2], W = [-1.6, 2.6, 10.8, 0.3, 1.3, -0.5], H = [-5.5, 1.0, 9.5, 0.2, 3.0, 1.2], S = [4.2, 1.7, 6.2, -0.2, 1.4, 2];
// id: [camera, seconds after the cast, sky]: the moment that says what the spell is, on the sky it reads best against.
const SPELLS = {
	thunderstrike: [C, 1.05, 'night'],
	'chain-arc': [C, 0.7, 'night'],
	'ball-lightning': [C, 3.0, 'night'],
	thunderstorm: [W, 3.9, 'dusk'],
	fireball: [C, 1.35, 'dusk'],
	inferno: [C, 1.5, 'night'],
	phoenix: [C, 2.35, 'night'],
	'ember-swarm': [C, 4.2, 'night'],
	'tidal-lance': [S, 1.5, 'dusk'],
	geyser: [C, 1.8, 'dusk'],
	tsunami: [W, 2.6, 'dusk'],
	'glacial-spike': [C, 1.35, 'night'],
	'ice-wall': [W, 1.4, 'night'],
	'absolute-zero': [C, 2.8, 'night'],
	blizzard: [C, 3.0, 'dusk'],
	upheaval: [C, 2.0, 'dusk'],
	meteor: [C, 2.4, 'dusk'],
	fissure: [C, 1.2, 'night'],
	'lava-geyser': [H, 3.0, 'night'],
	cyclone: [W, 2.2, 'dusk'],
	'wind-slash': [C, 1.25, 'dusk'],
	'dust-devils': [W, 2.8, 'dusk'],
	singularity: [W, 2.2, 'dusk'],
	rift: [C, 2.0, 'night'],
	portal: [W, 1.2, 'night'],
	judgment: [H, 2.0, 'dusk'],
	'radiant-lance': [C, 2.0, 'night'],
	'solar-flare': [C, 2.8, 'night'],
	'aurora-veil': [H, 3.2, 'night'],
	supernova: [C, 2.6, 'night'],
	'toxic-bloom': [C, 2.4, 'night'],
	'corrosion-cloud': [C, 3.4, 'dusk'],
	'plague-swarm': [W, 4.2, 'night'],
	'arcane-barrage': [C, 1.3, 'night'],
	aegis: [C, 2.0, 'night'],
	starfall: [W, 2.2, 'night'],
	'frozen-lightning': [C, 1.2, 'night'],
	'fire-tornado': [H, 3.0, 'night'],
	'black-flame': [C, 2.6, 'night'],
};
const only = process.argv.slice(2);

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
	const f = path.join(dist, decodeURIComponent(new URL(req.url, 'http://x').pathname));
	if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return res.writeHead(404).end();
	res.writeHead(200, { 'content-type': TYPES[path.extname(f)] ?? 'application/octet-stream' }).end(fs.readFileSync(f));
}).listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));

const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ['--mute-audio', '--ignore-gpu-blocklist', '--use-angle=d3d11'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await page.goto(`http://127.0.0.1:${server.address().port}/index.html?nowarm`);
await page.waitForFunction(() => window.__block?.times?.ready, null, { timeout: 120000 });
await page.evaluate(async () => {
	const B = window.__block, E = B.elements;
	B.hooks.onVisible(false);
	B.stop();
	for (const sp of E.SPELLS) await E.warmSpell(sp);
	const gl = E.renderer.getContext();
	// frames with a wait for the GPU now and then: hundreds in one go can take the tab down
	const fence = async () => { const q = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0); gl.flush(); while (gl.clientWaitSync(q, 0, 0) === gl.TIMEOUT_EXPIRED) await new Promise((r) => setTimeout(r, 1)); gl.deleteSync(q); };
	const steps = async (n) => { for (let f = 0; f < n; f++) { E.render(1 / 60); if (f % 6 === 5 && f < n - 1) await fence(); } };
	const slug = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
	window.__t = {
		slug, steps,
		async scene(sky, v) {
			if (B.values.sky !== sky) { B.hooks.onSet('sky', sky); await steps(3); }
			E.clear();
			E.fx.particles.reseed(7);
			B.camera.position.set(v[0], v[1], v[2]);
			B.controls.target.set(v[3], v[4], v[5]);
			B.controls.update();
			await steps(60);
			E.post._snap = true;
			await steps(1);
		},
		cast(id, i = 0, seed = 7) {
			const e = E.ENTRIES.find((x) => slug(x.name) === id);
			E.casts.cast(e.spell, E.ARENA.dummies[i].clone().setY(1.1), { form: e.form, target: i, seed });
		},
		// the frame drawn just now, copied in the same task (the drawing buffer isn't kept): whole, or its middle square
		grab(type, quality, w, h, square) {
			const src = B.renderer.domElement, c = document.createElement('canvas');
			c.width = w;
			c.height = h;
			const g = c.getContext('2d');
			g.imageSmoothingQuality = 'high';
			const sw = square ? src.height : src.width, sh = src.height;
			g.drawImage(src, (src.width - sw) / 2, 0, sw, sh, 0, 0, w, h);
			return c.toDataURL(type, quality);
		},
	};
});
const save = (file, url) => {
	fs.mkdirSync(path.dirname(file), { recursive: true });
	fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
	return fs.statSync(file).size;
};
async function thumb(file, q0, run) {
	let q = q0, bytes;
	do {
		bytes = save(file, await page.evaluate(run, q));
		q -= 0.1;
	} while (bytes > 48 * 1024 && q > 0.3);
	console.log(`${path.relative(here, file)} ${bytes} bytes`);
}
for (const [id, [view, t, sky]] of Object.entries(SPELLS)) {
	if (only.length && !only.includes(id)) continue;
	await page.evaluate(async ([id, view, t, sky]) => {
		const T = window.__t;
		window.__block.hooks.onSet('spell', id);
		await T.scene(sky, view);
		T.cast(id);
		await T.steps(Math.round(t * 60) - 1);
	}, [id, view, t, sky]);
	await thumb(path.join(here, 'thumbs/spells', `${id}.webp`), 0.85, async (q) => {
		window.__block.elements.render(1 / 60);
		return window.__t.grab('image/webp', q, 112, 112, true);
	});
}
if (!only.length || only.includes('sky')) {
	for (const sky of ['dusk', 'noon', 'night']) {
		await page.evaluate(async ([sky, v]) => {
			await window.__t.scene(sky, v);
			await window.__t.steps(30);
		}, [sky, [-1.6, 2.6, 10.8, 0.3, 1.3, -0.5]]);
		await thumb(path.join(here, 'thumbs/sky', `${sky}.webp`), 0.85, async (q) => {
			window.__block.elements.render(1 / 60);
			return window.__t.grab('image/webp', q, 112, 112, true);
		});
	}
}
if (!only.length || only.includes('cover')) {
	// the cover: three elements at once on the training ground at dusk, each caught at its height
	await page.evaluate(async () => {
		const T = window.__t;
		await T.scene('dusk', [-1.6, 2.6, 10.8, 0.3, 1.5, -0.5]);
		T.cast('lava-geyser', 2);
		await T.steps(55);
		T.cast('starfall', 0);
		await T.steps(125);
	});
	const url = await page.evaluate(async () => {
		window.__block.elements.render(1 / 60);
		return window.__t.grab('image/jpeg', 0.9, 1280, 720, false);
	});
	console.log(`cover.jpg ${save(path.join(here, 'cover.jpg'), url)} bytes`);
}
await browser.close();
server.close();
