# Regenerist review and improvements — September 2026

The original application had a useful soul/incarnation model and substantial local reference data, but its sheet was primarily a display with several disconnected mechanics. This review implemented fixes and table-use features across the frontend, rules helpers, API, deployment setup, and validation. It does **not** claim full D&D Beyond parity.

## Architecture

- `Character` stores the enduring identity, active level, and Regenerist/static mode.
- `Life` stores each incarnation's class, race, ability scores, HP, story, selections, and now `gameplayState` JSON. `baseStats` means pre-ASI scores, already including racial bonuses.
- `Quirk` provides reusable homebrew narrative effects; these are not a mechanical effect engine.
- Next App Router pages load character records and separately hydrate local 5eTools descriptions and earned features. `lib/dndApi.ts` handles this mapping.
- Regeneration chooses a supported form, applies deterministic local stats, selects skills/spells, requests a Bedrock narrative, and commits the replacement in one transaction. AI has no authority over ability bonuses or class spell legality.
- Rules helpers provide shared calculations. `lib/lifeUpdates.ts` validates server mutations and applies derived changes. Gameplay helpers and panels support table actions.

## Findings fixed

| Severity | Original behavior | Result |
| --- | --- | --- |
| High | Old incarnation deactivated before replacement completed | Preparation precedes a serializable transaction; failed/concurrent generation preserves the old life |
| High | Unrestricted life update fields and weak ownership validation | Allowlisted fields, scoped lookups, numeric/boolean validation, conflict responses |
| High | Repeated editing/leveling could apply ASIs again | Explicit pre-ASI point buy versus final manual scores; unchanged scores keep progression |
| High | Spell-school guesses admitted spells from unrelated classes | Explicit PHB class lists and named subclass grants, class/level validation and selection quotas |
| High | No transactional synchronization of character and life levels | Active life and soul update together; concurrent changes return a conflict |
| High | Fresh initialization lacked existing model columns | Corrected initialization SQL; additive existing-database upgrade supplied |
| High | Outdated framework/dependency vulnerabilities | Next 15.5.25, compatible dependency fixes, patched PostCSS override; audit reports zero vulnerabilities |
| Medium | Historical lives showed current incarnation's features/spells | Hydration takes a validated, character-scoped life ID |
| Medium | Empty spellbooks displayed all available spells | Empty selection remains empty; editing selects from eligible spells |
| Medium | Clearing history removed the active character in the UI | Active incarnation preserved in database and reloaded on screen |
| Medium | HP/API errors hidden and overlapping saves lost state | Shared serialized save handling, immediate save lock, partial resource updates, visible errors |
| Medium | Story-only saves could overwrite manually adjusted HP | Mechanical recalculation checks actual identity/level changes |
| Medium | Generated class choices included ten entries with missing data | Automatic pool restricted to 119 verified combinations; manual picks show support warning |
| Medium | Race/subclass data and feature references were incomplete | Merged subraces, resolved nested granted features, excluded unselected options |
| Medium | Spell progression and some ASI/HP/AC formulas were inaccurate | Shared slot tables, pact/third/Artificer progression, split ASIs, racial/subclass HP, armor-aware defenses/movement |
| Medium | Hub/admin could hide failed requests or remove unsaved data | Response checking and errors; creation refreshes actual initial life |
| Medium | Build depended on Google Fonts availability | System font stack permits builds without a font download |

## Functional additions

- Armor, shield and manual AC bonus persist per incarnation; armor affects AC and relevant movement features.
- PHB weapon selection connects Strength/Dexterity, proficiency, magic bonus, versatile grip, Monk martial arts and Extra Attack. Dice controls include advantage/disadvantage and critical damage.
- Temporary HP absorbs damage first. Damage/healing handles current HP, concentration reminders, death saves and massive damage. Death-save rolls implement natural 1 and 20.
- Level-aware spell slot counters persist; short rests recover pact slots, long rests recover HP/slots and half total hit dice (minimum one). Hit-die spending uses class die and Constitution.
- Subclass spell grants are automatic and do not consume ordinary selection quotas. Unsupported general supplemental spell membership is not guessed.
- Static editor separates final-score editing from an explicit point-buy rebuild; failed saves preserve the editor and its draft.

## Remaining gaps and recommended priorities

1. **Make advancement choices first-class data.** Store raw starting scores, racial choices, chosen ASIs/feats, background, expertise, fighting style, and subclass decisions. Current generation assigns ability increases by class priority. Manual race changes preserve scores; use point buy to rebuild bonuses. Existing potentially inflated scores are not automatically repaired because the original choices cannot be reconstructed reliably.
2. **Add an effect/resource engine.** Rage, ki, sorcery points, Wild Shape, channel divinity, exhaustion, conditions, magic items and quirks should contribute structured modifiers with sources and expiration rules. Descriptions currently do not automatically change the sheet. Start with a few well-tested classes rather than pretending every described feature is automated.
3. **Separate learned spells from preparation.** The current saved list is the active selection. Wizard research spellbooks, ritual-only choices, Mystic Arcanum selections/usage, Magical Secrets, origin replacements and third-caster school restrictions need distinct models and rules.
4. **Expand inventory and combat context.** The weapon panel is one equipped weapon, not a complete inventory. Ammunition, currency, weight, range circumstances, dual wielding, Sneak Attack, resistances and fighting-style effects remain manual. Ability overrides only cover Strength/Dexterity; Hexblade/Battle Smith spell-ability attacks need feature-aware options.
5. **Make rules edition/source selectable.** The original catalog mixed supplements, 2024 entries and homebrew. Current automatic generation excludes missing combinations, but there is no full 2024 engine or multiclass support. See the exhaustive [coverage table](RULES-COVERAGE.md).
6. **Strengthen persistence and recovery.** Add character export/import, versioned backups, database integration tests, optimistic row version tokens for stale tabs, and a database-level active-life invariant. Current transactions catch overlapping operations, but do not reject every sequential edit from an old browser snapshot.
7. **Add authentication before public hosting.** All app/admin APIs currently trust the caller. This remains a personal/trusted-network application. Authentication and per-user ownership are separate from the fixed character/life scoping.
8. **Improve regeneration identity over time.** Store continuity memories, recurring bonds, personality traits and a configurable generation pool. An eventual guided regeneration preview could explain what changed and why while preserving the surprise reveal. These are proposals, not implemented features.

## Verification and limits

- All 41 Node regression tests pass. Regression tests cover arithmetic, class spell eligibility/grants/quotas, every supported random subclass, attack rolls, HP/death saves, rests, validation, scoped IDs, and mocked transaction rollback/conflicts.
- Production build, TypeScript, lint (zero warnings), local data check, and whitespace checks pass.
- Browser tests cover damage/temp HP, empty spellbook editing, failed story saves, history clearing and hub errors with intercepted API responses.
- Node 22 is used for final validation. The machine's default Node 19 is too old for the upgraded dependencies; `.nvmrc`, package engines, and Docker now specify the supported runtime.
- An isolated PostgreSQL attempt could not start because the bundled local DBngin binaries depended on missing installation paths. No real database integration or live AWS narrative call was verified. Mock tests do not prove PostgreSQL isolation behavior.
- No existing character database was modified and nothing was deployed. Apply the documented additive SQL before running the new application against an existing database.

Rules references: [2014 class rules](https://www.dndbeyond.com/sources/dnd/basic-rules-2014/classes), [2014 spell lists](https://www.dndbeyond.com/sources/dnd/basic-rules-2014/spells). Framework upgrade reference: [Next August 2026 security release](https://nextjs.org/blog/august-2026-security-release). Local supplemental descriptions retain their original source tags.
