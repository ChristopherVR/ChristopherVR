// What is happening this week. Nothing here is written by hand: the number,
// the repositories and their twelve-week histories, and the releases all
// come from the pipeline's last run.

import { cycle, fmt, measure, n, svg, text, wrap } from '../lib/kit.mjs';
import { PROFILE } from '../profile.mjs';

const W = 860;
const P = 30;

const stamp = (date, opts) => new Intl.DateTimeFormat('en-AU', { timeZone: PROFILE.timeZone, ...opts }).format(date);
const shortDay = (date) => stamp(date, { day: 'numeric', month: 'short' });
const clip = (s, max) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

export function now(data, T) {
	const repos = Object.values(data.repos);
	const week = (r) => r.weeks.at(-1);
	const active = repos.filter((r) => week(r) > 0).sort((a, b) => week(b) - week(a));
	const total = active.reduce((s, r) => s + week(r), 0);
	// When the week has been quiet, fall back to whatever moved most recently.
	const rows = (active.length ? active : [...repos].sort((a, b) => b.pushedAt - a.pushedAt)).slice(0, 5);
	const latest = rows.reduce((a, r) => (r.pushedAt > a.pushedAt ? r : a), rows[0]);
	const releases = repos
		.filter((r) => r.release)
		.sort((a, b) => b.release.at - a.release.at)
		.slice(0, 4);

	/* ---- The week, as one number -------------------------------------- */
	let left = text(0, 62, fmt(total), { font: 'display', size: 68, fill: T.ink });
	let y = 92;
	const sentence = total
		? `commits in the last seven days, across ${active.length} ${active.length === 1 ? 'repository' : 'repositories'}.`
		: 'commits in the last seven days. A quiet week.';
	for (const l of wrap('text', sentence, 14.5, 226)) {
		left += text(0, y, l, { font: 'text', size: 14.5, fill: T.soft });
		y += 21.5;
	}
	left += text(0, y + 10, `as of ${stamp(data.builtAt, { weekday: 'short', day: 'numeric', month: 'short' })}, ${stamp(data.builtAt, { hour: 'numeric', minute: '2-digit', hour12: true })}`, { size: 11, fill: T.muted });

	/* ---- By repository -------------------------------------------------- */
	const mx = 280;
	const mEnd = 596;
	let mid = text(mx, 16, 'This week by repository, with the twelve weeks behind it', { font: 'text', size: 12.5, fill: T.muted });
	rows.forEach((r, i) => {
		const ry = 54 + i * 37;
		const d = 0.5 + i * 0.35;
		if (r === latest)
			mid += `<circle class="ping" cx="${mx + 4}" cy="${ry - 4}" r="3.5" fill="${T.fills[5]}"/><circle cx="${mx + 4}" cy="${ry - 4}" r="3.5" fill="${T.fills[5]}"/>`;
		mid += text(mx + 16, ry, clip(r.name, 20), { size: 12.5, fill: T.ink });
		const peak = Math.max(1, ...r.weeks);
		r.weeks.forEach((c, k) => {
			const h = c ? Math.max(1.5, (c / peak) * 24) : 1;
			const last = k === r.weeks.length - 1;
			mid += `<rect class="wk" style="animation-delay:${n(d + k * 0.04, 2)}s" x="${n(mx + 172 + k * 8)}" y="${n(ry + 3 - h)}" width="5.5" height="${n(h)}" rx="1" fill="${last ? T.fills[0] : T.fills[2]}" fill-opacity="${!c ? 0.35 : last ? 1 : 0.6}"/>`;
		});
		mid += `<g class="in" style="animation-delay:${n(d + 0.5, 2)}s">${text(mEnd, ry, fmt(week(r)), { size: 12.5, fill: T.ink, anchor: 'end' })}</g>`;
	});

	/* ---- Releases ------------------------------------------------------- */
	const rx = 640;
	let right = text(rx, 16, 'Latest releases', { font: 'text', size: 12.5, fill: T.muted });
	releases.forEach((r, i) => {
		const ry = 54 + i * 44;
		const date = shortDay(r.release.at);
		const room = Math.floor((W - rx - measure('mono', date, 11) - 14) / 7.5);
		right += `<g class="in" style="animation-delay:${n(0.9 + i * 0.3, 2)}s">${text(rx, ry, clip(r.name, room), { size: 12.5, fill: T.ink })}${text(W, ry, date, { size: 11, fill: T.muted, anchor: 'end' })}${text(rx, ry + 17, clip(r.release.tag, 32), { size: 11, fill: T.muted })}</g>`;
	});

	const H = Math.max(54 + (rows.length - 1) * 37 + 18, 54 + (releases.length - 1) * 44 + 30, y + 22);

	const css = [
		`.wk{transform-box:fill-box;transform-origin:50% 100%;animation:wk ${P}s linear infinite both}`,
		cycle('wk', P, { from: 'transform:scaleY(0)', to: 'transform:scaleY(1)', enter: 0.5, gap: 2 }),
		`.in{animation:in ${P}s linear infinite both}`,
		cycle('in', P, { from: 'opacity:0', to: 'opacity:1', enter: 0.4, gap: 2 }),
		// The repository pushed to most recently has a live dot.
		`.ping{transform-box:fill-box;transform-origin:center;animation:ping 2.4s ease-out infinite}@keyframes ping{0%{transform:scale(1);opacity:.7}70%,100%{transform:scale(3.2);opacity:0}}`,
	].join('');

	return svg({
		w: W,
		h: Math.ceil(H),
		title: `${fmt(total)} commits in the last seven days. Most active: ${rows.map((r) => `${r.name} (${fmt(week(r))})`).join(', ')}. Latest releases: ${releases.map((r) => `${r.name} ${r.release.tag} on ${shortDay(r.release.at)}`).join(', ')}.`,
		fonts: ['display', 'text', 'mono'],
		css,
		body: `${left}
${mid}
${right}`,
	});
}
