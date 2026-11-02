// A new spell, made from lib/ultra-elements/src/spells/_template.js: README.md, Make a new spell, walks through it.
// An area spell: frost gathers at the target, then a ring and a burst of ice go out across the floor.
export default {
	id: 'frost-nova',
	name: 'Frost Nova',
	element: 'ice',
	hue: '#9ff0ff',
	shape: 'area',
	params: { radius: 3.5, shards: 1, color: '#9fe8ff' },
	ranges: { radius: [1, 8, 0.1], shards: [0, 3, 0.01] },
	timing: { charge: 0.5, impact: 0.2, linger: 1.6 },
	kinds: {
		shard: { style: 'glow', drag: 1.2, gravity: 7, restitution: 0.3, friction: 0.5, life: [0.5, 1.3], size: [0.03, 0.008], stretch: 0.04, emissive: 22, color: ['#d8f6ff', '#3f9fff'], alpha: [1, 0] },
		mist: { style: 'media', drag: 2.4, buoyancy: 0.15, curl: 0.7, life: [0.9, 1.8], size: [0.5, 1.6], emissive: 0, color: ['#cfe6f2', '#8fb4c8'], alpha: [0.35, 0], density: 2 },
	},
	create(fx) {
		const S = this, P = fx.particles;
		const shards = P.emitter('frost-nova.shard', { shape: 'ring', radius: 0.6, spread: 7, radial: 4 });
		const mist = P.emitter('frost-nova.mist', { shape: 'disk', radius: 1.4, spread: 1.4 });
		const ring = { pos: new fx.ARENA.focus.constructor(), radius0: 0.2, radius1: 4, duration: 0.45, thickness: 0.5, distortion: 0.06, ground: true, intensity: 3 };
		return {
			phase(c, name) {
				const p = S.params;
				if (name === 'charge') {
					c.data.light = fx.lights.acquire();
					if (c.data.light) {
						Object.assign(c.data.light, { range: 9, intensity: 0 });
						c.data.light.color.set(p.color);
						c.data.light.pos.copy(c.to).setY(1);
					}
				} else if (name === 'impact') {
					shards.pos.copy(c.pos).setY(0.2);
					shards.burst(600 * p.shards);
					mist.pos.copy(c.pos).setY(0.25);
					mist.burst(36);
					ring.pos.copy(c.pos).setY(0.05);
					ring.radius1 = p.radius * 1.3;
					fx.shocks.spawn(ring);
					fx.ground.splat({ x: c.pos.x, z: c.pos.z, radius: p.radius, frost: 0.9 });
					fx.rig.shake(0.3, 14);
					fx.flash(0.2);
					if (c.target >= 0) fx.dummies[c.target].status.frozen = 1;
					if (c.data.light) c.data.light.intensity = 90;
				} else if (name === 'done') {
					c.data.light?.release();
					c.data.light = null;
				}
			},
			update(c, dt) {
				const L = c.data.light;
				if (!L) return;
				if (c.phase === 'charge') L.intensity = 14 * (c.t / c.durations.charge);
				else L.intensity *= Math.exp(-dt * 5);
			},
		};
	},
};
