import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser, STAFF_ROLES, logAudit } from '@/lib/api-utils'

// PATCH /api/installments/:id — pay an installment (creates payment record)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  const { id } = await params

  const inst = await db.installment.findUnique({
    where: { id },
    include: { enrollment: { include: { classGroup: true } } },
  })
  if (!inst) return fail('قسط یافت نشد', 404)

  const isOwner = user.role === 'STUDENT' && inst.enrollment.studentId === user.id
  if (!STAFF_ROLES.includes(user.role) && !isOwner) return fail('دسترسی غیرمجاز', 403)

  const b = await req.json().catch(() => ({}))

  const updated = await db.installment.update({
    where: { id },
    data: { status: 'PAID', paidAt: new Date() },
  })

  // auto-create corresponding payment record
  await db.payment.create({
    data: {
      studentId: inst.enrollment.studentId,
      enrollmentId: inst.enrollmentId,
      branchId: inst.enrollment.classGroup.branchId,
      amount: inst.amount,
      method: b.method || 'ONLINE',
      status: 'PAID',
      refCode: 'PAY-' + Date.now().toString(36).toUpperCase(),
      note: `پرداخت قسط ${inst.enrollment.classGroup.name}`,
    },
  })

  await logAudit(user.id, 'PAY', 'Installment', id, `پرداخت قسط مبلغ ${inst.amount}`)
  return ok({ installment: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  if (!STAFF_ROLES.includes(user.role)) return fail('دسترسی غیرمجاز', 403)
  const { id } = await params
  await db.installment.delete({ where: { id } })
  return ok({ ok: true })
}
