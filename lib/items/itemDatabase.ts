import { Item, Raw5eToolsItem } from './types';
import { parse5eToolsItem } from './parser';

// In-memory item database (loaded once)
let itemDatabase: Map<string, Item> | null = null;
let itemsByName: Map<string, Item[]> | null = null;

/**
 * Load all items from 5eTools JSON files
 */
export async function loadItemDatabase(): Promise<Map<string, Item>> {
  if (itemDatabase) return itemDatabase;

  itemDatabase = new Map();
  itemsByName = new Map();

  try {
    // Load base items (PHB equipment) - stored under 'baseitem' key
    const baseItemsModule = await import('@/data/items-base.json').catch(() => ({ default: { baseitem: [] } }));
    const baseItemsData = baseItemsModule.default as { baseitem?: unknown[] };
    const baseItems = (baseItemsData?.baseitem || []) as Raw5eToolsItem[];

    // Load regular items (includes magic items) - stored under 'item' key
    const itemsModule = await import('@/data/items.json').catch(() => ({ default: { item: [] } }));
    const itemsData = itemsModule.default as { item?: unknown[] };
    const items = (itemsData?.item || []) as Raw5eToolsItem[];

    // Parse and add all items
    const allRawItems = [...baseItems, ...items];
    let parseErrors = 0;

    allRawItems.forEach((rawItem) => {
      try {
        const item = parse5eToolsItem(rawItem);

        // Store by ID (for exact lookups)
        itemDatabase!.set(item.id, item);

        // Store by lowercase name for search (multiple items can have same name from different sources)
        const nameLower = item.name.toLowerCase();
        if (!itemsByName!.has(nameLower)) {
          itemsByName!.set(nameLower, []);
        }
        itemsByName!.get(nameLower)!.push(item);
      } catch (e) {
        parseErrors++;
        if (parseErrors <= 5) {
          console.warn(`Failed to parse item: ${rawItem.name}`, e);
        }
      }
    });

    if (parseErrors > 5) {
      console.warn(`... and ${parseErrors - 5} more parse errors`);
    }

    console.log(`Loaded ${itemDatabase.size} items (${parseErrors} parse errors)`);
  } catch (e) {
    console.error('Failed to load item database:', e);
  }

  return itemDatabase;
}

/**
 * Get an item by ID
 */
export async function getItem(id: string): Promise<Item | undefined> {
  const db = await loadItemDatabase();
  return db.get(id);
}

/**
 * Get an item by exact name (returns first match, preferring PHB source)
 */
export async function getItemByName(name: string): Promise<Item | undefined> {
  await loadItemDatabase();
  const items = itemsByName?.get(name.toLowerCase());
  if (!items || items.length === 0) return undefined;

  // Prefer PHB source, then alphabetically by source
  return items.sort((a, b) => {
    if (a.source === 'PHB' && b.source !== 'PHB') return -1;
    if (b.source === 'PHB' && a.source !== 'PHB') return 1;
    return a.source.localeCompare(b.source);
  })[0];
}

/**
 * Search items by name
 */
export async function searchItems(
  query: string,
  options?: {
    category?: string;
    rarity?: string;
    limit?: number;
    source?: string;
  }
): Promise<Item[]> {
  const db = await loadItemDatabase();
  const results: Item[] = [];
  const queryLower = query.toLowerCase();
  const limit = options?.limit ?? Number.POSITIVE_INFINITY;

  for (const item of Array.from(db.values())) {
    if (results.length >= limit) break;

    const description = item.description?.toLowerCase() || '';
    const category = item.category?.toLowerCase() || '';
    const equipSlot = item.equipSlot?.toLowerCase() || '';
    const haystack = `${item.name.toLowerCase()} ${category} ${equipSlot} ${description}`;

    // Name/type/entries match
    if (!haystack.includes(queryLower)) continue;

    // Category filter
    if (options?.category && item.category !== options.category) continue;

    // Rarity filter
    if (options?.rarity && item.rarity !== options.rarity) continue;

    // Source filter
    if (options?.source && item.source !== options.source) continue;

    results.push(item);
  }

  return results.sort((a, b) => {
    // Exact matches first
    const aExact = a.name.toLowerCase() === queryLower;
    const bExact = b.name.toLowerCase() === queryLower;
    if (aExact && !bExact) return -1;
    if (bExact && !aExact) return 1;

    // Then alphabetically
    return a.name.localeCompare(b.name);
  });
}

/**
 * Get items by category
 */
export async function getItemsByCategory(category: string): Promise<Item[]> {
  const db = await loadItemDatabase();
  const results: Item[] = [];

  for (const item of Array.from(db.values())) {
    if (item.category === category) {
      results.push(item);
    }
  }

  return results.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get all weapons
 */
export async function getWeapons(): Promise<Item[]> {
  return getItemsByCategory('weapon');
}

/**
 * Get all armor (including shields)
 */
export async function getArmor(): Promise<Item[]> {
  const db = await loadItemDatabase();
  const results: Item[] = [];

  for (const item of Array.from(db.values())) {
    if (item.category === 'armor' || item.category === 'shield') {
      results.push(item);
    }
  }

  return results.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get items by rarity
 */
export async function getItemsByRarity(rarity: string): Promise<Item[]> {
  const db = await loadItemDatabase();
  const results: Item[] = [];

  for (const item of Array.from(db.values())) {
    if (item.rarity === rarity) {
      results.push(item);
    }
  }

  return results.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get magic items only
 */
export async function getMagicItems(): Promise<Item[]> {
  const db = await loadItemDatabase();
  const results: Item[] = [];

  for (const item of Array.from(db.values())) {
    if (item.isMagic) {
      results.push(item);
    }
  }

  return results.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get item database stats
 */
export async function getItemStats(): Promise<{
  total: number;
  byCategory: Record<string, number>;
  byRarity: Record<string, number>;
  bySource: Record<string, number>;
}> {
  const db = await loadItemDatabase();

  const stats = {
    total: db.size,
    byCategory: {} as Record<string, number>,
    byRarity: {} as Record<string, number>,
    bySource: {} as Record<string, number>,
  };

  for (const item of Array.from(db.values())) {
    // Category
    stats.byCategory[item.category] = (stats.byCategory[item.category] || 0) + 1;

    // Rarity
    const rarity = item.rarity || 'none';
    stats.byRarity[rarity] = (stats.byRarity[rarity] || 0) + 1;

    // Source
    stats.bySource[item.source] = (stats.bySource[item.source] || 0) + 1;
  }

  return stats;
}
