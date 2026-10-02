// The README's rows of cards. Each row is one image inside one link, because
// GitHub only lets a README image be clicked as a whole. When Chungus snaps,
// the row's snapped cards blow away as dust and the survivors slide over and
// widen to fill the row, re-wrapped for their new width.

import { random } from './chungus.mjs';

const FONT = `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif`;
const W = 860;
const GAP = 14;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Greedy wrap by an average glyph width; good enough for a system sans. */
function wrap(text, size, width) {
	const max = Math.floor(width / (size * 0.53));
	const out = [''];
	for (const word of text.split(' ')) {
		const cur = out[out.length - 1];
		if ((cur + ' ' + word).trim().length > max) out.push(word);
		else out[out.length - 1] = (cur + ' ' + word).trim();
	}
	return out;
}

/* ---- Cards ----------------------------------------------------------- */

const TOOLS = ['TypeScript', 'JavaScript', 'C#', '.NET', 'Python', 'Rust', 'React', 'Angular', 'Node.js', 'Azure', 'Docker', 'Kubernetes', 'SQL Server'];

/** A text card: name, a small tag line and a paragraph. */
const textCard = (id, name, tag, text) => ({
	id,
	title: `${name}: ${text}`,
	height: (w) => 80 + wrap(text, 13, w - 36).length * 19 + 6,
	draw: (t, w, h) => `<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="10" fill="${t.card}" stroke="${t.border}"/>
<text x="18" y="34" font-size="17" font-weight="700" fill="${t.accent}">${esc(name)}</text>
<text x="18" y="54" font-size="11.5" fill="${t.muted}">${esc(tag)}</text>
${wrap(text, 13, w - 36)
	.map((l, i) => `<text x="18" y="${80 + i * 19}" font-size="13" fill="${t.text}">${esc(l)}</text>`)
	.join('')}`,
});

function chips(w) {
	let x = 18;
	let y = 70;
	const out = [];
	for (const tool of TOOLS) {
		const cw = tool.length * 7.2 + 22;
		if (x + cw > w - 18) {
			x = 18;
			y += 34;
		}
		out.push({ tool, x, y, cw });
		x += cw + 8;
	}
	return out;
}

const toolsCard = {
	id: 'tools',
	title: `Tools: ${TOOLS.join(', ')}`,
	height: (w) => chips(w).at(-1).y + 26 + 18,
	draw: (t, w, h) => `<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="10" fill="${t.card}" stroke="${t.border}"/>
<text x="18" y="34" font-size="17" font-weight="700" fill="${t.accent}">Tools</text>
<text x="18" y="54" font-size="11.5" fill="${t.muted}">What I build with</text>
${chips(w)
	.map(
		(c) =>
			`<rect x="${c.x}" y="${c.y}" width="${c.cw}" height="26" rx="13" fill="${t.bg}" stroke="${t.border}"/><text x="${c.x + c.cw / 2}" y="${c.y + 17}" text-anchor="middle" font-size="12" fill="${t.text}">${esc(c.tool)}</text>`,
	)
	.join('')}`,
};

/** The rows, top to bottom, with where each row links to. */
export const ROWS = [
	{
		id: 'about',
		href: 'https://github.com/ChristopherVR?tab=repositories',
		alt: 'About me and the tools I use',
		cards: [
			textCard('about', 'About me', 'Azure Software Engineer · Brisbane, Australia', 'I work mostly with TypeScript, C# and Python across cloud and web projects, currently focused on agentic AI and enterprise integrations on Azure and Databricks. Day to day I build MCP servers, write agent skills and wire agentic AI into enterprise workflows.'),
			toolsCard,
		],
	},
	{
		id: 'suite',
		href: 'https://christophervr.github.io/ooxml/',
		alt: 'An Office suite for the browser: ooxml, docx-viewer, pptx-viewer and the launcher',
		cards: [
			textCard('ooxml', 'ooxml', 'npm: ooxml-core', 'The engine behind the viewers: packaging, a shared XML model, Word and PowerPoint parsing and saving, SmartArt and live collaboration.'),
			textCard('docx-viewer', 'docx-viewer', 'Word in the browser', 'A Word editor: one model, one web component and adapters for React, Vue, Angular, Svelte, Solid and vanilla JS.'),
			textCard('pptx-viewer', 'pptx-viewer', 'PowerPoint in the browser', 'Parse, edit, render and convert PowerPoint files, with export to PNG, PDF and video.'),
			textCard('launcher', 'Try the suite', 'christophervr.github.io/ooxml', 'Open, edit and save Word and PowerPoint documents entirely client-side, nothing to install.'),
		],
	},
	{
		id: 'other',
		href: 'https://github.com/ChristopherVR?tab=repositories',
		alt: 'Other projects: AbioticEditor and DownUnderDiscordBot',
		cards: [
			textCard('abiotic', 'AbioticEditor', 'C# · .NET', 'Save editor for Abiotic Factor that runs in the browser or as a desktop app, with a CLI and a plugin host.'),
			textCard('discord', 'DownUnderDiscordBot', 'TypeScript · Discord.js · Docker', 'Discord music bot with a Tauri-based desktop companion app.'),
		],
	},
];

/**
 * Snap half of all the cards, but never a whole row, so every row keeps at
 * least one survivor to slide into the space.
 */
export function pickSnapped(seed) {
	const rand = random(seed);
	const all = ROWS.flatMap((r) => r.cards.map((c) => ({ row: r.id, id: c.id })));
	const left = Object.fromEntries(ROWS.map((r) => [r.id, r.cards.length]));
	const snapped = new Set();
	for (const c of [...all].sort(() => rand() - 0.5)) {
		if (snapped.size === Math.floor(all.length / 2)) break;
		if (left[c.row] > 1) {
			snapped.add(c.id);
			left[c.row]--;
		}
	}
	return snapped;
}

/* ---- Rows ------------------------------------------------------------ */

/** Lay `n` equal cards across the row. */
const slots = (n) => {
	const w = (W - GAP * (n - 1)) / n;
	return Array.from({ length: n }, (_, i) => ({ x: i * (w + GAP), w }));
};

/**
 * One row as an image. `dustAt` is when this row's snap lands (seconds from
 * load); `snapped` is the set of card ids that turn to dust.
 */
export function rowSvg(row, theme, snapped, dustAt, seed) {
	const before = slots(row.cards.length);
	const survivors = row.cards.filter((c) => !snapped.has(c.id));
	const after = slots(survivors.length);
	const H = Math.ceil(
		Math.max(...row.cards.map((c, i) => c.height(before[i].w)), ...survivors.map((c, i) => c.height(after[i].w))),
	);
	const settle = dustAt + 1.35;
	const rand = random(seed);
	let body = '';
	let particles = '';
	row.cards.forEach((card, i) => {
		const s = before[i];
		const inner = `<g transform="translate(${s.x.toFixed(1)} 0)">${card.draw(theme, s.w, H)}</g>`;
		if (snapped.has(card.id)) {
			// Wiped away left to right under a moving mask while dust lifts off it.
			body += `<mask id="m${i}" maskUnits="userSpaceOnUse" x="${s.x}" y="0" width="${s.w}" height="${H}"><rect class="wipe" x="${s.x}" y="0" width="${s.w}" height="${H}" fill="#fff"/></mask><g mask="url(#m${i})">${inner}</g>`;
			const count = Math.round((s.w * H) / 300);
			for (let k = 0; k < count; k++) {
				const fx = rand();
				const size = 2 + rand() * 3.5;
				const color = [theme.accent, theme.text, theme.muted, theme.border][Math.floor(rand() * 4)];
				particles += `<rect class="p" x="${(s.x + fx * s.w).toFixed(1)}" y="${(rand() * H).toFixed(1)}" width="${size.toFixed(1)}" height="${size.toFixed(1)}" fill="${color}" style="--dx:${Math.round(40 + rand() * 140)}px;--dy:${Math.round(-30 - rand() * 90)}px;animation-delay:${(dustAt + fx + rand() * 0.25).toFixed(2)}s"/>`;
			}
		} else {
			// Survivors are drawn twice: as they are, then in their new slot.
			const k = survivors.indexOf(card);
			const a = after[k];
			body += `<g class="old">${inner}</g>`;
			body += `<g class="new" style="--dx:${(s.x - a.x).toFixed(1)}px"><g transform="translate(${a.x.toFixed(1)} 0)">${card.draw(theme, a.w, H)}</g></g>`;
		}
	});
	const style = `@keyframes wipe{from{transform:none}to{transform:translateX(100%)}}
.wipe{transform-box:fill-box;animation:wipe 1.1s linear ${dustAt}s forwards}
@keyframes dust{0%{opacity:1;transform:none}100%{opacity:0;transform:translate(var(--dx),var(--dy))}}
.p{opacity:0;animation:dust 1.6s ease-out forwards}
@keyframes leave{to{opacity:0}}
.old{animation:leave .18s ease-in ${settle}s forwards}
@keyframes settle{from{opacity:0;transform:translateX(var(--dx))}to{opacity:1;transform:none}}
.new{opacity:0;animation:settle .65s cubic-bezier(.2,.8,.2,1) ${settle + 0.18}s forwards}
@media (prefers-reduced-motion: reduce){.wipe,.p,.old,.new{animation:none}.p,.new{display:none}}`;
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
<title>${esc(row.alt)}</title>
<style>${style}</style>
${body}
${particles}
</svg>
`;
}
