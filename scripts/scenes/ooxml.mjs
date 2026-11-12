// The flagship: what a .pptx actually is, as an exploded drawing.
//
// A finished slide sits flat, then lifts apart into the four things the
// engine has to resolve to draw it: the ZIP package, the theme, the layout
// and the slide's own shapes. Each layer is ordinary flat artwork placed with
// one affine matrix, so the "3D" costs nothing at runtime; the layers only
// ever translate.

import { fmt, mix, n, svg, text, timeline, wrap } from '../lib/kit.mjs';

const W = 860;
const H = 372;
const P = 24;

// Slide space is 280 x 158 (16:9). These two vectors are where its x and y
// axes land on screen.
const SW = 280;
const SH = 158;
const A = { x: 1.09, y: 0.195 };
const B = { x: -0.5, y: 0.5 };
const O = { x: 84, y: 118 };
const LIFT = [93, 31, -31, -93];

// Timeline, in seconds.
const OPEN = 2.2;
const OPENED = 3.9;
const CLOSE = 17.4;
const CLOSED = 19;

export function ooxml(data, T) {
	const slideBg = mix(T.page, T.ink, T.name === 'dark' ? 0.09 : 0.05);
	const plane = (k, inner) =>
		`<g class="ly${k}"><g transform="matrix(${A.x} ${A.y} ${B.x} ${B.y} ${O.x} ${O.y})">${inner}<rect class="pulse p${k}" width="${SW}" height="${SH}"/></g></g>`;
	const frame = `<rect class="pl" width="${SW}" height="${SH}"/>`;

	/* ---- 0: the package --------------------------------------------- */
	const parts = ['rels', 'presentation', 'slide1', 'layout2', 'master1', 'theme1', 'image1.emf', 'chart1'];
	let tiles = '';
	parts.forEach((name, i) => {
		const x = 12 + (i % 4) * 65;
		const y = 14 + Math.floor(i / 4) * 67;
		tiles += `<path d="M${x} ${y}h44l14 14v48h-58z" fill="${T.page}" stroke="${T.faint}"/><path d="M${x + 44} ${y}v14h14" fill="none" stroke="${T.faint}"/>${text(x + 5, y + 53, name, { size: 6.6, fill: T.soft })}`;
	});
	const pkg = `<rect width="${SW}" height="${SH}" fill="${T.wash}" stroke="${T.faint}"/><g class="dt">${tiles}</g>`;

	/* ---- 1: the theme ------------------------------------------------ */
	let swatches = '';
	T.fills.slice(0, 6).forEach((c, i) => {
		swatches += `<rect x="${18 + i * 22}" y="118" width="17" height="17" rx="2" fill="${c}"/>`;
	});
	const theme = `<rect width="${SW}" height="${SH}" fill="${slideBg}" stroke="${T.faint}"/><g class="dt">${text(17, 84, 'Aa', { font: 'display', size: 62, fill: T.faint })}${swatches}${text(162, 131, 'accent 1 to 6', { size: 7.5, fill: T.muted })}</g>`;

	/* ---- 2: the layout ----------------------------------------------- */
	const ph = (x, y, w, h, label) =>
		`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${T.muted}" stroke-dasharray="3 3"/>${text(x + 4, y + 9, label, { size: 6.6, fill: T.muted })}`;
	const layout = `<g class="dt">${frame}${ph(12, 12, 256, 38, 'title')}${ph(12, 58, 126, 88, 'picture')}${ph(146, 58, 122, 88, 'chart')}</g>`;

	/* ---- 3: the slide ------------------------------------------------ */
	const bars = [34, 46, 58, 78]
		.map((h, i) => `<rect x="${158 + i * 27}" y="${138 - h}" width="19" height="${h}" fill="${i === 3 ? T.fills[0] : T.fills[2]}"/>`)
		.join('');
	const slide =
		`<g class="dt">${frame}</g>` +
		text(18, 38, 'Q3 revenue', { font: 'display', size: 22, fill: T.ink }) +
		`<rect x="18" y="64" width="114" height="76" fill="${mix(T.page, T.fills[4], 0.3)}"/>` +
		`<circle cx="104" cy="86" r="9" fill="${T.fills[0]}"/>` +
		`<path d="M18 140l34-40 22 24 18-16 40 32z" fill="${mix(T.page, T.fills[4], 0.75)}"/>` +
		`<path d="M152 138.5h112" stroke="${T.muted}"/>${bars}`;

	/* ---- Guides and labels ------------------------------------------- */
	// The dotted verticals of an exploded drawing, corner to corner.
	const corner = (sx, sy) => ({ x: O.x + sx * A.x + sy * B.x, y: O.y + sx * A.y + sy * B.y });
	let guides = '';
	for (const [sx, sy] of [[0, 0], [SW, 0], [SW, SH], [0, SH]]) {
		const c = corner(sx, sy);
		guides += `<line x1="${n(c.x)}" x2="${n(c.x)}" y1="${n(c.y + LIFT[3])}" y2="${n(c.y + LIFT[0])}"/>`;
	}

	const right = corner(SW, 0);
	const names = [
		['deck.pptx', 'a ZIP archive of XML parts'],
		['theme1.xml', 'the colours and fonts'],
		['slideLayout2.xml', 'where the placeholders sit'],
		['slide1.xml', 'the shapes on this slide'],
	];
	let labels = '';
	names.forEach(([file, what], k) => {
		const y = right.y + LIFT[k];
		labels += `<g class="lb lb${k}"><line x1="${n(right.x + 6)}" x2="${n(right.x + 20)}" y1="${n(y)}" y2="${n(y)}" stroke="${T.muted}"/>${text(right.x + 28, y - 1, file, { size: 12, fill: T.ink })}${text(right.x + 28, y + 15, what, { font: 'text', size: 12.5, fill: T.soft })}</g>`;
	});

	// While it is closed, say what you are looking at.
	labels += `<g class="lbc"><line x1="${n(right.x + 6)}" x2="${n(right.x + 20)}" y1="${n(right.y)}" y2="${n(right.y)}" stroke="${T.muted}"/>${text(right.x + 28, right.y - 1, 'deck.pptx, slide 1', { size: 12, fill: T.ink })}${text(right.x + 28, right.y + 15, 'what PowerPoint shows you', { font: 'text', size: 12.5, fill: T.soft })}</g>`;

	/* ---- Copy --------------------------------------------------------- */
	const colX = 606;
	const colW = W - colX;
	const stars = (data.repos.ooxml?.stars ?? 0) + (data.repos['pptx-viewer']?.stars ?? 0);
	const forks = (data.repos.ooxml?.forks ?? 0) + (data.repos['pptx-viewer']?.forks ?? 0);
	let copy = text(colX, 92, 'ooxml', { font: 'display', size: 50, fill: T.ink });
	let y = 126;
	for (const l of wrap('text', 'Word and PowerPoint in the browser. One engine parses, edits, renders and saves .docx and .pptx without the file leaving the page, with components for React, Vue, Angular, Svelte and Solid.', 14.5, colW)) {
		copy += text(colX, y, l, { font: 'text', size: 14.5, fill: T.soft });
		y += 21.5;
	}
	y += 12;
	copy += text(colX, y, `${fmt(stars)} stars, ${fmt(forks)} forks`, { size: 12, fill: T.ink });
	copy += text(colX, y + 19, 'christophervr.github.io/ooxml', { size: 12, fill: T.muted });

	/* ---- Motion ------------------------------------------------------- */
	const ease = 'animation-timing-function:cubic-bezier(.65,0,.2,1)';
	const lift = (k) =>
		timeline(`ly${k}`, P, [
			[0, 'transform:translateY(0)'],
			[OPEN, `transform:translateY(0);${ease}`],
			[OPENED, `transform:translateY(${LIFT[k]}px)`],
			[CLOSE, `transform:translateY(${LIFT[k]}px);${ease}`],
			[CLOSED, 'transform:translateY(0)'],
			[P, 'transform:translateY(0)'],
		]);
	// A pulse climbs the stack: package, theme, layout, slide. That is the
	// order the engine resolves an inherited property in.
	const pulse = (k) => {
		const stops = [[0, 'opacity:0']];
		for (const start of [6, 10.5, 15]) {
			const t = start + k * 0.42;
			if (t + 0.9 > CLOSE) continue;
			stops.push([t, 'opacity:0'], [t + 0.16, 'opacity:1'], [t + 0.9, 'opacity:0']);
		}
		stops.push([P, 'opacity:0']);
		return timeline(`p${k}`, P, stops);
	};
	const fade = (name, a, b, c, d) =>
		timeline(name, P, [[0, 'opacity:0'], [a, 'opacity:0'], [b, 'opacity:1'], [c, 'opacity:1'], [d, 'opacity:0'], [P, 'opacity:0']]);

	const css = [
		...[0, 1, 2, 3].map((k) => `.ly${k}{animation:ly${k} ${P}s linear infinite}${lift(k)}`),
		...[0, 1, 2, 3].map((k) => `.p${k}{animation:p${k} ${P}s linear infinite}${pulse(k)}`),
		`.pulse{fill:${T.hues[0]};fill-opacity:.1;stroke:${T.hues[0]};stroke-width:1.6;opacity:0}`,
		`.pl{fill:${T.ink};fill-opacity:.035;stroke:${T.faint}}`,
		`.dt{opacity:0;animation:dt ${P}s linear infinite}`,
		fade('dt', OPEN + 0.3, OPENED - 0.2, CLOSE, CLOSE + 0.9),
		`.gd{opacity:0;animation:dt ${P}s linear infinite}.gd line{stroke:${T.faint};stroke-dasharray:1.5 4}`,
		...[0, 1, 2, 3].map(
			(k) =>
				`.lb${k}{opacity:0;animation:lb${k} ${P}s linear infinite}` +
				fade(`lb${k}`, OPENED - 0.5 + k * 0.18, OPENED - 0.1 + k * 0.18, CLOSE - 0.2, CLOSE + 0.3),
		),
		`.lbc{animation:lbc ${P}s linear infinite}`,
		timeline('lbc', P, [[0, 'opacity:1'], [OPEN - 0.3, 'opacity:1'], [OPEN, 'opacity:0'], [CLOSED, 'opacity:0'], [CLOSED + 0.5, 'opacity:1'], [P, 'opacity:1']]),
		// With motion off, show the drawing opened up, which is the point of it.
		`@media (prefers-reduced-motion:reduce){.lbc{opacity:0}.dt,.gd,${[0, 1, 2, 3].map((k) => `.lb${k}`).join(',')}{opacity:1}${[0, 1, 2, 3].map((k) => `.ly${k}{transform:translateY(${LIFT[k]}px)}`).join('')}}`,
	].join('');

	return svg({
		w: W,
		h: H,
		title: `ooxml: Word and PowerPoint in the browser. An exploded drawing of a PowerPoint slide lifting apart into its ZIP package, theme, layout and shapes. ${fmt(stars)} stars and ${fmt(forks)} forks across ooxml and pptx-viewer.`,
		fonts: ['display', 'text', 'mono'],
		css,
		body: `<g class="gd">${guides}</g>
${plane(0, pkg)}
${plane(1, theme)}
${plane(2, layout)}
${plane(3, slide)}
${labels}
${copy}`,
	});
}
