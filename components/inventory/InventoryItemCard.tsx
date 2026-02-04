'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Shield,
  Sword,
  Wand2,
  Trash2,
  Sparkles,
  Package,
} from 'lucide-react';
import { InventoryItem } from '@/lib/items/types';

interface InventoryItemCardProps {
  item: InventoryItem;
  characterSlug: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: () => void;
}

export default function InventoryItemCard({
  item,
  characterSlug,
  isExpanded,
  onToggleExpand,
  onUpdate,
}: InventoryItemCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const itemData = item.item;
  if (!itemData) return null;

  const displayName = item.customName || itemData.name;
  const isMagic = itemData.isMagic;
  const requiresAttunement = itemData.requiresAttunement;

  const handleEquipToggle = async () => {
    setIsUpdating(true);
    try {
      if (item.equipped) {
        await fetch(`/api/characters/${characterSlug}/inventory/${item.id}/equip`, {
          method: 'DELETE',
        });
      } else {
        await fetch(`/api/characters/${characterSlug}/inventory/${item.id}/equip`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
      }
      onUpdate();
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAttuneToggle = async () => {
    setIsUpdating(true);
    try {
      if (item.attuned) {
        await fetch(`/api/characters/${characterSlug}/inventory/${item.id}/attune`, {
          method: 'DELETE',
        });
      } else {
        const res = await fetch(`/api/characters/${characterSlug}/inventory/${item.id}/attune`, {
          method: 'POST',
        });
        if (!res.ok) {
          const data = await res.json();
          alert(data.error || 'Failed to attune');
        }
      }
      onUpdate();
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Remove ${displayName} from inventory?`)) return;

    setIsUpdating(true);
    try {
      await fetch(`/api/characters/${characterSlug}/inventory/${item.id}`, {
        method: 'DELETE',
      });
      onUpdate();
    } finally {
      setIsUpdating(false);
    }
  };

  const handleQuantityChange = async (delta: number) => {
    const newQty = item.quantity + delta;
    if (newQty < 1) {
      handleDelete();
      return;
    }

    setIsUpdating(true);
    try {
      await fetch(`/api/characters/${characterSlug}/inventory/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQty }),
      });
      onUpdate();
    } finally {
      setIsUpdating(false);
    }
  };

  const getCategoryIcon = () => {
    switch (itemData.category) {
      case 'weapon':
        return <Sword className="w-4 h-4" />;
      case 'armor':
      case 'shield':
        return <Shield className="w-4 h-4" />;
      case 'wand':
      case 'staff':
      case 'rod':
        return <Wand2 className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  const getRarityColor = () => {
    switch (itemData.rarity) {
      case 'common':
        return 'text-slate-400';
      case 'uncommon':
        return 'text-green-400';
      case 'rare':
        return 'text-blue-400';
      case 'very rare':
        return 'text-purple-400';
      case 'legendary':
        return 'text-orange-400';
      case 'artifact':
        return 'text-red-400';
      default:
        return 'text-slate-400';
    }
  };

  const canEquip = itemData.equipSlot && itemData.equipSlot !== 'none';

  return (
    <div
      className={`
      border rounded-lg overflow-hidden transition-all
      ${
        item.equipped
          ? 'border-amber-600 bg-amber-900/10'
          : 'border-slate-700 bg-slate-800/50'
      }
      ${isMagic ? 'ring-1 ring-purple-500/30' : ''}
    `}
    >
      {/* Header Row */}
      <div
        className="p-3 flex items-center gap-3 cursor-pointer hover:bg-slate-700/30"
        onClick={onToggleExpand}
      >
        {/* Icon */}
        <div className={`${isMagic ? 'text-purple-400' : 'text-slate-400'}`}>
          {getCategoryIcon()}
        </div>

        {/* Name & Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-medium truncate ${isMagic ? 'text-purple-300' : ''}`}>
              {displayName}
            </span>
            {isMagic && <Sparkles className="w-3 h-3 text-purple-400 flex-shrink-0" />}
            {item.equipped && (
              <span className="text-xs px-1.5 py-0.5 bg-amber-600 rounded">Equipped</span>
            )}
            {item.attuned && (
              <span className="text-xs px-1.5 py-0.5 bg-purple-600 rounded">Attuned</span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            {itemData.rarity && itemData.rarity !== 'none' && (
              <span className={getRarityColor()}>{itemData.rarity}</span>
            )}
            {itemData.weapon && (
              <span>
                {itemData.weapon.damage} {itemData.weapon.damageType}
              </span>
            )}
            {itemData.armor && <span>AC {itemData.armor.baseAC}</span>}
            {itemData.magicBonus && (
              <span className="text-green-400">+{itemData.magicBonus}</span>
            )}
          </div>
        </div>

        {/* Quantity */}
        {item.quantity > 1 && <span className="text-sm text-slate-400">x{item.quantity}</span>}

        {/* Expand Icon */}
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-slate-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-500" />
        )}
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-slate-700 space-y-3">
          {/* Description */}
          {itemData.description && (
            <p className="text-sm text-slate-400 mt-3">{itemData.description}</p>
          )}

          {/* Properties */}
          <div className="flex flex-wrap gap-2 text-xs">
            {itemData.weight && (
              <span className="px-2 py-1 bg-slate-700 rounded">{itemData.weight} lb</span>
            )}
            {itemData.value && (
              <span className="px-2 py-1 bg-slate-700 rounded">{itemData.value} gp</span>
            )}
            {itemData.weapon?.properties.map(prop => (
              <span key={prop} className="px-2 py-1 bg-slate-700 rounded capitalize">
                {prop}
              </span>
            ))}
            {requiresAttunement && (
              <span className="px-2 py-1 bg-purple-900/50 text-purple-300 rounded">
                Requires Attunement
                {typeof itemData.attunementRequirement === 'string' &&
                  ` ${itemData.attunementRequirement}`}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 flex-wrap">
            {/* Equip/Unequip */}
            {canEquip && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  handleEquipToggle();
                }}
                disabled={isUpdating}
                className={`
                  px-3 py-1.5 rounded text-sm font-medium disabled:opacity-50
                  ${
                    item.equipped
                      ? 'bg-slate-700 hover:bg-slate-600'
                      : 'bg-amber-600 hover:bg-amber-500'
                  }
                `}
              >
                {item.equipped ? 'Unequip' : 'Equip'}
              </button>
            )}

            {/* Attune/Break Attunement */}
            {requiresAttunement && item.equipped && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  handleAttuneToggle();
                }}
                disabled={isUpdating}
                className={`
                  px-3 py-1.5 rounded text-sm font-medium disabled:opacity-50
                  ${
                    item.attuned
                      ? 'bg-slate-700 hover:bg-slate-600'
                      : 'bg-purple-600 hover:bg-purple-500'
                  }
                `}
              >
                {item.attuned ? 'Break Attunement' : 'Attune'}
              </button>
            )}

            {/* Quantity Controls */}
            {itemData.isConsumable && (
              <div className="flex items-center gap-1">
                <button
                  onClick={e => {
                    e.stopPropagation();
                    handleQuantityChange(-1);
                  }}
                  disabled={isUpdating}
                  className="w-7 h-7 flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded disabled:opacity-50"
                >
                  -
                </button>
                <span className="w-8 text-center">{item.quantity}</span>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    handleQuantityChange(1);
                  }}
                  disabled={isUpdating}
                  className="w-7 h-7 flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded disabled:opacity-50"
                >
                  +
                </button>
              </div>
            )}

            {/* Delete */}
            <button
              onClick={e => {
                e.stopPropagation();
                handleDelete();
              }}
              disabled={isUpdating}
              className="ml-auto p-2 text-red-400 hover:bg-red-900/30 rounded disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Notes */}
          {item.notes && (
            <div className="text-sm text-slate-500 italic pt-2 border-t border-slate-700">
              Note: {item.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
