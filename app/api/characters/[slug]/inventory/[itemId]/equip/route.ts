import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth-utils';
import { getItem } from '@/lib/items/itemDatabase';
import { Item } from '@/lib/items/types';

// POST - Equip an item
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; itemId: string }> }
) {
  const { slug, itemId } = await params;
  const session = await getSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const character = await prisma.character.findUnique({
      where: { slug },
      include: {
        lives: {
          where: { isActive: true },
          include: { inventory: true },
        },
      },
    });

    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    if (character.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const life = character.lives[0];
    if (!life) {
      return NextResponse.json({ error: 'No active life' }, { status: 400 });
    }

    // Find the inventory item
    const inventoryItem = life.inventory.find((i) => i.id === itemId);
    if (!inventoryItem) {
      return NextResponse.json({ error: 'Item not in inventory' }, { status: 404 });
    }

    // Get the item data to determine slot
    let itemData: Item | null = null;
    if (inventoryItem.itemId) {
      itemData = (await getItem(inventoryItem.itemId)) || null;
    } else if (inventoryItem.customItem) {
      itemData = inventoryItem.customItem as unknown as Item;
    }

    if (!itemData) {
      return NextResponse.json({ error: 'Item data not found' }, { status: 404 });
    }

    // Determine equipment slot
    const body = await request.json().catch(() => ({}));
    let equipSlot = body.slot || itemData.equipSlot;

    // No equip slot limits (allow multiple equipped items per slot)

    // Equip the item
    const updated = await prisma.characterInventory.update({
      where: { id: itemId },
      data: {
        equipped: true,
        equipSlot: equipSlot || null,
      },
    });

    return NextResponse.json({
      success: true,
      inventoryItem: {
        id: updated.id,
        equipped: updated.equipped,
        equipSlot: updated.equipSlot,
      },
      slot: equipSlot,
    });
  } catch (error) {
    console.error('Error equipping item:', error);
    return NextResponse.json({ error: 'Failed to equip item' }, { status: 500 });
  }
}

// DELETE - Unequip an item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; itemId: string }> }
) {
  const { slug, itemId } = await params;
  const session = await getSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const character = await prisma.character.findUnique({
      where: { slug },
    });

    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    if (character.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updated = await prisma.characterInventory.update({
      where: { id: itemId },
      data: {
        equipped: false,
        equipSlot: null,
      },
    });

    return NextResponse.json({
      success: true,
      inventoryItem: {
        id: updated.id,
        equipped: updated.equipped,
        equipSlot: updated.equipSlot,
      },
    });
  } catch (error) {
    console.error('Error unequipping item:', error);
    return NextResponse.json({ error: 'Failed to unequip item' }, { status: 500 });
  }
}
