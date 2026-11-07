# The Regenerist

A D&D 5e character manager built around an enduring soul and its changing incarnations. Regenerist characters gain a new race/class/body and story; static characters can be edited manually. The current rules baseline is **2014, single class, levels 1–20**, with selected supplements. See [rules coverage](docs/RULES-COVERAGE.md) for exact support and [review](docs/REVIEW.md) for findings and priorities.

## Start locally

Use Node 22 or newer (`nvm use` if available), PostgreSQL, and your existing local rules data.

```sh
npm ci
cp .env.example .env.local
# Set DATABASE_URL in .env.local. AWS credentials are optional for fallback stories.
npm run data:check
npm run db:push
npm run dev
```

Prisma CLI reads `.env`, not Next's `.env.local`. Before `db:push`, `db:studio`, or an upgrade command, export `DATABASE_URL` in your shell (or put just that setting in a local `.env`, which is ignored). Next reads `.env.local` itself. `db:push` targets the database you configure: use a new local database for initial setup.

The `data/` directory is ignored by git and is **not included in a fresh clone**. Restore the project's existing data folder separately. It contains `class/`, `spells/`, `races.json`, and other reference files. The tracked `lib/data/` folder contains app catalogs and explicit spell/weapon mappings, not the full descriptions. The app must have local data at runtime; Docker copies it into the image.

Open http://localhost:3000. Create a character in Regenerist mode to generate incarnations, or disable that mode for a manually edited character. AI stories use your configured Bedrock model; mechanics are deterministic local rules. Bedrock failure falls back to a local story/spell selection.

## Existing installations

This update adds nullable `Life.gameplayState`. Apply the additive script once before running the new build:

```sh
# DATABASE_URL must already be exported and point to your intended database.
npx prisma db execute --file prisma/upgrades/20260907_character_resources.sql --schema prisma/schema.prisma
```

Back up your database first. The script also adds older missing `isRegenerist`, `baseStats`, and `spellbook` columns when necessary. It does not rewrite existing characters or repair historical scores. The development review did not apply this script to your existing database.

For a fresh Docker database, `init.sql` includes all fields. PostgreSQL only runs initialization scripts for empty volumes; rebuilding the app does not upgrade an existing volume. Never delete a database volume to apply an upgrade.

```sh
docker compose --env-file .env.local up --build
```

The app remains a trusted personal/LAN tool: there is no account authentication or per-user access control. Do not expose its character/admin APIs publicly without adding authentication.

## At the table

- Set armor, shield, and weapon. AC, movement, attack bonuses, damage, proficiency, and attack counts follow the current form and level.
- Apply damage/healing, grant temporary HP, track concentration and death saves, and roll weapon attacks.
- Spend hit dice during a short rest; complete short/long rests to recover the implemented resources. Class-specific recovery choices remain manual.
- Edit the selected spell list and track used slots. Granted subclass spells are automatic; a Wizard's separate research spellbook is not yet modeled.
- Open previous lives to inspect them. Clearing history preserves the active life. Regeneration always uses the active soul's level, even while viewing an older form.
- Static editing defaults to final-score editing. Unchanged scores preserve their progression; edited final scores use manual advancement. Explicit point-buy rebuilds apply racial bonuses and automatic class-priority ASIs once.

Quirk descriptions are narrative/homebrew effects. Their stated bonuses and penalties are not automatically applied. Manual bonuses and table adjudication are still required for many feats and features.

## Validation

```sh
npm test                 # Pure mechanics and mocked route regressions, no DB/AWS
npm run typecheck
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e         # Browser workflows with mocked APIs, isolated port 3107
```

You can set `PLAYWRIGHT_CHROME_PATH` to an installed Chrome executable instead of downloading Chromium. After `npm run build`, set `PLAYWRIGHT_PRODUCTION=1` to test the production build instead of starting the development server. Run builds and development/browser servers sequentially because they share `.next`. Browser tests never send mutations to your real character API. Test results are ignored by git.

The production framework is upgraded to Next 15.5.25. Node 22 is used in Docker and required by `.nvmrc`/package engines. The PostCSS override keeps the framework's transitive parser on the patched 8.x line. Keep the lockfile with deployments.
