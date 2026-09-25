import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser } from '@/lib/api-utils'

// GET /api/live-messages?sessionId=
export async function GET(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  const sessionId = req.nextUrl.searchParams.get('sessionId')
  if (!sessionId) return fail('شناسه جلسه الزامی است')

  const messages = await db.liveMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
    take: 200,
  })
  return ok({ messages })
}

// POST /api/live-messages — persist one message
export async function POST(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  const b = await req.json()
  if (!b.sessionId || !b.content) return fail('داده نامعتبر است')

  const message = await db.liveMessage.create({
    data: {
      sessionId: String(b.sessionId),
      userId: user.id,
      userName: user.name,
      role: user.role,
      content: String(b.content),
      type: b.type || 'CHAT',
    },
  })
  return ok({ message }, 201)
}
