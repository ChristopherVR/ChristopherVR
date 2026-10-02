// Renders Chungus poses from the 3D model into transparent WebP frames.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
// Needs Playwright (npm i -D playwright); serve this folder and pass its URL.
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [url, out] = process.argv.slice(2);
const easeOutBack = (t) => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2;

const specs = [];
for (let i = 0; i < 8; i++) specs.push(['walk', { walk: (i / 8) * Math.PI * 2 }]);
for (const t of [0.3, 0.6, 0.85, 1]) specs.push(['turn', { turn: t }]);
for (const t of [0.2, 0.4, 0.6, 0.8, 1]) specs.push(['raise', { turn: 1, arm: easeOutBack(t), handTo: 'ready', handT: Math.min(1, t * 1.2) }]);
for (const g of [0.5, 1.1]) specs.push(['charge', { turn: 1, arm: 1, handFrom: 'ready', handTo: 'press', handT: g > 1 ? 1 : 0.5, glow: g }]);
specs.push(['snap', { turn: 1, arm: 1, handFrom: 'press', handTo: 'snapped', handT: 0.55, glow: 1.4, flick: 0.12 }]);
specs.push(['snap', { turn: 1, arm: 1, handFrom: 'press', handTo: 'snapped', handT: 1, glow: 1.2, flick: 0.18 }]);
specs.push(['after', { turn: 1, arm: 1, handFrom: 'snapped', handTo: 'snapped', glow: 0.35 }]);

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 420, height: 480 } });
await page.goto(url);
await page.waitForFunction(() => window.ready, null, { timeout: 30000 });
mkdirSync(out, { recursive: true });
const manifest = [];
for (const [i, [phase, spec]] of specs.entries()) {
	const data = await page.evaluate((s) => window.frame(s), spec);
	const name = `${String(i).padStart(2, '0')}-${phase}.webp`;
	writeFileSync(`${out}/${name}`, Buffer.from(data.split(',')[1], 'base64'));
	manifest.push({ name, phase });
}
writeFileSync(`${out}/frames.json`, JSON.stringify(manifest, null, 1));
await browser.close();
console.log(`${manifest.length} frames`);
