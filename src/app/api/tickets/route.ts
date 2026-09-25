import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser, STAFF_ROLES, logAudit } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  const status = req.nextUrl.searchParams.get('status')

  const where: Record<string, unknown> = {}
  if (!STAFF_ROLES.includes(user.role)) where.userId = user.id
  if (status) where.status = status

  const tickets = await db.ticket.findMany({
    where,
    include: {
      user: { select: { name: true, role: true } },
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 200,
  })
  return ok({ tickets })
}

export async function POST(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  const b = await req.json()
  if (!b.subject || !b.content) return fail('موضوع و متن پیام الزامی است')

  const ticket = await db.ticket.create({
    data: {
      userId: user.id,
      subject: String(b.subject),
      category: b.category || 'GENERAL',
      priority: b.priority || 'MEDIUM',
      messages: { create: { senderId: user.id, content: String(b.content), isStaff: false } },
    },
  })
  return ok({ ticket }, 201)
}
