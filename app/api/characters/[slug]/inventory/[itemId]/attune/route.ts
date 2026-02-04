import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth-utils';

const MAX_ATTUNED_ITEMS = 3;

// POST - Attune to an item
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

    // Check attunement limit
    const currentAttuned = life.inventory.filter((i) => i.attuned && i.id !== itemId).length;
    if (currentAttuned >= MAX_ATTUNED_ITEMS) {
      return NextResponse.json(
        {
          error: `Cannot attune to more than ${MAX_ATTUNED_ITEMS} items. Break attunement with another item first.`,
          currentAttuned: life.inventory.filter((i) => i.attuned).map((i) => i.id),
        },
        { status: 400 }
      );
    }

    // Verify the item is in the character's inventory
    const inventoryItem = life.inventory.find((i) => i.id === itemId);
    if (!inventoryItem) {
      return NextResponse.json({ error: 'Item not in inventory' }, { status: 404 });
    }

    const updated = await prisma.characterInventory.update({
      where: { id: itemId },
      data: { attuned: true },
    });

    return NextResponse.json({
      success: true,
      inventoryItem: {
        id: updated.id,
        attuned: updated.attuned,
      },
      attunedCount: currentAttuned + 1,
    });
  } catch (error) {
    console.error('Error attuning to item:', error);
    return NextResponse.json({ error: 'Failed to attune to item' }, { status: 500 });
  }
}

// DELETE - Break attunement
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

    const updated = await prisma.characterInventory.update({
      where: { id: itemId },
      data: { attuned: false },
    });

    const newAttunedCount = life.inventory.filter((i) => i.attuned && i.id !== itemId).length;

    return NextResponse.json({
      success: true,
      inventoryItem: {
        id: updated.id,
        attuned: updated.attuned,
      },
      attunedCount: newAttunedCount,
    });
  } catch (error) {
    console.error('Error breaking attunement:', error);
    return NextResponse.json({ error: 'Failed to break attunement' }, { status: 500 });
  }
}
