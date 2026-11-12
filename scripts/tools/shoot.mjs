// Development aid: freeze a built SVG at given moments and screenshot it, so
// an animation can be checked frame by frame without watching it loop.
//
//   node scripts/tools/shoot.mjs dist/hero-dark.svg 0.5,3,12 [outDir] [scale]
//
// Needs Chrome (set CHROME to its path if it is not in the usual place).

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [file, times = '0', outDir = 'shots', scale = '1'] = process.argv.slice(2);
const chrome =
	process.env.CHROME ??
	['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync);

const source = readFileSync(file, 'utf8');
const [, w, h] = source.match(/width="(\d+)" height="(\d+)"/);
const dark = file.includes('dark');
mkdirSync(outDir, { recursive: true });

for (const t of times.split(',')) {
	const name = `${basename(file, '.svg')}@${t}`;
	const page = join(outDir, `${name}.html`);
	writeFileSync(
		page,
		`<!doctype html><meta charset="utf-8"><body style="margin:0;background:${dark ? '#0d1117' : '#fff'}">${source}<script>
const t=${Number(t)};
function seek(){
  document.getAnimations().forEach(a=>{a.pause();a.currentTime=t*1000});
  document.querySelectorAll('svg').forEach(s=>{s.pauseAnimations();s.setCurrentTime(t)});
}
seek();document.fonts.ready.then(seek);
</script>`,
	);
	execFileSync(chrome, [
		'--headless=new',
		'--disable-gpu',
		'--hide-scrollbars',
		`--force-device-scale-factor=${scale}`,
		`--window-size=${w},${h}`,
		'--virtual-time-budget=3000',
		'--run-all-compositor-stages-before-draw',
		`--screenshot=${resolve(outDir, `${name}.png`)}`,
		pathToFileURL(resolve(page)).href,
	], { stdio: 'ignore' });
	console.log(join(outDir, `${name}.png`));
}
