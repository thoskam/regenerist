import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/auth'
import { StoreError } from '@/lib/sheet/store'

export function errorResponse(e: unknown) {
  if (e instanceof StoreError) return NextResponse.json({ error: e.message, ...e.extra }, { status: e.status })
  if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
  console.error(e)
  return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
}
