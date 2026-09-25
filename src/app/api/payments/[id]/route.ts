import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser, STAFF_ROLES, logAudit } from '@/lib/api-utils'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  if (!STAFF_ROLES.includes(user.role)) return fail('دسترسی غیرمجاز', 403)
  const { id } = await params
  const b = await req.json()
  const data: Record<string, unknown> = {}
  if (b.status) data.status = b.status
  if (b.note !== undefined) data.note = b.note
  const payment = await db.payment.update({ where: { id }, data })
  await logAudit(user.id, 'UPDATE', 'Payment', id, `تغییر وضعیت پرداخت به ${b.status}`)
  return ok({ payment })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  if (user.role !== 'ADMIN' && user.role !== 'MANAGER') return fail('دسترسی غیرمجاز', 403)
  const { id } = await params
  await db.payment.delete({ where: { id } })
  await logAudit(user.id, 'DELETE', 'Payment', id, 'حذف پرداخت')
  return ok({ ok: true })
}
