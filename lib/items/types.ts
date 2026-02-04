// ============================================
// ITEM TYPE DEFINITIONS
// ============================================

export type ItemRarity =
  | 'none'
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'very rare'
  | 'legendary'
  | 'artifact';

export type ItemCategory =
  | 'weapon'
  | 'armor'
  | 'shield'
  | 'adventuring-gear'
  | 'tool'
  | 'magic-item'
  | 'wondrous'
  | 'potion'
  | 'scroll'
  | 'wand'
  | 'rod'
  | 'staff'
  | 'ring'
  | 'ammunition'
  | 'treasure';

export type EquipmentSlot =
  | 'armor'
  | 'shield'
  | 'main-hand'
  | 'off-hand'
  | 'two-hand'
  | 'head'
  | 'neck'
  | 'cloak'
  | 'ring-1'
  | 'ring-2'
  | 'belt'
  | 'boots'
  | 'gloves'
  | 'none';

export type WeaponProperty =
  | 'ammunition'
  | 'finesse'
  | 'heavy'
  | 'light'
  | 'loading'
  | 'range'
  | 'reach'
  | 'special'
  | 'thrown'
  | 'two-handed'
  | 'versatile'
  | 'silvered'
  | 'martial'
  | 'simple';

export type ArmorType = 'light' | 'medium' | 'heavy' | 'shield';

export interface ItemBonus {
  type: 'ac' | 'attack' | 'damage' | 'saving-throw' | 'spell-attack' | 'spell-dc' | 'skill' | 'ability';
  value: number;
  skill?: string;      // For skill-specific bonuses
  ability?: string;    // For ability-specific bonuses
  save?: string;       // For save-specific bonuses
}

export interface WeaponData {
  damage: string;           // e.g., "1d8"
  damageType: string;       // e.g., "slashing"
  properties: WeaponProperty[];
  range?: string;           // e.g., "20/60"
  versatileDamage?: string; // e.g., "1d10" for versatile weapons
}

export interface ArmorData {
  type: ArmorType;
  baseAC: number;
  maxDexBonus?: number;     // undefined = unlimited, 0 = none, 2 = medium armor
  strengthRequirement?: number;
  stealthDisadvantage?: boolean;
}

export interface Item {
  id: string;               // Unique identifier
  name: string;
  source: string;           // e.g., "PHB", "DMG"

  // Classification
  category: ItemCategory;
  rarity?: ItemRarity;
  requiresAttunement?: boolean;
  attunementRequirement?: string;  // e.g., "by a cleric"

  // Physical properties
  weight?: number;          // In pounds
  value?: number;           // In gold pieces

  // Equipment data
  equipSlot?: EquipmentSlot;
  weapon?: WeaponData;
  armor?: ArmorData;

  // Bonuses (for magic items)
  bonuses?: ItemBonus[];
  magicBonus?: number;      // +1, +2, +3

  // Charges
  charges?: number;
  rechargeAmount?: string;  // e.g., "1d6+1"
  rechargeTime?: string;    // e.g., "dawn"

  // Description
  description?: string;
  entries?: unknown[];      // 5eTools format entries

  // Flags
  isMagic?: boolean;
  isConsumable?: boolean;

  // Raw 5eTools data for reference
  _raw?: unknown;
}

export interface InventoryItem {
  id: string;               // CharacterInventory record ID
  item: Item;               // The item data
  quantity: number;
  equipped: boolean;
  attuned: boolean;
  equipSlot?: EquipmentSlot;
  notes?: string;
  customName?: string;
  charges?: number;
  maxCharges?: number;
}

export interface Currency {
  cp: number;
  sp: number;
  ep: number;
  gp: number;
  pp: number;
}

// Utility type for the raw 5eTools item format
export interface Raw5eToolsItem {
  name: string;
  source?: string;
  type?: string;
  rarity?: string;
  reqAttune?: boolean | string;
  weight?: number;
  value?: number | { quantity: number; unit: string };
  weaponCategory?: string;
  property?: string[];
  dmg1?: string;
  dmg2?: string;
  dmgType?: string;
  range?: string;
  ac?: number;
  strength?: number;
  stealth?: boolean;
  bonusAc?: string | number;
  bonusWeapon?: string | number;
  bonusWeaponAttack?: string | number;
  bonusWeaponDamage?: string | number;
  bonusSavingThrow?: string | number;
  bonusSpellAttack?: string | number;
  bonusSpellSaveDc?: string | number;
  charges?: number;
  recharge?: string;
  rechargeTime?: string;
  entries?: unknown[];
  tier?: string;
  wondrous?: boolean;
  [key: string]: unknown;
}
