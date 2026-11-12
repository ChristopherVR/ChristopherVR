// Shared pieces for every profile graphic: themes, embedded fonts, text
// measurement, and the timeline helpers the animations are written with.
//
// Every graphic is one self-contained SVG. GitHub shows README images through
// <img>, which means no scripts, no external requests and no interaction, so
// everything that moves is CSS keyframes or SMIL baked in at build time.

import { readFileSync } from 'node:fs';

const fontDir = new URL('../../assets/fonts/', import.meta.url);
export const atlas = JSON.parse(readFileSync(new URL('atlas.json', fontDir), 'utf8'));

const FONTS = {
	display: { file: 'display.woff2', family: 'CvrDisplay', fallback: `Georgia,'Times New Roman',serif` },
	text: { file: 'text.woff2', family: 'CvrText', fallback: `Georgia,'Times New Roman',serif` },
	mono: { file: 'mono.woff2', family: 'CvrMono', fallback: `ui-monospace,SFMono-Regular,Menlo,Consolas,monospace` },
};
const b64 = Object.fromEntries(
	Object.entries(FONTS).map(([k, f]) => [k, readFileSync(new URL(f.file, fontDir)).toString('base64')]),
);

/** The hex-editor highlight colours, one per parsed field, plus the page inks. */
export const THEMES = {
	dark: {
		name: 'dark',
		page: '#0d1117',
		ink: '#e6edf3',
		soft: '#aab4bf',
		muted: '#7d8590',
		faint: '#3d444d',
		rule: '#262c36',
		wash: '#151b23',
		hues: ['#f2b84b', '#ff7d6e', '#3fd4be', '#b596ff', '#5aaeff', '#a6d85c', '#f78fc8'],
		fills: ['#f2b84b', '#ff7d6e', '#3fd4be', '#b596ff', '#5aaeff', '#a6d85c', '#f78fc8'],
	},
	light: {
		name: 'light',
		page: '#ffffff',
		ink: '#1b1f24',
		soft: '#454c54',
		muted: '#636c76',
		faint: '#b4bcc5',
		rule: '#dfe4ea',
		wash: '#f4f6f8',
		// `hues` are dark enough to set text in; `fills` are the same colours at
		// the strength a filled shape wants on a white page.
		hues: ['#a15c00', '#cf3a2b', '#0b7f70', '#7a4be0', '#0b63c7', '#4a7a0a', '#bd3587'],
		fills: ['#e9a52b', '#f0705f', '#22b3a0', '#9a78f2', '#3d92ee', '#7fb536', '#e567b0'],
	},
};

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Compact number for SVG attributes. */
export const n = (v, d = 1) => {
	const s = Number(v).toFixed(d);
	return s.includes('.') ? s.replace(/\.?0+$/, '') || '0' : s;
};

/** Blend two #rrggbb colours; t = 0 gives a, t = 1 gives b. */
export function mix(a, b, t) {
	const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
	const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
	return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

export const fmt = (v) => Number(v).toLocaleString('en-AU');

/** Width of `str` in px, using the same advances and kerning the browser will. */
export function measure(font, str, size) {
	const f = atlas[font];
	let w = 0;
	const chars = [...String(str)];
	for (let i = 0; i < chars.length; i++) {
		w += f.adv[chars[i]] ?? f.adv.n;
		if (i + 1 < chars.length) w += f.kern[chars[i] + chars[i + 1]] ?? 0;
	}
	return (w * size) / f.upm;
}

/** Greedy word wrap against real glyph widths. */
export function wrap(font, str, size, width) {
	const lines = [''];
	for (const word of String(str).split(' ')) {
		const cur = lines[lines.length - 1];
		const next = cur ? `${cur} ${word}` : word;
		if (cur && measure(font, next, size) > width) lines.push(word);
		else lines[lines.length - 1] = next;
	}
	return lines;
}

/** A <text> element. `font` is display, text or mono. */
export function text(x, y, str, { font = 'mono', size = 12, fill, anchor, cls, style, opacity, ls } = {}) {
	const a = [
		`x="${n(x)}" y="${n(y)}"`,
		`class="${font[0]}${cls ? ` ${cls}` : ''}"`,
		`font-size="${n(size, 2)}"`,
		fill && `fill="${fill}"`,
		anchor && `text-anchor="${anchor}"`,
		opacity != null && `opacity="${opacity}"`,
		ls && `letter-spacing="${ls}"`,
		style && `style="${style}"`,
	].filter(Boolean);
	return `<text ${a.join(' ')}>${esc(str)}</text>`;
}

/**
 * Keyframes from absolute times. `stops` is [[seconds, 'css declarations'], ...]
 * over a loop of `period` seconds, so a scene reads as a timeline rather than
 * as a column of percentages.
 */
export function timeline(name, period, stops) {
	const body = stops
		.map(([t, css]) => `${n(Math.min(100, Math.max(0, (t / period) * 100)), 3)}%{${css}}`)
		.join('');
	return `@keyframes ${name}{${body}}`;
}

/**
 * The standard loop: hidden, in at 0, hold, out shortly before the loop ends.
 * Give each element its own animation-delay and the whole scene re-parses in
 * the order it first appeared, instead of blinking off all at once.
 */
export function cycle(name, period, { from, to, enter = 0.4, gap = 1.6, exit = 0.4, ease = 'cubic-bezier(.2,.8,.2,1)' }) {
	return timeline(name, period, [
		[0, `${from};animation-timing-function:${ease}`],
		[enter, to],
		[period - gap, `${to};animation-timing-function:ease-in`],
		[period - gap + exit, from],
		[period, from],
	]);
}

/** Deterministic PRNG so a build with the same seed draws the same picture. */
export function random(seed) {
	let s = (seed >>> 0) || 1;
	return () => {
		s ^= s << 13;
		s >>>= 0;
		s ^= s >>> 17;
		s ^= s << 5;
		s >>>= 0;
		return s / 4294967296;
	};
}

/**
 * Wrap a scene in its <svg>. `fonts` lists the faces the scene uses; each is
 * embedded as base64 because an image cannot request a font file.
 */
export function svg({ w, h, title, fonts = ['mono'], css = '', defs = '', body }) {
	const faces = fonts
		.map(
			(k) =>
				`@font-face{font-family:${FONTS[k].family};src:url(data:font/woff2;base64,${b64[k]}) format('woff2')}` +
				`.${k[0]}{font-family:${FONTS[k].family},${FONTS[k].fallback}}`,
		)
		.join('');
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}">
<title>${esc(title)}</title>
<style>${faces}text{white-space:pre}${css}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}</style>
${defs ? `<defs>${defs}</defs>` : ''}
${body}
</svg>
`;
}

/* ---- TrueType outlines ------------------------------------------------ */

/**
 * Turn one glyph's raw TrueType points into an SVG path plus the control
 * points, placed at (ox, oy) with the baseline on oy. TrueType contours are
 * quadratic: consecutive off-curve points imply an on-curve point half way
 * between them, which is why the outline drawings show more handles than
 * anchors.
 */
export function outline(font, ch, size, ox, oy) {
	const f = atlas[font];
	const g = f.glyphs?.[ch];
	const k = size / f.upm;
	const adv = ((f.adv[ch] ?? f.adv.n) * size) / f.upm;
	if (!g || !g.pts.length) return { d: '', on: [], off: [], handles: [], adv };
	const P = g.pts.map(([x, y, on]) => ({ x: ox + x * k, y: oy - y * k, on: !!on }));
	const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, on: true });
	const p = (q) => `${n(q.x)} ${n(q.y)}`;
	let d = '';
	const handles = [];
	let start = 0;
	for (const end of g.ends) {
		const c = P.slice(start, end + 1);
		start = end + 1;
		if (c.length < 2) continue;
		// Start on an on-curve point, inventing one if the contour has none.
		let first = c.findIndex((q) => q.on);
		let pts;
		if (first === -1) {
			pts = [mid(c[c.length - 1], c[0]), ...c];
		} else {
			pts = [...c.slice(first), ...c.slice(0, first)];
		}
		d += `M${p(pts[0])}`;
		let prevOn = pts[0];
		for (let i = 1; i <= pts.length; i++) {
			const cur = pts[i % pts.length];
			if (cur.on) {
				if (i < pts.length) d += `L${p(cur)}`;
				prevOn = cur;
				continue;
			}
			const next = pts[(i + 1) % pts.length];
			const to = next.on ? next : mid(cur, next);
			d += `Q${p(cur)} ${p(to)}`;
			handles.push([prevOn, cur], [cur, to]);
			prevOn = to;
			if (next.on) i++;
		}
		d += 'Z';
	}
	return { d, on: P.filter((q) => q.on), off: P.filter((q) => !q.on), handles, adv };
}

/** Lay a string out glyph by glyph with kerning; returns each glyph's outline. */
export function outlineText(font, str, size, x, y) {
	const f = atlas[font];
	const chars = [...str];
	const out = [];
	let cx = x;
	chars.forEach((ch, i) => {
		const o = outline(font, ch, size, cx, y);
		out.push({ ch, x: cx, ...o });
		cx += o.adv + (((f.kern[ch + (chars[i + 1] ?? '')] ?? 0) * size) / f.upm);
	});
	return { glyphs: out, width: cx - x };
}
