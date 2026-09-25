import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser, STAFF_ROLES, logAudit } from '@/lib/api-utils'

// GET — detail with messages
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  const { id } = await params

  const ticket = await db.ticket.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, role: true } },
      messages: { include: { sender: { select: { name: true, role: true } } }, orderBy: { createdAt: 'asc' } },
    },
  })
  if (!ticket) return fail('تیکت یافت نشد', 404)
  if (!STAFF_ROLES.includes(user.role) && ticket.userId !== user.id) return fail('دسترسی غیرمجاز', 403)
  return ok({ ticket })
}

// PATCH — update status (staff)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  if (!STAFF_ROLES.includes(user.role)) return fail('دسترسی غیرمجاز', 403)
  const { id } = await params
  const b = await req.json()
  const ticket = await db.ticket.update({ where: { id }, data: { status: b.status || 'IN_PROGRESS' } })
  await logAudit(user.id, 'UPDATE', 'Ticket', id, `وضعیت تیکت: ${b.status}`)
  return ok({ ticket })
}

// POST — add message
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  const { id } = await params
  const b = await req.json()
  if (!b.content) return fail('متن پیام الزامی است')

  const ticket = await db.ticket.findUnique({ where: { id } })
  if (!ticket) return fail('تیکت یافت نشد', 404)
  if (!STAFF_ROLES.includes(user.role) && ticket.userId !== user.id) return fail('دسترسی غیرمجاز', 403)

  const message = await db.ticketMessage.create({
    data: { ticketId: id, senderId: user.id, content: String(b.content), isStaff: STAFF_ROLES.includes(user.role) },
  })
  await db.ticket.update({ where: { id }, data: { status: ticket.status === 'OPEN' && STAFF_ROLES.includes(user.role) ? 'IN_PROGRESS' : ticket.status } })
  return ok({ message }, 201)
}
