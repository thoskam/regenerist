import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE() {
  try {
    await prisma.life.deleteMany({})
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error clearing lives:', error)
    return NextResponse.json(
      { error: 'Failed to clear lives' },
      { status: 500 }
    )
  }
}
