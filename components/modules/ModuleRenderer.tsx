'use client'

import type { ModuleId } from '@/lib/layout/types'
import type { HydratedCharacterData, HydratedActiveState } from '@/lib/types/5etools'
import type { CharacterAction } from '@/lib/actions/types'
import type { Stats } from '@/lib/types'
import type { CalculatedStats } from '@/lib/modifiers/types'

import SkillsModule from './SkillsModule'
import SavingThrowsModule from './SavingThrowsModule'
import ResourcesModule from './ResourcesModule'
import ProficiencyModule from './ProficiencyModule'
import InfoTabsModule from './InfoTabsModule'
import StoryTabsModule from './StoryTabsModule'
import SpellbookModule from './SpellbookModule'
import ChronicleModule from './ChronicleModule'
import QuirksModule from './QuirksModule'
import TempHpModule from './TempHpModule'
import ConditionsModule from './ConditionsModule'
import ExhaustionModule from './ExhaustionModule'
import DeathSavesModule from './DeathSavesModule'
import InventoryModule from './InventoryModule'
import LanguagesModule from './LanguagesModule'
import SensesModule from './SensesModule'

export interface CharacterData {
  characterId: string
  characterName: string
  slug: string
  lifeId: number
  className: string
  subclass: string
  race: string
  level: number
  currentHp: number
  maxHp: number
  stats: Stats
  baseStats?: Stats | null
  story: string | null
  effect: string
  subclassChoice: string | null
  isOwner: boolean
  isRegenerist: boolean
  proficiencyBonus: number
  skillProficiencies: string[]
  hydratedData: HydratedCharacterData | null
  actions: CharacterAction[]
  activeState: HydratedActiveState | null
  calculatedStats?: CalculatedStats | null
  regenPhase: 'idle' | 'fading-out' | 'loading' | 'flashing-in'
  isRegenerating: boolean
  onUseAction: (action: CharacterAction) => void
  onRefresh: () => void
}

interface ModuleRendererProps {
  moduleId: ModuleId
  characterData: CharacterData
}

export default function ModuleRenderer({ moduleId, characterData }: ModuleRendererProps) {
  const {
    characterId,
    characterName,
    slug,
    lifeId,
    className,
    subclass,
    race,
    level,
    maxHp,
    stats,
    baseStats,
    story,
    effect,
    subclassChoice,
    isOwner,
    proficiencyBonus,
    skillProficiencies,
    hydratedData,
    actions,
    activeState,
    calculatedStats,
    regenPhase,
    isRegenerating,
    onUseAction,
    onRefresh,
  } = characterData

  switch (moduleId) {
    case 'skills':
      return (
        <SkillsModule
          stats={stats}
          proficiencies={skillProficiencies}
          proficiencyBonus={proficiencyBonus}
          characterId={characterId}
          characterName={characterName}
          calculatedSkills={calculatedStats?.skills}
          passives={calculatedStats?.passives}
        />
      )
    case 'saving-throws':
      return (
        <SavingThrowsModule
          stats={stats}
          savingThrowProficiencies={hydratedData?.savingThrowProficiencies || []}
          proficiencyBonus={proficiencyBonus}
          characterId={characterId}
          characterName={characterName}
          calculatedSaves={calculatedStats?.savingThrows}
        />
      )
    case 'resources':
      return (
        <ResourcesModule
          slug={slug}
          activeState={activeState}
          isWarlock={className.toLowerCase() === 'warlock'}
          isSpellcaster={hydratedData?.isSpellcaster ?? false}
          isOwner={isOwner}
          onUpdate={onRefresh}
        />
      )
    case 'combat-stats':
      return null
    case 'proficiency':
      return <ProficiencyModule proficiencyBonus={proficiencyBonus} regenPhase={regenPhase} />
    case 'hit-points':
      return null
    case 'ability-scores':
      return null
    case 'info-tabs':
      return (
        <InfoTabsModule
          race={race}
          className={className}
          subclass={subclass}
          effect={effect}
          story={story}
          subclassChoice={subclassChoice}
          level={level}
          raceInfo={hydratedData?.raceInfo || null}
          subclassInfo={hydratedData?.subclassInfo || null}
        />
      )
    case 'story-tabs':
      return (
        <StoryTabsModule
          actions={actions}
          hydratedData={hydratedData}
          stats={stats}
          slug={slug}
          lifeId={lifeId}
          characterId={characterId}
          characterName={characterName}
          level={level}
          activeState={activeState}
          onUseAction={onUseAction}
          onRefresh={onRefresh}
        />
      )
    case 'spellbook':
      if (!hydratedData?.isSpellcaster) return null
      return (
        <SpellbookModule
          hydratedData={hydratedData}
          stats={stats}
          proficiencyBonus={proficiencyBonus}
          slug={slug}
          lifeId={lifeId}
          className={className}
          subclassName={subclass}
          level={level}
          onRefresh={onRefresh}
          characterId={characterId}
          characterName={characterName}
        />
      )
    case 'chronicle':
      return (
        <ChronicleModule
          chronicle={story}
          quirk={effect}
          isRegenerist={characterData.isRegenerist}
        />
      )
    case 'quirks':
      return <QuirksModule quirk={effect} />
    case 'temp-hp':
      if (!activeState || !isOwner) return null
      return <TempHpModule tempHp={activeState.tempHp} characterSlug={slug} onUpdate={onRefresh} />
    case 'conditions':
      if (!activeState || !isOwner) return null
      return (
        <ConditionsModule
          conditions={activeState.conditions as string[]}
          characterSlug={slug}
          onUpdate={onRefresh}
        />
      )
    case 'exhaustion':
      if (!activeState || !isOwner) return null
      return <ExhaustionModule level={activeState.exhaustionLevel} characterSlug={slug} onUpdate={onRefresh} />
    case 'death-saves':
      if (!activeState || !isOwner) return null
      return (
        <DeathSavesModule
          successes={activeState.deathSaveSuccesses}
          failures={activeState.deathSaveFailures}
          currentHp={activeState.currentHp}
          characterSlug={slug}
          characterId={characterId}
          characterName={characterName}
          onUpdate={onRefresh}
        />
      )
    case 'concentration':
      return null
    case 'inventory':
      if (!isOwner) return null
      return (
        <InventoryModule
          characterSlug={slug}
          isOwner={isOwner}
          onRefresh={onRefresh}
        />
      )
    case 'languages':
      return <LanguagesModule raceInfo={hydratedData?.raceInfo || null} />
    case 'senses':
      return <SensesModule raceInfo={hydratedData?.raceInfo || null} />
    default:
      return null
  }
}
