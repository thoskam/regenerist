# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The Regenerist is a D&D 5e character manager where characters "regenerate" into new forms with randomized races, classes, and abilities. Each regeneration creates a new "life" with AI-generated narrative stories via AWS Bedrock (Claude 3.5 Sonnet).

## Commands

```bash
# Development
npm run dev          # Start dev server at localhost:3000
npm run build        # Build for production
npm run lint         # Run ESLint

# Database
npx prisma db push   # Apply schema changes to database
npx prisma studio    # Open GUI database viewer

# Docker
docker-compose up    # Run full stack (app + postgres)
docker-compose up db # Run just the database
```

## Architecture

**Stack:** Next.js 14 (App Router) + TypeScript + Prisma + PostgreSQL + AWS Bedrock

### Key Directories

- `app/` - Next.js App Router pages and API routes
- `app/api/characters/[slug]/regenerate/route.ts` - Core regeneration logic (main feature)
- `components/` - React components for character display
- `lib/` - Utility functions, calculations, and game logic
- `lib/data/` - JSON files for D&D data (classes, races, effects, skills)
- `prisma/schema.prisma` - Database schema

### Database Schema

Three tables:
- **Character** - The persistent soul/identity (has name, slug, level)
- **Life** - Individual incarnations with race, class, stats, story, spellbook (many per Character)
- **Quirk** - Post-regeneration effects that can be assigned to lives

### Core Logic Flow

Regeneration (`/api/characters/[slug]/regenerate`):
1. Roll new level: current level ± (1d4 - 2)
2. Random race from `lib/data/races.json`
3. Random class/subclass from `lib/data/classes.json` (100+ combinations)
4. Calculate stats using class-priority ability score array + racial bonuses + ASIs
5. Select skill proficiencies based on class
6. Generate narrative story via AWS Bedrock
7. Generate smart spellbook for spellcasters via AWS Bedrock (see Smart Spellbook System)
8. Deactivate old life, create new active life

### Stat Calculation

- Base array: 14, 13, 12, 10, 8, 8 (mapped to class priorities)
- Racial bonuses fetched from Claude with fallback defaults
- ASIs applied at levels 4, 8, 12, 16, 19
- HP = hit_die + (levels - 1) × (avg_hit_die + CON_mod)

## Environment Variables

Required in `.env.local`:
```
DATABASE_URL=postgresql://user:password@host:5432/regenerist
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
BEDROCK_MODEL_ID=us.anthropic.claude-3-5-sonnet-20241022-v2:0
```

## API Routes

- `GET/POST /api/characters` - List/create characters
- `GET/PUT/DELETE /api/characters/[slug]` - Character CRUD
- `POST /api/characters/[slug]/regenerate` - Generate new life (includes spellbook for casters)
- `GET /api/characters/[slug]/hydrate` - Get hydrated character data (class features, race traits, spells)
- `GET/PUT /api/characters/[slug]/lives/[lifeId]` - Life management (including spellbook updates)
- `GET/POST/PUT/DELETE /api/quirks[/id]` - Quirk CRUD

## Regeneration Animation System

The regeneration UI has a Doctor Who-inspired animation sequence with multiple phases.

### Animation Phases (`regenPhase` state)

1. **`idle`** - Normal state, no animations
2. **`fading-out`** (0.8s) - Text fades to transparent with amber flash midway, boxes remain visible
3. **`loading`** (min 1.5s) - Grid boxes pulse with golden glow while waiting for API response
4. **`flashing-in`** (1s) - Screen flash overlay + text fades back in from amber

### Key Files

- `app/character/[slug]/page.tsx` - Main state machine (`regenPhase`, `handleRegenerate`)
- `app/globals.css` - All animation keyframes (`regenerate-text-out`, `regenerate-text-in`, `grid-pulse`, `screen-flash`)
- `components/StatBlock.tsx` - Ability score boxes with `pulseStyle` prop

### Animation CSS Classes

- `.animate-regenerate-out` - Text fade out (applied to content wrappers)
- `.animate-regenerate-in` - Text fade in with amber flash
- `.regeneration-flash` - Full-screen golden flash overlay
- `grid-pulse` keyframe - Applied via inline styles during loading phase

### Important Notes

- Grid box pulse animations use **inline styles** (not CSS classes) because Tailwind classes can conflict
- Minimum 1.5s loading time ensures pulse animation is visible even with fast API responses
- The `animate-regenerate-out/in` classes use `animation-fill-mode: forwards`

## Smart Spellbook System

AI-powered spell selection for spellcasting characters using AWS Bedrock. Spells are selected based on race, class, and subclass theme.

### How It Works

1. **During Regeneration**: For spellcasters, the system:
   - Calculates cantrips known and spells known/prepared using D&D 5e rules
   - Gets available spells from local 5eTools JSON data (`data/spells/`)
   - Sends spell names to Bedrock with "The Archivist" persona prompt
   - AI selects thematically appropriate spells and provides tactical advice
   - Stores selection in `Life.spellbook` as JSON

2. **Spell Editing**: Users can modify their spellbook via UI:
   - Click "Edit Spells" button in Spells tab
   - Add/remove spells with +/- buttons
   - Save changes (persisted to database)

### Key Files

- `lib/spellSlots.ts` - D&D 5e spell slot calculations (cantrips, spells known/prepared, max level)
- `lib/spellbookGenerator.ts` - Bedrock integration for AI spell selection
- `lib/dndApi.ts` - `getAvailableSpellNames()` for fetching spell lists
- `components/SpellList.tsx` - UI with edit mode, spellcasting stats, Archivist's Note

### Database Schema

```prisma
model Life {
  // ... other fields ...
  spellbook  Json?  // {spellNames: string[], archivistNote: string}
}
```

### Spellcasting Stats Display

The Spells tab shows:
- **Spellcasting Ability** (INT/WIS/CHA based on class)
- **Spell Save DC**: 8 + proficiency + ability mod
- **Spell Attack Bonus**: proficiency + ability mod
- **Archivist's Note**: AI-generated tactical advice

### Caster Type Detection

- **Full casters**: Bard, Cleric, Druid, Sorcerer, Wizard (spell progression 1-9)
- **Half casters**: Paladin, Ranger, Artificer (spell progression 1-5, starts level 2)
- **Third casters**: Eldritch Knight, Arcane Trickster (spell progression 1-4, starts level 3)
- **Pact Magic**: Warlock (spell progression 1-5, different slot mechanics)
- **Non-casters**: No spellbook generated, Spells tab hidden

## Development Workflow

### Local Development (Recommended)

Run Next.js locally while using Docker for the database:

```bash
docker-compose stop app          # Stop the app container
docker-compose up -d db          # Keep database running
npm run dev                      # Start local dev server
```

This allows hot-reloading without rebuilding Docker images.

### Docker Development

If running fully in Docker, code changes require rebuild:

```bash
docker-compose up --build -d app
```

### Deployment to Unraid

SSH into Unraid server and run:

```bash
cd /path/to/dnd
git pull
docker-compose up --build -d app
```
