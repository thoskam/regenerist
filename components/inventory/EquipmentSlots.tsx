'use client';

import { InventoryItem, EquipmentSlot } from '@/lib/items/types';
import { Shield, Sword, CircleDot, Shirt, User } from 'lucide-react';

interface EquipmentSlotsProps {
  equippedItems: InventoryItem[];
  allItems: InventoryItem[];
  characterSlug: string;
  onEquipmentChange: () => void;
}

export default function EquipmentSlots({
  equippedItems,
  characterSlug,
  onEquipmentChange,
}: EquipmentSlotsProps) {
  const getItemInSlot = (slot: EquipmentSlot): InventoryItem | undefined => {
    return equippedItems.find(i => i.equipSlot === slot);
  };

  const handleUnequip = async (item: InventoryItem) => {
    await fetch(`/api/characters/${characterSlug}/inventory/${item.id}/equip`, {
      method: 'DELETE',
    });
    onEquipmentChange();
  };

  const twoHandedItem = getItemInSlot('two-hand');

  return (
    <div className="space-y-6">
      {/* Equipment Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Armor */}
        <EquipmentSlotCard
          label="Armor"
          slot="armor"
          item={getItemInSlot('armor')}
          icon={<Shirt className="w-6 h-6" />}
          onUnequip={handleUnequip}
        />

        {/* Shield */}
        <EquipmentSlotCard
          label="Shield"
          slot="shield"
          item={getItemInSlot('shield')}
          icon={<Shield className="w-6 h-6" />}
          onUnequip={handleUnequip}
          disabled={!!twoHandedItem}
        />

        {/* Main Hand */}
        <EquipmentSlotCard
          label="Main Hand"
          slot="main-hand"
          item={getItemInSlot('main-hand') || twoHandedItem}
          icon={<Sword className="w-6 h-6" />}
          onUnequip={handleUnequip}
        />

        {/* Off Hand */}
        <EquipmentSlotCard
          label="Off Hand"
          slot="off-hand"
          item={getItemInSlot('off-hand')}
          icon={<Sword className="w-6 h-6 -scale-x-100" />}
          onUnequip={handleUnequip}
          disabled={!!twoHandedItem}
        />

        {/* Head */}
        <EquipmentSlotCard
          label="Head"
          slot="head"
          item={getItemInSlot('head')}
          icon={<User className="w-6 h-6" />}
          onUnequip={handleUnequip}
        />

        {/* Neck */}
        <EquipmentSlotCard
          label="Neck"
          slot="neck"
          item={getItemInSlot('neck')}
          icon={<CircleDot className="w-6 h-6" />}
          onUnequip={handleUnequip}
        />

        {/* Cloak */}
        <EquipmentSlotCard
          label="Cloak"
          slot="cloak"
          item={getItemInSlot('cloak')}
          onUnequip={handleUnequip}
        />

        {/* Gloves */}
        <EquipmentSlotCard
          label="Gloves"
          slot="gloves"
          item={getItemInSlot('gloves')}
          onUnequip={handleUnequip}
        />

        {/* Belt */}
        <EquipmentSlotCard
          label="Belt"
          slot="belt"
          item={getItemInSlot('belt')}
          onUnequip={handleUnequip}
        />

        {/* Ring 1 */}
        <EquipmentSlotCard
          label="Ring"
          slot="ring-1"
          item={getItemInSlot('ring-1')}
          icon={<CircleDot className="w-5 h-5" />}
          onUnequip={handleUnequip}
        />

        {/* Ring 2 */}
        <EquipmentSlotCard
          label="Ring"
          slot="ring-2"
          item={getItemInSlot('ring-2')}
          icon={<CircleDot className="w-5 h-5" />}
          onUnequip={handleUnequip}
        />

        {/* Boots */}
        <EquipmentSlotCard
          label="Boots"
          slot="boots"
          item={getItemInSlot('boots')}
          onUnequip={handleUnequip}
        />
      </div>

      {/* Summary Stats */}
      <div className="p-4 bg-slate-800 rounded-lg">
        <h3 className="text-sm font-medium text-slate-400 mb-2">Equipment Bonuses</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-slate-500">Total AC Bonus:</span>
            <span className="ml-2 text-green-400">
              +
              {equippedItems.reduce((sum, i) => {
                const acBonus = i.item?.bonuses?.find(b => b.type === 'ac')?.value || 0;
                return sum + acBonus;
              }, 0)}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Attack Bonus:</span>
            <span className="ml-2 text-green-400">
              +
              {equippedItems.reduce((sum, i) => {
                const bonus = i.item?.bonuses?.find(b => b.type === 'attack')?.value || 0;
                return sum + bonus;
              }, 0)}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Save Bonus:</span>
            <span className="ml-2 text-green-400">
              +
              {equippedItems.reduce((sum, i) => {
                const bonus = i.item?.bonuses?.find(b => b.type === 'saving-throw')?.value || 0;
                return sum + bonus;
              }, 0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EquipmentSlotCard({
  label,
  item,
  icon,
  disabled,
  onUnequip,
}: {
  label: string;
  slot: EquipmentSlot;
  item?: InventoryItem;
  icon?: React.ReactNode;
  disabled?: boolean;
  onUnequip: (item: InventoryItem) => void;
}) {
  const isEmpty = !item;
  const isMagic = item?.item?.isMagic;

  return (
    <div
      className={`
        p-3 rounded-lg border-2 border-dashed transition-all
        ${
          disabled
            ? 'border-slate-800 bg-slate-900/50 opacity-50'
            : isEmpty
              ? 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
              : isMagic
                ? 'border-purple-600 bg-purple-900/20'
                : 'border-amber-600 bg-amber-900/20'
        }
      `}
    >
      <div className="text-xs text-slate-500 mb-1">{label}</div>

      {isEmpty ? (
        <div className="flex items-center justify-center h-12 text-slate-600">
          {icon || <div className="w-6 h-6 rounded-full bg-slate-700" />}
        </div>
      ) : (
        <div className="space-y-1">
          <div className={`font-medium text-sm truncate ${isMagic ? 'text-purple-300' : ''}`}>
            {item.customName || item.item?.name}
          </div>
          {item.item?.magicBonus && (
            <div className="text-xs text-green-400">+{item.item.magicBonus}</div>
          )}
          <button
            onClick={() => onUnequip(item)}
            className="text-xs text-slate-400 hover:text-red-400"
          >
            Unequip
          </button>
        </div>
      )}
    </div>
  );
}
