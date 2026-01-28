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
- **Life** - Individual incarnations with race, class, stats, story (many per Character)
- **Quirk** - Post-regeneration effects that can be assigned to lives

### Core Logic Flow

Regeneration (`/api/characters/[slug]/regenerate`):
1. Roll new level: current level ± (1d4 - 2)
2. Random race from `lib/data/races.json`
3. Random class/subclass from `lib/data/classes.json` (100+ combinations)
4. Calculate stats using class-priority ability score array + racial bonuses + ASIs
5. Select skill proficiencies based on class
6. Generate narrative story via AWS Bedrock
7. Deactivate old life, create new active life

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
- `POST /api/characters/[slug]/regenerate` - Generate new life
- `GET/PUT /api/characters/[slug]/lives/[lifeId]` - Life management
- `GET/POST/PUT/DELETE /api/quirks[/id]` - Quirk CRUD
