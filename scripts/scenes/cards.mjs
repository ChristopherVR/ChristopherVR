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
import { bake, dragon } from '../lib/wire.mjs';
import { PROFILE } from '../profile.mjs';

const W = 424;
const VH = 184; // the demonstration's viewport
const H = 296;

const BLURBS = {
	'emf-converter': 'Replays Windows metafiles (EMF, EMF+ and WMF) record by record into PNG, WebP, SVG or PDF, checked pixel for pixel against Windows itself.',
	'mtx-decompressor': 'Unpacks MicroType Express fonts from the EOT containers buried in old Office documents, back into plain TrueType.',
	Drakan2PC: 'Drakan: The Ancients’ Gates (PS2, 2002), statically recompiled from MIPS to C++ and built for Windows, Linux and the browser.',
	AbioticEditor: 'A save editor for Abiotic Factor, in the browser or on the desktop: characters, worlds and your base in 3D, with a backup kept on every save.',
	'kotor-coop': 'Drop-in co-op for Knights of the Old Republic. One player hosts and friends join the same world from their own copies of the game.',
	'kotor-mod-manager': 'Installs the community mod builds for KOTOR 1 and 2 in one click: downloads every mod, runs TSLPatcher and applies them in build order.',
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

/* ---- emf-converter: replay GDI/GDI+ records into vector/raster output -- */

export function emfCard(data, T) {
	const P = 14;
	const slot = 0.82;
	const records = [
		['EMR_HEADER', 108],
		['EMR_SETWORLDXFORM', 32],
		['EMR_CREATEPEN', 28],
		['EMR_BEGINPATH', 8],
		['EMR_POLYBEZIER16', 56],
		['EMR_STROKEANDFILL', 24],
		['EMR_ELLIPSE', 24],
		['EMR_EXTTEXTOUTW', 84],
		['EMR_EOF', 20],
	];
	const at = (i) => 0.7 + i * slot;
	let list =
		text(12, 20, 'diagram.emf', { size: 9.5, fill: T.ink }) +
		text(182, 20, 'EMF+ / WMF', { size: 8.5, fill: T.muted, anchor: 'end' }) +
		`<line x1="10" x2="184" y1="26" y2="26" stroke="${T.rule}"/>`;
	records.forEach(([name, size], i) => {
		const y = 41 + i * 15.5;
		list += `<rect class="sb" ${delay(at(i))} x="8" y="${n(y - 10.5)}" width="176" height="14.5" rx="3" fill="${T.hues[0]}"/>`;
		list += `<text class="m st" ${delay(at(i))} x="12" y="${n(y)}" font-size="8.8">${name}</text>`;
		list += `<text class="m st" ${delay(at(i))} x="180" y="${n(y)}" font-size="8.8" text-anchor="end">${size}</text>`;
	});

	// Rendered vector canvas: a crisp CAD/GDI+ vector schematic (grid, Bezier
	// contour, filled wave, geometric callout circle, and GDI+ text), plus the
	// output format pills (PNG, WebP, SVG, PDF) that light up on EMR_EOF.
	const ox = 194;
	const oy = 12;
	const cw = 218;
	const ch = 132;
	let grid = '';
	for (let gx = 24; gx < cw; gx += 24) grid += `M${ox + gx} ${oy + 4}v${ch - 8}`;
	for (let gy = 24; gy < ch; gy += 24) grid += `M${ox + 4} ${oy + gy}h${cw - 8}`;

	const curve = `M${ox + 22} ${oy + 100}C${ox + 58} ${oy + 100} ${ox + 64} ${oy + 34} ${ox + 108} ${oy + 44}S${ox + 158} ${oy + 96} ${ox + 196} ${oy + 42}`;
	const ribbon = `${curve}L${ox + 196} ${oy + 108}L${ox + 22} ${oy + 108}Z`;

	const formats = ['PNG', 'WebP', 'SVG', 'PDF'];
	let pills = '';
	formats.forEach((fmtLabel, i) => {
		const px = ox + i * 37;
		pills +=
			`<rect x="${px}" y="153" width="33" height="18" rx="3" fill="${T.page}" stroke="${T.rule}"/>` +
			`<rect class="pop" ${delay(at(8) + i * 0.12)} x="${px}" y="153" width="33" height="18" rx="3" fill="${T.fills[2]}" fill-opacity=".18" stroke="${T.hues[2]}"/>` +
			text(px + 16.5, 165, fmtLabel, { size: 8.5, fill: T.ink, anchor: 'middle' });
	});
	pills += `<g class="pop" ${delay(at(8) + 0.4)}>${text(412, 165, 'GDI exact ✓', { size: 8.5, fill: T.hues[5], anchor: 'end' })}</g>`;

	const canvas =
		`<rect x="${ox}" y="${oy}" width="${cw}" height="${ch}" rx="4" fill="${T.page}" stroke="${T.rule}"/>` +
		`<path d="${grid}" stroke="${T.rule}" stroke-width=".6" opacity=".65"/>` +
		`<rect class="flash" ${delay(at(0))} x="${ox}" y="${oy}" width="${cw}" height="${ch}" rx="4" fill="none" stroke="${T.hues[0]}" stroke-width="1.5"/>` +
		// World transform axes
		`<path class="draw" ${delay(at(1))} pathLength="1" d="M${ox + 18} ${oy + 18}V${oy + 114}H${ox + 202}" stroke="${T.muted}" stroke-width="1"/>` +
		// Filled Bezier region
		`<path class="pop" ${delay(at(5))} d="${ribbon}" fill="${T.fills[2]}" fill-opacity=".2"/>` +
		// Primary Bezier stroke & tangent handle
		`<path class="draw" ${delay(at(4))} pathLength="1" d="${curve}" stroke="${T.fills[0]}" stroke-width="2.2"/>` +
		`<g class="pop" ${delay(at(4) + 0.2)}><line x1="${ox + 64}" y1="${oy + 34}" x2="${ox + 108}" y2="${oy + 44}" stroke="${T.muted}" stroke-dasharray="2 2"/><circle cx="${ox + 64}" cy="${oy + 34}" r="2.2" fill="${T.muted}"/><rect x="${ox + 105.5}" y="${oy + 41.5}" width="5" height="5" fill="${T.hues[0]}"/></g>` +
		// Precision ellipse & concentric marker
		`<g class="pop" ${delay(at(6))}><circle cx="${ox + 158}" cy="${oy + 76}" r="18" fill="${T.fills[4]}" fill-opacity=".16" stroke="${T.hues[4]}" stroke-width="1.4"/><circle cx="${ox + 158}" cy="${oy + 76}" r="4" fill="${T.fills[4]}"/></g>` +
		// Vector text record
		`<g class="pop" ${delay(at(7))}>${text(ox + 28, oy + 32, 'GDI+ vector', { font: 'display', size: 13.5, fill: T.ink })}</g>` +
		pills;

	const css = [
		stepCss(T, P, slot),
		`.draw{fill:none;stroke-linecap:round;stroke-dasharray:1 2;animation:draw ${P}s linear infinite both}`,
		cycle('draw', P, { from: 'stroke-dashoffset:1.01', to: 'stroke-dashoffset:0', enter: 0.7, ease: 'ease-in-out' }),
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
	let list =
		text(14, 21, 'font.eot → font.ttf', { size: 9.5, fill: T.ink }) +
		text(164, 21, 'MTX', { size: 8.5, fill: T.muted, anchor: 'end' }) +
		`<line x1="14" x2="164" y1="27" y2="27" stroke="${T.rule}"/>`;
	steps.forEach((label, i) => {
		const y = 44 + i * 22.5;
		list += `<text class="m st" ${delay(at(i))} x="14" y="${n(y)}" font-size="10">${label}</text>`;
		// The three blocks show their progress; the other steps are instant.
		if (i >= 1 && i <= 3) {
			list += `<rect x="14" y="${n(y + 5.5)}" width="150" height="2.5" rx="1.25" fill="${T.rule}"/><rect class="bar" ${delay(at(i))} x="14" y="${n(y + 5.5)}" width="150" height="2.5" rx="1.25" fill="${T.fills[i + 1]}"/>`;
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

/* ---- Drakan2PC: PS2 MIPS R5900 in, C++ out, Arokh flying natively ----- */

export function drakanCard(data, T) {
	const P = 15;
	const slot = 1.05;
	const rows = [
		['lui   v0, 0x0034', 'v0 = 0x00340000;'],
		['lw    a0, 16(sp)', 'a0 = MEM32(sp + 16);'],
		['addiu a0, a0, 1', 'a0 += 1;'],
		['mtc1  a0, f12', 'f12 = bits(a0);'],
		['jal   0x1A3F40', 'fn_001A3F40(ctx);'],
		['beqz  v0, .L8', 'if (!v0) goto L8;'],
		['sw    v0, 0(a1)', 'MEM32(a1) = v0;'],
	];
	const at = (i) => 0.8 + i * slot;
	let code =
		text(12, 22, 'SCES-500.06 · MIPS', { size: 9, fill: T.muted }) +
		text(134, 22, 'recompiled C++', { size: 9, fill: T.muted }) +
		`<line x1="12" x2="272" y1="29" y2="29" stroke="${T.rule}"/>`;
	rows.forEach(([mips, cpp], i) => {
		const y = 48 + i * 18.4;
		code += `<rect class="sb" ${delay(at(i))} x="8" y="${n(y - 12)}" width="266" height="16.5" rx="3" fill="${T.hues[2]}"/>`;
		code += `<text class="m st" ${delay(at(i))} x="12" y="${n(y)}" font-size="9.3">${esc(mips)}</text>`;
		code += `<g class="out" ${delay(at(i) + 0.3)}>${text(134, y, cpp, { size: 9.3, fill: T.hues[2] })}</g>`;
	});

	// Native PC/browser viewport with Arokh (3D wireframe winged dragon).
	const spin = bake(dragon(), { frames: 40, cx: 348, cy: 90, scale: 32, tilt: 0.42, dist: 4.8 });
	const model =
		`<rect x="282" y="12" width="132" height="134" rx="5" fill="${T.page}" stroke="${T.rule}"/>` +
		text(290, 25, 'Surdana', { size: 8.5, fill: T.muted }) +
		text(406, 25, '60 FPS', { size: 8.5, fill: T.hues[5], anchor: 'end' }) +
		`<path d="${spin.first}" fill="${T.fills[0]}" fill-opacity=".08" stroke="${T.fills[0]}" stroke-width="1" stroke-linejoin="round"><animate attributeName="d" dur="14s" repeatCount="indefinite" values="${spin.values}"/></path>` +
		text(348, 165, 'Win · Linux · WASM', { size: 9, fill: T.muted, anchor: 'middle' });

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

/* ---- AbioticEditor: 3D base view + GATE save inspector ---------------- */

export function abioticCard(data, T) {
	const P = 15;
	const MOVE = 1.4;
	const EDIT1 = 4.6;
	const EDIT2 = 7.4;
	const SAVE = 10.2;

	// Left: 3D Base View (Office Sector floor grid + Crafting Bench / Crate move).
	const O = { x: 104, y: 50 };
	const a = { x: 14, y: 7 };
	const b = { x: -14, y: 7 };
	const corner = (i, j) => ({ x: O.x + i * a.x + j * b.x, y: O.y + i * a.y + j * b.y });
	const pt = (q, lift = 0) => `${n(q.x)} ${n(q.y - lift)}`;
	let base =
		`<rect x="10" y="10" width="188" height="140" rx="5" fill="${T.page}" stroke="${T.rule}"/>` +
		text(18, 24, '3D BASE VIEW', { size: 8.5, fill: T.ink }) +
		text(190, 24, 'Office', { size: 8.5, fill: T.muted, anchor: 'end' });
	for (let k = 0; k <= 5; k++) {
		base += `<path d="M${pt(corner(k, 0))}L${pt(corner(k, 5))}M${pt(corner(0, k))}L${pt(corner(5, k))}" stroke="${T.rule}" fill="none"/>`;
	}
	const shadeOf = (c, q) => mix(c, T.name === 'dark' ? T.page : '#10151c', q);
	const box = (i, j, h, color, spanI = 1, spanJ = 1) => {
		const m = 0.14;
		const [p00, p10, p11, p01] = [
			corner(i + m, j + m),
			corner(i + spanI - m, j + m),
			corner(i + spanI - m, j + spanJ - m),
			corner(i + m, j + spanJ - m),
		];
		return (
			`<path d="M${pt(p01)}L${pt(p11)}L${pt(p11, h)}L${pt(p01, h)}Z" fill="${shadeOf(color, 0.24)}"/>` +
			`<path d="M${pt(p11)}L${pt(p10)}L${pt(p10, h)}L${pt(p11, h)}Z" fill="${shadeOf(color, 0.5)}"/>` +
			`<path d="M${pt(p00, h)}L${pt(p10, h)}L${pt(p11, h)}L${pt(p01, h)}Z" fill="${color}"/>`
		);
	};
	// Static base structures: Charging Station (tall), Storage Crates, Cabinet
	base +=
		box(0, 0, 24, T.fills[4]) +
		box(1, 0, 12, T.fills[4]) +
		box(3, 0, 18, T.fills[3]) +
		box(0, 3, 14, T.fills[5]) +
		box(4, 2, 11, T.fills[3]);
	// Relocating a Crafting Bench (2x1 module) to a new grounded tile
	const from = [3, 3];
	const to = [1, 2];
	const dx = corner(...to).x - corner(...from).x;
	const dy = corner(...to).y - corner(...from).y;
	const tile = [corner(to[0], to[1]), corner(to[0] + 1, to[1]), corner(to[0] + 1, to[1] + 1), corner(to[0], to[1] + 1)];
	base += `<path class="new" ${delay(MOVE - 0.6)} d="M${tile.map((q) => pt(q)).join('L')}Z" fill="none" stroke="${T.hues[0]}" stroke-dasharray="3 2.5"/>`;
	base += `<g class="mv" ${delay(MOVE)}>${box(from[0], from[1], 14, T.fills[0])}</g>`;
	base += `<g class="new" ${delay(MOVE + 1.5)}>${text(190, 142, 'grounded ✓', { size: 8.5, fill: T.hues[5], anchor: 'end' })}</g>`;
	base += `<g class="old" ${delay(SAVE)}>${text(12, 167, 'WorldSave.sav', { size: 9, fill: T.muted })}</g>`;
	base += `<g class="new" ${delay(SAVE)}>${text(12, 167, 'saved · .bak kept ✓', { size: 9, fill: T.hues[5] })}</g>`;

	// Right: GATE Save Inspector (Character / World / 3D Base tabs, stats, items)
	const px = 208;
	let panel =
		text(px, 22, 'Character', { size: 9.5, fill: T.ink }) +
		`<line x1="${px}" x2="${px + 54}" y1="26" y2="26" stroke="${T.hues[0]}" stroke-width="1.5"/>` +
		text(px + 66, 22, 'World', { size: 9.5, fill: T.muted }) +
		text(px + 108, 22, '3D Base', { size: 9.5, fill: T.muted }) +
		`<line x1="${px}" x2="414" y1="27" y2="27" stroke="${T.rule}"/>`;

	// Health bar (22 -> 100)
	panel += text(px, 43, 'Health', { size: 9.5, fill: T.ink });
	panel += `<g class="old" ${delay(EDIT1)}>${text(414, 43, '22 / 100', { size: 9.5, fill: T.muted, anchor: 'end' })}</g>`;
	panel += `<g class="new" ${delay(EDIT1)}>${text(414, 43, '100 / 100', { size: 9.5, fill: T.hues[1], anchor: 'end' })}</g>`;
	panel +=
		`<rect x="${px}" y="49" width="206" height="5.5" rx="2.75" fill="${T.rule}"/>` +
		`<rect x="${px}" y="49" width="45" height="5.5" rx="2.75" fill="${T.fills[1]}"/>` +
		`<rect class="heal" ${delay(EDIT1)} x="${px}" y="49" width="206" height="5.5" rx="2.75" fill="${T.fills[1]}"/>`;

	// Crafting skill row
	panel += text(px, 71, 'Crafting', { size: 9.5, fill: T.ink });
	panel += text(414, 71, 'Lv 15', { size: 9.5, fill: T.hues[4], anchor: 'end' });
	panel +=
		`<rect x="${px}" y="77" width="206" height="4.5" rx="2.25" fill="${T.rule}"/>` +
		`<rect x="${px}" y="77" width="154" height="4.5" rx="2.25" fill="${T.fills[4]}"/>`;

	// Named GATE Inventory slots (crisp recognizable icons, no random shapes)
	panel += text(px, 97, 'Inventory', { size: 9.5, fill: T.ink });
	const slots = [
		{
			name: 'Key',
			count: '1',
			icon: (x, y) =>
				`<rect x="${x - 7}" y="${y - 4.5}" width="14" height="9" rx="1.5" fill="none" stroke="${T.hues[4]}" stroke-width="1.3"/><rect x="${x - 4.5}" y="${y - 2}" width="4" height="3" fill="${T.fills[4]}"/>`,
		},
		{
			name: 'Cell',
			count: '2',
			editTo: '99',
			icon: (x, y) =>
				`<rect x="${x - 4.5}" y="${y - 5}" width="9" height="10" rx="1.5" fill="none" stroke="${T.hues[2]}" stroke-width="1.3"/><rect x="${x - 2}" y="${y - 7}" width="4" height="2" fill="${T.fills[2]}"/><rect x="${x - 2.5}" y="${y - 2}" width="5" height="5" fill="${T.fills[2]}"/>`,
		},
		{
			name: 'Med',
			count: '4',
			icon: (x, y) =>
				`<path d="M${x - 1.8} ${y - 5.5}h3.6v3.7h3.7v3.6h-3.7v3.7h-3.6v-3.7h-3.7v-3.6h3.7z" fill="${T.fills[1]}"/>`,
		},
		{
			name: 'Tool',
			count: '1',
			icon: (x, y) =>
				`<path d="M${x - 5} ${y + 4}L${x + 4} ${y - 5}M${x + 1} ${y - 5.5}l4.5 4.5" stroke="${T.hues[0]}" stroke-width="2" stroke-linecap="round"/>`,
		},
	];
	slots.forEach((s, i) => {
		const sx = px + i * 52.5;
		panel += `<rect x="${n(sx)}" y="103" width="48" height="36" rx="4" fill="${T.page}" stroke="${T.rule}"/>`;
		panel += s.icon(sx + 15, 118);
		panel += text(sx + 5, 134, s.name, { size: 7.5, fill: T.muted });
		if (s.editTo) {
			panel += `<rect class="sel" ${delay(EDIT2 - 0.7)} x="${n(sx - 1.2)}" y="101.8" width="50.4" height="38.4" rx="5" fill="none" stroke="${T.hues[2]}" stroke-width="1.4"/>`;
			panel += `<g class="old" ${delay(EDIT2)}>${text(sx + 44, 134, s.count, { size: 8.5, fill: T.soft, anchor: 'end' })}</g>`;
			panel += `<g class="new" ${delay(EDIT2)}>${text(sx + 44, 134, s.editTo, { size: 8.5, fill: T.hues[2], anchor: 'end' })}</g>`;
		} else {
			panel += text(sx + 44, 134, s.count, { size: 8.5, fill: T.soft, anchor: 'end' });
		}
	});

	panel += text(px, 163, 'Steam · Game Pass', { size: 8.5, fill: T.muted });
	panel += `<g class="new" ${delay(SAVE)}><rect x="348" y="148" width="66" height="22" rx="4" fill="${T.hues[5]}"/>${text(381, 162.5, 'SAVED ✓', { size: 9.5, fill: T.page, anchor: 'middle' })}</g>`;
	panel += `<g class="old" ${delay(SAVE)}><rect x="348" y="148" width="66" height="22" rx="4" fill="none" stroke="${T.muted}"/>${text(381, 162.5, 'SAVE', { size: 9.5, fill: T.ink, anchor: 'middle' })}</g>`;

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
		demo: base + panel,
		css,
	});
}

/* ---- kotor-coop: two copies of KOTOR, one shared Dantooine world ------ */

export function coopCard(data, T) {
	const P = 11;
	// Jedi Enclave courtyard layout: outer walls + central pillars.
	const walls = 'M12 28h156v84h-156z M56 46h20v16h-20z M104 46h20v16h-20z M56 78h20v16h-20z M104 78h20v16h-20z';
	const routeA = 'M30 42C52 34 86 36 90 68S136 102 150 76 138 36 92 42 32 98 30 78 22 48 30 42';
	const routeB = 'M148 96C124 102 92 94 88 68S46 36 32 64 48 100 92 94 148 44 150 64 156 90 148 96';

	const view = (x, title, hpColor, lagA, lagB) => {
		const who = (route, color, lag) =>
			`<g><circle r="7" fill="${color}" fill-opacity=".22"/><circle r="3.8" fill="${color}"/><animateMotion dur="${P}s" begin="${lag ? n(lag - P, 2) : 0}s" repeatCount="indefinite" path="${route}"/></g>`;
		return (
			`<g transform="translate(${x} 10)">` +
			`<rect width="180" height="142" rx="5" fill="${T.page}" stroke="${T.rule}"/>` +
			// Mini KOTOR HUD top bar
			`<path d="M0 5a5 5 0 0 1 5-5h170a5 5 0 0 1 5 5v15H0z" fill="${T.wash}"/>` +
			`<line x1="0" x2="180" y1="20" y2="20" stroke="${T.rule}"/>` +
			`<rect x="7" y="7" width="18" height="5" rx="2.5" fill="${hpColor}"/>` +
			text(30, 13, title, { size: 8.5, fill: T.ink }) +
			// Courtyard arena & synced players
			`<path d="${walls}" fill="none" stroke="${T.faint}" stroke-width="1.1" stroke-linejoin="round"/>` +
			who(routeA, T.fills[4], lagA) +
			who(routeB, T.fills[0], lagB) +
			// Synced in-game chat strip
			`<line x1="0" x2="180" y1="120" y2="120" stroke="${T.rule}"/>` +
			`<g class="c1">${text(8, 134, 'P2: Ready to explore?', { size: 8.2, fill: T.hues[0] })}</g>` +
			`<g class="c2">${text(8, 134, 'P1: Let’s go!', { size: 8.2, fill: T.hues[4] })}</g>` +
			`</g>`
		);
	};

	// Live state packets on the wire between Host and Friend.
	const packet = (from, to, y, color, begin) =>
		`<rect width="6" height="2.4" rx="1.2" fill="${color}"><animateMotion dur="1.2s" begin="${begin ? n(begin - 1.2, 2) : 0}s" repeatCount="indefinite" path="M${from} ${y}H${to}"/></rect>`;
	const wire =
		`<path d="M193 68H231M193 84H231" stroke="${T.rule}"/>` +
		text(212, 61, 'sync', { size: 8, fill: T.muted, anchor: 'middle' }) +
		packet(192, 226, 66.8, T.fills[4], 0) +
		packet(192, 226, 66.8, T.fills[4], 0.6) +
		packet(226, 192, 82.8, T.fills[0], 0.3) +
		packet(226, 192, 82.8, T.fills[0], 0.9);

	const footer =
		text(12, 169, 'Co-op → Host · Dantooine', { size: 9, fill: T.muted }) +
		`<circle cx="${W - 104}" cy="166" r="3.2" fill="${T.fills[4]}"/>` +
		text(W - 97, 169, 'host', { size: 9, fill: T.muted }) +
		`<circle cx="${W - 58}" cy="166" r="3.2" fill="${T.fills[0]}"/>` +
		text(W - 51, 169, 'friend', { size: 9, fill: T.muted });

	const css = [
		`.c1{animation:c1 ${P}s linear infinite}`,
		timeline('c1', P, [[0, 'opacity:0'], [1.0, 'opacity:0'], [1.4, 'opacity:1'], [5.2, 'opacity:1'], [5.6, 'opacity:0'], [P, 'opacity:0']]),
		`.c2{animation:c2 ${P}s linear infinite}`,
		timeline('c2', P, [[0, 'opacity:0'], [5.6, 'opacity:0'], [6.0, 'opacity:1'], [10.0, 'opacity:1'], [10.4, 'opacity:0'], [P, 'opacity:0']]),
	].join('');

	return card(T, data, {
		repo: 'kotor-coop',
		demo: view(12, 'Host · Enclave', T.fills[4], 0, 0.35) + view(232, 'Friend · Joined', T.fills[0], 0.35, 0) + wire + footer,
		css,
	});
}

/* ---- kotor-mod-manager: desktop app UI with Mod Builds & TSLPatcher --- */

export function modsCard(data, T) {
	const P = 14;
	const slot = 2.05;
	const mods = [
		['K1 Community Patch', 'DeadlyStream · TSLPatcher'],
		['KOTOR 1 Restoration', 'DeadlyStream · TSLPatcher'],
		['High-Res Skyboxes', 'Nexus · Override'],
		['Widescreen UI', 'DeadlyStream · TSLPatcher'],
	];
	const at = (i) => 0.8 + i * slot;

	// Mini desktop app frame with real navigation tabs
	let ui =
		`<rect x="10" y="10" width="404" height="164" rx="5" fill="${T.page}" stroke="${T.rule}"/>` +
		`<path d="M10 15a5 5 0 0 1 5-5h394a5 5 0 0 1 5 5v18H10z" fill="${T.wash}"/>` +
		`<line x1="10" x2="414" y1="33" y2="33" stroke="${T.rule}"/>` +
		text(20, 25, 'Mod Builds', { size: 9, fill: T.ink }) +
		`<line x1="20" x2="74" y1="32" y2="32" stroke="${T.hues[0]}" stroke-width="1.6"/>` +
		text(88, 25, 'Library', { size: 9, fill: T.muted }) +
		text(140, 25, 'Conflicts', { size: 9, fill: T.muted }) +
		text(202, 25, 'Settings', { size: 9, fill: T.muted }) +
		text(404, 25, 'KOTOR 1 & 2', { size: 8.5, fill: T.hues[4], anchor: 'end' }) +
		// Build header
		text(20, 48, 'KOTOR 1 Full Build', { size: 9.5, fill: T.ink }) +
		text(404, 48, '173 mods · build order', { size: 8.5, fill: T.muted, anchor: 'end' });

	mods.forEach(([name, source], i) => {
		const y = 67 + i * 22.5;
		ui += `<text class="m st" ${delay(at(i))} x="20" y="${n(y)}" font-size="9.5">${name}</text>`;
		ui += text(166, y, source, { size: 8.2, fill: T.muted });
		ui += `<g class="old" ${delay(at(i) + slot - 0.15)}><g class="new" ${delay(at(i))}>${text(404, y, 'patching…', { size: 8.5, fill: T.hues[0], anchor: 'end' })}</g></g>`;
		ui += `<g class="new" ${delay(at(i) + slot - 0.15)}>${text(404, y, 'installed ✓', { size: 8.5, fill: T.hues[5], anchor: 'end' })}</g>`;
		ui +=
			`<rect x="20" y="${n(y + 5.5)}" width="384" height="2.4" rx="1.2" fill="${T.rule}"/>` +
			`<rect class="bar" ${delay(at(i))} x="20" y="${n(y + 5.5)}" width="384" height="2.4" rx="1.2" fill="${T.fills[5]}"/>`;
	});

	// Bottom status bar
	ui +=
		`<line x1="10" x2="414" y1="152" y2="152" stroke="${T.rule}"/>` +
		text(20, 166, 'TSLPatcher automated · DeadlyStream & Nexus', { size: 8.5, fill: T.muted }) +
		text(404, 166, '0 conflicts ✓', { size: 8.5, fill: T.hues[5], anchor: 'end' });

	const css = [
		stepCss(T, P, slot),
		`.bar{transform-box:fill-box;transform-origin:0 50%;animation:bar ${P}s linear infinite both}`,
		cycle('bar', P, { from: 'transform:scaleX(0)', to: 'transform:scaleX(1)', enter: slot - 0.15, ease: 'cubic-bezier(.3,0,.4,1)' }),
		`.new{animation:new ${P}s linear infinite both}`,
		cycle('new', P, { from: 'opacity:0', to: 'opacity:1', enter: 0.15 }),
		`.old{animation:old ${P}s linear infinite both}`,
		cycle('old', P, { from: 'opacity:1', to: 'opacity:0', enter: 0.15 }),
		`@media (prefers-reduced-motion:reduce){.old{opacity:0}}`,
	].join('');

	return card(T, data, {
		repo: 'kotor-mod-manager',
		demo: ui,
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
