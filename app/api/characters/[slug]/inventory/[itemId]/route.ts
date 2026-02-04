import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth-utils';
import { getItem } from '@/lib/items/itemDatabase';

// GET - Get single inventory item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; itemId: string }> }
) {
  const { itemId } = await params;

  try {
    const inventoryItem = await prisma.characterInventory.findUnique({
      where: { id: itemId },
    });

    if (!inventoryItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Hydrate with item data
    let itemData = null;
    if (inventoryItem.itemId) {
      itemData = await getItem(inventoryItem.itemId);
    } else if (inventoryItem.customItem) {
      itemData = inventoryItem.customItem;
    }

    return NextResponse.json({
      inventoryItem: {
        id: inventoryItem.id,
        item: itemData,
        quantity: inventoryItem.quantity,
        equipped: inventoryItem.equipped,
        attuned: inventoryItem.attuned,
        equipSlot: inventoryItem.equipSlot,
        notes: inventoryItem.notes,
        customName: inventoryItem.customName,
        charges: inventoryItem.charges,
        maxCharges: inventoryItem.maxCharges,
      },
    });
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    return NextResponse.json({ error: 'Failed to fetch item' }, { status: 500 });
  }
}

// PUT - Update inventory item (quantity, equipped, attuned, notes, etc.)
export async function PUT(
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

    const body = await request.json();
    const { quantity, equipped, attuned, equipSlot, notes, customName, charges } = body;

    // Validate attunement limit (max 3)
    if (attuned === true) {
      const currentAttuned = life.inventory.filter((i) => i.attuned && i.id !== itemId).length;
      if (currentAttuned >= 3) {
        return NextResponse.json(
          { error: 'Cannot attune to more than 3 items' },
          { status: 400 }
        );
      }
    }

    // If equipping to a slot, unequip any existing item in that slot
    if (equipped && equipSlot) {
      await prisma.characterInventory.updateMany({
        where: {
          lifeId: life.id,
          equipSlot: equipSlot,
          id: { not: itemId },
        },
        data: {
          equipped: false,
          equipSlot: null,
        },
      });
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (quantity !== undefined) updateData.quantity = quantity;
    if (equipped !== undefined) updateData.equipped = equipped;
    if (attuned !== undefined) updateData.attuned = attuned;
    if (equipSlot !== undefined) updateData.equipSlot = equipped ? equipSlot : null;
    if (notes !== undefined) updateData.notes = notes;
    if (customName !== undefined) updateData.customName = customName;
    if (charges !== undefined) updateData.charges = charges;

    // Update the item
    const updatedItem = await prisma.characterInventory.update({
      where: { id: itemId },
      data: updateData,
    });

    // Hydrate with item data
    let itemData = null;
    if (updatedItem.itemId) {
      itemData = await getItem(updatedItem.itemId);
    } else if (updatedItem.customItem) {
      itemData = updatedItem.customItem;
    }

    return NextResponse.json({
      success: true,
      inventoryItem: {
        id: updatedItem.id,
        item: itemData,
        quantity: updatedItem.quantity,
        equipped: updatedItem.equipped,
        attuned: updatedItem.attuned,
        equipSlot: updatedItem.equipSlot,
        notes: updatedItem.notes,
        customName: updatedItem.customName,
        charges: updatedItem.charges,
        maxCharges: updatedItem.maxCharges,
      },
    });
  } catch (error) {
    console.error('Error updating inventory item:', error);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}

// DELETE - Remove this specific item
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

    await prisma.characterInventory.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }
}
