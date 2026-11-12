// Builds every drawing on the profile and keeps the README's project grid in
// step with what is pinned. Runs in GitHub Actions (see
// .github/workflows/profile.yml). Nothing is installed first and no image
// service is called, so the profile cannot break when someone else's server
// goes away.
//
// Usage: GITHUB_TOKEN=... node scripts/build.mjs <login> <outDir>
//
// Useful while designing:
//   PROFILE_DATA=.cache/data.json   reuse one GitHub response
//   PROFILE_NOW=2026-06-21T07:00Z   build as of another moment (try the sky at dusk)
//   ONLY=hero,now                   build only some drawings

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadData } from './lib/data.mjs';
import { THEMES } from './lib/kit.mjs';
import { previewHtml } from './lib/preview.mjs';
import { cardList } from './scenes/cards.mjs';
import { footer } from './scenes/footer.mjs';
import { hero } from './scenes/hero.mjs';
import { now } from './scenes/now.mjs';
import { ooxml } from './scenes/ooxml.mjs';
import { overview } from './scenes/overview.mjs';

const login = process.argv[2] ?? 'ChristopherVR';
const outDir = process.argv[3] ?? 'dist';
const RAW = `https://raw.githubusercontent.com/${login}/${login}/output`;

const data = await loadData(login, process.env.GITHUB_TOKEN);
const cards = cardList(data);

/** Every drawing, rendered once per theme. */
const scenes = {
	hero: (T) => hero(data, T),
	now: (T) => now(data, T),
	ooxml: (T) => ooxml(data, T),
	...Object.fromEntries(cards.map((c) => [c.id, c.render])),
	overview: (T) => overview(data, T),
	footer: (T) => footer(data, T),
};

await mkdir(outDir, { recursive: true });
const only = process.env.ONLY?.split(',');
for (const [name, render] of Object.entries(scenes)) {
	if (only && !only.includes(name)) continue;
	for (const T of Object.values(THEMES)) {
		const out = render(T);
		await writeFile(join(outDir, `${name}-${T.name}.svg`), out);
		if (T.name === 'dark') console.log(`${name.padEnd(24)} ${(out.length / 1024).toFixed(0).padStart(5)} KB`);
	}
}

/* ---- Keep the README's project grid in step with the pins -------------- */

const picture = (id, alt, width) =>
	`<picture><source media="(prefers-color-scheme: dark)" srcset="${RAW}/${id}-dark.svg"><img alt="${alt.replace(/"/g, '&quot;')}" src="${RAW}/${id}-light.svg" width="${width}"></picture>`;

const rows = [];
for (let i = 0; i < cards.length; i += 2) {
	const pair = cards.slice(i, i + 2).map((c) => `<a href="${c.href}">${picture(c.id, c.alt, '49%')}</a>`);
	rows.push(`<p>\n${pair.join('\n')}\n</p>`);
}
const readmeUrl = new URL('../README.md', import.meta.url);
const readme = await readFile(readmeUrl, 'utf8');
const START = '<!-- cards:start (written by scripts/build.mjs from the pinned repositories) -->';
const END = '<!-- cards:end -->';
const a = readme.indexOf(START);
const b = readme.indexOf(END);
if (a === -1 || b === -1) throw new Error('README.md has lost its cards:start / cards:end markers');
const next = `${readme.slice(0, a + START.length)}\n\n${rows.join('\n\n')}\n\n${readme.slice(b)}`;
if (next !== readme) {
	await writeFile(readmeUrl, next);
	console.log(`README.md: project grid updated (${cards.map((c) => c.repo).join(', ')})`);
}

await writeFile(join(outDir, 'preview.html'), previewHtml(next));
console.log(`Wrote ${Object.keys(scenes).length} drawings to ${outDir}`);
