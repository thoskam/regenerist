import { NextRequest, NextResponse } from 'next/server';
import { searchItems, getItemsByCategory, getItemStats } from '@/lib/items/itemDatabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || undefined;
  const rarity = searchParams.get('rarity') || undefined;
  const source = searchParams.get('source') || undefined;
  const limitParam = searchParams.get('limit')
  const limit = limitParam ? parseInt(limitParam) : undefined
  const stats = searchParams.get('stats') === 'true';

  try {
    // If stats requested, return database statistics
    if (stats) {
      const dbStats = await getItemStats();
      return NextResponse.json({ stats: dbStats });
    }

    // Require query or category
    if (!query && !category) {
      return NextResponse.json(
        { error: 'Query (q) or category required' },
        { status: 400 }
      );
    }

    let results: Awaited<ReturnType<typeof searchItems>> = [];

    if (query) {
      results = await searchItems(query, { category, rarity, source, limit });
    } else if (category) {
      results = await getItemsByCategory(category);
      if (limit && results.length > limit) {
        results = results.slice(0, limit);
      }
    }

    return NextResponse.json({
      items: results,
      count: results.length,
    });
  } catch (error) {
    console.error('Error searching items:', error);
    return NextResponse.json({ error: 'Failed to search items' }, { status: 500 });
  }
}
