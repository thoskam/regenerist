# Rules coverage (2014 baseline)

This app uses 2014 single-class progression. The catalog originally mixed 2014 supplements, 2024 subclasses, and homebrew. Having a description is not the same as automating every feature.

## Class catalog

| Class | Configured subclasses | Hydrated subclasses | Missing data |
| --- | ---: | ---: | --- |
| Artificer | 4 | 4 | — |
| Barbarian | 10 | 9 | Path of the World Tree |
| Bard | 9 | 8 | College of Dance |
| Cleric | 14 | 14 | — |
| Druid | 8 | 7 | Circle of the Sea |
| Fighter | 11 | 10 | Gunslinger |
| Monk | 11 | 10 | Way of the Warrior |
| Paladin | 10 | 10 | — |
| Ranger | 8 | 8 | — |
| Rogue | 9 | 9 | — |
| Sorcerer | 9 | 8 | Pyromancy |
| Warlock | 9 | 9 | — |
| Wizard | 13 | 13 | — |
| Blood Hunter | 4 | 0 | Order of the Ghostslayer, Order of the Lycan, Order of the Mutant, Order of the Profane Soul |

Purple Dragon Knight is resolved to the local Banneret entry. The ten missing combinations are excluded from automatic regeneration by `lib/catalog.ts`, including the fallback after every supported subclass has been used. Existing characters can retain their identity, but their unsupported features require manual adjudication.

## Race catalog

| Selection | Resolved source | Walking speed | Ability increases |
| --- | --- | ---: | --- |
| Aasimar | VGM | 30 | CHA +2 |
| Aarakocra | EEPC | 25 | DEX +2, WIS +1 |
| Bugbear | VGM | 30 | STR +2, DEX +1 |
| Centaur | MPMM | 40 | STR +2, CON +1 |
| Changeling | MPMM | 30 | STR +2, CON +1 |
| Dragonborn | PHB | 30 | STR +2, CHA +1 |
| Dwarf (Hill) | PHB | 25 | CON +2, WIS +1 |
| Dwarf (Mountain) | PHB | 25 | STR +2, CON +2 |
| Elf (High) | PHB | 30 | DEX +2, INT +1 |
| Elf (Wood) | PHB | 35 | DEX +2, WIS +1 |
| Elf (Drow) | PHB | 30 | DEX +2, CHA +1 |
| Fairy | MPMM | 30 | STR +2, CON +1 |
| Firbolg | VGM | 30 | STR +1, WIS +2 |
| Genasi (Air) | EEPC | 30 | CON +2, DEX +1 |
| Genasi (Earth) | EEPC | 30 | STR +1, CON +2 |
| Genasi (Fire) | EEPC | 30 | CON +2, INT +1 |
| Genasi (Water) | EEPC | 30 | CON +2, WIS +1 |
| Githyanki | MPMM | 30 | STR +2, CON +1 |
| Githzerai | MPMM | 30 | STR +2, CON +1 |
| Gnome (Forest) | PHB | 25 | DEX +1, INT +2 |
| Gnome (Rock) | PHB | 25 | CON +1, INT +2 |
| Gnome (Deep) | MTF | 25 | DEX +1, INT +2 |
| Goblin | VGM | 30 | CON +1, DEX +2 |
| Goliath | VGM | 30 | STR +2, CON +1 |
| Halfling (Lightfoot) | PHB | 25 | DEX +2, CHA +1 |
| Halfling (Stout) | PHB | 25 | CON +1, DEX +2 |
| Half-Elf | PHB | 30 | CHA +2, STR +1, CON +1 |
| Half-Orc | PHB | 30 | STR +2, CON +1 |
| Harengon | MPMM | 30 | STR +2, CON +1 |
| Hobgoblin | VGM | 30 | CON +2, INT +1 |
| Human (Standard) | PHB | 30 | STR +1, CON +1, DEX +1, WIS +1, CHA +1, INT +1 |
| Human (Variant) | PHB | 30 | STR +1, CON +1 |
| Kalashtar | ERLW | 30 | WIS +2, CHA +1 |
| Kenku | VGM | 30 | DEX +2, WIS +1 |
| Kobold | VGM | 30 | DEX +2 |
| Lizardfolk | VGM | 30 | CON +2, WIS +1 |
| Minotaur | MPMM | 30 | STR +2, CON +1 |
| Orc | VGM | 30 | STR +2, CON +1 |
| Satyr | MPMM | 35 | STR +2, CON +1 |
| Shifter | MPMM | 30 | STR +2, CON +1 |
| Tabaxi | VGM | 30 | DEX +2, CHA +1 |
| Tiefling | PHB | 30 | CHA +2, INT +1 |
| Tortle | MPMM | 30 | STR +2, CON +1 |
| Triton | VGM | 30 | STR +1, CON +1, CHA +1 |
| Warforged | ERLW | 30 | CON +2, STR +1 |

Ability choices in this table use Fighter priorities as an example. Flexible race choices use the chosen class priority; they are deterministic, not player-selected. PHB, EEPC and VGM versions are preferred over later reprints when both exist. Choice-only races such as Shifter still require a dedicated subrace/trait choice workflow.

## Mechanical coverage

| Area | Implemented | Still manual or incomplete |
| --- | --- | --- |
| Ability scores | Standard array, point buy, deterministic race increases, class ASI schedules and 20-point cap | Feats, player-chosen split ASIs, replacing racial choice priorities |
| HP | Fixed-average class HP, retroactive CON, minimum one HP per gained level, Hill Dwarf and Draconic Bloodline bonuses | Rolled HP history, Tough and other feat/features |
| Armor and movement | Armor categories and negative DEX, shields, Monk/Barbarian defense, Tortle/Lizardfolk/Draconic natural armor, heavy armor STR penalty and dwarf exemption | Armor proficiency penalties, encumbrance, magic item effects, conditional flying/swimming speeds |
| Spell slots | Full, half, third, Artificer level one, pact slots, Mystic Arcanum unlock levels | Multiclass slots, separate Arcanum choices/usage, invocations |
| Base spell eligibility | Explicit PHB class lists; explicit Artificer PHB spell list; Divine Soul cleric expansion | General TCE/XGE class membership, optional class-list expansions, Magical Secrets, third-caster school/replacement quotas |
| Subclass spells | Explicit level-gated prepared/known grants and expanded choices, including named TCE/XGE spells; selected Circle of Land environment | Choice expressions (for example Arcana bonus cantrips), origin-spell replacement, separate free-cast features |
| Class features | Earned reference graph, nested subclass grants, no automatic award of every optional fighting style | Most resource/action automation and subclass choices |

## Data and source policy

The local spell description files include PHB, TCE, and XGE, but do not include general class-membership metadata. The app must not infer legality from a spell's school. Base selection uses explicit PHB lists; explicit subclass references can safely unlock supplemental spells. Expanding the general catalog requires an authoritative class-to-spell mapping and edition/source selection, not removing the eligibility filter.

Subclass known/prepared grants are displayed automatically and do not consume ordinary selection quotas. Arcane Trickster’s mandatory Mage Hand is part of its printed cantrip total, so its ordinary selection allowance is one lower. The current editable spell selection represents known/prepared spells; it does not model a separate unlimited Wizard research spellbook. Saves enforce the ordinary selection count, and level/stat changes trim selections that no longer fit. Expanded warlock lists only make spells selectable. A subclass-dependent named choice must be selected before its particular grants are awarded.

References: [2014 class rules](https://www.dndbeyond.com/sources/dnd/basic-rules-2014/classes), [2014 spell lists](https://www.dndbeyond.com/sources/dnd/basic-rules-2014/spells), [2014 races](https://www.dndbeyond.com/sources/dnd/basic-rules-2014/races). Subclass data is resolved from the repository's existing class JSON and its source tags.
