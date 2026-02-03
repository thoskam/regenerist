import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-utils'
import { generateRollNarration } from '@/lib/ai/narrator'
import type { RollResult } from '@/lib/dice/types'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const roll = body.roll as RollResult | undefined

  if (!roll) {
    return NextResponse.json({ error: 'No roll provided' }, { status: 400 })
  }

  const narration = await generateRollNarration(roll)
  return NextResponse.json({ narration })
}
