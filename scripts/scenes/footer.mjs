// One line at the foot of the page: when the pipeline last ran.

import { svg, text } from '../lib/kit.mjs';
import { PROFILE } from '../profile.mjs';

const W = 860;

const stamp = (date, opts) => new Intl.DateTimeFormat('en-AU', { timeZone: PROFILE.timeZone, ...opts }).format(date);

export function footer(data, T) {
	const when = `${stamp(data.builtAt, { day: 'numeric', month: 'short' })}, ${stamp(data.builtAt, { hour: 'numeric', minute: '2-digit', hour12: true })} ${PROFILE.timeZoneLabel}`;
	const line = `Last rebuilt ${when}. It runs again every hour, and whenever a project ships a release.`;
	return svg({
		w: W,
		h: 28,
		title: line,
		fonts: ['mono'],
		body: text(0, 18, line, { size: 11, fill: T.muted }),
	});
}
