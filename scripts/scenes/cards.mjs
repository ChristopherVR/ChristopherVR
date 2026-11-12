// One card per project. Each has a small looping demonstration of what the
// project does, above its name and a sentence about it. Cards are separate
// images because a README image is clickable only as a whole, and each one
// should open its own project.
//
// Which cards exist is decided by the pipeline, not here: one for every
// repository pinned on the profile (see cardList at the bottom). A project
// with a hand-made demonstration below uses it; any other gets a card drawn
// from its own data, so pinning something new is all it takes.

import { cycle, esc, fmt, mix, n, outline, svg, text, timeline, wrap } from '../lib/kit.mjs';
import { bake, torus } from '../lib/wire.mjs';
import { PROFILE } from '../profile.mjs';

const W = 424;
const VH = 184; // the demonstration's viewport
const H = 296;

const BLURBS = {
	'emf-converter': 'Replays Windows metafiles (EMF, EMF+ and WMF) record by record into PNG, SVG or PDF, checked pixel for pixel against Windows itself.',
	'mtx-decompressor': 'Unpacks MicroType Express fonts from the EOT containers buried in old Office documents, back into plain TrueType.',
	Drakan2PC: 'A 2002 PlayStation 2 game, statically recompiled: its MIPS code is translated to C++ and built for Windows, Linux and the browser.',
	AbioticEditor: 'A save editor for Abiotic Factor, in the browser or on the desktop: characters, worlds and your base in 3D, with a backup kept on every save.',
	'kotor-coop': 'Drop-in co-op for Knights of the Old Republic. One player hosts and friends join the same world from their own copies of the game.',
	'kotor-mod-manager': 'Installs the community mod builds for KOTOR 1 and 2 in one click: it downloads every mod and applies them in the right order.',
};

/** A repository's own description, cut to card length at a word. */
function trim(str, max = 150) {
	if (str.length <= max) return str;
	const cutAt = str.lastIndexOf(' ', max);
	return `${str.slice(0, cutAt).replace(/[,;:.\s]+$/, '')}…`;
}
const blurbFor = (data, repo) => BLURBS[repo] ?? (trim(data.repos[repo]?.description ?? '') || 'No description yet.');

/** The shared frame: viewport, name, star count and blurb. */
function card(T, data, { repo, demo, css, fonts = [] }) {
	const r = data.repos[repo] ?? { stars: 0 };
	const blurb = blurbFor(data, repo);
	let body = `<rect x=".5" y=".5" width="${W - 1}" height="${VH - 1}" rx="7" fill="${T.wash}" stroke="${T.rule}"/>${demo}`;
	body += text(0, VH + 37, repo, { font: 'display', size: 26, fill: T.ink });
	if (r.stars) body += text(W, VH + 37, `${fmt(r.stars)} ${r.stars === 1 ? 'star' : 'stars'}`, { size: 11.5, fill: T.muted, anchor: 'end' });
	wrap('text', blurb, 13.5, W - 2)
		.slice(0, 3)
		.forEach((l, i) => {
			body += text(0, VH + 62 + i * 19.5, l, { font: 'text', size: 13.5, fill: T.soft });
		});
	return svg({ w: W, h: H, title: `${repo}: ${blurb}`, fonts: [...new Set(['display', 'text', 'mono', ...fonts])], css, body });
}

/** A list row that is dim until its turn, with a tinted bar while it runs. */
function stepCss(T, P, slot) {
	return [
		`.st{fill:${T.ink};animation:st ${P}s linear infinite both}`,
		cycle('st', P, { from: `fill:${T.muted}`, to: `fill:${T.ink}`, enter: 0.1 }),
		`.sb{opacity:0;animation:sb ${P}s linear infinite both}`,
		timeline('sb', P, [[0, 'opacity:0'], [0.04, 'opacity:.18'], [slot, 'opacity:.18'], [slot + 0.12, 'opacity:0'], [P, 'opacity:0']]),
	].join('');
}
const delay = (t) => `style="animation-delay:${n(t, 2)}s"`;

/* ---- emf-converter: replay the records, watch the picture appear ------ */

export function emfCard(data, T) {
	const P = 14;
	const slot = 0.78;
	const records = [
		['EMR_HEADER', 108],
		['EMR_CREATEPEN', 28],
		['EMR_POLYLINE16', 40],
		['EMR_CREATEBRUSHINDIRECT', 24],
		['EMR_RECTANGLE', 24],
		['EMR_RECTANGLE', 24],
		['EMR_RECTANGLE', 24],
		['EMR_POLYBEZIER16', 44],
		['EMR_EXTTEXTOUTW', 92],
		['EMR_EOF', 20],
	];
	const at = (i) => 0.8 + i * slot;
	let list = '';
	records.forEach(([name, size], i) => {
		const y = 27 + i * 15.6;
		list += `<rect class="sb" ${delay(at(i))} x="8" y="${n(y - 11)}" width="172" height="15" rx="3" fill="${T.hues[0]}"/>`;
		list += `<text class="m st" ${delay(at(i))} x="14" y="${n(y)}" font-size="9.5">${name}</text>`;
		list += `<text class="m st" ${delay(at(i))} x="175" y="${n(y)}" font-size="9.5" text-anchor="end">${size}</text>`;
	});

	// The picture those records paint: axes, three bars, a trend, a label.
	const ox = 196;
	const oy = 14;
	const bars = [40, 62, 88]
		.map((h, i) => `<rect class="grow" ${delay(at(4 + i))} x="${ox + 48 + i * 44}" y="${oy + 130 - h}" width="28" height="${h}" fill="${T.fills[2]}"/>`)
		.join('');
	const canvas =
		`<rect x="${ox}" y="${oy}" width="214" height="156" rx="4" fill="${T.page}" stroke="${T.rule}"/>` +
		`<rect class="flash" ${delay(at(0))} x="${ox}" y="${oy}" width="214" height="156" rx="4" fill="none" stroke="${T.hues[0]}" stroke-width="1.5"/>` +
		`<path class="draw" ${delay(at(2))} pathLength="1" d="M${ox + 30} ${oy + 20}V${oy + 130}H${ox + 196}" stroke="${T.muted}" stroke-width="1.3"/>` +
		bars +
		`<path class="draw" ${delay(at(7))} pathLength="1" d="M${ox + 40} ${oy + 104}C${ox + 86} ${oy + 96} ${ox + 120} ${oy + 62} ${ox + 190} ${oy + 30}" stroke="${T.fills[0]}" stroke-width="2.2"/>` +
		`<g class="pop" ${delay(at(8))}>${text(ox + 42, oy + 34, 'Revenue', { font: 'display', size: 15, fill: T.ink })}</g>`;

	const css = [
		stepCss(T, P, slot),
		`.draw{fill:none;stroke-linecap:round;stroke-dasharray:1 2;animation:draw ${P}s linear infinite both}`,
		cycle('draw', P, { from: 'stroke-dashoffset:1.01', to: 'stroke-dashoffset:0', enter: 0.7, ease: 'ease-in-out' }),
		`.grow{transform-box:fill-box;transform-origin:50% 100%;animation:grow ${P}s linear infinite both}`,
		cycle('grow', P, { from: 'transform:scaleY(0)', to: 'transform:scaleY(1)', enter: 0.55 }),
		`.pop{animation:pop ${P}s linear infinite both}`,
		cycle('pop', P, { from: 'opacity:0', to: 'opacity:1', enter: 0.3 }),
		`.flash{opacity:0;animation:flash ${P}s linear infinite both}`,
		timeline('flash', P, [[0, 'opacity:0'], [0.1, 'opacity:1'], [0.7, 'opacity:0'], [P, 'opacity:0']]),
	].join('');

	return card(T, data, {
		repo: 'emf-converter',
		demo: list + canvas,
		css,
	});
}

/* ---- mtx-decompressor: a compressed font comes back as outlines ------- */

export function mtxCard(data, T) {
	const P = 15;
	const slot = 1.25;
	const steps = ['read the EOT header', 'unpack LZCOMP block 1', 'unpack LZCOMP block 2', 'unpack LZCOMP block 3', 'rebuild glyf and loca', 'write font.ttf'];
	const at = (i) => 0.8 + i * slot;
	let list = '';
	steps.forEach((label, i) => {
		const y = 34 + i * 24;
		list += `<text class="m st" ${delay(at(i))} x="14" y="${y}" font-size="10.5">${label}</text>`;
		// The three blocks show their progress; the other steps are instant.
		if (i >= 1 && i <= 3) {
			list += `<rect x="14" y="${y + 6}" width="150" height="2.5" rx="1.25" fill="${T.rule}"/><rect class="bar" ${delay(at(i))} x="14" y="${y + 6}" width="150" height="2.5" rx="1.25" fill="${T.fills[i + 1]}"/>`;
		}
	});

	// The glyph: points arrive while the blocks unpack, the contour is
	// rebuilt, then it is a font again.
	const g = outline('display', '&', 176, 222, 150);
	const pts = [...g.on.map((p) => ({ ...p, on: true })), ...g.off.map((p) => ({ ...p, on: false }))].sort((a, b) => a.x - b.x);
	const spread = (3 * slot) / pts.length;
	let dots = '';
	pts.forEach((p, i) => {
		const d = delay(at(1) + i * spread);
		dots += p.on
			? `<rect class="pt" ${d} x="${n(p.x - 1.7)}" y="${n(p.y - 1.7)}" width="3.4" height="3.4" fill="${T.hues[0]}"/>`
			: `<circle class="pt" ${d} cx="${n(p.x)}" cy="${n(p.y)}" r="1.5" fill="${T.muted}"/>`;
	});
	const glyph =
		`<path class="gfill" ${delay(at(5))} d="${g.d}" fill="${T.ink}"/>` +
		`<path class="draw" ${delay(at(4))} pathLength="1" d="${g.d}" stroke="${T.hues[0]}" stroke-width="1.2"/>` +
		dots;

	const css = [
		stepCss(T, P, slot),
		`.bar{transform-box:fill-box;transform-origin:0 50%;animation:bar ${P}s linear infinite both}`,
		cycle('bar', P, { from: 'transform:scaleX(0)', to: 'transform:scaleX(1)', enter: slot, ease: 'linear' }),
		`.pt{animation:pt ${P}s linear infinite both}`,
		timeline('pt', P, [[0, 'opacity:0'], [0.15, 'opacity:1'], [P - 1.6, 'opacity:1'], [P - 1.2, 'opacity:0'], [P, 'opacity:0']]),
		`.draw{fill:none;stroke-dasharray:1 2;animation:draw ${P}s linear infinite both}`,
		cycle('draw', P, { from: 'stroke-dashoffset:1.01', to: 'stroke-dashoffset:0', enter: 1.2, ease: 'ease-in-out' }),
		`.gfill{animation:gfill ${P}s linear infinite both}`,
		cycle('gfill', P, { from: 'fill-opacity:0', to: 'fill-opacity:1', enter: 0.8 }),
	].join('');

	return card(T, data, {
		repo: 'mtx-decompressor',
		demo: list + glyph,
		css,
	});
}

/* ---- Drakan2PC: MIPS in, C++ out, running natively -------------------- */

export function drakanCard(data, T) {
	const P = 15;
	const slot = 1.05;
	const rows = [
		['lw    v0, 16(sp)', 'v0 = MEM32(sp + 16);'],
		['addiu a0, a0, 1', 'a0 += 1;'],
		['sll   v1, a0, 2', 'v1 = a0 << 2;'],
		['mtc1  v1, f12', 'f12 = bits(v1);'],
		['jal   0x1A3F40', 'fn_001A3F40(ctx);'],
		['beqz  v0, .L8', 'if (!v0) goto L8;'],
		['sw    v0, 0(a1)', 'MEM32(a1) = v0;'],
	];
	const at = (i) => 0.8 + i * slot;
	let code = text(14, 24, 'PS2 MIPS', { size: 9.5, fill: T.muted }) + text(138, 24, 'generated C++', { size: 9.5, fill: T.muted });
	code += `<line x1="14" x2="286" y1="31" y2="31" stroke="${T.rule}"/>`;
	rows.forEach(([mips, cpp], i) => {
		const y = 50 + i * 18.6;
		code += `<rect class="sb" ${delay(at(i))} x="8" y="${n(y - 12)}" width="282" height="17" rx="3" fill="${T.hues[2]}"/>`;
		code += `<text class="m st" ${delay(at(i))} x="14" y="${n(y)}" font-size="9.8">${esc(mips)}</text>`;
		code += `<g class="out" ${delay(at(i) + 0.3)}>${text(138, y, cpp, { size: 9.8, fill: T.hues[2] })}</g>`;
	});

	// The proof it runs: a model turning in real 3D (see lib/wire.mjs).
	const spin = bake(torus(1, 0.44, 12, 6), { frames: 40, cx: 353, cy: 84, scale: 34, tilt: 0.5 });
	const model =
		`<path d="${spin.first}" fill="none" stroke="${T.fills[0]}" stroke-width=".9" stroke-linejoin="round"><animate attributeName="d" dur="16s" repeatCount="indefinite" values="${spin.values}"/></path>` +
		text(353, 160, 'x64, Linux, wasm', { size: 9.5, fill: T.muted, anchor: 'middle' });

	const css = [
		stepCss(T, P, slot),
		`.out{animation:out ${P}s linear infinite both}`,
		cycle('out', P, { from: 'opacity:0;transform:translateX(-6px)', to: 'opacity:1;transform:none', enter: 0.3 }),
	].join('');

	return card(T, data, {
		repo: 'Drakan2PC',
		demo: code + model,
		css,
	});
}

/* ---- AbioticEditor: change the bytes, change the save ------------------ */

export function abioticCard(data, T) {
	const P = 15;
	const MOVE = 1.4;
	const EDIT1 = 4.6;
	const EDIT2 = 7.4;
	const SAVE = 10.2;

	// Your base, in 3D: pick a crate up and put it down somewhere else.
	const O = { x: 97, y: 42 };
	const a = { x: 15, y: 7.5 };
	const b = { x: -15, y: 7.5 };
	const corner = (i, j) => ({ x: O.x + i * a.x + j * b.x, y: O.y + i * a.y + j * b.y });
	const pt = (q, lift = 0) => `${n(q.x)} ${n(q.y - lift)}`;
	let dump = '';
	for (let k = 0; k <= 5; k++) {
		dump += `<path d="M${pt(corner(k, 0))}L${pt(corner(k, 5))}M${pt(corner(0, k))}L${pt(corner(5, k))}" stroke="${T.rule}" fill="none"/>`;
	}
	const shadeOf = (c, q) => mix(c, T.name === 'dark' ? T.page : '#10151c', q);
	const box = (i, j, h, color) => {
		const m = 0.13;
		const [p00, p10, p11, p01] = [corner(i + m, j + m), corner(i + 1 - m, j + m), corner(i + 1 - m, j + 1 - m), corner(i + m, j + 1 - m)];
		return (
			`<path d="M${pt(p01)}L${pt(p11)}L${pt(p11, h)}L${pt(p01, h)}Z" fill="${shadeOf(color, 0.24)}"/>` +
			`<path d="M${pt(p11)}L${pt(p10)}L${pt(p10, h)}L${pt(p11, h)}Z" fill="${shadeOf(color, 0.5)}"/>` +
			`<path d="M${pt(p00, h)}L${pt(p10, h)}L${pt(p11, h)}L${pt(p01, h)}Z" fill="${color}"/>`
		);
	};
	// Back to front.
	dump += box(0, 0, 20, T.fills[4]) + box(1, 0, 11, T.fills[4]) + box(3, 0, 26, T.fills[3]) + box(0, 3, 15, T.fills[5]) + box(4, 2, 12, T.fills[3]);
	// Where the crate is going, then the crate itself.
	const from = [3, 3];
	const to = [1, 2];
	const dx = corner(...to).x - corner(...from).x;
	const dy = corner(...to).y - corner(...from).y;
	const tile = [corner(to[0], to[1]), corner(to[0] + 1, to[1]), corner(to[0] + 1, to[1] + 1), corner(to[0], to[1] + 1)];
	dump += `<path class="new" ${delay(MOVE - 0.6)} d="M${tile.map((q) => pt(q)).join('L')}Z" fill="none" stroke="${T.hues[0]}" stroke-dasharray="3 2.5"/>`;
	dump += `<g class="mv" ${delay(MOVE)}>${box(from[0], from[1], 13, T.fills[0])}</g>`;
	dump += `<g class="old" ${delay(SAVE)}>${text(14, 160, 'WorldSave.sav', { size: 9.5, fill: T.muted })}</g>`;
	dump += `<g class="new" ${delay(SAVE)}>${text(14, 160, 'saved, backup kept as .bak', { size: 9.5, fill: T.hues[5] })}</g>`;

	// The same two values as the editor shows them.
	const px = 196;
	let panel = text(px, 34, 'Health', { size: 10.5, fill: T.ink });
	panel += `<g class="old" ${delay(EDIT1)}>${text(410, 34, '22', { size: 10.5, fill: T.muted, anchor: 'end' })}</g>`;
	panel += `<g class="new" ${delay(EDIT1)}>${text(410, 34, '100', { size: 10.5, fill: T.hues[1], anchor: 'end' })}</g>`;
	panel += `<rect x="${px}" y="42" width="214" height="6" rx="3" fill="${T.rule}"/><rect x="${px}" y="42" width="47" height="6" rx="3" fill="${T.fills[1]}"/><rect class="heal" ${delay(EDIT1)} x="${px}" y="42" width="214" height="6" rx="3" fill="${T.fills[1]}"/>`;
	panel += text(px, 76, 'Backpack', { size: 10.5, fill: T.ink });
	const items = [
		(x, y) => `<circle cx="${x}" cy="${y}" r="7" fill="${T.fills[4]}"/>`,
		(x, y) => `<rect x="${x - 7}" y="${y - 5}" width="14" height="10" rx="2" fill="${T.fills[0]}"/>`,
		(x, y) => `<path d="M${x} ${y - 8}l8 14h-16z" fill="${T.fills[2]}"/>`,
		(x, y) => `<path d="M${x} ${y - 8}l7 8-7 8-7-8z" fill="${T.fills[3]}"/>`,
		(x, y) => `<rect x="${x - 3}" y="${y - 8}" width="6" height="16" rx="3" fill="${T.fills[5]}"/>`,
		null,
	];
	const counts = ['1', '12', '3', '2', '40', ''];
	items.forEach((draw, i) => {
		const x = px + i * 36.4;
		panel += `<rect x="${n(x)}" y="86" width="32" height="32" rx="5" fill="${T.page}" stroke="${T.rule}"/>`;
		if (!draw) return;
		panel += draw(x + 16, 100);
		if (i === 2) {
			panel += `<rect class="sel" ${delay(EDIT2 - 0.7)} x="${n(x - 1.5)}" y="84.5" width="35" height="35" rx="6" fill="none" stroke="${T.hues[2]}" stroke-width="1.5"/>`;
			panel += `<g class="old" ${delay(EDIT2)}>${text(x + 29, 115, counts[i], { size: 8.5, fill: T.soft, anchor: 'end' })}</g>`;
			panel += `<g class="new" ${delay(EDIT2)}>${text(x + 29, 115, '99', { size: 8.5, fill: T.hues[2], anchor: 'end' })}</g>`;
		} else panel += text(x + 29, 115, counts[i], { size: 8.5, fill: T.soft, anchor: 'end' });
	});
	panel += `<g class="new" ${delay(SAVE)}><rect x="${px}" y="136" width="62" height="24" rx="5" fill="${T.hues[5]}"/>${text(px + 31, 152, 'Saved', { size: 10.5, fill: T.page, anchor: 'middle' })}</g>`;
	panel += `<g class="old" ${delay(SAVE)}><rect x="${px}" y="136" width="62" height="24" rx="5" fill="none" stroke="${T.muted}"/>${text(px + 31, 152, 'Save', { size: 10.5, fill: T.ink, anchor: 'middle' })}</g>`;

	const css = [
		`.new{animation:new ${P}s linear infinite both}`,
		cycle('new', P, { from: 'opacity:0', to: 'opacity:1', enter: 0.2 }),
		`.old{animation:old ${P}s linear infinite both}`,
		cycle('old', P, { from: 'opacity:1', to: 'opacity:0', enter: 0.2 }),
		`.mv{animation:mv ${P}s linear infinite both}`,
		timeline('mv', P, [
			[0, 'transform:translate(0,0);animation-timing-function:ease-out'],
			[0.3, 'transform:translate(0,-8px);animation-timing-function:ease-in-out'],
			[1.1, `transform:translate(${n(dx)}px,${n(dy - 8)}px);animation-timing-function:ease-in`],
			[1.4, `transform:translate(${n(dx)}px,${n(dy)}px)`],
			[P - 1.6, `transform:translate(${n(dx)}px,${n(dy)}px)`],
			[P - 1.2, 'transform:translate(0,0)'],
			[P, 'transform:translate(0,0)'],
		]),
		`.sel{animation:new ${P}s linear infinite both}`,
		`.heal{transform-box:fill-box;transform-origin:0 50%;animation:heal ${P}s linear infinite both}`,
		cycle('heal', P, { from: 'transform:scaleX(.22)', to: 'transform:scaleX(1)', enter: 0.9 }),
		`@media (prefers-reduced-motion:reduce){.old{opacity:0}}`,
	].join('');

	return card(T, data, {
		repo: 'AbioticEditor',
		demo: dump + panel,
		css,
	});
}

/* ---- kotor-coop: two copies of the game, one world --------------------- */

export function coopCard(data, T) {
	// Each player walks a loop. Both screens show both players; the far one
	// arrives a beat late, which is what a network looks like.
	const walls = 'M10 12h70v26h50v-26h42v52h-34v52h-128z';
	const routeA = 'M30 34C56 20 70 60 104 62S150 30 154 46 124 96 96 100 20 104 28 76 14 44 30 34';
	const routeB = 'M150 96C120 110 90 70 62 82S26 96 30 60 60 30 76 50 150 60 152 76 160 90 150 96';
	const view = (x, label, lagA, lagB) => {
		const who = (route, color, lag, r) =>
			`<circle r="${r}" fill="${color}"><animateMotion dur="11s" begin="${lag ? n(lag - 11, 2) : 0}s" repeatCount="indefinite" path="${route}"/></circle>`;
		return (
			`<g transform="translate(${x} 14)"><rect width="182" height="128" rx="4" fill="${T.page}" stroke="${T.rule}"/>` +
			`<path d="${walls}" fill="none" stroke="${T.faint}" stroke-width="1.2" stroke-linejoin="round"/>` +
			who(routeA, T.fills[0], lagA, 4.5) +
			who(routeB, T.fills[2], lagB, 4.5) +
			`</g>` +
			text(x + 2, 160, label, { size: 9.5, fill: T.muted })
		);
	};
	// Packets on the wire between them.
	const packet = (from, to, y, color, begin) =>
		`<rect width="5" height="2.4" rx="1.2" fill="${color}"><animateMotion dur="1.3s" begin="${begin ? n(begin - 1.3, 2) : 0}s" repeatCount="indefinite" path="M${from} ${y}H${to}"/></rect>`;
	const wire =
		`<path d="M197 70H227M197 86H227" stroke="${T.rule}"/>` +
		packet(196, 224, 68.8, T.fills[0], 0) +
		packet(196, 224, 68.8, T.fills[0], 0.65) +
		packet(224, 196, 84.8, T.fills[2], 0.3) +
		packet(224, 196, 84.8, T.fills[2], 0.95);

	const legend =
		`<circle cx="${W - 104}" cy="157" r="3.5" fill="${T.fills[0]}"/>` +
		text(W - 96, 160, 'host', { size: 9.5, fill: T.muted }) +
		`<circle cx="${W - 58}" cy="157" r="3.5" fill="${T.fills[2]}"/>` +
		text(W - 50, 160, 'friend', { size: 9.5, fill: T.muted });

	return card(T, data, {
		repo: 'kotor-coop',
		demo: view(14, 'your screen', 0, 0.35) + view(228, 'their screen', 0.35, 0) + wire + legend,
		css: '',
	});
}

/* ---- kotor-mod-manager: the whole build, in order ---------------------- */

export function modsCard(data, T) {
	const P = 14;
	const slot = 1.7;
	const mods = ['Community patch', 'Restored content', 'High-resolution skyboxes', 'Character overhaul', 'Widescreen interface'];
	const at = (i) => 0.9 + i * slot;
	let list = text(14, 26, 'KOTOR 1, full build', { size: 10.5, fill: T.ink });
	list += text(W - 14, 26, 'installing in build order', { size: 9.5, fill: T.muted, anchor: 'end' });
	mods.forEach((name, i) => {
		const y = 52 + i * 26;
		list += `<text class="m st" ${delay(at(i))} x="14" y="${y}" font-size="10.5">${name}</text>`;
		list += `<g class="old" ${delay(at(i) + slot - 0.1)}><g class="new" ${delay(at(i))}>${text(W - 14, y, 'downloading', { size: 9.5, fill: T.muted, anchor: 'end' })}</g></g>`;
		list += `<g class="new" ${delay(at(i) + slot - 0.1)}>${text(W - 14, y, 'installed', { size: 9.5, fill: T.hues[5], anchor: 'end' })}</g>`;
		list += `<rect x="14" y="${y + 6}" width="${W - 28}" height="2.5" rx="1.25" fill="${T.rule}"/><rect class="bar" ${delay(at(i))} x="14" y="${y + 6}" width="${W - 28}" height="2.5" rx="1.25" fill="${T.fills[5]}"/>`;
	});

	const css = [
		stepCss(T, P, slot),
		`.bar{transform-box:fill-box;transform-origin:0 50%;animation:bar ${P}s linear infinite both}`,
		cycle('bar', P, { from: 'transform:scaleX(0)', to: 'transform:scaleX(1)', enter: slot - 0.1, ease: 'cubic-bezier(.3,0,.4,1)' }),
		`.new{animation:new ${P}s linear infinite both}`,
		cycle('new', P, { from: 'opacity:0', to: 'opacity:1', enter: 0.15 }),
		`.old{animation:old ${P}s linear infinite both}`,
		cycle('old', P, { from: 'opacity:1', to: 'opacity:0', enter: 0.15 }),
		`@media (prefers-reduced-motion:reduce){.old{opacity:0}}`,
	].join('');

	return card(T, data, {
		repo: 'kotor-mod-manager',
		demo: list,
		css,
	});
}

/* ---- Any other repository: drawn from its own data --------------------- */

export function genericCard(data, T, repo) {
	const P = 14;
	const r = data.repos[repo];
	const peak = Math.max(1, ...r.weeks);
	const sum = r.weeks.reduce((acc, c) => acc + c, 0);
	const pitch = (W - 28) / r.weeks.length;
	let demo = text(14, 26, r.release ? r.release.tag.slice(0, 30) : 'No release yet', { size: 10.5, fill: T.ink });
	demo += text(W - 14, 26, `${fmt(sum)} commits in twelve weeks`, { size: 9.5, fill: T.muted, anchor: 'end' });
	r.weeks.forEach((c, k) => {
		const h = c ? Math.max(2, (c / peak) * 84) : 1.5;
		const last = k === r.weeks.length - 1;
		demo += `<rect class="grow" ${delay(0.5 + k * 0.09)} x="${n(14 + k * pitch)}" y="${n(126 - h)}" width="${n(pitch - 5)}" height="${n(h)}" rx="2" fill="${last ? T.fills[0] : T.fills[2]}"${c ? '' : ' fill-opacity=".35"'}/>`;
	});
	demo += text(14, 141, 'twelve weeks ago', { size: 9.5, fill: T.muted }) + text(W - 14, 141, 'this week', { size: 9.5, fill: T.muted, anchor: 'end' });
	// What it is written in.
	let x = 14;
	let names = '';
	r.languages.slice(0, 5).forEach((l, i) => {
		const w = Math.max(2, l.share * (W - 28));
		demo += `<rect x="${n(x)}" y="152" width="${n(Math.max(1, w - 1.5))}" height="5" rx="1.5" fill="${T.fills[i]}"/>`;
		if (i < 3 && l.share > 0.08) names += text(x, 171, l.name, { size: 9.5, fill: T.muted });
		x += w;
	});
	const css = [
		`.grow{transform-box:fill-box;transform-origin:50% 100%;animation:grow ${P}s linear infinite both}`,
		cycle('grow', P, { from: 'transform:scaleY(0)', to: 'transform:scaleY(1)', enter: 0.6 }),
	].join('');
	return card(T, data, { repo, demo: demo + names, css });
}

const BESPOKE = {
	'emf-converter': emfCard,
	'mtx-decompressor': mtxCard,
	Drakan2PC: drakanCard,
	AbioticEditor: abioticCard,
	'kotor-coop': coopCard,
	'kotor-mod-manager': modsCard,
};

/**
 * The cards to draw, in order: every pinned repository, then PROFILE.extras,
 * leaving out the flagship (it has its own wide drawing). If that leaves an
 * odd number, the most-starred repository not already shown fills the gap.
 */
export function cardList(data) {
	const skip = new Set([PROFILE.flagship, ...(PROFILE.flagshipAlso ?? [])]);
	const names = [...new Set([...data.pinned, ...(PROFILE.extras ?? [])])].filter((name) => data.repos[name] && !skip.has(name));
	if (names.length % 2) {
		const spare = Object.values(data.repos)
			.filter((r) => !r.archived && !skip.has(r.name) && !names.includes(r.name) && r.name !== data.login)
			.sort((a, b) => b.stars - a.stars || b.pushedAt - a.pushedAt)[0];
		if (spare) names.push(spare.name);
	}
	return names.map((repo) => ({
		id: `card-${repo.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
		repo,
		href: data.repos[repo].homepage ?? data.repos[repo].url,
		alt: `${repo}: ${blurbFor(data, repo)}`,
		render: (T) => (BESPOKE[repo] ? BESPOKE[repo](data, T) : genericCard(data, T, repo)),
	}));
}
