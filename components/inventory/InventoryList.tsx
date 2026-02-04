'use client';

import { useState } from 'react';
import { InventoryItem } from '@/lib/items/types';
import InventoryItemCard from './InventoryItemCard';

interface InventoryListProps {
  items: InventoryItem[];
  characterSlug: string;
  onUpdate: () => void;
}

export default function InventoryList({ items, characterSlug, onUpdate }: InventoryListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    const category = item.item?.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, InventoryItem[]>);

  const categoryOrder = [
    'weapon',
    'armor',
    'shield',
    'wondrous',
    'ring',
    'wand',
    'rod',
    'staff',
    'potion',
    'scroll',
    'adventuring-gear',
    'tool',
    'ammunition',
    'treasure',
    'other',
  ];

  const sortedCategories = Object.keys(groupedItems).sort(
    (a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b)
  );

  const formatCategoryName = (category: string) => {
    return category.replace(/-/g, ' ');
  };

  return (
    <div className="space-y-4">
      {sortedCategories.map(category => (
        <div key={category}>
          <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-2 capitalize">
            {formatCategoryName(category)}
          </h4>
          <div className="space-y-1">
            {groupedItems[category].map(item => (
              <InventoryItemCard
                key={item.id}
                item={item}
                characterSlug={characterSlug}
                isExpanded={expandedId === item.id}
                onToggleExpand={() => setExpandedId(expandedId === item.id ? null : item.id)}
                onUpdate={onUpdate}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
