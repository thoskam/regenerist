const IMAGEN_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict'

function buildPrompt(race: string, className: string, subclass: string): string {
  return (
    `Fantasy RPG character portrait of a ${race} ${className} (${subclass} subclass). ` +
    `Dramatic lighting, detailed digital oil painting, heroic fantasy art style, ` +
    `face and upper body composition, highly detailed armor and clothing befitting the class, ` +
    `epic fantasy illustration, dark fantasy aesthetic`
  )
}

export async function generatePortrait(
  race: string,
  className: string,
  subclass: string
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.warn('GEMINI_API_KEY not set — skipping portrait generation')
    return null
  }

  try {
    const prompt = buildPrompt(race, className, subclass)

    const res = await fetch(`${IMAGEN_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: 1, aspectRatio: '1:1' },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Imagen API error:', res.status, err)
      return null
    }

    const data = await res.json()
    const prediction = data.predictions?.[0]
    if (!prediction?.bytesBase64Encoded) {
      console.error('No image in Imagen response:', JSON.stringify(data))
      return null
    }

    const mimeType = prediction.mimeType || 'image/png'
    return `data:${mimeType};base64,${prediction.bytesBase64Encoded}`
  } catch (error) {
    console.error('Portrait generation failed:', error)
    return null
  }
}
