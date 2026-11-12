// A local stand-in for the GitHub profile page, written next to the images
// so a build can be looked at before it is pushed. Open dist/preview.html;
// add ?theme=light or ?theme=dark to force a theme.

const esc = (s) => s.replace(/[&<>]/g, (c) => `&#${c.charCodeAt(0)};`);
const inline = (s) =>
	s
		.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
		.replace(/`([^`]+)`/g, (_, c) => `<code>${esc(c)}</code>`)
		.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

/** Just enough Markdown for this README: tables, fences and paragraphs. */
function markdown(src) {
	const out = [];
	const lines = src.split('\n');
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (line.startsWith('```')) {
			const code = [];
			while (!lines[++i].startsWith('```')) code.push(lines[i]);
			out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`);
		} else if (line.startsWith('|')) {
			const rows = [];
			for (; lines[i]?.startsWith('|'); i++) rows.push(lines[i].slice(1, -1).split('|').map((c) => inline(c.trim())));
			i--;
			const [head, , ...body] = rows;
			out.push(`<table><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr>${body.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>`);
		} else if (line.startsWith('- ')) out.push(`<li>${inline(line.slice(2))}</li>`);
		else if (line.trim() && !line.startsWith('<')) out.push(`<p>${inline(line)}</p>`);
		else out.push(line);
	}
	return out.join('\n');
}

export function previewHtml(readme) {
	// The README points at the published images; here they are next door.
	const local = markdown(readme).replace(/https:\/\/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/output\//g, '');
	return `<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Profile preview</title>
<style>
:root{color-scheme:light dark;--page:#fff;--ink:#1f2328;--rule:#d1d9e0;--link:#0969da}
@media (prefers-color-scheme:dark){:root{--page:#0d1117;--ink:#f0f6fc;--rule:#3d444d;--link:#4493f8}}
:root[data-theme=light]{--page:#fff;--ink:#1f2328;--rule:#d1d9e0;--link:#0969da}
:root[data-theme=dark]{--page:#0d1117;--ink:#f0f6fc;--rule:#3d444d;--link:#4493f8}
body{margin:0;background:var(--page);color:var(--ink);font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",Helvetica,Arial,sans-serif}
main{box-sizing:border-box;max-width:894px;margin:0 auto;padding:24px}
img{max-width:100%;height:auto;vertical-align:middle}
p{margin:0 0 16px}
a{color:var(--link)}
details{margin:0 0 16px}
li{margin:4px 0 4px 24px}
table{border-collapse:collapse;margin:12px 0}
td,th{border:1px solid var(--rule);padding:6px 13px;text-align:left}
code{font:85% ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;background:color-mix(in srgb,var(--ink) 10%,transparent);padding:.2em .4em;border-radius:6px}
pre code{display:block;padding:16px;overflow:auto}
</style>
<main>
${local}
</main>
<script>
const theme = new URLSearchParams(location.search).get('theme');
if (theme) {
	document.documentElement.dataset.theme = theme;
	for (const s of document.querySelectorAll('source')) {
		const dark = s.media.includes('dark');
		if (dark === (theme === 'dark')) s.media = 'all';
		else s.remove();
	}
}
</script>
`;
}
