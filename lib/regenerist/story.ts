// Regeneration story via AWS Bedrock (optional). Without credentials, or on any error,
// a short local story is used instead so regeneration never depends on the network.
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'

export interface StoryInput { name: string; lifeNumber: number; species: string; classLabel: string; background: string; previous?: string | null }

const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th'}`

const article = (w: string) => (/^[aeiou]/i.test(w) ? 'an' : 'a')

export function localStory(i: StoryInput): string {
  return `## Your New Form: The ${ordinal(i.lifeNumber)} Life\n\nGolden light pours from every seam of ${i.name}'s old body${i.previous ? ` — the ${i.previous} burns away` : ''} — and when it fades, ${article(i.species)} ${i.species} stands in its place: ${i.classLabel}, shaped by a past as ${article(i.background)} ${i.background}.\n\n## How to Play This Life\n\nOpen the Features & Traits tab and learn what this body can do. Every end is just another beginning.`
}

export async function generateStory(i: StoryInput): Promise<string> {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.BEDROCK_MODEL_ID) return localStory(i)
  try {
    const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' })
    const system = `You are "The Archivist," a witty D&D chronicler describing a "Regeneration": a soul taking a new body and class. Encouraging, specific about D&D mechanics, a little Doctor Who.

Use these markdown headers exactly:
## Your New Form: [dramatic title]
## The Roleplay Moment
[one vivid paragraph, under 100 words]
## How to Play This Life
[2–3 sentences of concrete tactical advice naming real class and species features]
## Signature Catchphrase
*"[four words or fewer]"*`
    const user = `Describe the ${ordinal(i.lifeNumber)} regeneration of ${i.name}. ${i.previous ? `Previous form: ${i.previous}.` : 'This is their first known incarnation.'} New form: ${i.species}, ${i.classLabel}, background ${i.background}.`
    const res = await client.send(new InvokeModelCommand({
      modelId: process.env.BEDROCK_MODEL_ID,
      contentType: 'application/json', accept: 'application/json',
      body: JSON.stringify({ anthropic_version: 'bedrock-2023-05-31', max_tokens: 1200, system, messages: [{ role: 'user', content: user }] }),
    }))
    const body = JSON.parse(new TextDecoder().decode(res.body))
    if (body.stop_reason === 'refusal') return localStory(i)
    const text = (body.content ?? []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('\n').trim()
    return text || localStory(i)
  } catch (e) {
    console.error('Regeneration story unavailable:', (e as Error).message)
    return localStory(i)
  }
}
