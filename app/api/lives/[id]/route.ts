import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    const life = await prisma.life.findUnique({
      where: { id },
    })

    if (!life) {
      return NextResponse.json(
        { error: 'Life not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(life)
  } catch (error) {
    console.error('Error fetching life:', error)
    return NextResponse.json(
      { error: 'Failed to fetch life' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    const body = await request.json()

    const life = await prisma.life.update({
      where: { id },
      data: body,
    })

    return NextResponse.json(life)
  } catch (error) {
    console.error('Error updating life:', error)
    return NextResponse.json(
      { error: 'Failed to update life' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    await prisma.life.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting life:', error)
    return NextResponse.json(
      { error: 'Failed to delete life' },
      { status: 500 }
    )
  }
}
