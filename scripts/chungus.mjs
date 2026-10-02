// The Chungus stage: a very large rabbit walks in and snaps a gold gauntlet.
// The README rows below it (scripts/sections.mjs) time their dust to land on
// the snap. Everything plays once, from page load, and holds its last frame.
//
// Chungus himself is a set of frames rendered from the 3D model on the
// Office suite launcher (scripts/chungus-render), embedded as WebP.

import { readFileSync } from 'node:fs';

const FONT = `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif`;
const FRAMES_DIR = new URL('../assets/chungus/', import.meta.url);

// Beats, in seconds from the moment an image loads.
export const T = { walk: 1.0, arrive: 4.0, speak: 4.5, raise: 5.9, charge: 6.4, snap: 7.6, dust: 7.75, gap: 0.45, end: 12 };

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const pct = (t) => `${Math.min(100, (t / T.end) * 100).toFixed(3)}%`;

/** Deterministic noise, so a given seed always lays the dust out the same way. */
export function random(seed) {
	return () => {
		seed |= 0;
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Keyframes that show something only inside the given [from, to) windows. */
function windows(name, spans) {
	const stops = ['0%{opacity:0}'];
	for (const [a, b] of spans) {
		stops.push(`${pct(a)}{opacity:1}`);
		// A window that runs past the end holds the frame for good.
		stops.push(b < T.end ? `${pct(b)}{opacity:0}` : '100%{opacity:1}');
	}
	return `@keyframes ${name}{${stops.join('')}}`;
}

const svg = (w, h, title, style, body) =>
	`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="${FONT}">
<title>${esc(title)}</title>
<style>${style}</style>
${body}
</svg>
`;

/* ---- The stage ------------------------------------------------------- */

function loadFrames() {
	const list = JSON.parse(readFileSync(new URL('frames.json', FRAMES_DIR), 'utf8'));
	return list.map((f) => ({
		...f,
		href: `data:image/webp;base64,${readFileSync(new URL(f.name, FRAMES_DIR)).toString('base64')}`,
	}));
}

/** When each frame is on screen, as [from, to) windows in seconds. */
function frameSchedule(frames) {
	const spans = frames.map(() => []);
	const at = (phase) => frames.flatMap((f, i) => (f.phase === phase ? [i] : []));
	const walk = at('walk');
	for (let k = 0; T.walk + k * 0.1 < T.arrive - 1e-6; k++)
		spans[walk[k % walk.length]].push([T.walk + k * 0.1, T.walk + (k + 1) * 0.1]);
	const turn = at('turn');
	turn.forEach((i, k) => spans[i].push([T.arrive + k * 0.1, T.arrive + (k + 1) * 0.1]));
	spans[turn.at(-1)].push([T.arrive + turn.length * 0.1, T.raise]);
	const raise = at('raise');
	raise.forEach((i, k) => spans[i].push([T.raise + k * 0.1, T.raise + (k + 1) * 0.1]));
	spans[raise.at(-1)].push([T.raise + raise.length * 0.1, T.charge]);
	const charge = at('charge');
	for (let k = 0; T.charge + k * 0.15 < T.snap - 1e-6; k++)
		spans[charge[k % 2]].push([T.charge + k * 0.15, Math.min(T.charge + (k + 1) * 0.15, T.snap)]);
	const snap = at('snap');
	spans[snap[0]].push([T.snap, T.snap + 0.06]);
	spans[snap[1]].push([T.snap + 0.06, T.snap + 0.9]);
	spans[at('after')[0]].push([T.snap + 0.9, T.end + 1]);
	return spans;
}

export function stageSvg(theme) {
	const W = 860;
	const H = 440;
	const frames = loadFrames();
	const spans = frameSchedule(frames);
	// Frames are 840 x 960, shown at 350 x 400 with the feet on the bottom edge.
	const fw = 350;
	const fh = 400;
	const fx = (W - fw) / 2;
	const fy = H - fh;
	const hand = { x: fx + 0.66 * fw, y: fy + 0.4 * fh };
	const head = { x: fx + 0.5 * fw, y: fy + 0.38 * fh };
	const last = frames.length - 1;

	const images = frames
		.map((f, i) => `<image class="f f${i}" href="${f.href}" x="${fx}" y="${fy}" width="${fw}" height="${fh}"/>`)
		.join('\n');
	const style = `.f,.walker,.bubble,.word,.flash,.caption{animation-duration:${T.end}s;animation-fill-mode:forwards;animation-timing-function:step-end}
.f{opacity:0}
${spans.map((s, i) => `${windows(`f${i}`, s)}.f${i}{animation-name:f${i}}`).join('\n')}
@keyframes walker{0%{transform:translateX(${W}px)}${pct(T.walk)}{transform:translateX(${W}px)}${pct(T.arrive)}{transform:none}100%{transform:none}}
.walker{animation-name:walker;animation-timing-function:linear}
${windows('bubble', [[T.speak, T.raise]])}.bubble{animation-name:bubble;opacity:0}
@keyframes word{0%{opacity:0;transform:scale(.4)}${pct(T.snap)}{opacity:0;transform:scale(.4)}${pct(T.snap + 0.2)}{opacity:1;transform:scale(1.1)}${pct(T.snap + 1.1)}{opacity:1;transform:scale(1)}${pct(T.snap + 1.6)}{opacity:0;transform:scale(1)}100%{opacity:0}}
.word{animation-name:word;animation-timing-function:ease-out;transform-box:fill-box;transform-origin:center;opacity:0}
@keyframes flash{0%{opacity:0}${pct(T.snap)}{opacity:0}${pct(T.snap + 0.08)}{opacity:${theme.flashPeak}}${pct(T.snap + 0.7)}{opacity:0}100%{opacity:0}}
.flash{animation-name:flash;animation-timing-function:ease-out;opacity:0}
@keyframes caption{0%{opacity:0}${pct(T.dust + 2.6)}{opacity:0}${pct(T.dust + 3.2)}{opacity:1}100%{opacity:1}}
.caption{animation-name:caption;animation-timing-function:ease-in-out;opacity:0}
@media (prefers-reduced-motion: reduce){*{animation:none!important}.f${last}{opacity:1}.walker{transform:none}}`;

	const body = `
<text x="0" y="44" font-size="34" font-weight="800" fill="${theme.text}">Hi, I'm Christopher</text>
<text x="0" y="74" font-size="15" fill="${theme.muted}">Azure Software Engineer · Brisbane, Australia</text>
<text x="0" y="98" font-size="13" fill="${theme.muted}">AZ-204 · AZ-900 · AI-103</text>
<g class="walker">${images}</g>
<g class="bubble"><rect x="${head.x - 250}" y="${head.y - 92}" width="170" height="40" rx="14" fill="${theme.card}" stroke="${theme.border}"/><path d="M${head.x - 81} ${head.y - 76}l16 6l-16 6z" fill="${theme.card}"/><text x="${head.x - 165}" y="${head.y - 66}" text-anchor="middle" font-size="15" font-weight="700" fill="${theme.text}">Hold my carrot.</text></g>
<text class="word" x="${hand.x + 110}" y="${hand.y - 40}" text-anchor="middle" font-size="44" font-weight="900" font-style="italic" fill="#ffd23f" stroke="#9c6a10" stroke-width="1.5">SNAP</text>
<text class="caption" x="${W}" y="${H - 16}" text-anchor="end" font-size="15" font-style="italic" fill="${theme.muted}">Perfectly balanced, as all things should be.</text>
<rect class="flash" width="${W}" height="${H}" fill="${theme.flash}"/>`;
	return svg(W, H, "Christopher's profile: a very large rabbit with a gold gauntlet walks in and snaps", style, body);
}
