# Ultra Elements, vendored

By Humpalumps, MIT, from https://github.com/Humpalumps/ultra-elements at commit `698b720c81d8f1f282bae53633d72413b5c4408d` (2026-10-30). Left out: `dev/` (the author's tools and the shelved Sandstorm) and `.github/`. `src/main.js` is upstream's own page, kept for reference and not part of the block's build; `../../elements.js` is adapted from it.

## What Patch changed here

Each is marked `Patch:` in the file. The first four are for cold loads and first draws, and could go upstream as they are.

| File | Change | Why |
|---|---|---|
| `src/spells/acid/plague-swarm.glsl.js` | `Swarm` compiles its passes in `link()` and runs them first in `prepare()`, not in its constructor. Its simulation writes one output per program, in two draws a step, to two targets. | The constructor blocked the page for 3.5 to 4 s per swarm while the shader linked, and at first draw it compiled again for 2 to 2.6 s. |
| `src/vfx/Particles.js` | The particle simulation writes one output per program, in three draws a step, to three targets. | The same second compile, about 1.4 s, on every load. |
| `src/vfx/ParticleFluid.js` | `link()` and `prepare()` for the fluid, and `bakeFoam()`, all outside its constructor and `foamTexture()`. | The constructor blocked the page for 2.3 s. |
| `src/scene/pool.js` | Returns its `sim` pass, so a warm-up can compile it beforehand. | It linked at its first draw, blocking. |
| `src/spells/lightning/thunderstorm.js` | Takes the exposure key's base only once per storm. | **A bug:** changing the time of day during a storm took the dimmed key as the new base, and the picture stayed dark for good. |
