'use client';

import { useState, useEffect } from 'react';
import { X, Search, Plus, Package } from 'lucide-react';
import { Item, ItemCategory, ItemRarity, EquipmentSlot, WeaponProperty, ArmorType } from '@/lib/items/types';

interface AddItemModalProps {
  characterSlug: string;
  onClose: () => void;
  onItemAdded: () => void;
}

const WEAPON_DAMAGE_TYPES = [
  'slashing', 'piercing', 'bludgeoning', 'fire', 'cold', 'lightning',
  'thunder', 'acid', 'poison', 'necrotic', 'radiant', 'psychic', 'force',
];

const WEAPON_PROPERTIES: WeaponProperty[] = [
  'finesse', 'light', 'heavy', 'reach', 'thrown', 'two-handed', 'versatile',
  'ammunition', 'loading', 'range', 'special', 'silvered', 'martial', 'simple',
];

const DEFAULT_EQUIP_SLOT: Record<ItemCategory, EquipmentSlot> = {
  weapon: 'main-hand',
  armor: 'armor',
  shield: 'shield',
  wondrous: 'none',
  ring: 'ring-1',
  wand: 'none',
  rod: 'none',
  staff: 'main-hand',
  potion: 'none',
  scroll: 'none',
  ammunition: 'none',
  'adventuring-gear': 'none',
  tool: 'none',
  treasure: 'none',
  'magic-item': 'none',
};

interface CustomItemForm {
  name: string;
  category: ItemCategory;
  rarity: ItemRarity;
  description: string;
  weight: string;
  value: string;
  equipSlot: EquipmentSlot;
  isMagic: boolean;
  requiresAttunement: boolean;
  magicBonus: string;
  charges: string;
  rechargeAmount: string;
  rechargeTime: string;
  // Weapon
  weaponDamage: string;
  weaponDamageType: string;
  weaponProperties: WeaponProperty[];
  weaponRange: string;
  weaponVersatileDamage: string;
  // Armor
  armorType: ArmorType;
  armorBaseAC: string;
  armorMaxDex: string;
  armorStrRequirement: string;
  armorStealthDisadvantage: boolean;
}

const DEFAULT_FORM: CustomItemForm = {
  name: '',
  category: 'adventuring-gear',
  rarity: 'none',
  description: '',
  weight: '',
  value: '',
  equipSlot: 'none',
  isMagic: false,
  requiresAttunement: false,
  magicBonus: '',
  charges: '',
  rechargeAmount: '',
  rechargeTime: '',
  weaponDamage: '',
  weaponDamageType: 'slashing',
  weaponProperties: [],
  weaponRange: '',
  weaponVersatileDamage: '',
  armorType: 'light',
  armorBaseAC: '',
  armorMaxDex: '',
  armorStrRequirement: '',
  armorStealthDisadvantage: false,
};

export default function AddItemModal({ characterSlug, onClose, onItemAdded }: AddItemModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [form, setForm] = useState<CustomItemForm>(DEFAULT_FORM);

  useEffect(() => {
    const searchItems = async () => {
      if (searchQuery.length < 2 && !selectedCategory) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const params = new URLSearchParams();
        if (searchQuery) params.set('q', searchQuery);
        if (selectedCategory) params.set('category', selectedCategory);
        const res = await fetch(`/api/items/search?${params}`);
        const data = await res.json();
        setSearchResults(data.items || []);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsSearching(false);
      }
    };
    const debounce = setTimeout(searchItems, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, selectedCategory]);

  const set = (field: Partial<CustomItemForm>) => setForm(prev => ({ ...prev, ...field }));

  const handleCategoryChange = (category: ItemCategory) => {
    set({ category, equipSlot: DEFAULT_EQUIP_SLOT[category] });
  };

  const toggleWeaponProperty = (prop: WeaponProperty) => {
    set({
      weaponProperties: form.weaponProperties.includes(prop)
        ? form.weaponProperties.filter(p => p !== prop)
        : [...form.weaponProperties, prop],
    });
  };

  const handleAddItem = async (item: Item) => {
    try {
      await fetch(`/api/characters/${characterSlug}/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id }),
      });
      onItemAdded();
    } catch (error) {
      console.error('Failed to add item:', error);
    }
  };

  const buildCustomItemPayload = (): Item => {
    const isMagic = form.isMagic || form.rarity !== 'none';
    const base: Item = {
      id: `custom-${Date.now()}`,
      name: form.name,
      source: 'Custom',
      category: form.category,
      rarity: form.rarity,
      description: form.description || undefined,
      weight: form.weight ? parseFloat(form.weight) : undefined,
      value: form.value ? parseFloat(form.value) : undefined,
      equipSlot: form.equipSlot,
      isMagic,
      requiresAttunement: form.requiresAttunement,
      magicBonus: form.magicBonus ? parseInt(form.magicBonus) : undefined,
      charges: form.charges ? parseInt(form.charges) : undefined,
      rechargeAmount: form.rechargeAmount || undefined,
      rechargeTime: form.rechargeTime || undefined,
    };

    if (form.category === 'weapon' && form.weaponDamage) {
      base.weapon = {
        damage: form.weaponDamage,
        damageType: form.weaponDamageType,
        properties: form.weaponProperties,
        range: form.weaponRange || undefined,
        versatileDamage: form.weaponVersatileDamage || undefined,
      };
    }

    if ((form.category === 'armor' || form.category === 'shield') && form.armorBaseAC) {
      base.armor = {
        type: form.category === 'shield' ? 'shield' : form.armorType,
        baseAC: parseInt(form.armorBaseAC),
        maxDexBonus: form.armorMaxDex !== '' ? parseInt(form.armorMaxDex) : undefined,
        strengthRequirement: form.armorStrRequirement ? parseInt(form.armorStrRequirement) : undefined,
        stealthDisadvantage: form.armorStealthDisadvantage || undefined,
      };
    }

    return base;
  };

  const handleAddCustomItem = async () => {
    if (!form.name) return;
    try {
      await fetch(`/api/characters/${characterSlug}/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customItem: buildCustomItemPayload() }),
      });
      onItemAdded();
    } catch (error) {
      console.error('Failed to add custom item:', error);
    }
  };

  const isMagicSection = form.isMagic || form.rarity !== 'none';

  const categories = [
    { value: '', label: 'All Categories' },
    { value: 'weapon', label: 'Weapons' },
    { value: 'armor', label: 'Armor' },
    { value: 'shield', label: 'Shields' },
    { value: 'wondrous', label: 'Wondrous Items' },
    { value: 'potion', label: 'Potions' },
    { value: 'scroll', label: 'Scrolls' },
    { value: 'ring', label: 'Rings' },
    { value: 'wand', label: 'Wands' },
    { value: 'rod', label: 'Rods' },
    { value: 'staff', label: 'Staves' },
    { value: 'adventuring-gear', label: 'Adventuring Gear' },
    { value: 'tool', label: 'Tools' },
    { value: 'ammunition', label: 'Ammunition' },
  ];

  const equipSlots: { value: EquipmentSlot; label: string }[] = [
    { value: 'none', label: 'Not equippable' },
    { value: 'main-hand', label: 'Main Hand' },
    { value: 'off-hand', label: 'Off Hand' },
    { value: 'two-hand', label: 'Two-Handed' },
    { value: 'armor', label: 'Armor' },
    { value: 'shield', label: 'Shield' },
    { value: 'head', label: 'Head' },
    { value: 'neck', label: 'Neck' },
    { value: 'cloak', label: 'Cloak' },
    { value: 'ring-1', label: 'Ring' },
    { value: 'belt', label: 'Belt' },
    { value: 'boots', label: 'Boots' },
    { value: 'gloves', label: 'Gloves' },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Package className="w-5 h-5" />
            Add Item
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          <button
            onClick={() => setShowCustomForm(false)}
            className={`flex-1 py-2 text-sm font-medium ${
              !showCustomForm ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Search Items
          </button>
          <button
            onClick={() => setShowCustomForm(true)}
            className={`flex-1 py-2 text-sm font-medium ${
              showCustomForm ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Custom Item
          </button>
        </div>

        {showCustomForm ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Name + Category row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Item Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => set({ name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-amber-500 focus:outline-none"
                  placeholder="Flametongue Longsword"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={e => handleCategoryChange(e.target.value as ItemCategory)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-amber-500 focus:outline-none"
                >
                  {categories.filter(c => c.value).map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Rarity</label>
                <select
                  value={form.rarity}
                  onChange={e => set({ rarity: e.target.value as ItemRarity })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-amber-500 focus:outline-none"
                >
                  <option value="none">Common (no rarity)</option>
                  <option value="common">Common</option>
                  <option value="uncommon">Uncommon</option>
                  <option value="rare">Rare</option>
                  <option value="very rare">Very Rare</option>
                  <option value="legendary">Legendary</option>
                  <option value="artifact">Artifact</option>
                </select>
              </div>
            </div>

            {/* Weapon fields */}
            {form.category === 'weapon' && (
              <div className="space-y-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Weapon</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Damage Dice</label>
                    <input
                      type="text"
                      value={form.weaponDamage}
                      onChange={e => set({ weaponDamage: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-amber-500 focus:outline-none"
                      placeholder="1d8"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Damage Type</label>
                    <select
                      value={form.weaponDamageType}
                      onChange={e => set({ weaponDamageType: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-amber-500 focus:outline-none"
                    >
                      {WEAPON_DAMAGE_TYPES.map(t => (
                        <option key={t} value={t} className="capitalize">{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Range</label>
                    <input
                      type="text"
                      value={form.weaponRange}
                      onChange={e => set({ weaponRange: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-amber-500 focus:outline-none"
                      placeholder="20/60"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Versatile Damage</label>
                    <input
                      type="text"
                      value={form.weaponVersatileDamage}
                      onChange={e => set({ weaponVersatileDamage: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-amber-500 focus:outline-none"
                      placeholder="1d10"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-2">Properties</label>
                  <div className="flex flex-wrap gap-2">
                    {WEAPON_PROPERTIES.map(prop => (
                      <button
                        key={prop}
                        type="button"
                        onClick={() => toggleWeaponProperty(prop)}
                        className={`px-2 py-1 text-xs rounded capitalize border transition-colors ${
                          form.weaponProperties.includes(prop)
                            ? 'bg-amber-600 border-amber-500 text-white'
                            : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-400'
                        }`}
                      >
                        {prop}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Armor fields */}
            {(form.category === 'armor' || form.category === 'shield') && (
              <div className="space-y-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
                  {form.category === 'shield' ? 'Shield' : 'Armor'}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {form.category === 'armor' && (
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Armor Type</label>
                      <select
                        value={form.armorType}
                        onChange={e => set({ armorType: e.target.value as ArmorType })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-amber-500 focus:outline-none"
                      >
                        <option value="light">Light</option>
                        <option value="medium">Medium</option>
                        <option value="heavy">Heavy</option>
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      {form.category === 'shield' ? 'AC Bonus' : 'Base AC'}
                    </label>
                    <input
                      type="number"
                      value={form.armorBaseAC}
                      onChange={e => set({ armorBaseAC: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-amber-500 focus:outline-none"
                      placeholder={form.category === 'shield' ? '2' : '12'}
                    />
                  </div>
                  {form.category === 'armor' && (
                    <>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Max Dex Bonus</label>
                        <input
                          type="number"
                          value={form.armorMaxDex}
                          onChange={e => set({ armorMaxDex: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-amber-500 focus:outline-none"
                          placeholder="Unlimited"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Str Requirement</label>
                        <input
                          type="number"
                          value={form.armorStrRequirement}
                          onChange={e => set({ armorStrRequirement: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-amber-500 focus:outline-none"
                          placeholder="None"
                        />
                      </div>
                    </>
                  )}
                </div>
                {form.category === 'armor' && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.armorStealthDisadvantage}
                      onChange={e => set({ armorStealthDisadvantage: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-xs text-slate-400">Stealth disadvantage</span>
                  </label>
                )}
              </div>
            )}

            {/* Magic section */}
            {isMagicSection && (
              <div className="space-y-3 p-3 bg-slate-900/50 rounded-lg border border-purple-800/50">
                <p className="text-xs font-semibold text-purple-400 uppercase tracking-wide">Magic</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Magic Bonus (+1/+2/+3)</label>
                    <select
                      value={form.magicBonus}
                      onChange={e => set({ magicBonus: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-amber-500 focus:outline-none"
                    >
                      <option value="">None</option>
                      <option value="1">+1</option>
                      <option value="2">+2</option>
                      <option value="3">+3</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Charges</label>
                    <input
                      type="number"
                      value={form.charges}
                      onChange={e => set({ charges: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-amber-500 focus:outline-none"
                      placeholder="0"
                    />
                  </div>
                  {form.charges && (
                    <>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Recharge Amount</label>
                        <input
                          type="text"
                          value={form.rechargeAmount}
                          onChange={e => set({ rechargeAmount: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-amber-500 focus:outline-none"
                          placeholder="1d6+1"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Recharge Time</label>
                        <input
                          type="text"
                          value={form.rechargeTime}
                          onChange={e => set({ rechargeTime: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-amber-500 focus:outline-none"
                          placeholder="dawn"
                        />
                      </div>
                    </>
                  )}
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.requiresAttunement}
                    onChange={e => set({ requiresAttunement: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-xs text-slate-400">Requires attunement</span>
                </label>
              </div>
            )}

            {/* Equipment slot + weight + value */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Equipment Slot</label>
                <select
                  value={form.equipSlot}
                  onChange={e => set({ equipSlot: e.target.value as EquipmentSlot })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-amber-500 focus:outline-none text-sm"
                >
                  {equipSlots.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Weight (lb)</label>
                <input
                  type="number"
                  value={form.weight}
                  onChange={e => set({ weight: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-amber-500 focus:outline-none"
                  placeholder="1"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Value (gp)</label>
                <input
                  type="number"
                  value={form.value}
                  onChange={e => set({ value: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-amber-500 focus:outline-none"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={e => set({ description: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-amber-500 focus:outline-none"
                rows={3}
                placeholder="A blade forged in dragon fire..."
              />
            </div>

            <button
              onClick={handleAddCustomItem}
              disabled={!form.name}
              className="w-full py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium"
            >
              Add Custom Item
            </button>
          </div>
        ) : (
          /* Search Interface */
          <>
            <div className="p-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-amber-500 focus:outline-none"
                  placeholder="Search for items..."
                  autoFocus
                />
              </div>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-amber-500 focus:outline-none"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 overflow-y-auto p-4 pt-0">
              {isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500" />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  {searchQuery.length < 2 && !selectedCategory
                    ? 'Type at least 2 characters to search'
                    : 'No items found'}
                </div>
              ) : (
                <div className="space-y-1">
                  {searchResults.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 hover:bg-slate-700 rounded-lg cursor-pointer group"
                      onClick={() => handleAddItem(item)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium ${item.isMagic ? 'text-purple-300' : ''}`}>
                          {item.name}
                          {item.magicBonus && (
                            <span className="text-green-400 ml-1">+{item.magicBonus}</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                          <span className="capitalize">{item.category}</span>
                          {item.rarity && item.rarity !== 'none' && <span>· {item.rarity}</span>}
                          {item.weapon && <span>· {item.weapon.damage} {item.weapon.damageType}</span>}
                          {item.armor && <span>· AC {item.armor.baseAC}</span>}
                        </div>
                      </div>
                      <button className="p-2 opacity-0 group-hover:opacity-100 bg-amber-600 rounded-lg transition-opacity">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
