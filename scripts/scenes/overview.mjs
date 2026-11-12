// Languages and tools. The square is all of the public code, sorted by
// language and laid along a Hilbert curve: a single line that fills a square
// without ever crossing itself, so each language is one continuous ribbon
// and its area is its share.

import { cycle, fmt, measure, n, svg, text, timeline, wrap } from '../lib/kit.mjs';
import { PROFILE } from '../profile.mjs';

const W = 860;
const P = 34;
const ORDER = 5; // 32 x 32 cells
const CELL = 8;

/** Distance along a Hilbert curve of side `size` to (x, y). */
function d2xy(size, d) {
	let x = 0;
	let y = 0;
	let t = d;
	for (let s = 1; s < size; s *= 2) {
		const rx = 1 & (t / 2);
		const ry = 1 & (t ^ rx);
		if (ry === 0) {
			if (rx === 1) {
				x = s - 1 - x;
				y = s - 1 - y;
			}
			[x, y] = [y, x];
		}
		x += s * rx;
		y += s * ry;
		t = Math.floor(t / 4);
	}
	return [x, y];
}

export function overview(data, T) {
	const size = 2 ** ORDER;
	const cells = size * size;
	const side = size * CELL;
	const top = 6;
	const pt = (d) => {
		const [x, y] = d2xy(size, d);
		return [x * CELL + CELL / 2, top + y * CELL + CELL / 2];
	};

	// Top six languages by bytes, everything else folded into "Other".
	const shown = data.langs.slice(0, 6).map((l, i) => ({ name: l.name, share: l.share, color: T.fills[i] }));
	const rest = 1 - shown.reduce((s, l) => s + l.share, 0);
	if (rest > 0.0005) shown.push({ name: 'Other', share: rest, color: T.muted });

	const DRAW = 7; // seconds to lay the whole curve
	let ribbons = '';
	let legend = '';
	let from = 0;
	let acc = 0;
	const legendX = side + 30;
	shown.forEach((l, i) => {
		acc += l.share;
		const to = i === shown.length - 1 ? cells : Math.max(from + 1, Math.round(acc * cells));
		let d = '';
		for (let c = from; c < to; c++) {
			const [x, y] = pt(c);
			d += `${c === from ? 'M' : 'L'}${x} ${y}`;
		}
		if (to - from === 1) d += 'h.01';
		const start = 0.6 + (from / cells) * DRAW;
		const dur = Math.max(0.12, ((to - from) / cells) * DRAW);
		// One keyframe set per ribbon, because each takes a different time to draw.
		ribbons += `<path class="rb" pathLength="1" d="${d}" stroke="${l.color}" style="animation-name:rb${i};animation-delay:${n(start, 2)}s"/>`;
		const y = top + 12 + i * 25;
		const pct = l.share * 100;
		legend += `<g class="lg" style="animation-delay:${n(start, 2)}s"><rect x="${legendX}" y="${y - 9.5}" width="10" height="10" rx="2" fill="${l.color}"/>${text(legendX + 18, y, l.name, { size: 12.5, fill: T.ink })}${text(legendX + 150, y, `${pct < 10 ? pct.toFixed(1) : pct.toFixed(0)}%`, { size: 12.5, fill: T.muted, anchor: 'end' })}</g>`;
		l.kf = timeline(`rb${i}`, P, [
			[0, 'stroke-dashoffset:1.002'],
			[dur, 'stroke-dashoffset:0'],
			[P - 2, 'stroke-dashoffset:0;opacity:1'],
			[P - 1.5, 'stroke-dashoffset:0;opacity:0'],
			[P, 'stroke-dashoffset:0;opacity:0'],
		]);
		from = to;
	});

	// The bare curve underneath, so the square reads as a path before it fills.
	let trace = '';
	for (let c = 0; c < cells; c++) {
		const [x, y] = pt(c);
		trace += `${c ? 'L' : 'M'}${x} ${y}`;
	}

	const caption = wrap('mono', 'All of my public code, sorted by language and folded along a Hilbert curve, so each language is one unbroken ribbon.', 11, side + 180);
	let cap = '';
	caption.forEach((l, i) => {
		cap += text(0, top + side + 22 + i * 16, l, { size: 11, fill: T.muted });
	});

	/* ---- Right column: the stack as a sentence, then the counts ------- */
	const colX = side + 30 + 150 + 50;
	const colW = W - colX;
	const stack = `${PROFILE.stack.slice(0, -1).join(', ')} and ${PROFILE.stack.at(-1)}.`;
	let right = '';
	let y = top + 24;
	for (const l of wrap('display', stack, 24, colW)) {
		right += text(colX, y, l, { font: 'display', size: 24, fill: T.ink });
		y += 31;
	}
	y += 14;
	const t = data.totals;
	const counts = [
		['commits this year', t.commits],
		['pull requests', t.pullRequests],
		['issues', t.issues],
		['public repositories', t.repos],
		['stars', t.stars],
		['forks', t.forks],
	];
	const half = colW / 2;
	counts.forEach(([label, value], i) => {
		const cx = colX + (i % 2) * half;
		const cy = y + Math.floor(i / 2) * 56;
		right += `<g class="lg" style="animation-delay:${n(1.2 + i * 0.25, 2)}s">${text(cx, cy + 20, fmt(value), { font: 'display', size: 27, fill: T.ink })}${text(cx, cy + 37, label, { size: 11, fill: T.muted })}</g>`;
	});
	const H = Math.ceil(Math.max(top + side + 22 + caption.length * 16, y + 3 * 56 - 10) + 4);

	const css = [
		`.tc{fill:none;stroke:${T.rule};stroke-width:1}`,
		`.rb{fill:none;stroke-width:${CELL - 2};stroke-linecap:square;stroke-linejoin:miter;stroke-dasharray:1 2;animation:${P}s linear infinite both}`,
		...shown.map((l) => l.kf),
		`.lg{animation:lg ${P}s linear infinite both}`,
		cycle('lg', P, { from: 'opacity:0', to: 'opacity:1', enter: 0.4, gap: 2 }),
	].join('');

	return svg({
		w: W,
		h: H,
		title: `Languages across public repositories: ${shown.map((l) => `${l.name} ${(l.share * 100).toFixed(0)}%`).join(', ')}. Tools: ${stack}`,
		fonts: ['display', 'mono'],
		css,
		body: `<path class="tc" d="${trace}"/>
${ribbons}
${legend}
${cap}
${right}`,
	});
}
