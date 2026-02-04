import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth-utils';
import { getItem } from '@/lib/items/itemDatabase';

// GET - Fetch character's inventory
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const character = await prisma.character.findUnique({
      where: { slug },
      include: {
        lives: {
          where: { isActive: true },
          include: {
            inventory: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });

    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    const life = character.lives[0];
    if (!life) {
      return NextResponse.json({ error: 'No active life' }, { status: 404 });
    }

    // Hydrate inventory items with full item data
    const hydratedInventory = await Promise.all(
      life.inventory.map(async (invItem) => {
        let itemData = null;

        if (invItem.itemId) {
          // Load from 5eTools database
          itemData = await getItem(invItem.itemId);
        } else if (invItem.customItem) {
          // Use custom item data
          itemData = invItem.customItem;
        }

        return {
          id: invItem.id,
          item: itemData,
          quantity: invItem.quantity,
          equipped: invItem.equipped,
          attuned: invItem.attuned,
          equipSlot: invItem.equipSlot,
          notes: invItem.notes,
          customName: invItem.customName,
          charges: invItem.charges,
          maxCharges: invItem.maxCharges,
        };
      })
    );

    // Get currency
    const currency = {
      cp: life.currencyCP,
      sp: life.currencySP,
      ep: life.currencyEP,
      gp: life.currencyGP,
      pp: life.currencyPP,
    };

    return NextResponse.json({
      inventory: hydratedInventory,
      currency,
      attunedCount: life.inventory.filter((i) => i.attuned).length,
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
  }
}

// POST - Add item to inventory
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
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
    const {
      itemId, // For 5eTools items
      customItem, // For custom items: { name, description, weight, value, ... }
      quantity = 1,
      equipped = false,
      notes,
    } = body;

    // Validate item exists if itemId provided
    if (itemId) {
      const item = await getItem(itemId);
      if (!item) {
        return NextResponse.json({ error: 'Item not found in database' }, { status: 404 });
      }
    }

    // Create inventory record
    const inventoryItem = await prisma.characterInventory.create({
      data: {
        lifeId: life.id,
        itemId: itemId || null,
        customItem: customItem || null,
        quantity,
        equipped,
        notes,
      },
    });

    // Hydrate the response with item data
    let itemData = null;
    if (itemId) {
      itemData = await getItem(itemId);
    } else if (customItem) {
      itemData = customItem;
    }

    return NextResponse.json({
      success: true,
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
    console.error('Error adding item to inventory:', error);
    return NextResponse.json({ error: 'Failed to add item' }, { status: 500 });
  }
}

// DELETE - Remove item from inventory (by inventory ID query param)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const session = await getSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const inventoryId = searchParams.get('id');

  if (!inventoryId) {
    return NextResponse.json({ error: 'Inventory item ID required' }, { status: 400 });
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
      where: { id: inventoryId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing item from inventory:', error);
    return NextResponse.json({ error: 'Failed to remove item' }, { status: 500 });
  }
}
