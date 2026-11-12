// The hero: a year of work as a city, under the real sky over Brisbane.
//
// Two things here are computed rather than drawn. The sky is where the sun
// and moon actually were when the pipeline last ran (lib/sky.mjs): the arc
// is the sun's true path across today's sky, looking north, and the moon
// shows its true phase. The city is the contribution calendar, one column
// per day, in an axonometric projection worked out below. After dark the
// columns turn their lights on.

import { cycle, fmt, measure, mix, n, outlineText, random, svg, text, timeline, wrap } from '../lib/kit.mjs';
import { compass, skyFor } from '../lib/sky.mjs';
import { PROFILE } from '../profile.mjs';

const W = 860;
const P = 36; // seconds per loop

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const day = (iso) => new Date(`${iso}T00:00:00Z`);
const shortDate = (iso) => day(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** A clock time in the profile's own time zone, "6:14 pm". */
export function clock(date) {
	return new Intl.DateTimeFormat('en-AU', { timeZone: PROFILE.timeZone, hour: 'numeric', minute: '2-digit', hour12: true }).format(date).replace(/\s/g, ' ');
}

function streak(days) {
	let best = 0;
	let run = 0;
	for (const d of days) {
		run = d.count > 0 ? run + 1 : 0;
		best = Math.max(best, run);
	}
	return best;
}

export function hero(data, T) {
	const dark = T.name === 'dark';
	const sky = skyFor(data.builtAt, PROFILE.lat, PROFILE.lon, PROFILE.utcOffset);
	const sunUp = sky.sun.alt > -0.833;
	// 1 in full daylight, 0 once civil twilight has ended.
	const daylight = clamp((sky.sun.alt + 6) / 12);
	const css = [];
	let defs = '';

	/* ================= Sky ============================================ */
	// The view looks north, so east is on the right and the sun crosses the
	// picture from right to left, as it does from Brisbane.
	// The sky is drawn as a dome seen from inside: height on the page is
	// altitude, and a body's sideways position shrinks toward the middle as it
	// climbs, so something passing overhead (the midsummer sun does, here)
	// goes over the top as a point instead of smearing across it.
	const SKY = { cx: 288, half: 270, top: 6, horizon: 238 };
	const RAD = Math.PI / 180;
	const place = ({ az, alt }) => ({
		x: SKY.cx + SKY.half * Math.cos(alt * RAD) * Math.sin(az * RAD),
		y: SKY.horizon - (alt / 90) * (SKY.horizon - SKY.top),
	});
	const line = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${n(p.x)} ${n(p.y)}`).join('');

	let skySvg = `<line x1="0" x2="${SKY.cx + SKY.half + 8}" y1="${SKY.horizon}" y2="${SKY.horizon}" stroke="${T.rule}"/>`;
	for (const [label, side] of [['W', -1], ['N', 0], ['E', 1]]) {
		const x = SKY.cx + side * SKY.half;
		skySvg += `<line x1="${n(x)}" x2="${n(x)}" y1="${SKY.horizon}" y2="${SKY.horizon + 4}" stroke="${T.faint}"/>${text(x, SKY.horizon + 15, label, { size: 9.5, fill: T.muted, anchor: 'middle' })}`;
	}

	// Stars come out as the sun goes down. Their positions are fixed, so the
	// same sky returns every night.
	const darkness = clamp((-sky.sun.alt - 3) / 9);
	if (darkness > 0) {
		const rand = random(20170428);
		let stars = '';
		const count = Math.round(130 * darkness);
		for (let i = 0; i < count; i++) {
			const x = rand() * (SKY.cx + SKY.half);
			const y = SKY.top + rand() * (SKY.horizon - SKY.top - 8);
			const r = 0.6 + rand() * rand() * 1.5;
			const o = (0.3 + rand() * 0.7) * (dark ? 1 : 0.55);
			stars += `<circle${i % 6 === 0 ? ` class="tw" style="animation-delay:${n(-rand() * 5, 2)}s"` : ''} cx="${n(x)}" cy="${n(y)}" r="${n(r, 2)}" opacity="${n(o, 2)}"/>`;
		}
		skySvg += `<g fill="${T.ink}">${stars}</g>`;
		css.push(`.tw{animation:tw 5s ease-in-out infinite}@keyframes tw{50%{opacity:.15}}`);
	}

	// Today's arc. The part already travelled is solid, the rest dotted.
	const up = sky.sunTrack.filter((p) => p.alt > 0);
	const travelled = up.filter((p) => p.t <= sky.date.getTime());
	const sunNow = place(sky.sun);
	const sunColor = mix(dark ? '#ff7a3d' : '#f0642a', dark ? '#ffcf5a' : '#f3ac12', clamp(sky.sun.alt / 25));
	if (sunUp && up.length > 1) {
		skySvg += `<path d="${line(up.map(place))}" fill="none" stroke="${T.muted}" stroke-width="1" stroke-dasharray="1 5" stroke-linecap="round" opacity=".9"/>`;
	}

	// The glow at the horizon around sunrise and sunset.
	const twilight = clamp(1 - Math.abs(sky.sun.alt) / 11);
	if (twilight > 0) {
		defs += `<radialGradient id="dusk"><stop offset="0" stop-color="#ff8a4c" stop-opacity=".75"/><stop offset=".45" stop-color="#e8589a" stop-opacity=".3"/><stop offset="1" stop-color="#7a5cf0" stop-opacity="0"/></radialGradient><clipPath id="above"><rect x="-40" y="-40" width="${W + 80}" height="${SKY.horizon + 40}"/></clipPath>`;
		skySvg += `<g clip-path="url(#above)"><ellipse cx="${n(clamp(sunNow.x, 20, SKY.cx + SKY.half))}" cy="${SKY.horizon}" rx="330" ry="120" fill="url(#dusk)" opacity="${n(twilight * (dark ? 0.9 : 0.6), 2)}"/></g>`;
	}

	if (sunUp && travelled.length > 1) {
		const pts = [...travelled.map(place), sunNow];
		// Replay the day so far: the sun climbs its arc to where it is now.
		const len = [0];
		for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
		const total = len.at(-1) || 1;
		const RISE = 2.8;
		const steps = 14;
		const stops = [];
		const trail = [];
		for (let k = 0; k <= steps; k++) {
			const i = Math.round((k / steps) * (pts.length - 1));
			const t = 0.3 + RISE * (1 - (1 - k / steps) ** 2.2);
			stops.push([t, `transform:translate(${n(pts[i].x - sunNow.x)}px,${n(pts[i].y - sunNow.y)}px)`]);
			trail.push([t, `stroke-dashoffset:${n(1 - len[i] / total, 4)}`]);
		}
		css.push(
			`.sun{animation:sun ${P}s linear infinite both}`,
			timeline('sun', P, [[0, stops[0][1]], ...stops, [P, 'transform:translate(0,0)']]),
			`.trail{stroke-dasharray:1 2;animation:trail ${P}s linear infinite both}`,
			timeline('trail', P, [[0, 'stroke-dashoffset:1.01'], ...trail, [P, 'stroke-dashoffset:0']]),
		);
		skySvg += `<path class="trail" pathLength="1" d="${line(pts)}" fill="none" stroke="${sunColor}" stroke-width="1.6" stroke-linecap="round"/>`;
	}
	if (sunUp) {
		defs += `<radialGradient id="halo"><stop offset="0" stop-color="${sunColor}" stop-opacity="${dark ? 0.55 : 0.5}"/><stop offset="1" stop-color="${sunColor}" stop-opacity="0"/></radialGradient>`;
		skySvg += `<g class="sun"><circle cx="${n(sunNow.x)}" cy="${n(sunNow.y)}" r="58" fill="url(#halo)"/><circle cx="${n(sunNow.x)}" cy="${n(sunNow.y)}" r="13" fill="${sunColor}"/></g>`;
	}

	// The moon, with tonight's phase. From the southern hemisphere a waxing
	// moon is lit on its left.
	if (sky.moon.alt > 2) {
		const m = place(sky.moon);
		const r = 10;
		const f = sky.phase.lit;
		const rx = n(r * Math.abs(1 - 2 * f), 2);
		const lit = `M0 ${-r}A${r} ${r} 0 0 1 0 ${r}A${rx} ${r} 0 0 ${f < 0.5 ? 0 : 1} 0 ${-r}Z`;
		const strength = sunUp ? 0.6 : 1;
		if (!sunUp) {
			const mUp = sky.moonTrack.filter((p) => p.alt > 0);
			// The track can be in two pieces when the moon sets and rises again.
			let seg = [];
			const segs = [seg];
			mUp.forEach((p, i) => {
				if (i && p.t - mUp[i - 1].t > 6e5) segs.push((seg = []));
				seg.push(p);
			});
			for (const s of segs) if (s.length > 1) skySvg += `<path d="${line(s.map(place))}" fill="none" stroke="${T.faint}" stroke-dasharray="1 5" stroke-linecap="round"/>`;
		}
		skySvg += `<g transform="translate(${n(m.x)} ${n(m.y)})" opacity="${strength}"><circle r="${r}" fill="${dark ? '#1b222d' : '#eef1f4'}"/><path d="${lit}" transform="scale(${sky.phase.waxing ? -1 : 1} 1)" fill="${dark ? '#f2f4f7' : '#ffffff'}" stroke="${dark ? 'none' : T.muted}" stroke-width=".8"/>${dark ? '' : `<circle r="${r}" fill="none" stroke="${T.muted}" stroke-width=".8"/>`}</g>`;
	}

	// One plain sentence about the sky, so the drawing can be checked.
	const where = PROFILE.city;
	const moonNote = `${sky.phase.name[0].toUpperCase()}${sky.phase.name.slice(1)}${sky.moon.alt > 2 ? ', up now' : ''}.`;
	const sunNote = sunUp
		? `The sun is ${Math.round(sky.sun.alt)}° up in the ${compass(sky.sun.az)} and sets at ${clock(sky.sunset)}.`
		: sky.date < sky.sunrise
			? `The sun is down and rises at ${clock(sky.sunrise)}.`
			: `The sun set at ${clock(sky.sunset)}.`;
	const noteLines = wrap('text', `${where}, ${clock(sky.date)}. ${sunNote} ${moonNote}`, 13.5, 560);
	let note = '';
	noteLines.forEach((l, i) => {
		note += text(0, SKY.horizon + 40 + i * 19, l, { font: 'text', size: 13.5, fill: T.soft });
	});

	/* ================= Name =========================================== */
	const [first, ...rest] = data.name.split(' ');
	const S = 106;
	const lead = 96;
	const base1 = 92;
	let glyphs = '';
	let k = 0;
	[first, rest.join(' ')].filter(Boolean).forEach((str, li) => {
		for (const g of outlineText('display', str, S, 4, base1 + li * lead).glyphs) {
			if (!g.d) continue;
			const d = 0.25 + k++ * 0.075;
			const handles = g.handles.map(([a, b]) => `M${n(a.x)} ${n(a.y)}L${n(b.x)} ${n(b.y)}`).join('');
			const dots = (pts) => pts.map((q) => `M${n(q.x)} ${n(q.y)}h.01`).join('');
			glyphs += `<g style="--d:${n(d, 2)}s"><path class="gf" d="${g.d}"/><path class="go" pathLength="1" d="${g.d}"/><g class="gn"><path class="gh" d="${handles}"/><path class="gq" d="${dots(g.off)}"/><path class="gp" d="${dots(g.on)}"/></g></g>`;
		}
	});
	// Each letter is traced from the font's own control points, then inked.
	// The ink stays; once a loop the tracing sweeps back across it.
	const again = 19;
	const sweep = (on, off) => [[again, off], [again + 0.3, on], [again + 1.2, on], [again + 1.8, off]];
	css.push(
		`.gf{fill:${T.ink};animation:gf 1.6s ease-out both var(--d)}@keyframes gf{0%,45%{fill-opacity:0}100%{fill-opacity:1}}`,
		`.go{fill:none;stroke:${T.hues[0]};stroke-width:1.3;stroke-dasharray:1;stroke-dashoffset:0;stroke-opacity:0;animation:go ${P}s linear infinite both var(--d)}`,
		timeline('go', P, [
			[0, 'stroke-dashoffset:1;stroke-opacity:1;animation-timing-function:cubic-bezier(.5,0,.2,1)'],
			[1.15, 'stroke-dashoffset:0;stroke-opacity:1'],
			[1.9, 'stroke-dashoffset:0;stroke-opacity:1'],
			[2.6, 'stroke-dashoffset:0;stroke-opacity:0'],
			...sweep('stroke-dashoffset:0;stroke-opacity:1', 'stroke-dashoffset:0;stroke-opacity:0'),
			[P, 'stroke-dashoffset:0;stroke-opacity:0'],
		]),
		`.gn{opacity:0;animation:gn ${P}s linear infinite both var(--d)}`,
		timeline('gn', P, [[0, 'opacity:0'], [0.3, 'opacity:1'], [1.9, 'opacity:1'], [2.6, 'opacity:0'], ...sweep('opacity:1', 'opacity:0'), [P, 'opacity:0']]),
		`.gh{fill:none;stroke:${T.muted};stroke-width:.6}`,
		`.gq{fill:none;stroke:${T.muted};stroke-width:3.2;stroke-linecap:round}`,
		`.gp{fill:none;stroke:${T.hues[0]};stroke-width:3.4;stroke-linecap:square}`,
	);

	/* ================= Words ========================================== */
	const colX = 612;
	const colW = W - colX;
	let copy = '';
	let cy = 44;
	for (const l of wrap('display', PROFILE.headline, 23, colW)) {
		copy += text(colX, cy, l, { font: 'display', size: 23, fill: T.ink });
		cy += 28;
	}
	cy += 8;
	for (const l of wrap('text', PROFILE.intro, 14.5, colW)) {
		copy += text(colX, cy, l, { font: 'text', size: 14.5, fill: T.soft });
		cy += 21.5;
	}

	/* ================= City =========================================== */
	const t = data.totals;
	const headY = SKY.horizon + 40 + noteLines.length * 19 + 34;
	const big = fmt(t.contributions);
	const head =
		text(0, headY, big, { font: 'display', size: 44, fill: T.ink }) +
		text(measure('display', big, 44) + 12, headY, 'contributions in the past year', { font: 'display', size: 21, fill: T.ink }) +
		text(0, headY + 24, `One column for each day. Active on ${t.activeDays} of them, ${streak(data.days)} in a row at best.`, { font: 'text', size: 13.5, fill: T.soft });

	const weeks = data.weeks;
	const NW = weeks.length;
	const max = Math.max(1, t.best.count);
	// Screen-space axes: a week steps right and slightly down, a day steps
	// down and to the left. Columns rise straight up the screen.
	const x0 = 52;
	const y0 = headY + 58;
	const u = { x: (W - x0 - 3) / NW, y: 1.6 };
	const v = { x: -6.6, y: 8.6 };
	const fillK = 0.84;
	const us = { x: u.x * fillK, y: u.y * fillK };
	const vs = { x: v.x * fillK, y: v.y * fillK };
	const at = (i, j) => ({ x: x0 + i * u.x + j * v.x, y: y0 + i * u.y + j * v.y });
	const HMAX = 132;
	const height = (c) => (c ? 2.5 + HMAX * Math.sqrt(c / max) : 0);

	// By day the columns run teal to amber with height. At night they sink
	// toward the colour of the dark and their windows come on.
	const nightBody = dark ? '#18233b' : '#33415c';
	const low = mix(T.page, T.fills[2], dark ? 0.42 : 0.5);
	const ramp = (q) => {
		const c = q < 0.5 ? mix(low, T.fills[2], q * 2) : mix(T.fills[2], T.fills[0], (q - 0.5) * 2);
		return mix(c, nightBody, 0.62 * (1 - daylight));
	};
	const shade = (c, q) => mix(c, dark ? T.page : '#10151c', q);
	const lights = clamp(1 - daylight * 1.6);
	if (lights > 0)
		defs += `<pattern id="win" width="4.4" height="6.2" patternUnits="userSpaceOnUse"><rect x="1.1" y="1.6" width="2.1" height="2.7" fill="#ffd27a"/></pattern>`;

	const topFace = (h) => `M0 ${n(-h)}l${n(us.x)} ${n(us.y)}l${n(vs.x)} ${n(vs.y)}l${n(-us.x)} ${n(-us.y)}z`;
	const ku = n(u.y / u.x, 4);
	const kv = n(-v.y / -v.x, 4);
	const rand = random(t.contributions);
	let tiles = '';
	let columns = '';
	let peak = null;
	// Back to front: far days first, then left to right.
	for (let j = 0; j < 7; j++) {
		for (let i = 0; i < NW; i++) {
			const d = weeks[i].find((x) => x.weekday === j);
			if (!d) continue;
			const p = at(i, j);
			const tr = `transform="translate(${n(p.x)} ${n(p.y)})"`;
			if (!d.count) {
				tiles += `<path ${tr} d="${topFace(0)}"/>`;
				continue;
			}
			const h = height(d.count);
			const c = ramp(Math.sqrt(d.count / max));
			const delay = 0.6 + i * 0.045 + j * 0.03;
			const lit = lights > 0 && h > 9 ? `<rect class="s" y="${n(-h)}" width="${n(us.x)}" height="${n(h)}" fill="url(#win)" opacity="${n(lights * (0.45 + rand() * 0.55), 2)}"/>` : '';
			columns +=
				`<g ${tr} style="--d:${n(delay, 2)}s;--h:${n(h)}px">` +
				`<g transform="matrix(1 ${ku} 0 1 ${n(vs.x)} ${n(vs.y)})"><rect class="s" y="${n(-h)}" width="${n(us.x)}" height="${n(h)}" fill="${shade(c, 0.24)}"/>${lit}</g>` +
				`<g transform="matrix(1 ${kv} 0 1 ${n(us.x + vs.x)} ${n(us.y + vs.y)})"><rect class="s" y="${n(-h)}" width="${n(-vs.x)}" height="${n(h)}" fill="${shade(c, 0.5)}"/></g>` +
				`<path class="tp" d="${topFace(h)}" fill="${c}"/></g>`;
			if (d.date === t.best.date) peak = { x: p.x + (us.x + vs.x) / 2, y: p.y + (us.y + vs.y) / 2 - h, delay };
		}
	}

	// Months along the front edge.
	let labels = '';
	let lastMonth = -1;
	weeks.forEach((w, i) => {
		const m = day(w[0].date).getUTCMonth();
		if (m === lastMonth) return;
		lastMonth = m;
		if (i > NW - 2) return;
		const p = at(i, 7);
		labels += text(p.x + 3, p.y + 13, day(w[0].date).toLocaleDateString('en-AU', { month: 'short', timeZone: 'UTC' }), { size: 10.5, fill: T.muted });
	});

	// Flags: the week each featured project began. Placed right to left, each
	// label on the first row where it neither overlaps another label nor is
	// crossed by a pole on its way to a lower row.
	const firstDay = day(weeks[0][0].date).getTime();
	const featured = [...new Set([PROFILE.flagship, ...(PROFILE.flagshipAlso ?? []), ...data.pinned, ...(PROFILE.extras ?? [])])];
	const flags = featured
		.map((name) => data.repos[name])
		.filter(Boolean)
		.map((r) => ({ name: r.name, i: (r.createdAt.getTime() - firstDay) / (7 * 864e5) }))
		.filter((f) => f.i >= 0 && f.i < NW)
		.sort((a, b) => b.i - a.i);
	const placed = [];
	const flagBase = at(NW, 7).y + 40;
	let flagSvg = '';
	for (const f of flags) {
		const p = at(f.i, 7);
		const w = measure('mono', f.name, 11);
		const flip = p.x + 7 + w > W;
		const x1 = flip ? p.x - 7 - w : p.x + 7;
		const x2 = x1 + w;
		let row = 0;
		const clash = (r) =>
			placed.some(
				(o) =>
					(o.row === r && x1 < o.x2 + 10 && x2 > o.x1 - 10) ||
					(o.row > r && o.px > x1 - 5 && o.px < x2 + 5) ||
					(o.row < r && p.x > o.x1 - 5 && p.x < o.x2 + 5),
			);
		while (clash(row)) row++;
		placed.push({ row, x1, x2, px: p.x });
		const y = flagBase + row * 17;
		flagSvg += `<g class="fl" style="animation-delay:${n(1.1 + f.i * 0.045, 2)}s"><line x1="${n(p.x)}" x2="${n(p.x)}" y1="${n(p.y + 2)}" y2="${n(y + 3)}" stroke="${T.faint}"/><circle cx="${n(p.x)}" cy="${n(p.y + 2)}" r="2.2" fill="${T.ink}"/>${text(x1, y, f.name, { size: 11, fill: T.ink })}</g>`;
	}
	const flagRows = Math.max(1, ...placed.map((o) => o.row + 1));

	// The busiest day, called out from the top of its column.
	let callout = '';
	if (peak) {
		const lx = peak.x - 26;
		const ly = peak.y - 16;
		callout = `<g class="fl" style="animation-delay:${n(peak.delay + 0.9, 2)}s"><path d="M${n(peak.x)} ${n(peak.y - 3)}L${n(peak.x - 8)} ${n(ly + 1)}H${n(lx + 4)}" fill="none" stroke="${T.muted}"/>${text(lx, ly + 5, `${fmt(t.best.count)} on ${shortDate(t.best.date)}`, { size: 12, fill: T.ink, anchor: 'end' })}</g>`;
	}

	css.push(
		`.z path{fill:${T.wash};stroke:${T.rule};stroke-width:.7}`,
		`.s{animation:gs ${P}s linear infinite both var(--d)}`,
		cycle('gs', P, { from: 'transform:scaleY(0)', to: 'transform:scaleY(1)', enter: 0.9, gap: 2, exit: 0.7 }),
		`.tp{animation:gt ${P}s linear infinite both var(--d)}`,
		cycle('gt', P, { from: 'transform:translateY(var(--h))', to: 'transform:translateY(0)', enter: 0.9, gap: 2, exit: 0.7 }),
		`.fl{animation:fl ${P}s linear infinite both}`,
		cycle('fl', P, { from: 'opacity:0', to: 'opacity:1', enter: 0.5, gap: 2 }),
	);

	const H = Math.ceil(flagBase + (flagRows - 1) * 17 + 12);
	return svg({
		w: W,
		h: H,
		title: `${data.name}. ${PROFILE.headline} ${PROFILE.intro} ${where}, ${clock(sky.date)}: ${sunNote} ${moonNote} Below, ${big} contributions in the past year drawn as a city with one column per day; the busiest day had ${fmt(t.best.count)}.`,
		fonts: ['display', 'text', 'mono'],
		css: css.join(''),
		defs,
		body: `${skySvg}
${glyphs}
${copy}
${note}
${head}
<g class="z">${tiles}</g>
${columns}
${labels}
${flagSvg}
${callout}`,
	});
}
