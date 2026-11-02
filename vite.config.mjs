// The block demo's build: index.html at the top of dist, every path relative, nothing from other hosts.
// No `vite` import: the config is a plain object, and every bare import is pinned to the repo's one copy.
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const nm = `${here}node_modules/`;

export default {
	root: here,
	base: './',
	publicDir: false,
	resolve: {
		alias: [
			{ find: /^three$/, replacement: `${nm}three/build/three.module.js` },
			{ find: /^three\/addons\/(.*)$/, replacement: `${nm}three/examples/jsm/$1` },
			{ find: /^patch-block$/, replacement: fileURLToPath(new URL('./lib/patch-block.js', import.meta.url)) },
		],
	},
	build: { target: 'es2022', outDir: `${here}dist`, emptyOutDir: true, assetsInlineLimit: 0, modulePreload: { polyfill: false } },
};
