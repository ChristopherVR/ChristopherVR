// A very large grey rabbit holding a gold gauntlet up in front of him, drawn
// as plain SVG for the profile animation. The box is 360 x 480 with his feet
// on the bottom edge. Classes on the hand let scripts/chungus.mjs swap the
// "ready" pinch for the "snapped" pose and light the stones.

const FUR = '#8a8d97';
const FUR_DARK = '#6c6f7a';
const BELLY = '#f2eee6';
const LINE = '#2e3039';
const GOLD_EDGE = '#7a5208';
const GOLD = '#e3ad42';
const STONES = ['#9b4dff', '#2f7dff', '#ff3b4e', '#ffd23f'];

const finger = (d, width) =>
	`<path d="${d}" fill="none" stroke="${GOLD_EDGE}" stroke-width="${width + 4}" stroke-linecap="round"/>
<path d="${d}" fill="none" stroke="${GOLD}" stroke-width="${width}" stroke-linecap="round"/>
<path d="${d}" fill="none" stroke="#ffe58a" stroke-opacity=".55" stroke-width="${Math.round(width / 3)}" stroke-linecap="round" transform="translate(-2 -1)"/>`;

function hand() {
	const stones = STONES.map(
		(c, i) => `<circle class="ch-stone" cx="${266 + i * 14}" cy="202" r="4.5" fill="${c}" stroke="#5a3a06" stroke-width=".8"/>`,
	).join('');
	// Drawn at 1.5x around the wrist so the fingers read at README size.
	return `<g class="ch-hand"><g transform="translate(286 286) scale(1.5) translate(-286 -286)">
<circle class="ch-aura" cx="290" cy="180" r="70" fill="url(#ch-aura)"/>
<rect x="259" y="250" width="54" height="36" rx="7" fill="url(#ch-gold)" stroke="${GOLD_EDGE}" stroke-width="2.5"/>
<path d="M263 262h46M263 273h46" stroke="#9c6a10" stroke-width="2.5" stroke-linecap="round"/>
${finger('M266 196 L266 120', 12)}
<g class="ch-ready">
${finger('M284 194 Q288 146 306 148 Q320 152 314 172', 12)}
</g>
<rect x="255" y="188" width="64" height="66" rx="17" fill="url(#ch-gold)" stroke="${GOLD_EDGE}" stroke-width="2.5"/>
${finger('M300 196 Q306 190 304 184', 10)}
${finger('M311 200 Q317 194 315 188', 9)}
<g class="ch-snapped">
${finger('M284 194 Q292 204 290 214', 12)}
</g>
${stones}
<circle class="ch-stone" cx="287" cy="228" r="9" fill="#ff8a1f" stroke="#5a3a06" stroke-width=".8"/>
<g class="ch-ready">${finger('M318 240 Q328 200 314 174', 13)}<circle class="ch-stone" cx="322" cy="212" r="4" fill="#2ed47a" stroke="#5a3a06" stroke-width=".8"/></g>
<g class="ch-snapped">${finger('M318 240 Q320 196 280 158', 13)}<circle class="ch-stone" cx="314" cy="204" r="4" fill="#2ed47a" stroke="#5a3a06" stroke-width=".8"/>
<path d="M322 150l14 -8M328 164l16 -2M318 138l8 -13" stroke="#ffd23f" stroke-width="3" stroke-linecap="round"/></g>
</g></g>`;
}

export function chungusFigure() {
	return `<g class="ch-ears">
<ellipse cx="150" cy="72" rx="21" ry="64" transform="rotate(-9 150 72)" fill="${FUR}"/>
<ellipse cx="151" cy="78" rx="9" ry="47" transform="rotate(-9 151 78)" fill="#f2b8c6"/>
<g class="ch-ear"><ellipse cx="210" cy="72" rx="21" ry="64" transform="rotate(9 210 72)" fill="${FUR}"/>
<ellipse cx="209" cy="78" rx="9" ry="47" transform="rotate(9 209 78)" fill="#f2b8c6"/></g>
</g>
<path d="M80 250 Q22 300 30 362" fill="none" stroke="${FUR_DARK}" stroke-width="32" stroke-linecap="round"/>
<circle cx="31" cy="376" r="25" fill="${BELLY}" stroke="#d9d3c6" stroke-width="2"/>
<ellipse cx="120" cy="468" rx="56" ry="16" fill="${FUR_DARK}"/>
<ellipse cx="240" cy="468" rx="56" ry="16" fill="${FUR_DARK}"/>
<path d="M180 150C255 150 300 230 318 320C338 420 300 468 180 468C60 468 22 420 42 320C60 230 105 150 180 150Z" fill="url(#ch-fur)"/>
<path d="M180 205C238 205 268 282 276 350C284 430 250 460 180 460C110 460 76 430 84 350C92 282 122 205 180 205Z" fill="${BELLY}"/>
<g class="ch-head">
<ellipse cx="180" cy="150" rx="64" ry="57" fill="url(#ch-fur)"/>
<ellipse cx="158" cy="176" rx="32" ry="21" fill="${BELLY}"/>
<ellipse cx="202" cy="176" rx="32" ry="21" fill="${BELLY}"/>
<ellipse cx="180" cy="190" rx="38" ry="17" fill="${BELLY}"/>
<ellipse cx="163" cy="138" rx="13" ry="15" fill="#fff"/>
<ellipse cx="197" cy="138" rx="13" ry="15" fill="#fff"/>
<circle cx="165" cy="144" r="5" fill="${LINE}"/>
<circle cx="195" cy="144" r="5" fill="${LINE}"/>
<path d="M149 139a14 15 0 0 1 28 0z M183 139a14 15 0 0 1 28 0z" fill="#9a9da7" stroke="${LINE}" stroke-width="2.5" stroke-linejoin="round"/>
<ellipse cx="180" cy="162" rx="8" ry="5.5" fill="#a5596a"/>
<path d="M164 181Q180 197 196 181Z" fill="#b81f33"/>
<rect x="175" y="180.5" width="5" height="7.5" rx="1" fill="#fff" stroke="${LINE}" stroke-width="1"/>
<rect x="180" y="180.5" width="5" height="7.5" rx="1" fill="#fff" stroke="${LINE}" stroke-width="1"/>
</g>
<path d="M286 252 Q318 300 304 344 Q292 310 286 286" fill="none" stroke="${FUR_DARK}" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>
${hand()}`;
}

export const figureDefs = `<radialGradient id="ch-fur" cx="38%" cy="30%" r="80%">
<stop offset="0" stop-color="#b6b8c2"/><stop offset="1" stop-color="${FUR_DARK}"/>
</radialGradient>
<linearGradient id="ch-gold" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="#ffe58a"/><stop offset=".55" stop-color="#e0a722"/><stop offset="1" stop-color="#9c6a10"/>
</linearGradient>
<radialGradient id="ch-aura">
<stop offset="0" stop-color="#fff3b0" stop-opacity=".9"/><stop offset=".5" stop-color="#ffb347" stop-opacity=".35"/><stop offset="1" stop-color="#ff7a1f" stop-opacity="0"/>
</radialGradient>`;
