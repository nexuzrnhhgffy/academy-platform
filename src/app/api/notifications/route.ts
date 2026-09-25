import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser } from '@/lib/api-utils'

// GET /api/notifications — my notifications
export async function GET(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  const unread = notifications.filter((n) => !n.isRead).length
  return ok({ notifications, unread })
}

// PATCH /api/notifications — mark all read
export async function PATCH(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  await db.notification.updateMany({ where: { userId: user.id, isRead: false }, data: { isRead: true } })
  return ok({ ok: true })
}

// DELETE /api/notifications?id=
export async function DELETE(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  const id = req.nextUrl.searchParams.get('id')
  if (id) {
    await db.notification.delete({ where: { id } })
  } else {
    await db.notification.deleteMany({ where: { userId: user.id, isRead: true } })
  }
  return ok({ ok: true })
}
