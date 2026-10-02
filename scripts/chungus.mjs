// The whole profile as one animated SVG: a picture of the README (banner,
// about, projects, the live activity and overview graphs) that a very large
// rabbit walks into, snaps a gold gauntlet at, and blows away as dust. Only
// he is left; then the page fades back and the loop starts again.
//
// CSS animations only (transforms and opacity), so it stays cheap to play in
// an <img>. Under prefers-reduced-motion the page simply stays put.

import { chungusFigure, figureDefs } from './chungus-figure.mjs';

const W = 860;
const PAD = 24;
const CYCLE = 20; // seconds for one loop
const FONT = `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif`;

// Beats of the loop, in seconds.
const T = { walk: 3.5, arrive: 6.5, speak: 6.6, raise: 7.6, charge: 8.0, snap: 9.4, dust: 10, gap: 0.55, caption: 14.6, fade: 18.4 };

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const pct = (t) => `${((t / CYCLE) * 100).toFixed(3)}%`;

/** @param {string} name @param {[number, string][]} stops */
const keyframes = (name, stops) =>
	`@keyframes ${name}{${stops.map(([t, css]) => `${pct(t)}{${css}}`).join('')}}`;

/** Deterministic noise, so every regeneration lays the dust out the same way. */
function random(seed) {
	return () => {
		seed |= 0;
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Greedy wrap by an average glyph width; good enough for a system sans. */
function wrap(text, size, width) {
	const max = Math.floor(width / (size * 0.53));
	const lines = [''];
	for (const word of text.split(' ')) {
		const line = lines[lines.length - 1];
		if ((line + ' ' + word).trim().length > max) lines.push(word);
		else lines[lines.length - 1] = (line + ' ' + word).trim();
	}
	return lines;
}

function paragraph(text, x, y, size, width, fill, lineHeight = size * 1.55) {
	const lines = wrap(text, size, width);
	const svg = lines
		.map((l, i) => `<text x="${x}" y="${y + i * lineHeight}" font-size="${size}" fill="${fill}">${esc(l)}</text>`)
		.join('');
	return { svg, height: lines.length * lineHeight };
}

/** Nest one of the generated cards (activity, overview) at a position. */
const nest = (svg, y) => svg.replace('<svg xmlns="http://www.w3.org/2000/svg"', `<svg x="0" y="${y}"`);

function layout(theme, activity, overview) {
	const sections = [];
	let y = 0;
	const add = (height, svg, colors) => {
		sections.push({ y, height, svg, colors });
		y += height + 28;
	};

	add(
		170,
		`<rect x="0" y="0" width="${W}" height="170" rx="14" fill="url(#banner)"/>
<text x="${PAD + 8}" y="78" font-size="40" font-weight="800" fill="#fff">Hi, I'm Christopher</text>
<text x="${PAD + 8}" y="112" font-size="17" fill="#fff" fill-opacity=".9">Azure Software Engineer · Brisbane, Australia</text>
<text x="${PAD + 8}" y="142" font-size="13" fill="#fff" fill-opacity=".8">AZ-204 · AZ-900 · AI-103</text>`,
		['#2f80ed', '#56ccf2', '#ffffff'],
	);

	const about = [
		'Azure Software Engineer based in Brisbane, Australia. I work mostly with TypeScript, C#, and Python across cloud and web projects. Currently focused on agentic AI solutions and enterprise integrations on Azure and Databricks.',
		"Day-to-day I build MCP servers, write custom agent skills, and wire agentic AI into enterprise workflows; it's a core part of what I do both professionally and in side projects.",
	];
	let body = `<text x="0" y="24" font-size="22" font-weight="700" fill="${theme.text}">About me</text>`;
	let ay = 56;
	for (const p of about) {
		const r = paragraph(p, 0, ay, 14, W, theme.text);
		body += r.svg;
		ay += r.height + 8;
	}
	add(ay - 10, body, [theme.text, theme.muted]);

	const cards = [
		['ooxml', 'The engine: OPC packaging, a shared XML model, Word and PowerPoint parsing and saving, DrawingML, SmartArt and live collaboration.'],
		['docx-viewer', 'A Word document editor in the browser, with adapters for React, Vue, Angular, Svelte, Solid and vanilla JS.'],
		['pptx-viewer', 'Parse, edit, render and convert PowerPoint files in the browser and Node.js, with export to PNG, PDF and video.'],
	];
	const cw = (W - 32) / 3;
	let suite = `<text x="0" y="24" font-size="22" font-weight="700" fill="${theme.text}">An Office suite for the browser</text>
<text x="0" y="52" font-size="14" fill="${theme.muted}">Open, edit and save Word and PowerPoint documents entirely client-side, on one shared OOXML engine.</text>`;
	cards.forEach(([name, text], i) => {
		const x = i * (cw + 16);
		const r = paragraph(text, x + 16, 112, 12.5, cw - 32, theme.muted, 18);
		suite += `<rect x="${x + 0.5}" y="70.5" width="${cw - 1}" height="136" rx="10" fill="${theme.card}" stroke="${theme.border}"/>
<text x="${x + 16}" y="94" font-size="15" font-weight="700" fill="${theme.accent}">${name}</text>${r.svg}`;
	});
	add(208, suite, [theme.accent, theme.muted, theme.border]);

	const tools = ['TypeScript', 'JavaScript', 'C#', '.NET', 'Python', 'Rust', 'React', 'Angular', 'Node.js', 'Azure', 'Docker', 'Kubernetes', 'SQL Server'];
	let tx = 0;
	let ty = 112;
	let chips = '';
	for (const t of tools) {
		const w = t.length * 7.4 + 22;
		if (tx + w > W) {
			tx = 0;
			ty += 34;
		}
		chips += `<rect x="${tx}" y="${ty}" width="${w}" height="26" rx="13" fill="${theme.card}" stroke="${theme.border}"/><text x="${tx + w / 2}" y="${ty + 17}" text-anchor="middle" font-size="12" fill="${theme.text}">${esc(t)}</text>`;
		tx += w + 8;
	}
	add(
		ty + 28,
		`<text x="0" y="24" font-size="22" font-weight="700" fill="${theme.text}">Other projects</text>
<text x="0" y="54" font-size="14" fill="${theme.text}"><tspan font-weight="700" fill="${theme.accent}">AbioticEditor</tspan>: save editor for Abiotic Factor, in the browser or as a desktop app. C#, .NET.</text>
<text x="0" y="80" font-size="14" fill="${theme.text}"><tspan font-weight="700" fill="${theme.accent}">DownUnderDiscordBot</tspan>: Discord music bot with a Tauri desktop companion app.</text>
${chips}`,
		[theme.accent, theme.text, theme.border],
	);

	add(300, nest(activity, 0), [theme.line, theme.muted, theme.border]);
	add(200, nest(overview, 0), [theme.text, theme.line, '#3178c6', theme.border]);
	return { sections, height: y - 28 };
}

/** Dust for one section: small squares that blow off up and to the right. */
function dust(section, index, rand) {
	const start = T.dust + index * T.gap;
	let particles = '';
	for (let k = 0; k < 90; k++) {
		const fx = rand();
		const x = fx * W;
		const y = section.y + rand() * section.height;
		const size = 2 + rand() * 4;
		const color = section.colors[Math.floor(rand() * section.colors.length)];
		const delay = Math.round(fx * 650 + rand() * 300);
		const dx = Math.round(60 + rand() * 180);
		const dy = Math.round(-40 - rand() * 120);
		particles += `<rect class="anim p${index}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${size.toFixed(1)}" height="${size.toFixed(1)}" fill="${color}" style="--dx:${dx}px;--dy:${dy}px;animation-delay:${delay}ms"/>`;
	}
	const css = [
		keyframes(`s${index}`, [
			[0, 'opacity:0;transform:none'],
			[0.6, 'opacity:1;transform:none'],
			[start, 'opacity:1;transform:none'],
			[start + 0.9, 'opacity:0;transform:translate(26px,-14px)'],
			[CYCLE, 'opacity:0;transform:translate(26px,-14px)'],
		]),
		keyframes(`p${index}`, [
			[0, 'opacity:0;transform:none'],
			[start - 0.01, 'opacity:0;transform:none'],
			[start, 'opacity:1;transform:none'],
			[start + 1.7, 'opacity:0;transform:translate(var(--dx),var(--dy))'],
			[CYCLE, 'opacity:0;transform:translate(var(--dx),var(--dy))'],
		]),
		`.s${index}{animation-name:s${index}}.p${index}{animation-name:p${index};opacity:0}`,
	].join('\n');
	return { particles, css };
}

function chungusCss() {
	const bob = [];
	for (let t = T.walk, k = 0; t < T.arrive; t += 0.21, k++)
		bob.push([t, `transform:translateY(${k % 2 ? -12 : 0}px) rotate(${k % 2 ? 2 : -2}deg)`]);
	const aura = [[0, 'opacity:0'], [T.charge, 'opacity:0']];
	for (let t = T.charge + 0.2, k = 0; t < T.snap; t += 0.18, k++) aura.push([t, `opacity:${k % 2 ? 0.6 : 1}`]);
	return [
		keyframes('walk', [
			[0, 'opacity:1;transform:translateX(720px)'],
			[T.walk, 'opacity:1;transform:translateX(720px)'],
			[T.arrive, 'opacity:1;transform:none'],
			[T.fade, 'opacity:1;transform:none'],
			[T.fade + 0.9, 'opacity:0;transform:none'],
			[CYCLE - 0.2, 'opacity:0;transform:translateX(720px)'],
			[CYCLE, 'opacity:1;transform:translateX(720px)'],
		]),
		keyframes('bob', [[0, 'transform:none'], ...bob, [T.arrive, 'transform:none'], [CYCLE, 'transform:none']]),
		keyframes('raise', [
			[0, 'transform:none'],
			[T.raise, 'transform:none'],
			[T.raise + 0.6, 'transform:translateY(-26px)'],
			[T.snap, 'transform:translateY(-26px)'],
			[T.snap + 0.12, 'transform:translateY(-30px) rotate(-7deg)'],
			[T.snap + 0.6, 'transform:translateY(-26px)'],
			[T.fade, 'transform:translateY(-26px)'],
			[T.fade + 0.9, 'transform:none'],
			[CYCLE, 'transform:none'],
		]),
		keyframes('ready', [[0, 'opacity:1'], [T.snap, 'opacity:1'], [T.snap + 0.06, 'opacity:0'], [CYCLE - 0.2, 'opacity:0'], [CYCLE, 'opacity:1']]),
		keyframes('snapped', [[0, 'opacity:0'], [T.snap, 'opacity:0'], [T.snap + 0.06, 'opacity:1'], [CYCLE - 0.2, 'opacity:1'], [CYCLE, 'opacity:0']]),
		keyframes('aura', [...aura, [T.snap, 'opacity:1'], [T.snap + 1.2, 'opacity:.3'], [T.fade, 'opacity:.3'], [T.fade + 0.6, 'opacity:0'], [CYCLE, 'opacity:0']]),
		keyframes('flash', [[0, 'opacity:0'], [T.snap, 'opacity:0'], [T.snap + 0.08, 'opacity:var(--flash-peak)'], [T.snap + 0.8, 'opacity:0'], [CYCLE, 'opacity:0']]),
		keyframes('ring', [[0, 'opacity:0;transform:scale(.2)'], [T.snap, 'opacity:.9;transform:scale(.2)'], [T.snap + 1.1, 'opacity:0;transform:scale(9)'], [CYCLE, 'opacity:0;transform:scale(9)']]),
		keyframes('word', [[0, 'opacity:0;transform:scale(.4)'], [T.snap, 'opacity:0;transform:scale(.4)'], [T.snap + 0.2, 'opacity:1;transform:scale(1.1)'], [T.snap + 1, 'opacity:1;transform:scale(1)'], [T.snap + 1.4, 'opacity:0;transform:translateY(-16px)'], [CYCLE, 'opacity:0']]),
		keyframes('bubble', [[0, 'opacity:0'], [T.speak, 'opacity:0'], [T.speak + 0.3, 'opacity:1'], [T.snap - 0.3, 'opacity:1'], [T.snap - 0.1, 'opacity:0'], [CYCLE, 'opacity:0']]),
		keyframes('caption', [[0, 'opacity:0'], [T.caption, 'opacity:0'], [T.caption + 0.6, 'opacity:1'], [T.fade, 'opacity:1'], [T.fade + 0.8, 'opacity:0'], [CYCLE, 'opacity:0']]),
		`.walk{animation-name:walk;opacity:0}.bob{animation-name:bob}.ch-hand{animation-name:raise}
.ch-ready{animation-name:ready}.ch-snapped{animation-name:snapped;opacity:0}.ch-aura{animation-name:aura;opacity:0}
.flash{animation-name:flash;opacity:0}.ring{animation-name:ring;opacity:0}.word{animation-name:word;opacity:0}
.bubble{animation-name:bubble;opacity:0}.caption{animation-name:caption;opacity:0}`,
	].join('\n');
}

/** @param {Record<string,string>} theme @param {string} activity @param {string} overview */
export function chungusProfileSvg(theme, activity, overview) {
	const { sections, height } = layout(theme, activity, overview);
	const H = height + 120;
	const rand = random(7);
	const parts = sections.map((s, i) => ({ ...s, ...dust(s, i, rand) }));

	// Chungus stands in the middle of the page, scaled up a little.
	const scale = 1.15;
	const fx = W / 2 - 180 * scale;
	const fy = Math.round(H / 2 + 120 - 480 * scale);
	const hand = { x: fx + 296 * scale, y: fy + 110 * scale };
	const head = { x: fx + 180 * scale, y: fy + 40 * scale };

	const style = `.anim,.walk,.bob,.ch-hand,.ch-ready,.ch-snapped,.ch-aura,.flash,.ring,.word,.bubble,.caption,${parts.map((_, i) => `.s${i}`).join(',')}{animation-duration:${CYCLE}s;animation-iteration-count:infinite;animation-timing-function:ease-in-out;animation-fill-mode:both}
.bob,.ch-hand,.ring,.word{transform-box:fill-box;transform-origin:50% 100%}.ring,.word{transform-origin:50% 50%}
${parts.map((p) => p.css).join('\n')}
${chungusCss()}
@media (prefers-reduced-motion: reduce){*{animation:none!important}}`;

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
<title>Christopher's GitHub profile, snapped away by a very large rabbit</title>
<style>${style}</style>
<defs>${figureDefs}
<linearGradient id="banner" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2f80ed"/><stop offset="1" stop-color="#56ccf2"/></linearGradient>
</defs>
${parts.map((p, i) => `<g class="s${i}"><g transform="translate(0 ${p.y})">${p.svg}</g></g>`).join('\n')}
${parts.map((p) => p.particles).join('\n')}
<g class="walk"><g class="bob"><g transform="translate(${fx} ${fy}) scale(${scale})">${chungusFigure()}</g></g></g>
<g class="bubble"><rect x="${head.x - 210}" y="${head.y - 18}" width="170" height="40" rx="14" fill="${theme.card}" stroke="${theme.border}"/><path d="M${head.x - 41} ${head.y}l14 4l-14 6z" fill="${theme.card}"/><text x="${head.x - 125}" y="${head.y + 7}" text-anchor="middle" font-size="15" font-weight="700" fill="${theme.text}">Hold my carrot.</text></g>
<circle class="ring" cx="${hand.x}" cy="${hand.y}" r="40" fill="none" stroke="#ffd36b" stroke-width="6"/>
<text class="word" x="${hand.x + 100}" y="${hand.y - 50}" text-anchor="middle" font-size="44" font-weight="900" font-style="italic" fill="#ffd23f" stroke="#9c6a10" stroke-width="1.5">SNAP</text>
<text class="caption" x="${W / 2}" y="${fy + 480 * scale + 50}" text-anchor="middle" font-size="18" font-style="italic" fill="${theme.muted}">Perfectly balanced, as all things should be.</text>
<rect class="flash" width="${W}" height="${H}" fill="${theme.flash}" style="--flash-peak:${theme.flashPeak}"/>
</svg>
`;
}
