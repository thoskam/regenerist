import { NextResponse } from 'next/server'
import { createFromBuild } from '@/lib/sheet/store'
import { errorResponse } from '../errors'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    return NextResponse.json(await createFromBuild(body?.build), { status: 201 })
  } catch (e) {
    return errorResponse(e)
  }
}
