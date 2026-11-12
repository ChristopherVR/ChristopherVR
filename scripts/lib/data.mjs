// Everything the graphics know about the account. Two GraphQL requests: one
// for the profile, repositories, pins and releases, then one for twelve weeks
// of commit counts on every repository that has been touched recently.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const WEEKS = 12;
const WEEK = 7 * 864e5;

const QUERY = `query($login: String!) {
  user(login: $login) {
    name
    login
    location
    createdAt
    followers { totalCount }
    pinnedItems(first: 6, types: REPOSITORY) {
      nodes { ... on Repository { name owner { login } } }
    }
    contributionsCollection {
      totalCommitContributions
      totalPullRequestContributions
      totalIssueContributions
      restrictedContributionsCount
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount weekday } }
      }
    }
    repositories(ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC, first: 100) {
      totalCount
      nodes {
        name
        description
        url
        stargazerCount
        forkCount
        pushedAt
        createdAt
        isArchived
        homepageUrl
        primaryLanguage { name color }
        languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
          edges { size node { name color } }
        }
        releases(first: 1, orderBy: { field: CREATED_AT, direction: DESC }) {
          nodes { tagName publishedAt }
        }
      }
    }
  }
}`;

async function graphql(token, query, variables = {}) {
	const res = await fetch('https://api.github.com/graphql', {
		method: 'POST',
		headers: { authorization: `bearer ${token}`, 'content-type': 'application/json', 'user-agent': 'profile-graphics' },
		body: JSON.stringify({ query, variables }),
	});
	const json = await res.json();
	if (!res.ok || json.errors) throw new Error(JSON.stringify(json.errors ?? json));
	return json.data;
}

/** Commit counts on the default branch, one alias per week per repository. */
async function fetchWeekly(token, login, names, now) {
	if (!names.length) return {};
	const iso = (t) => new Date(t).toISOString();
	const weeks = Array.from({ length: WEEKS }, (_, w) => {
		// w0 is the oldest week, the last one ends now.
		const until = now - (WEEKS - 1 - w) * WEEK;
		return `w${w}: history(since: "${iso(until - WEEK)}", until: "${iso(until)}") { totalCount }`;
	}).join(' ');
	const query = `query { ${names
		.map((name, i) => `r${i}: repository(owner: ${JSON.stringify(login)}, name: ${JSON.stringify(name)}) { defaultBranchRef { target { ... on Commit { ${weeks} } } } }`)
		.join(' ')} }`;
	const data = await graphql(token, query);
	return Object.fromEntries(
		names.map((name, i) => {
			const t = data[`r${i}`]?.defaultBranchRef?.target;
			return [name, Array.from({ length: WEEKS }, (_, w) => t?.[`w${w}`]?.totalCount ?? 0)];
		}),
	);
}

/**
 * Load and tidy the account data.
 *
 * PROFILE_DATA  a file to reuse one response while working on the graphics,
 *               so a design pass needs neither the network nor a token.
 * PROFILE_NOW   an ISO time to build "as of", to see the sky at another hour.
 */
export async function loadData(login, token) {
	const cache = process.env.PROFILE_DATA;
	let raw;
	if (cache && existsSync(cache)) {
		raw = JSON.parse(readFileSync(cache, 'utf8'));
	} else {
		if (!token) throw new Error('GITHUB_TOKEN is required');
		const builtAt = Date.now();
		const { user } = await graphql(token, QUERY, { login });
		const active = user.repositories.nodes.filter((r) => !r.isArchived && builtAt - new Date(r.pushedAt) < WEEKS * WEEK).map((r) => r.name);
		raw = { user, builtAt, weekly: await fetchWeekly(token, login, active, builtAt) };
		if (cache) {
			mkdirSync(dirname(cache), { recursive: true });
			writeFileSync(cache, JSON.stringify(raw));
		}
	}
	const { user, weekly } = raw;
	const builtAt = new Date(process.env.PROFILE_NOW ?? raw.builtAt);

	const cc = user.contributionsCollection;
	const weeks = cc.contributionCalendar.weeks.map((w) =>
		w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount, weekday: d.weekday })),
	);
	const days = weeks.flat();
	const nodes = user.repositories.nodes;

	const sizes = new Map();
	for (const r of nodes)
		for (const e of r.languages.edges) {
			const cur = sizes.get(e.node.name) ?? { name: e.node.name, size: 0 };
			cur.size += e.size;
			sizes.set(e.node.name, cur);
		}
	const sum = [...sizes.values()].reduce((s, v) => s + v.size, 0) || 1;
	const langs = [...sizes.values()].sort((a, b) => b.size - a.size).map((l) => ({ ...l, share: l.size / sum }));

	const repos = Object.fromEntries(
		nodes.map((r) => {
			const rel = r.releases.nodes[0];
			const bytes = r.languages.edges.reduce((s, e) => s + e.size, 0) || 1;
			return [
				r.name,
				{
					name: r.name,
					description: r.description ?? '',
					url: r.url,
					stars: r.stargazerCount,
					forks: r.forkCount,
					pushedAt: new Date(r.pushedAt),
					createdAt: new Date(r.createdAt),
					archived: r.isArchived,
					homepage: r.homepageUrl || null,
					language: r.primaryLanguage?.name ?? null,
					languages: r.languages.edges.map((e) => ({ name: e.node.name, share: e.size / bytes })),
					release: rel?.publishedAt ? { tag: rel.tagName, at: new Date(rel.publishedAt) } : null,
					// Twelve weekly commit counts, oldest first; the last is this week.
					weeks: weekly[r.name] ?? Array(WEEKS).fill(0),
				},
			];
		}),
	);

	const best = days.reduce((a, d) => (d.count > a.count ? d : a), days[0]);
	return {
		login: user.login,
		name: user.name ?? user.login,
		location: user.location ?? '',
		createdAt: new Date(user.createdAt),
		builtAt,
		followers: user.followers.totalCount,
		// Pins that are this account's own repositories, in pin order.
		pinned: user.pinnedItems.nodes.filter((p) => p?.owner?.login === user.login && repos[p.name]).map((p) => p.name),
		weeks,
		days,
		langs,
		repos,
		totals: {
			contributions: cc.contributionCalendar.totalContributions,
			commits: cc.totalCommitContributions + cc.restrictedContributionsCount,
			pullRequests: cc.totalPullRequestContributions,
			issues: cc.totalIssueContributions,
			stars: nodes.reduce((s, r) => s + r.stargazerCount, 0),
			forks: nodes.reduce((s, r) => s + r.forkCount, 0),
			repos: user.repositories.totalCount,
			activeDays: days.filter((d) => d.count > 0).length,
			best,
		},
	};
}
