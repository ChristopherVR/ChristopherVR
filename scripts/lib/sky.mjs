// Where the sun and moon are, for a place and a moment. The hero draws the
// real sky over the city on the profile, so the pipeline works it out on
// every run instead of asking a weather service.
//
// These are the standard low-precision series (good to a fraction of a
// degree, far finer than the drawing): the sun from its mean anomaly and
// equation of centre, the moon from its three main periodic terms.

const RAD = Math.PI / 180;
const DAY = 864e5;
const OBLIQUITY = RAD * 23.4397;

const daysSinceJ2000 = (date) => date / DAY - 0.5 + 2440588 - 2451545;
const rightAscension = (l, b) => Math.atan2(Math.sin(l) * Math.cos(OBLIQUITY) - Math.tan(b) * Math.sin(OBLIQUITY), Math.cos(l));
const declination = (l, b) => Math.asin(Math.sin(b) * Math.cos(OBLIQUITY) + Math.cos(b) * Math.sin(OBLIQUITY) * Math.sin(l));
const siderealTime = (d, lw) => RAD * (280.16 + 360.9856235 * d) - lw;

function sunCoords(d) {
	const M = RAD * (357.5291 + 0.98560028 * d);
	const C = RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
	const L = M + C + RAD * 102.9372 + Math.PI;
	return { dec: declination(L, 0), ra: rightAscension(L, 0) };
}

function moonCoords(d) {
	const L = RAD * (218.316 + 13.176396 * d);
	const M = RAD * (134.963 + 13.064993 * d);
	const F = RAD * (93.272 + 13.22935 * d);
	const l = L + RAD * 6.289 * Math.sin(M);
	const b = RAD * 5.128 * Math.sin(F);
	return { ra: rightAscension(l, b), dec: declination(l, b), dist: 385001 - 20905 * Math.cos(M) };
}

/** Altitude above the horizon and bearing clockwise from north, in degrees. */
function horizontal(c, d, lat, lon) {
	const phi = RAD * lat;
	const H = siderealTime(d, RAD * -lon) - c.ra;
	const alt = Math.asin(Math.sin(phi) * Math.sin(c.dec) + Math.cos(phi) * Math.cos(c.dec) * Math.cos(H));
	const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(c.dec) * Math.cos(phi)) + Math.PI;
	return { alt: alt / RAD, az: (((az / RAD) % 360) + 360) % 360 };
}

export const sunAt = (date, lat, lon) => horizontal(sunCoords(daysSinceJ2000(date)), daysSinceJ2000(date), lat, lon);
export const moonAt = (date, lat, lon) => horizontal(moonCoords(daysSinceJ2000(date)), daysSinceJ2000(date), lat, lon);

/** How much of the moon is lit (0 to 1) and whether it is growing. */
export function moonPhase(date) {
	const d = daysSinceJ2000(date);
	const s = sunCoords(d);
	const m = moonCoords(d);
	const sunDist = 149598000;
	const phi = Math.acos(Math.sin(s.dec) * Math.sin(m.dec) + Math.cos(s.dec) * Math.cos(m.dec) * Math.cos(s.ra - m.ra));
	const inc = Math.atan2(sunDist * Math.sin(phi), m.dist - sunDist * Math.cos(phi));
	const angle = Math.atan2(
		Math.cos(s.dec) * Math.sin(s.ra - m.ra),
		Math.sin(s.dec) * Math.cos(m.dec) - Math.cos(s.dec) * Math.sin(m.dec) * Math.cos(s.ra - m.ra),
	);
	const lit = (1 + Math.cos(inc)) / 2;
	const waxing = angle < 0;
	const name =
		lit < 0.03 ? 'new moon' : lit > 0.97 ? 'full moon' : Math.abs(lit - 0.5) < 0.06 ? (waxing ? 'first quarter' : 'last quarter') : `${waxing ? 'waxing' : 'waning'} ${lit < 0.5 ? 'crescent' : 'gibbous'}`;
	return { lit, waxing, name };
}

const COMPASS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
export const compass = (az) => COMPASS[Math.round(az / 45) % 8];

/**
 * Everything the hero needs for one moment: where both bodies are now, the
 * path each traces across the 24 hours around it, and today's sunrise and
 * sunset. `offsetHours` is the place's UTC offset, to find its local day.
 */
export function skyFor(date, lat, lon, offsetHours) {
	const now = date.getTime();
	const local = new Date(now + offsetHours * 36e5);
	const midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - offsetHours * 36e5;
	const STEP = 5 * 6e4;
	const track = (at) => {
		const out = [];
		for (let t = midnight; t <= midnight + DAY; t += STEP) out.push({ t, ...at(new Date(t), lat, lon) });
		return out;
	};
	const sunTrack = track(sunAt);
	// Refraction and the sun's radius put sunrise at -0.833 degrees.
	const crossing = (rising) => {
		for (let i = 1; i < sunTrack.length; i++) {
			const a = sunTrack[i - 1];
			const b = sunTrack[i];
			if (rising ? a.alt < -0.833 && b.alt >= -0.833 : a.alt >= -0.833 && b.alt < -0.833)
				return new Date(a.t + ((-0.833 - a.alt) / (b.alt - a.alt)) * STEP);
		}
		return null;
	};
	return {
		date,
		sun: sunAt(date, lat, lon),
		moon: moonAt(date, lat, lon),
		phase: moonPhase(date),
		sunTrack,
		moonTrack: track(moonAt),
		sunrise: crossing(true),
		sunset: crossing(false),
	};
}
