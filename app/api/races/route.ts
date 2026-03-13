import { NextResponse } from 'next/server'
import { RACIAL_STAT_BONUSES } from '@/lib/racialBonuses'

// GET /api/races - return all racial stat bonuses
export async function GET() {
  return NextResponse.json(RACIAL_STAT_BONUSES)
}
