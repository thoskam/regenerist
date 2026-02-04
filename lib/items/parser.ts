import {
  Item,
  ItemCategory,
  WeaponData,
  ArmorData,
  EquipmentSlot,
  WeaponProperty,
  Raw5eToolsItem,
} from './types';

/**
 * Parse a 5eTools item into our Item format
 */
export function parse5eToolsItem(raw: Raw5eToolsItem): Item {
  const item: Item = {
    id: generateItemId(raw),
    name: raw.name,
    source: raw.source || 'Unknown',
    category: determineCategory(raw),
    _raw: raw,
  };

  // Rarity
  if (raw.rarity) {
    item.rarity = raw.rarity.toLowerCase() as Item['rarity'];
  }

  // Attunement
  if (raw.reqAttune) {
    item.requiresAttunement = true;
    if (typeof raw.reqAttune === 'string') {
      item.attunementRequirement = raw.reqAttune;
    }
  }

  // Physical properties
  if (raw.weight) item.weight = raw.weight;
  if (raw.value !== undefined) item.value = parseValue(raw.value);

  // Weapon data
  if (isWeapon(raw)) {
    item.weapon = parseWeaponData(raw);
    item.equipSlot = determineWeaponSlot(raw);
  }

  // Armor data
  if (isArmor(raw)) {
    item.armor = parseArmorData(raw);
    item.equipSlot = raw.type === 'S' ? 'shield' : 'armor';
  }

  // Magic bonuses
  if (raw.bonusAc) {
    item.bonuses = item.bonuses || [];
    item.bonuses.push({ type: 'ac', value: parseBonus(raw.bonusAc) });
    item.magicBonus = parseBonus(raw.bonusAc);
  }
  if (raw.bonusWeapon) {
    item.bonuses = item.bonuses || [];
    item.bonuses.push({ type: 'attack', value: parseBonus(raw.bonusWeapon) });
    item.bonuses.push({ type: 'damage', value: parseBonus(raw.bonusWeapon) });
    item.magicBonus = parseBonus(raw.bonusWeapon);
  }
  if (raw.bonusWeaponAttack) {
    item.bonuses = item.bonuses || [];
    item.bonuses.push({ type: 'attack', value: parseBonus(raw.bonusWeaponAttack) });
  }
  if (raw.bonusWeaponDamage) {
    item.bonuses = item.bonuses || [];
    item.bonuses.push({ type: 'damage', value: parseBonus(raw.bonusWeaponDamage) });
  }
  if (raw.bonusSavingThrow) {
    item.bonuses = item.bonuses || [];
    item.bonuses.push({ type: 'saving-throw', value: parseBonus(raw.bonusSavingThrow) });
  }
  if (raw.bonusSpellAttack) {
    item.bonuses = item.bonuses || [];
    item.bonuses.push({ type: 'spell-attack', value: parseBonus(raw.bonusSpellAttack) });
  }
  if (raw.bonusSpellSaveDc) {
    item.bonuses = item.bonuses || [];
    item.bonuses.push({ type: 'spell-dc', value: parseBonus(raw.bonusSpellSaveDc) });
  }

  // Charges
  if (raw.charges) {
    item.charges = raw.charges;
    item.rechargeAmount = raw.recharge;
    item.rechargeTime = raw.rechargeTime;
  }

  // Description
  if (raw.entries) {
    item.entries = raw.entries;
    item.description = entriesToText(raw.entries);
  }

  // Flags
  item.isMagic = !!(raw.rarity && raw.rarity !== 'none') ||
                 !!raw.bonusAc ||
                 !!raw.bonusWeapon ||
                 !!raw.tier ||
                 !!raw.wondrous;
  item.isConsumable = raw.type === 'P' || raw.type === 'SC'; // Potion or Scroll

  // Equipment slot for wondrous items
  if (!item.equipSlot && (item.category === 'wondrous' || raw.wondrous)) {
    item.equipSlot = determineWondrousSlot(raw);
  }

  return item;
}

function generateItemId(raw: Raw5eToolsItem): string {
  const name = raw.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  const source = (raw.source || 'unknown').toLowerCase();
  return `${source}-${name}`;
}

function determineCategory(raw: Raw5eToolsItem): ItemCategory {
  const type = raw.type || '';
  // Handle compound types like "R|XPHB"
  const baseType = type.split('|')[0];

  // Weapons
  if (['M', 'R'].includes(baseType) || raw.weaponCategory) return 'weapon';

  // Armor & Shields
  if (['LA', 'MA', 'HA'].includes(baseType)) return 'armor';
  if (baseType === 'S') return 'shield';

  // Magic items by type
  if (baseType === 'P') return 'potion';
  if (baseType === 'SC') return 'scroll';
  if (baseType === 'WD') return 'wand';
  if (baseType === 'RD') return 'rod';
  if (baseType === 'ST') return 'staff';
  if (baseType === 'RG') return 'ring';
  if (baseType === 'W' || raw.wondrous) return 'wondrous';

  // Tools
  if (['AT', 'T', 'INS', 'GS'].includes(baseType)) return 'tool';

  // Ammunition
  if (baseType === 'A') return 'ammunition';

  // Adventuring gear
  if (['G', 'SCF'].includes(baseType)) return 'adventuring-gear';

  // Treasure
  if (['$', 'TG'].includes(baseType)) return 'treasure';

  // Default
  return 'adventuring-gear';
}

function isWeapon(raw: Raw5eToolsItem): boolean {
  const type = raw.type || '';
  const baseType = type.split('|')[0];
  return ['M', 'R'].includes(baseType) || !!raw.weaponCategory;
}

function isArmor(raw: Raw5eToolsItem): boolean {
  const type = raw.type || '';
  const baseType = type.split('|')[0];
  return ['LA', 'MA', 'HA', 'S'].includes(baseType);
}

function parseWeaponData(raw: Raw5eToolsItem): WeaponData {
  const properties: WeaponProperty[] = [];

  if (raw.property) {
    raw.property.forEach((p: string) => {
      // Handle compound properties like "2H|XPHB"
      const baseProp = p.split('|')[0];
      const propMap: Record<string, WeaponProperty> = {
        'A': 'ammunition',
        'F': 'finesse',
        'H': 'heavy',
        'L': 'light',
        'LD': 'loading',
        'R': 'range',
        'RCH': 'reach',
        'S': 'special',
        'T': 'thrown',
        '2H': 'two-handed',
        'V': 'versatile',
        'AF': 'ammunition', // Auto-fire (futuristic)
        'RLD': 'loading',   // Reload
      };
      if (propMap[baseProp]) properties.push(propMap[baseProp]);
    });
  }

  if (raw.weaponCategory === 'martial') properties.push('martial');
  if (raw.weaponCategory === 'simple') properties.push('simple');

  // Map damage types
  const damageTypeMap: Record<string, string> = {
    'B': 'bludgeoning',
    'P': 'piercing',
    'S': 'slashing',
    'N': 'necrotic',
    'F': 'fire',
    'C': 'cold',
    'L': 'lightning',
    'R': 'radiant',
    'A': 'acid',
    'O': 'force',
    'T': 'thunder',
    'Y': 'psychic',
  };

  return {
    damage: raw.dmg1 || '1d4',
    damageType: damageTypeMap[raw.dmgType || 'B'] || raw.dmgType || 'bludgeoning',
    properties,
    range: raw.range,
    versatileDamage: raw.dmg2,
  };
}

function parseArmorData(raw: Raw5eToolsItem): ArmorData {
  const type = raw.type || '';
  const baseType = type.split('|')[0];

  const typeMap: Record<string, 'light' | 'medium' | 'heavy' | 'shield'> = {
    'LA': 'light',
    'MA': 'medium',
    'HA': 'heavy',
    'S': 'shield',
  };

  return {
    type: typeMap[baseType] || 'light',
    baseAC: raw.ac || 10,
    maxDexBonus: baseType === 'HA' ? 0 : baseType === 'MA' ? 2 : undefined,
    strengthRequirement: raw.strength,
    stealthDisadvantage: raw.stealth === true,
  };
}

function determineWeaponSlot(raw: Raw5eToolsItem): EquipmentSlot {
  if (raw.property?.some(p => p.startsWith('2H'))) return 'two-hand';
  return 'main-hand';
}

function determineWondrousSlot(raw: Raw5eToolsItem): EquipmentSlot {
  const name = raw.name.toLowerCase();

  if (name.includes('ring')) return 'ring-1';
  if (name.includes('cloak') || name.includes('mantle') || name.includes('cape')) return 'cloak';
  if (name.includes('amulet') || name.includes('necklace') || name.includes('periapt') || name.includes('medallion') || name.includes('brooch')) return 'neck';
  if (name.includes('helm') || name.includes('hat') || name.includes('headband') || name.includes('circlet') || name.includes('crown')) return 'head';
  if (name.includes('belt') || name.includes('girdle')) return 'belt';
  if (name.includes('boots') || name.includes('slippers') || name.includes('sandals')) return 'boots';
  if (name.includes('gloves') || name.includes('gauntlets') || name.includes('bracers')) return 'gloves';

  return 'none';
}

function parseBonus(value: string | number): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const match = value.match(/\+?(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }
  return 0;
}

function parseValue(value: number | { quantity: number; unit: string }): number {
  if (typeof value === 'number') return value / 100; // 5eTools stores in cp, convert to gp
  if (typeof value === 'object') {
    // 5eTools format: { quantity: 1, unit: 'gp' }
    const multipliers: Record<string, number> = {
      'cp': 0.01,
      'sp': 0.1,
      'ep': 0.5,
      'gp': 1,
      'pp': 10,
    };
    return (value.quantity || 0) * (multipliers[value.unit] || 1);
  }
  return 0;
}

function entriesToText(entries: unknown[]): string {
  return entries
    .map((entry) => {
      if (typeof entry === 'string') return entry;
      if (typeof entry === 'object' && entry !== null) {
        const e = entry as Record<string, unknown>;
        if (e.type === 'entries' && Array.isArray(e.entries)) {
          return entriesToText(e.entries);
        }
        if (e.type === 'list' && Array.isArray(e.items)) {
          return (e.items as unknown[]).map(item => `\u2022 ${item}`).join('\n');
        }
        if (e.type === 'table') {
          return '[Table]';
        }
      }
      return '';
    })
    .filter(Boolean)
    .join('\n\n');
}
