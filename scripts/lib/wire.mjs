// A very small software 3D pipeline. An <img> cannot run a renderer, so the
// rotation is done here: the model is projected once per frame at build time
// and the frames are written into a single SMIL <animate> that morphs the
// path's `d` between them. Thirty-odd frames with linear interpolation is
// indistinguishable from a live rotation.

import { n } from './kit.mjs';

/** A torus as closed polylines: `nu` rings around the tube and `nv` around the hole. */
export function torus(R, r, nu, nv) {
	const at = (a, b) => [(R + r * Math.cos(b)) * Math.cos(a), (R + r * Math.cos(b)) * Math.sin(a), r * Math.sin(b)];
	const rings = [];
	for (let i = 0; i < nu; i++) rings.push(Array.from({ length: nv }, (_, j) => at((i / nu) * 2 * Math.PI, (j / nv) * 2 * Math.PI)));
	for (let j = 0; j < nv; j++) rings.push(Array.from({ length: nu }, (_, i) => at((i / nu) * 2 * Math.PI, (j / nv) * 2 * Math.PI)));
	return rings;
}

/**
 * A low-poly 3D winged dragon (Arokh from Drakan: The Ancients' Gates) as
 * closed wireframe polygons: body, arched neck & horned head, swept wings
 * with finger ribs, and barbed tail.
 */
export function dragon() {
	const mirror = (pts) => pts.map(([x, y, z]) => [-x, y, z]);
	const wing = [
		// Main wing membrane panels (right side, +x)
		[[0.18, 0.14, 0.25], [0.75, 0.52, 0.08], [1.42, 0.62, -0.18], [0.92, 0.22, -0.32], [0.16, 0.04, -0.22]],
		// Wing trailing lobe
		[[0.16, 0.04, -0.22], [0.92, 0.22, -0.32], [1.18, 0.06, -0.62], [0.58, -0.04, -0.52]],
		// Wing leading spar & inner rib
		[[0.18, 0.14, 0.25], [0.75, 0.52, 0.08], [0.58, -0.04, -0.52]],
		[[0.75, 0.52, 0.08], [1.42, 0.62, -0.18], [1.18, 0.06, -0.62]],
	];
	return [
		// Torso spine & chest diamond
		[[0, 0.18, 0.36], [0.22, 0.06, 0.05], [0, -0.14, 0.2], [-0.22, 0.06, 0.05]],
		[[0, 0.18, 0.36], [0.18, 0.05, -0.32], [0, -0.08, -0.24], [-0.18, 0.05, -0.32]],
		[[0.22, 0.06, 0.05], [0.18, 0.05, -0.32], [0, 0.18, 0.36]],
		[[-0.22, 0.06, 0.05], [-0.18, 0.05, -0.32], [0, 0.18, 0.36]],
		// Arched neck & head crest
		[[0, 0.18, 0.36], [0.09, 0.34, 0.68], [0, 0.52, 0.88], [-0.09, 0.34, 0.68]],
		// Snout & jaw
		[[0, 0.52, 0.88], [0.1, 0.44, 0.94], [0, 0.42, 1.24], [-0.1, 0.44, 0.94]],
		// Horns
		[[0.07, 0.52, 0.88], [0.2, 0.68, 0.72], [0.04, 0.48, 0.8]],
		[[-0.07, 0.52, 0.88], [-0.2, 0.68, 0.72], [-0.04, 0.48, 0.8]],
		// Swept tail & spade tip
		[[0, 0.12, -0.28], [0.08, 0.0, -0.78], [0, -0.08, -1.24], [-0.08, 0.0, -0.78]],
		[[0, -0.08, -1.24], [0.16, -0.12, -1.36], [0, -0.14, -1.52], [-0.16, -0.12, -1.36]],
		// Right and left wings
		...wing,
		...wing.map(mirror),
	];
}

/**
 * Spin `rings` once about the vertical axis and return the first frame plus
 * the `values` list for <animate attributeName="d">.
 */
export function bake(rings, { frames = 36, cx, cy, scale, tilt = 0.45, dist = 4.2 }) {
	const ct = Math.cos(tilt);
	const st = Math.sin(tilt);
	const out = [];
	for (let f = 0; f <= frames; f++) {
		const a = (f / frames) * 2 * Math.PI;
		const ca = Math.cos(a);
		const sa = Math.sin(a);
		let d = '';
		for (const ring of rings) {
			ring.forEach(([x, y, z], i) => {
				// Yaw, then a fixed tilt toward the viewer, then perspective.
				const x1 = x * ca + z * sa;
				const z1 = -x * sa + z * ca;
				const y2 = y * ct - z1 * st;
				const z2 = y * st + z1 * ct;
				const k = (scale * dist) / (dist - z2);
				d += `${i ? 'L' : 'M'}${n(cx + x1 * k)} ${n(cy - y2 * k)}`;
			});
			d += 'Z';
		}
		out.push(d);
	}
	return { first: out[0], values: out.join(';') };
}
