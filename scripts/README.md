# How the profile page works

The profile README is a stack of animated SVGs. Nothing on it is a screenshot, a GIF or a video, and nothing comes from an image service. `build.mjs` draws every picture from live GitHub data, and the [workflow](../.github/workflows/profile.yml) publishes them to the `output` branch, which the README points at.

No JavaScript runs in the visitor's browser: GitHub shows README images through `<img>`, so everything that moves is CSS keyframes or SMIL written into the file at build time. The build has no dependencies and installs nothing.

## What is on the page

| Drawing | File | What it shows |
| --- | --- | --- |
| Hero | `scenes/hero.mjs` | The name, the sky over Brisbane, and the past year of contributions as a city |
| This week | `scenes/now.mjs` | Commits in the last seven days by repository, and the latest releases |
| Flagship | `scenes/ooxml.mjs` | A slide lifting apart into package, theme, layout and shapes |
| Project cards | `scenes/cards.mjs` | One card per pinned repository, each with a small looping demo |
| Languages | `scenes/overview.mjs` | Public code by language along a Hilbert curve, the stack, the year's totals |
| Footer | `scenes/footer.mjs` | When the pipeline last ran |

**The sky is the real one.** `lib/sky.mjs` works out where the sun and moon are over Brisbane at the moment of the build. The arc is the sun's actual path across that day's sky (looking north, which is why it travels right to left), and the moon shows its true phase. After sunset the stars come out and the city turns its lights on.

**The project cards follow the pins.** There is one card for each repository pinned on the profile, plus any named in `extras` in `profile.mjs`. A repository with a hand-made demo in `scenes/cards.mjs` uses it; any other gets a card drawn from its own data (latest release, twelve weeks of commits, languages). The build rewrites the block between the `cards:start` and `cards:end` markers in the root README to match, and the workflow commits that change.

**The lettering and the 3D are done by hand.** The name is traced from the font's own TrueType control points (`lib/kit.mjs`), the city and the exploded slide are axonometric projections worked out in the scene files, and the spinning model on the Drakan2PC card is rendered frame by frame at build time (`lib/wire.mjs`).

## When it runs

- Every hour, which keeps the sky close to the real one and the weekly numbers current.
- On a push that touches `scripts/`, `assets/`, the root README or the workflow.
- By hand, from the Actions tab.
- When another repository sends a `profile-refresh` event, so a project can refresh the profile the moment it ships. The snippet for a project's release workflow is in the header of the workflow file.

## Changing things

Everything written by hand is in `profile.mjs`: the headline and intro, the stack, the city the sky belongs to, which project is the flagship, and any extra cards.

To give a project its own demo, add a function to `scenes/cards.mjs`, put it in `BESPOKE`, and add its sentence to `BLURBS`.

## Running it locally

```sh
GITHUB_TOKEN=$(gh auth token) node scripts/build.mjs ChristopherVR dist
```

Then open `dist/preview.html`, a local stand-in for the profile page. Add `?theme=light` or `?theme=dark` to force a theme.

| Variable | Effect |
| --- | --- |
| `PROFILE_DATA=.cache/data.json` | Reuse one GitHub response, so a design pass needs neither the network nor a token |
| `PROFILE_NOW=2026-06-21T07:00:00Z` | Build as of another moment, to see the sky at a different hour or season |
| `ONLY=hero,now` | Build only some drawings |

`node scripts/tools/shoot.mjs dist/hero-dark.svg 1.5,15` freezes a drawing at those seconds and screenshots it with Chrome, which is the quickest way to check an animation.

## Fonts

Fraunces and IBM Plex Mono, both under the SIL Open Font License (texts in `assets/fonts`). `tools/fonts.py` subsets them, renames the subsets, and writes the metrics the build uses to measure text. It only needs running again to change a typeface.
