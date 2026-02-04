'use client';

import { useState, useEffect } from 'react';
import { X, Search, Plus, Package } from 'lucide-react';
import { Item } from '@/lib/items/types';

interface AddItemModalProps {
  characterSlug: string;
  onClose: () => void;
  onItemAdded: () => void;
}

export default function AddItemModal({ characterSlug, onClose, onItemAdded }: AddItemModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showCustomForm, setShowCustomForm] = useState(false);

  // Custom item form state
  const [customItem, setCustomItem] = useState({
    name: '',
    description: '',
    weight: '',
    value: '',
  });

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

  const handleAddCustomItem = async () => {
    if (!customItem.name) return;

    try {
      await fetch(`/api/characters/${characterSlug}/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customItem: {
            name: customItem.name,
            description: customItem.description,
            weight: customItem.weight ? parseFloat(customItem.weight) : undefined,
            value: customItem.value ? parseFloat(customItem.value) : undefined,
            category: 'adventuring-gear',
            equipSlot: 'none',
          },
        }),
      });
      onItemAdded();
    } catch (error) {
      console.error('Failed to add custom item:', error);
    }
  };

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

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
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
          /* Custom Item Form */
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Item Name *</label>
              <input
                type="text"
                value={customItem.name}
                onChange={e => setCustomItem({ ...customItem, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-amber-500 focus:outline-none"
                placeholder="Mysterious Artifact"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Description</label>
              <textarea
                value={customItem.description}
                onChange={e => setCustomItem({ ...customItem, description: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-amber-500 focus:outline-none"
                rows={3}
                placeholder="A strange item found in the dungeon..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Weight (lb)</label>
                <input
                  type="number"
                  value={customItem.weight}
                  onChange={e => setCustomItem({ ...customItem, weight: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-amber-500 focus:outline-none"
                  placeholder="1"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Value (gp)</label>
                <input
                  type="number"
                  value={customItem.value}
                  onChange={e => setCustomItem({ ...customItem, value: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-amber-500 focus:outline-none"
                  placeholder="0"
                />
              </div>
            </div>
            <button
              onClick={handleAddCustomItem}
              disabled={!customItem.name}
              className="w-full py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium"
            >
              Add Custom Item
            </button>
          </div>
        ) : (
          /* Search Interface */
          <>
            <div className="p-4 space-y-3">
              {/* Search Input */}
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

              {/* Category Filter */}
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

            {/* Results */}
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
                          {item.rarity && item.rarity !== 'none' && <span>* {item.rarity}</span>}
                          {item.weapon && <span>* {item.weapon.damage}</span>}
                          {item.armor && <span>* AC {item.armor.baseAC}</span>}
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
