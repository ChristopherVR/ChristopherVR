// Renders the profile's activity graph and overview card as static SVGs.
// Runs in GitHub Actions (see .github/workflows/profile.yml) so the README
// never depends on a third-party image service staying online.
//
// Usage: GITHUB_TOKEN=... node scripts/generate.mjs <login> <outDir>

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { T, stageSvg } from './chungus.mjs';
import { ROWS, pickSnapped, rowSvg } from './sections.mjs';

const login = process.argv[2] ?? 'ChristopherVR';
const outDir = process.argv[3] ?? 'dist';
const token = process.env.GITHUB_TOKEN;
if (!token) throw new Error('GITHUB_TOKEN is required');

const DAYS = 60;

const THEMES = {
	dark: {
		bg: '#0d1117',
		border: '#30363d',
		text: '#e6edf3',
		muted: '#8b949e',
		grid: '#21262d',
		line: '#3fb950',
		fill: '#3fb950',
		accent: '#4493f8',
		card: '#161b22',
		flash: '#ffe9a8',
		flashPeak: 0.3,
	},
	light: {
		bg: '#ffffff',
		border: '#d0d7de',
		text: '#1f2328',
		muted: '#59636e',
		grid: '#eaeef2',
		line: '#1a7f37',
		fill: '#2da44e',
		accent: '#0969da',
		card: '#f6f8fa',
		flash: '#fff8dc',
		flashPeak: 0.7,
	},
};

const FONT = `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif`;

const QUERY = `query($login: String!) {
  user(login: $login) {
    followers { totalCount }
    contributionsCollection {
      totalCommitContributions
      totalPullRequestContributions
      totalIssueContributions
      restrictedContributionsCount
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
    }
    repositories(ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC, first: 100) {
      totalCount
      nodes {
        stargazerCount
        languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
          edges { size node { name color } }
        }
      }
    }
  }
}`;

async function fetchUser() {
	const res = await fetch('https://api.github.com/graphql', {
		method: 'POST',
		headers: { authorization: `bearer ${token}`, 'content-type': 'application/json' },
		body: JSON.stringify({ query: QUERY, variables: { login } }),
	});
	const json = await res.json();
	if (!res.ok || json.errors) throw new Error(JSON.stringify(json.errors ?? json));
	return json.data.user;
}

const esc = (s) =>
	String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const fmt = (n) => n.toLocaleString('en-AU');

function card(width, height, theme, body) {
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${FONT}">
<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="10" fill="${theme.bg}" stroke="${theme.border}"/>
${body}
</svg>
`;
}

function activitySvg(days, theme) {
	const W = 860;
	const H = 300;
	const pad = { l: 48, r: 24, t: 84, b: 40 };
	const cw = W - pad.l - pad.r;
	const ch = H - pad.t - pad.b;
	const max = Math.max(4, ...days.map((d) => d.contributionCount));
	const raw = max / 4;
	const mag = 10 ** Math.floor(Math.log10(raw));
	const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
	const top = step * 4;
	const x = (i) => pad.l + (i / (days.length - 1)) * cw;
	const y = (v) => pad.t + ch - (v / top) * ch;

	const pts = days.map((d, i) => [x(i), y(d.contributionCount)]);
	// Monotone-ish smoothing: a cubic per segment with horizontal tangents
	// never overshoots below zero or above the neighbouring points.
	let path = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
	for (let i = 1; i < pts.length; i++) {
		const [x0, y0] = pts[i - 1];
		const [x1, y1] = pts[i];
		const mx = (x0 + x1) / 2;
		path += ` C${mx.toFixed(1)},${y0.toFixed(1)} ${mx.toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
	}
	const area = `${path} L${x(days.length - 1).toFixed(1)},${y(0)} L${pad.l},${y(0)} Z`;

	const grid = [0, 1, 2, 3, 4]
		.map((k) => {
			const v = k * step;
			return `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(v)}" y2="${y(v)}" stroke="${theme.grid}"/>
<text x="${pad.l - 10}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="${theme.muted}">${v}</text>`;
		})
		.join('\n');

	const labels = days
		.map((d, i) => ({ d, i }))
		.filter(({ i }) => i % 7 === 0 || i === days.length - 1)
		.filter(({ i }, k, arr) => !(k === arr.length - 2 && days.length - 1 - i < 4))
		.map(({ d, i }) => {
			const date = new Date(`${d.date}T00:00:00Z`);
			const label = date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', timeZone: 'UTC' });
			const anchor = i === 0 ? 'start' : i === days.length - 1 ? 'end' : 'middle';
			return `<text x="${x(i)}" y="${H - 14}" text-anchor="${anchor}" font-size="11" fill="${theme.muted}">${esc(label)}</text>`;
		})
		.join('\n');

	const total = days.reduce((s, d) => s + d.contributionCount, 0);
	const active = days.filter((d) => d.contributionCount > 0).length;
	const best = days.reduce((a, d) => (d.contributionCount > a.contributionCount ? d : a));

	const body = `<defs>
<linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="${theme.fill}" stop-opacity="0.35"/>
<stop offset="1" stop-color="${theme.fill}" stop-opacity="0"/>
</linearGradient>
</defs>
<text x="24" y="34" font-size="16" font-weight="600" fill="${theme.text}">Contribution activity</text>
<text x="24" y="52" font-size="12" fill="${theme.muted}">Last ${days.length} days</text>
<text x="${W - 24}" y="34" text-anchor="end" font-size="13" fill="${theme.text}"><tspan font-weight="600">${fmt(total)}</tspan><tspan fill="${theme.muted}"> contributions · </tspan><tspan font-weight="600">${active}</tspan><tspan fill="${theme.muted}"> active days</tspan></text>
<text x="${W - 24}" y="52" text-anchor="end" font-size="12" fill="${theme.muted}">Busiest day: ${fmt(best.contributionCount)}</text>
${grid}
<path d="${area}" fill="url(#g)"/>
<path d="${path}" fill="none" stroke="${theme.line}" stroke-width="2.25" stroke-linejoin="round" stroke-linecap="round"/>
${labels}`;
	return card(W, H, theme, body);
}

function overviewSvg(user, theme) {
	const W = 860;
	const H = 200;
	const cc = user.contributionsCollection;
	const repos = user.repositories.nodes;
	const stars = repos.reduce((s, r) => s + r.stargazerCount, 0);

	const stats = [
		['Contributions (12 months)', cc.contributionCalendar.totalContributions],
		['Commits', cc.totalCommitContributions + cc.restrictedContributionsCount],
		['Pull requests', cc.totalPullRequestContributions],
		['Stars earned', stars],
		['Public repositories', user.repositories.totalCount],
	];
	const colW = (W - 48) / stats.length;
	const statText = stats
		.map(
			([label, value], i) => `<text x="${24 + i * colW}" y="${44}" font-size="22" font-weight="600" fill="${theme.text}">${fmt(value)}</text>
<text x="${24 + i * colW}" y="${64}" font-size="12" fill="${theme.muted}">${esc(label)}</text>`,
		)
		.join('\n');

	const sizes = new Map();
	for (const r of repos)
		for (const e of r.languages.edges) {
			const cur = sizes.get(e.node.name) ?? { size: 0, color: e.node.color ?? theme.muted };
			cur.size += e.size;
			sizes.set(e.node.name, cur);
		}
	const sum = [...sizes.values()].reduce((s, v) => s + v.size, 0) || 1;
	const langs = [...sizes.entries()].sort((a, b) => b[1].size - a[1].size).slice(0, 6);

	const barW = W - 48;
	let bx = 24;
	const bar = langs
		.map(([, v]) => {
			const w = (v.size / sum) * barW;
			const r = `<rect x="${bx.toFixed(1)}" y="112" width="${Math.max(w, 1).toFixed(1)}" height="10" fill="${v.color}"/>`;
			bx += w;
			return r;
		})
		.join('\n');

	const legendW = barW / 3;
	const legend = langs
		.map(([name, v], i) => {
			const lx = 24 + (i % 3) * legendW;
			const ly = 148 + Math.floor(i / 3) * 24;
			const pct = ((v.size / sum) * 100).toFixed(1);
			return `<circle cx="${lx + 5}" cy="${ly - 4}" r="5" fill="${v.color}"/>
<text x="${lx + 16}" y="${ly}" font-size="12" fill="${theme.text}">${esc(name)} <tspan fill="${theme.muted}">${pct}%</tspan></text>`;
		})
		.join('\n');

	const body = `${statText}
<text x="24" y="100" font-size="12" font-weight="600" fill="${theme.text}">Languages across public repositories</text>
<clipPath id="bar"><rect x="24" y="112" width="${barW}" height="10" rx="5"/></clipPath>
<rect x="24" y="112" width="${barW}" height="10" rx="5" fill="${theme.grid}"/>
<g clip-path="url(#bar)">
${bar}
</g>
${legend}`;
	return card(W, H, theme, body);
}

const user = await fetchUser();
const days = user.contributionsCollection.contributionCalendar.weeks
	.flatMap((w) => w.contributionDays)
	.slice(-DAYS);

await mkdir(outDir, { recursive: true });
// Half the sections are snapped; which half changes with each six-hour run.
const seed = Number(process.env.CHUNGUS_SEED ?? Math.floor(Date.now() / (6 * 3600 * 1000)));
const snapped = pickSnapped(seed);
console.log(`Snapping: ${[...snapped].join(', ')}`);
for (const [name, theme] of Object.entries(THEMES)) {
	const activity = activitySvg(days, theme);
	const overview = overviewSvg(user, theme);
	await writeFile(join(outDir, `activity-${name}.svg`), activity);
	await writeFile(join(outDir, `overview-${name}.svg`), overview);
	await writeFile(join(outDir, `chungus-stage-${name}.svg`), stageSvg(theme));
	for (const [i, row] of ROWS.entries())
		await writeFile(join(outDir, `row-${row.id}-${name}.svg`), rowSvg(row, theme, snapped, T.dust + i * T.gap, seed + i));
}
console.log(`Wrote activity, overview, Chungus stage and row SVGs for ${login} to ${outDir}`);
