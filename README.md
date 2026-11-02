---
kind: effect
engine: three
---

# Elements

39 real-time elemental spells for three.js in WebGL2: fire, ice, lightning, wind, water, earth, void, light, acid and arcane, each simulated on the GPU and tunable, cast at a click. Ultra Elements by Humpalumps, set up for games by Patch.

It's [Ultra Elements](https://github.com/Humpalumps/ultra-elements) by Humpalumps (MIT), from the author of Ultra-Water, with a smaller page and a library around it. In the live demo, click anywhere on the training ground at dusk to cast the chosen spell there, drag to look around and scroll to zoom. Until your first click it casts by itself.

## The spells

| Group | Spells |
|---|---|
| Lightning | Thunderstrike, Chain Arc, Ball Lightning, Thunderstorm |
| Fire | Fireball, Inferno, Phoenix, Ember Swarm |
| Water | Tidal Lance, Geyser, Tsunami |
| Ice | Glacial Spike, Ice Wall, Absolute Zero, Blizzard |
| Earth | Upheaval, Meteor, Fissure, Lava Geyser |
| Wind | Cyclone, Wind Slash, Dust Devils |
| Void | Singularity, Rift, Portal |
| Light | Judgment, Radiant Lance, Solar Flare, Aurora Veil, Supernova |
| Acid | Toxic Bloom, Corrosion Cloud, Plague Swarm |
| Arcane | Arcane Barrage, Aegis, Starfall |
| Two at once | Frozen Lightning, Fire Tornado, Black Flame |

Everything is drawn from code: GPU particles, a FLIP fluid for water and acid, a combustion solver for fire and smoke, raymarched volumes, lightning, gravitational lensing, a reaction field on the floor that takes scorch, frost, cracks and acid. There isn't a texture, model or sound in it. `lib/ultra-elements/README.md` is the author's own account of how each part works.

## Use a spell in a game

`elements.js` draws the whole frame with three's `WebGLRenderer` and casts at a world point:

```js
import * as THREE from 'three';
import { createElements } from './elements.js';

const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, depth: false, stencil: false, alpha: false });
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 400);
const elements = await createElements({ renderer, camera, sky: 'dusk' });
elements.setSize(innerWidth, innerHeight);

await elements.warmAll({ onProgress: showLoadingBar });   // behind your loading screen (see Warm it up)

elements.cast('Fireball', new THREE.Vector3(0, 1, 0), { from: playerHand });

renderer.setAnimationLoop(() => elements.render(clock.getDelta()));
```

- `cast(name, point, { from, target, held })`: `name` is a spell's name from the table, `from` where it starts (default: the orb on the training ground), `held` keeps a beam going until `casts.releaseHeld()`. A spell that isn't warm yet casts the moment it is, never stalling a frame.
- `pick(x, y)` turns a pointer at -1 to 1 into a point on the ground, for click-to-cast.
- `setParam(spell, key, value)` changes one setting live. `spells.json` lists all 411, every spell's, with ranges, plus each spell's three named looks.
- `setSky('dusk' | 'noon' | 'night')` (the demo stays at dusk), `clear()`, `autoQuality(ms)` (lowers particles, then resolution, when frames are missed), `rig.shake(...)`, `view.timeScale`.

**Your own world.** `elements.hideArena()` takes away the training ground, then add your things to `elements.arena.group` and call `elements.updateShadow()`, so they're lit by its sky and cast its sun's shadow. `examples/game.js` is a whole game this size (`npm run dev`, then `/examples/game.html`). What stays is that spells are built for flat ground at y = 0, inside 18 m of the middle: they land there, particles bounce there, and only the training ground's own floor shows scorch and frost. Chain Arc and a few others look for the three targets: move them with your enemies (`elements.fx.dummies[0].pos.copy(enemy.position)`), or they stay where they were, unseen.

## Make a new spell

A spell is one plain module, and adding one takes no other code. `examples/frost-nova.js` is a whole one, 60 lines, made from `lib/ultra-elements/src/spells/_template.js`. To make your own:

1. Copy the existing spell nearest to what you want (`spells.json` says which file each one is in), or `examples/frost-nova.js`. Give it a new `id`, `name` and `element`, and rename every `'<old id>.<kind>'` string to the new id.
2. Change the numbers first. `kinds` are particle behaviours with no shader code in them, and `params` and `ranges` are its settings.
3. Hand it to `createElements`:

```js
export default {
  id: 'frost-nova', name: 'Frost Nova', element: 'ice', hue: '#9ff0ff',
  shape: 'area',                                  // projectile, beam, strike, area or self
  params: { radius: 3.5, shards: 1, color: '#9fe8ff' },
  ranges: { radius: [1, 8, 0.1], shards: [0, 3, 0.01] },
  timing: { charge: 0.5, impact: 0.2, linger: 1.6 },
  kinds: { shard: { style: 'glow', life: [0.5, 1.3], size: [0.03, 0.008], gravity: 7, emissive: 22, color: ['#d8f6ff', '#3f9fff'] } },
  create(fx) {                                    // runs once, allocates everything
    const S = this, shards = fx.particles.emitter('frost-nova.shard', { shape: 'ring', radius: 0.6, spread: 7 });
    return {
      phase(c, name) {                            // charge, release, travel, impact, linger, done
        if (name !== 'impact') return;
        shards.pos.copy(c.pos);
        shards.burst(600 * S.params.shards);
        fx.ground.splat({ x: c.pos.x, z: c.pos.z, radius: S.params.radius, frost: 0.9 });
        fx.rig.shake(0.3, 14);
      },
    };
  },
};

const elements = await createElements({ renderer, camera, spells: [frostNova] });
```

**The rules that keep it fast** (`lib/ultra-elements/CONTRIBUTING.md`, with the whole `fx` object): no allocation after `create()`, one of each thing from a pool and released in the `done` phase; no new shader programs or defines after load, uniforms only; `fx.rand()`, never `Math.random()`; flashes through `fx.flash()` and shake through `fx.rig`. Keep a spell under 3 ms for the whole frame on a mid-range GPU at its worst moment. `lib/ultra-elements/SPELLBOOK.md` has about eighty more spell ideas with the systems each would use.

## Warm it up

A cold load (a new browser profile, nothing cached, loaded from Patch's game host) took 18 to 24 s before these changes and takes 7 to 10 s now on Windows with an RTX 4090, longer on a busy or slower PC. All of that is behind the loading bar: once the view opens, every spell is warm and nothing heavy runs. If you're writing your own start-up, these are what made the difference:

- **A program's first use blocks until it has linked,** and a simulation shader can take 4 s. So every program starts linking at once and nothing is drawn until its link is done. The driver links side by side, and the page keeps going.
- **On Windows, a shader that draws to several targets at once compiles a second time at its first draw,** on the graphics process's main thread, however it was linked. ANGLE links for one target. Nothing avoids this, so every first draw happens behind the loading screen (`warmAll`), while the rest link. The particle and swarm simulations here are one output per program for this reason, and draw three and two times a step: a little GPU for a few seconds of loading.
- **Commands are queued, so JavaScript finishing isn't the GPU finishing.** A view revealed then can sit frozen behind the backlog. Wait on a fence (`gpuFence`) before you open the view. The demo also draws real frames with its canvas hidden until they come on time.

## Controls

The block page talks to the demo over the `patch-block` message channel (`lib/patch-block.js`). Casting happens in the frame.

**For people** (the block page shows these):

| id | Control | Type | Range | What it does |
|---|---|---|---|---|
| `spell` | Spell | choice | 39 options in 11 groups, each with a picture; default Starfall | Which spell a click casts. Choosing one casts it at a target. |
| `size` | Size | number | 0.4 to 2 ×, default 1 | How big each cast is. |
| `intensity` | Intensity | number | 0.25 to 2.5 ×, default 1 | How strong and bright each cast is. |
| `speed` | Speed | number | 0.1 to 2 ×, default 1 | How fast everything plays: below 1 is slow motion. |

Size and Intensity mean different settings in each spell (`tuning.js` says which), and each setting stays within its own range, so a few spells stop growing before 2 ×.

**Trigger:** Clear (`clear`) takes away every cast, the scorch and frost on the floor and what the targets took.

**For agents** (33 more, in `recipe.json` with every range and default):

| id | What it does |
|---|---|
| `sky` | `dusk` (default), `noon` or `night`. People always see dusk |
| `look` | One of the spell's three named looks (`first`, `second`, `third`; their names are in `spells.json`), or `own` |
| `auto`, `auto.all` | Keep casting the chosen spell, or every spell in turn |
| `shake`, `reduced` | How much big impacts shake the camera; reduce flashes and shake |
| `exposure`, `bloom`, `contrast`, `saturation`, `vignette`, `motion-blur` | The final picture |
| `wind`, `wind.direction` | A steady wind that pushes smoke, dust and sparks |
| `fov`, `particles` | The camera's field of view; how many particles every spell emits |
| `color.on`, `color.main`, `color.second` | Replace the spell's main colours |
| `tune.height`, `tune.duration`, `tune.hold`, `tune.flight`, `tune.haze`, `tune.smoke`, `tune.dust`, `tune.mist`, `tune.sparks`, `tune.embers`, `tune.debris`, `tune.scorch`, `tune.frost`, `tune.glints` | A multiplier for that setting, on any spell that has it |

A recipe holds at most 64 controls and the spells have 411 settings, so these are the ones shared across spells. All 411 are in `spells.json`, and `setParam` sets them in a game.

## Build it

```bash
npm install
npm run build        # writes recipe.json and spells.json, then dist/ (under 2 MB)
```

`node make-thumbs.mjs` retakes the pictures and the cover from the built demo.

| Path | What |
|---|---|
| `elements.js` | The library: the world, the frame, the warm-up, what a game calls (adapted from upstream's `src/main.js`) |
| `demo.js`, `index.html` | The demo page |
| `tuning.js` | What Size, Intensity and the shared controls mean in each spell |
| `spells.json` | Every spell's file, settings, ranges and looks (written by `make-recipe.mjs`) |
| `recipe.json`, `make-recipe.mjs` | The release recipe |
| `make-thumbs.mjs`, `thumbs/`, `cover.jpg` | The pictures, stills of this demo |
| `examples/` | A game in 50 lines, and a new spell |
| `lib/ultra-elements/` | Ultra Elements' `src`, with its licence, notices and docs, from commit `698b720`. `VENDOR.md` lists the five fixes made here. |
| `lib/patch-block.js` | Patch's block demo helper, as served at patch.gg/patch-block.js |
| `fonts/` | Red Hat Mono 500, latin, for the label |

Left out of the vendored copy: upstream's `dev/` folder (its tools and the shelved Sandstorm) and `.github/`.

## Credits and licences

- **Ultra Elements** by Humpalumps, MIT, © 2026 Humpalumps (`lib/ultra-elements/LICENSE`): all 39 spells, the training ground and targets, the sky, every effect system, the post. Credit line: "Ultra Elements by Humpalumps (MIT)". [github.com/Humpalumps/ultra-elements](https://github.com/Humpalumps/ultra-elements).
- **The code it adapts,** all MIT and listed in `lib/ultra-elements/THIRD_PARTY_NOTICES.md`: three.js, Ultra-Water (same author), WebGL Water by Evan Wallace, Hash without Sine by Dave Hoskins, and functions from Inigo Quilez.
- **three.js**: MIT.
- **Red Hat Mono**: The Red Hat Project Authors, SIL Open Font License 1.1 (`fonts/OFL-red-hat-mono.txt`).
- **`elements.js` (adapted), the demo page, `tuning.js`, the examples and the pictures in `thumbs/`**: Patch, MIT.

Code: MIT (`LICENSE`). There is no separate art: it's all drawn by the code. The font is OFL 1.1.
