// The words and choices on the profile. Numbers (stars, contributions,
// commits, releases, languages) and the sky come from the pipeline on every
// run; everything decided by hand lives here.

export const PROFILE = {
	headline: 'Azure software engineer in Brisbane.',
	intro:
		'By day I build MCP servers and wire agentic AI into enterprise systems on Azure and Databricks. After hours I experiment with AI for decompilation, build open source products and make mods for games.',
	stack: ['TypeScript', 'C#', '.NET', 'Python', 'C++', 'Rust', 'React', 'Angular', 'Node.js', 'Azure', 'Databricks', 'Docker', 'Kubernetes', 'SQL Server'],

	// Where the sky in the hero is. Brisbane has no daylight saving, so the
	// offset never changes; a city that has it would need the offset derived
	// from the time zone instead.
	city: 'Brisbane',
	lat: -27.4705,
	lon: 153.026,
	timeZone: 'Australia/Brisbane',
	timeZoneLabel: 'AEST',
	utcOffset: 10,

	// The project that gets the wide drawing. Its stars and forks are counted
	// together with any repositories listed in `flagshipAlso`.
	flagship: 'ooxml',
	flagshipAlso: ['pptx-viewer'],

	// Project cards are made for whatever is pinned on the GitHub profile, in
	// pin order. Add repository names here to show more than the six pins.
	extras: ['mtx-decompressor'],
};
