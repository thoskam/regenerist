'use client';

import { useState, useEffect, useCallback } from 'react';
import { Package, Plus, Coins } from 'lucide-react';
import InventoryList from './InventoryList';
import EquipmentSlots from './EquipmentSlots';
import CurrencyTracker from './CurrencyTracker';
import AddItemModal from './AddItemModal';
import { InventoryItem, Currency } from '@/lib/items/types';

interface InventoryTabProps {
  characterSlug: string;
  onEquipmentChange?: () => void;
}

export default function InventoryTab({ characterSlug, onEquipmentChange }: InventoryTabProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [currency, setCurrency] = useState<Currency>({ cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 });
  const [attunedCount, setAttunedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'equipped'>('list');

  const fetchInventory = useCallback(async () => {
    try {
      const res = await fetch(`/api/characters/${characterSlug}/inventory`);
      const data = await res.json();

      setInventory(data.inventory || []);
      setCurrency(data.currency || { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 });
      setAttunedCount(data.attunedCount || 0);
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
    } finally {
      setIsLoading(false);
    }
  }, [characterSlug]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleItemAdded = () => {
    fetchInventory();
    setShowAddModal(false);
  };

  const handleEquipmentChange = () => {
    fetchInventory();
    onEquipmentChange?.();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  const equippedItems = inventory.filter(i => i.equipped);
  const unequippedItems = inventory.filter(i => !i.equipped);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Package className="w-5 h-5" />
          Inventory
          <span className="text-sm text-slate-400 font-normal">
            ({inventory.length} items)
          </span>
        </h2>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 text-sm rounded ${
                viewMode === 'list' ? 'bg-slate-700' : 'hover:bg-slate-700/50'
              }`}
            >
              All Items
            </button>
            <button
              onClick={() => setViewMode('equipped')}
              className={`px-3 py-1 text-sm rounded ${
                viewMode === 'equipped' ? 'bg-slate-700' : 'hover:bg-slate-700/50'
              }`}
            >
              Equipment
            </button>
          </div>

          {/* Add Item Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>
      </div>

      {/* Attunement Indicator */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-400">Attuned:</span>
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${
                i < attunedCount ? 'bg-purple-500' : 'bg-slate-700'
              }`}
            />
          ))}
        </div>
        <span className="text-slate-500">{attunedCount}/3</span>
      </div>

      {/* Currency Tracker */}
      <CurrencyTracker
        currency={currency}
        characterSlug={characterSlug}
        onUpdate={fetchInventory}
      />

      {/* Main Content */}
      {viewMode === 'equipped' ? (
        <EquipmentSlots
          equippedItems={equippedItems}
          allItems={inventory}
          characterSlug={characterSlug}
          onEquipmentChange={handleEquipmentChange}
        />
      ) : (
        <div className="space-y-4">
          {/* Equipped Section */}
          {equippedItems.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-2">
                Equipped ({equippedItems.length})
              </h3>
              <InventoryList
                items={equippedItems}
                characterSlug={characterSlug}
                onUpdate={handleEquipmentChange}
              />
            </div>
          )}

          {/* Backpack Section */}
          <div>
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-2">
              Backpack ({unequippedItems.length})
            </h3>
            {unequippedItems.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                Your backpack is empty
              </div>
            ) : (
              <InventoryList
                items={unequippedItems}
                characterSlug={characterSlug}
                onUpdate={handleEquipmentChange}
              />
            )}
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <AddItemModal
          characterSlug={characterSlug}
          onClose={() => setShowAddModal(false)}
          onItemAdded={handleItemAdded}
        />
      )}
    </div>
  );
}
