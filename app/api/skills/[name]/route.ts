import { NextRequest, NextResponse } from 'next/server'
import { getSkillData } from '@/lib/dndApi'
import { entriesToText } from '@/lib/entryParser'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params

  if (!name) {
    return NextResponse.json({ error: 'Skill name is required' }, { status: 400 })
  }

  const skill = await getSkillData(decodeURIComponent(name))

  if (!skill) {
    return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
  }

  return NextResponse.json({
    name: skill.name,
    ability: skill.ability.toUpperCase(),
    description: entriesToText(skill.entries),
  })
}
