import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth-utils';

interface LifeWithCurrency {
  id: number;
  currencyCP: number;
  currencySP: number;
  currencyEP: number;
  currencyGP: number;
  currencyPP: number;
}

function calculateTotalGP(life: LifeWithCurrency): number {
  return (
    life.currencyCP / 100 +
    life.currencySP / 10 +
    life.currencyEP / 2 +
    life.currencyGP +
    life.currencyPP * 10
  );
}

// GET - Get current currency
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

    return NextResponse.json({
      cp: life.currencyCP,
      sp: life.currencySP,
      ep: life.currencyEP,
      gp: life.currencyGP,
      pp: life.currencyPP,
      totalGP: calculateTotalGP(life),
    });
  } catch (error) {
    console.error('Error fetching currency:', error);
    return NextResponse.json({ error: 'Failed to fetch currency' }, { status: 500 });
  }
}

// PUT - Update currency
export async function PUT(
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
    const { cp, sp, ep, gp, pp, action } = body;

    const updateData: Record<string, number> = {};

    if (action === 'set') {
      // Set exact values
      if (cp !== undefined) updateData.currencyCP = Math.max(0, Math.floor(cp));
      if (sp !== undefined) updateData.currencySP = Math.max(0, Math.floor(sp));
      if (ep !== undefined) updateData.currencyEP = Math.max(0, Math.floor(ep));
      if (gp !== undefined) updateData.currencyGP = Math.max(0, Math.floor(gp));
      if (pp !== undefined) updateData.currencyPP = Math.max(0, Math.floor(pp));
    } else if (action === 'add') {
      // Add to current values
      if (cp) updateData.currencyCP = life.currencyCP + Math.floor(cp);
      if (sp) updateData.currencySP = life.currencySP + Math.floor(sp);
      if (ep) updateData.currencyEP = life.currencyEP + Math.floor(ep);
      if (gp) updateData.currencyGP = life.currencyGP + Math.floor(gp);
      if (pp) updateData.currencyPP = life.currencyPP + Math.floor(pp);
    } else if (action === 'subtract') {
      // Subtract from current values (don't go below 0)
      if (cp) updateData.currencyCP = Math.max(0, life.currencyCP - Math.floor(cp));
      if (sp) updateData.currencySP = Math.max(0, life.currencySP - Math.floor(sp));
      if (ep) updateData.currencyEP = Math.max(0, life.currencyEP - Math.floor(ep));
      if (gp) updateData.currencyGP = Math.max(0, life.currencyGP - Math.floor(gp));
      if (pp) updateData.currencyPP = Math.max(0, life.currencyPP - Math.floor(pp));
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "set", "add", or "subtract"' },
        { status: 400 }
      );
    }

    const updated = await prisma.life.update({
      where: { id: life.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      cp: updated.currencyCP,
      sp: updated.currencySP,
      ep: updated.currencyEP,
      gp: updated.currencyGP,
      pp: updated.currencyPP,
      totalGP: calculateTotalGP(updated),
    });
  } catch (error) {
    console.error('Error updating currency:', error);
    return NextResponse.json({ error: 'Failed to update currency' }, { status: 500 });
  }
}

// POST - Convert currency
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
    const { from, to, amount } = body;

    // Conversion rates (all relative to copper)
    const rates: Record<string, number> = {
      cp: 1,
      sp: 10,
      ep: 50,
      gp: 100,
      pp: 1000,
    };

    const fromRate = rates[from];
    const toRate = rates[to];

    if (!fromRate || !toRate) {
      return NextResponse.json({ error: 'Invalid currency type' }, { status: 400 });
    }

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });
    }

    // Get current amounts
    const currencyFields: Record<string, keyof LifeWithCurrency> = {
      cp: 'currencyCP',
      sp: 'currencySP',
      ep: 'currencyEP',
      gp: 'currencyGP',
      pp: 'currencyPP',
    };

    const fromField = currencyFields[from];
    const toField = currencyFields[to];

    const currentFrom = life[fromField];

    if (currentFrom < amount) {
      return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 });
    }

    // Calculate conversion
    const copperValue = amount * fromRate;
    const convertedAmount = Math.floor(copperValue / toRate);
    const remainderCopper = copperValue % toRate;

    // Build update
    const updateData: Record<string, number> = {
      [fromField]: currentFrom - amount,
      [toField]: life[toField] + convertedAmount,
    };

    // Add remainder as copper (if not already converting from/to copper)
    if (remainderCopper > 0 && from !== 'cp' && to !== 'cp') {
      updateData.currencyCP = life.currencyCP + remainderCopper;
    }

    const updated = await prisma.life.update({
      where: { id: life.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      converted: {
        from,
        to,
        amount,
        result: convertedAmount,
        remainder: remainderCopper,
      },
      cp: updated.currencyCP,
      sp: updated.currencySP,
      ep: updated.currencyEP,
      gp: updated.currencyGP,
      pp: updated.currencyPP,
      totalGP: calculateTotalGP(updated),
    });
  } catch (error) {
    console.error('Error converting currency:', error);
    return NextResponse.json({ error: 'Failed to convert currency' }, { status: 500 });
  }
}
