import { requireViewer } from '@/lib/auth'
import { recentRolls, requireMember } from '@/lib/campaigns'
import { errorResponse } from '../../../sheets/errors'

export const dynamic = 'force-dynamic'
type Ctx = { params: Promise<{ id: string }> }

/** Server-sent events: the party's rolls as they happen (polls the database every 1.5 s). */
export async function GET(req: Request, { params }: Ctx) {
  let id: string
  try {
    const v = await requireViewer()
    id = (await params).id
    await requireMember(v, id)
  } catch (e) { return errorResponse(e) }
  const enc = new TextEncoder()
  let last = new Date(Date.now() - 1000)
  let timer: ReturnType<typeof setInterval> | null = null
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      send('ready', { at: new Date().toISOString() })
      let beats = 0
      timer = setInterval(async () => {
        try {
          const rows = await recentRolls(id, last)
          if (rows.length) { last = rows[rows.length - 1].createdAt; send('rolls', rows) }
          if (++beats % 10 === 0) controller.enqueue(enc.encode(': keep-alive\n\n'))
        } catch { /* transient DB error: try again next tick */ }
      }, 1500)
      req.signal.addEventListener('abort', () => { if (timer) clearInterval(timer); try { controller.close() } catch { /* closed */ } })
    },
    cancel() { if (timer) clearInterval(timer) },
  })
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' } })
}
