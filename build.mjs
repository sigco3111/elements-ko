// Builds the block demo into dist/ (index.html at the top) with its licences and pictures: `npm install`,
// then `npm run build`. Everything the demo draws is made in code (upstream ships no textures, models or
// sounds: its noise is baked on the GPU at load), so there are no other assets to copy.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(here, 'dist');
execSync('node make-recipe.mjs', { cwd: here, stdio: 'inherit' });
execSync(`node "${path.join(here, 'node_modules/vite/bin/vite.js')}" build --config vite.config.mjs`, { cwd: here, stdio: 'inherit' });

const put = (from, to) => {
	fs.mkdirSync(path.dirname(path.join(dist, to)), { recursive: true });
	fs.cpSync(from, path.join(dist, to), { recursive: true });
};
put(path.join(here, 'LICENSE'), 'LICENSE.txt');
put(path.join(here, 'lib/ultra-elements/LICENSE'), 'LICENSE-ultra-elements.txt');
put(path.join(here, 'lib/ultra-elements/THIRD_PARTY_NOTICES.md'), 'THIRD_PARTY_NOTICES-ultra-elements.md');
put(path.join(here, 'fonts/OFL-red-hat-mono.txt'), 'OFL-red-hat-mono.txt');
put(path.join(here, 'CREDITS.txt'), 'CREDITS.txt');
put(path.join(here, 'spells.json'), 'spells.json');
if (fs.existsSync(path.join(here, 'thumbs'))) put(path.join(here, 'thumbs'), 'thumbs');

let bytes = 0;
const sum = (dir) => {
	for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
		const p = path.join(dir, e.name);
		if (e.isDirectory()) sum(p);
		else bytes += fs.statSync(p).size;
	}
};
sum(dist);
console.log(`dist: ${(bytes / 1048576).toFixed(2)} MB`);
