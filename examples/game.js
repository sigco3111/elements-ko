// The smallest game: your own floor and box instead of the training ground, a click casts, and one spell of
// your own (frost-nova.js) beside the 39. Run it with `npm run dev`, then open /examples/game.html.
import * as THREE from 'three';
import { createElements } from '../elements.js';
import frostNova from './frost-nova.js';

const canvas = document.querySelector('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, depth: false, stencil: false, alpha: false, powerPreference: 'high-performance' });
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 400);
camera.position.set(0, 3, 12);
camera.lookAt(0, 1, 0);

const elements = await createElements({ renderer, camera, sky: 'dusk', spells: [frostNova] });
elements.setSize(innerWidth, innerHeight);
addEventListener('resize', () => elements.setSize(innerWidth, innerHeight));

// Your world goes in the arena's group, lit by its sky and sun. Spells land on a flat floor at y = 0.
elements.hideArena();
const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x4a4f45, roughness: 0.9 }));
const box = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3, 1.5), new THREE.MeshStandardMaterial({ color: 0x8a6f52, roughness: 0.7 }));
box.position.set(-4, 1.5, -2);
floor.receiveShadow = box.castShadow = true;
elements.arena.group.add(floor, box);
elements.updateShadow();

// Warm up behind your loading screen: nothing below stalls a frame once this is done.
await elements.warmAll({ onProgress: (p) => console.log(`loading ${Math.round(p * 100)}%`) });

const hand = new THREE.Vector3(0, 1.4, 9);
let spell = 'Fireball';
addEventListener('keydown', (e) => { if (e.key === '2') spell = 'Frost Nova'; if (e.key === '1') spell = 'Fireball'; });
addEventListener('pointerdown', (e) => {
	const hit = elements.pick((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
	if (hit) elements.cast(spell, hit.point, { from: hand });
});

let last = performance.now();
renderer.setAnimationLoop((now) => {
	const dt = Math.min((now - last) / 1000, 0.1);
	last = now;
	elements.autoQuality(dt * 1000);
	elements.render(dt);
});
window.__game = { elements, camera, renderer };
