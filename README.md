# NBA Shenanigans

**Build your five. Chase the banner.** A sleek, browser-only fantasy basketball draft and playoff simulator, ready for GitHub Pages.

## Play

1. Choose one of 30 NBA franchises, then draft five starters and three bench players.
2. Pick **Current era** or **Legacy mode**. Search names, filter teams and positions, inspect six custom attributes, or auto-draft the remaining slots.
3. Enter a seed, choose balanced, pace-and-space, or defensive tactics, and select single elimination, best-of-three, or best-of-seven series.
4. Face seven randomly drafted teams in an eight-team bracket. All 64 players in a tournament are unique.
5. Simulate each game or fast-forward a round. Inspect quarter scores, full player box scores, game MVPs, league leaders, and the champion.

The draft and tournament save in your browser. Download individual box scores as CSV or an entire run as JSON. JSON export is an archive; importing runs is not currently implemented. The same seed, lineup, mode, tactics, opponent pool, and series settings reproduce the same run.

## Host on GitHub Pages

This repository includes a complete static site at its root; no API key, backend, or install is needed to host it.

1. Open **Settings → Pages** in this repository.
2. Choose **Deploy from a branch**.
3. Select **main** and **/ (root)**, then **Save**.
4. When GitHub finishes deployment, open **https://tsukyi.github.io/NBA-Shenanigans/**.

All assets use relative paths, so the repository subdirectory works correctly. JavaScript modules need HTTP hosting; do not open `index.html` directly as a local file.

## Player data and ratings

- **Current era:** 100 curated players, with teams based on a **2025–26 opening-roster snapshot**. This is not a live 2026 roster or trade feed.
- **Legacy:** all **5,205 identities** in the bundled `nba_api` historical directory snapshot, including the 100 current profiles and **75 curated legends**. Directory source last updated August 16, 2026. The archive is a dated source snapshot, not a guarantee that every future NBA debut is included.
- **Custom ratings:** all abilities and overall ratings are original simulator estimates, **not official NBA 2K ratings**, historical season statistics, or real per-game averages. Overall blends the six-attribute average with the strongest attribute. Cross-era shooting values are fictional estimates.
- **Unrated historical players:** all 5,030 other archive entries are draftable with an explicitly labeled **70 baseline**. Positions and career teams are unverified, so they can fill any slot and show “Team unlisted.” Legacy defaults opponents to curated profiles; select the full archive to include baseline players in opponent drafts.
- **Photos and logos:** loaded from the NBA CDN, with a local silhouette and team-label fallback. Some historical headshots do not exist. Jerseys in live CDN images can differ from this dated roster snapshot. Current players are available regardless of real-world injuries. Curated legends show one featured career franchise.

Sources: [nba_api player directory](https://github.com/swar/nba_api/blob/master/src/nba_api/stats/library/data.py), [2025–26 roster reference](https://nba.2k.com/2k26/top-100-players/), [NBA legends](https://www.nba.com/news/history-nba-legends), [NBA players and headshots](https://www.nba.com/players). Attribution for the directory appears in `THIRD_PARTY_NOTICES.md`.

This independent fan project is not affiliated with the NBA, its teams, or 2K. Player images and team marks belong to their respective owners; the code license does not grant rights to those assets.

## Simulation

The possession engine uses finishing, shooting, playmaking, defense, rebounding, tactics, and seeded randomness. A single event stream generates points, shooting splits, assists, steals, blocks, turnovers, rebounds, and on-court plus/minus. Games include four 12-minute quarters, automatic bench rotations, and five-minute overtimes until the tie is broken. Athleticism is displayed and contributes to overall rating; it currently has no separate possession modifier.

This is a lightweight entertainment model, not a forecast of real games. It does not model fouling out, injuries, manual substitutions, or home-court advantage. Random seeding is a bracket draw, not a team-strength ranking.

## Development

Requires Node.js 20 or newer. The site has no runtime package dependencies.

```sh
npm start                 # http://localhost:5174
npm test                  # directory, draft, seeded simulation, stat consistency, tournaments
npm run build             # copies the static site into dist/
npm install --no-save --package-lock=false playwright@1.62.1
npx playwright install chromium
npm run test:e2e           # start the server in another terminal first
```

GitHub Actions runs unit checks, builds the site, and tests complete browser journeys at desktop, tablet, and phone widths. Browser screenshots are attached to each workflow run.

The editable custom ratings are in `data/roster-source.tsv` and `data/legends-source.tsv`. Download the upstream `nba_api` `data.py` to a local file, then run `python scripts/build-roster.py /path/to/data.py` and `python scripts/build-legacy.py /path/to/data.py` to regenerate the bundled modules. Those scripts parse the source without executing it. Review roster changes and directory counts before committing a refresh; the snapshot labels and archive counts in the interface must be updated together.
