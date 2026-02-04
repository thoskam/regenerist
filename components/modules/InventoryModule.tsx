'use client';

import DraggableModule from '@/components/layout/DraggableModule';
import { InventoryTab } from '@/components/inventory';

interface InventoryModuleProps {
  characterSlug: string;
  isOwner: boolean;
  onRefresh: () => void;
}

export default function InventoryModule({
  characterSlug,
  isOwner,
  onRefresh,
}: InventoryModuleProps) {
  if (!isOwner) {
    return null;
  }

  return (
    <DraggableModule moduleId="inventory">
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
        <InventoryTab characterSlug={characterSlug} onEquipmentChange={onRefresh} />
      </div>
    </DraggableModule>
  );
}
